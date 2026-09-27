import { Worker } from "bullmq";
import s3client from "../helper/s3";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import fs, { createWriteStream } from "node:fs";
import crypto from "crypto"
import { prisma } from "../../prisma/lib/prisma";
import Docker from "dockerode"

const docker = new Docker()



const worker = new Worker("myQueue", async (job) => {
  console.log(`The job is ${job.id} and the name is ${job.name}`)
  try {
    const result = await processJob(job.name, job.data)
  } catch (err) {

  }
})


const copyS3Folder = async (base_folder: string) => {
  const list_contents = new ListObjectsV2Command({
    'Bucket': "dev-forces",
    "Prefix": base_folder,
  })
  const lists = await s3client.send(list_contents);
  console.log(lists.Contents)
  return lists.Contents;
}


const SaveS3File = async (s3key: string) => {
  try {
    const command = new GetObjectCommand({
      Bucket: "dev-forces",
      Key: s3key

    })
    const response = await s3client.send(command)
    const writeStream = createWriteStream(`${process.cwd()}/${s3key}`)
    // @ts-ignore
    response.Body.pipe(writeStream)
    return new Promise((resolve, reject) => {
      writeStream.on("finish", () => {
        console.log("Successfully written")
        resolve("/uploads")
      })
      writeStream.on("error", (error) => {
        console.log("Error while writing the stream : ", error)
        reject()
      })
    })
  } catch (error) {
    return error
  }
}


const runContainer = async () => {
  try {
    const container = await docker.createContainer({
      Image : "",
      name : "my-container",
      HostConfig : {
        PortBindings : {
          '3001/tcp' : [{HostPort : 8080}]
        }
      },
      Cmd : ['vitest']
    })
    await container.start()
    console.log("container Id : ", container.id);

  } catch (error) {
    console.error(error)
  }
}





const processJob = async (jobName: string, data: string) => {
  if (jobName == "evaluate") {

    const submission = JSON.parse(data).submission;

    const submissionZip = await SaveS3File(`problem-submission/${submission.id}`)

    const testZip = await SaveS3File(`test/${submission.challenge_id}`)

    const package_json = JSON.parse(fs.readFileSync(`${process.cwd()}/${submission.id}/package.json`, 'utf-8'));
    const package_lock_json = JSON.parse(fs.readFileSync(`${process.cwd()}/${submission.id}/package-lock.json`, 'utf-8'));

    const deps = {
      dependencies: package_json.dependencies || {},
      devDependencies: package_json.devDependencies || {}
    };

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(deps))
      .digest('hex');


    if(hash){
      // fetch from the ecr directly 
    }else{
      //build the image first and push to ecr
    }


    await runContainer()


    // delete the zip files and folders 

  }
}