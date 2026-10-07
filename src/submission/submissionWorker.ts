import { Worker } from "bullmq";
import { uploadToS3 } from "../helper/s3";
import fs from "node:fs";
import { prisma } from "../../prisma/lib/prisma";
import path from "node:path";
import { redisConnection } from "../helper/worker-config";

export const processJob = async (jobName: string, data: any) => {
  if (jobName === "submit-problem") {
    const jobData = typeof data === "string" ? JSON.parse(data) : data;
    const submission = jobData.submission;
    const test_result = jobData.result || jobData.test_result;
    const pathOfZippedFile = jobData.pathToZipped;

    if (!pathOfZippedFile || !fs.existsSync(pathOfZippedFile)) {
      console.error("Zipped file does not exist at path:", pathOfZippedFile);
      return;
    }

    // S3 Key format: ${submission_id}.zip
    const s3Key = `${submission.id}.zip`;

    try {
      console.log(`Uploading ${pathOfZippedFile} to S3 bucket dev-forces as ${s3Key}...`);
      await uploadToS3(pathOfZippedFile, "dev-forces", s3Key);

      // Determine passed/failed status from test results
      const numFailed = test_result?.numFailedTests ?? (test_result?.success === false ? 1 : 0);
      const isPassed = numFailed === 0 && (test_result?.numPassedTests ?? 0) > 0;
      const finalStatus = isPassed ? "passed" : "failed";

      await prisma.submissions.update({
        where: {
          id: submission.id,
        },
        data: {
          status: finalStatus,
          bucket_name: "dev-forces",
          Key: s3Key,
          test_passed: test_result?.numPassedTests ?? 0,
        },
      });

      // Insert individual test run results into submissionTest table
      if (test_result?.testResults && Array.isArray(test_result.testResults)) {
        const testResultsArray = test_result.testResults.map((result: any) =>
          path.basename(result.name)
        );

        const validTests = await prisma.tests.findMany({
          where: {
            challenge_id: submission.challenge_id,
            test_name: {
              in: testResultsArray,
            },
          },
        });

        const dataToInsert = validTests.map((test) => {
          const testRequired = test_result.testResults.find(
            (res: any) => path.basename(res.name) === path.basename(test.test_name)
          );
          const status = testRequired?.status === "passed" ? "passed" : "failed";
          return {
            submission_id: submission.id,
            test_id: test.id,
            status: status as "passed" | "failed",
          };
        });

        if (dataToInsert.length > 0) {
          // Remove previous test records for this submission to avoid duplicates
          await prisma.submissionTest.deleteMany({
            where: {
              submission_id: submission.id,
            },
          });

          await prisma.submissionTest.createMany({
            data: dataToInsert,
          });
        }
      }

      console.log(`Submission ${submission.id} completed with status: ${finalStatus}`);
    } catch (error) {
      console.error("Error processing submission in worker:", error);
      await prisma.submissions.update({
        where: {
          id: submission.id,
        },
        data: {
          status: "failed",
        },
      });
    } finally {
      // Once uploaded to S3, delete the local zip file as requested
      try {
        if (fs.existsSync(pathOfZippedFile)) {
          fs.unlinkSync(pathOfZippedFile);
          console.log(`Successfully deleted local zip file: ${pathOfZippedFile}`);
        }
      } catch (err) {
        console.error("Failed to delete local zip file:", err);
      }
    }
  }

  if (jobName === "save-code") {
    const jobData = typeof data === "string" ? JSON.parse(data) : data;
    const submission = jobData.submission;
    const pathOfZippedFile = jobData.pathToZipped;

    if (!pathOfZippedFile || !fs.existsSync(pathOfZippedFile)) {
      console.error("Zipped file does not exist at path:", pathOfZippedFile);
      return;
    }

    const s3Key = `${submission.id}.zip`;

    try {
      console.log(`Saving code on disconnect: uploading ${pathOfZippedFile} to S3 bucket dev-forces as ${s3Key}...`);
      await uploadToS3(pathOfZippedFile, "dev-forces", s3Key);

      await prisma.submissions.update({
        where: {
          id: submission.id,
        },
        data: {
          bucket_name: "dev-forces",
          Key: s3Key,
        },
      });
      console.log(`Successfully saved code for submission ${submission.id} to S3 on disconnect`);
    } catch (error) {
      console.error("Error saving code to S3 in worker on disconnect:", error);
    } finally {
      try {
        if (fs.existsSync(pathOfZippedFile)) {
          fs.unlinkSync(pathOfZippedFile);
          console.log(`Successfully deleted local zip file: ${pathOfZippedFile}`);
        }
      } catch (err) {
        console.error("Failed to delete local zip file:", err);
      }
    }
  }
};

export const submissionWorker = new Worker(
  "evaluator",
  async (job) => {
    console.log(`Worker processing job ${job.id}: ${job.name}`);
    await processJob(job.name, job.data);
  },
  {
    connection: redisConnection,
  }
);

submissionWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

submissionWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error:`, err);
});