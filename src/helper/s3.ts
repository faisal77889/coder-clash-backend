import { GetObjectCommand, PutObjectCommand, S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3"
import Dockerode from "dockerode"
import { Readable } from "node:stream";
import tar from "tar-stream"
const docker = new Dockerode();
import path from "node:path";
import * as fs from "fs"

const s3client = new S3Client({
    region: process.env.AWS_REGION! || "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
})


export const saveS3FileToDocker = async (client: S3Client, bucketName: string, Key: string, containerId: string, targetDir: string) => {
    try {
        const container = docker.getContainer(containerId);
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: Key
        })
        const response = await client.send(command);
        const fileSize = response.ContentLength;

        if (fileSize === undefined) {
            throw new Error("S3 response did not provide a ContentLength.");
        }

        if (!(response.Body instanceof Readable)) {
            throw new Error("Expected S3 Body to be a Node.js Readable stream");
        }
        const s3Stream = response.Body;
        const pack = tar.pack();
        const entry = pack.entry({
            name: path.basename(Key),
            size: fileSize,
            mode: 0o644,
        })
        s3Stream.pipe(entry);
        s3Stream.on("end", () => {
            pack.finalize();
        });
        s3Stream.on("error", (err) => {
            pack.destroy(err);
        });

        await container.putArchive(pack as unknown as NodeJS.ReadableStream, {
            path: targetDir,
        });

    } catch (error) {
        throw new Error(error);
    }
}

export const uploadToS3 = async (pathOfFile: string, bucket_name: string, key: string) => {
    const cleanKey = key.replace(/^\/+/, "");
    const fileStream = fs.createReadStream(pathOfFile);
    const command = new PutObjectCommand({
        Bucket: bucket_name,
        Key: cleanKey,
        Body: fileStream,
        ContentType : "application/zip"
    })
    try {
        const response = await s3client.send(command);
        console.log("Upload successful:", response);
        return response;
    } catch (error) {
        console.error("Error uploading to S3:", error);
        throw error;
    }
}


const copyS3Folder = async (base_folder: string) => {
  const list_contents = new ListObjectsV2Command({
    'Bucket': "dev-forces",
    "Prefix": base_folder,
  })
  const lists: any = await s3client.send(list_contents);
  console.log(lists.Contents);
  return lists.Contents;
}


const SaveS3File = async (s3key: string) => {
  try {
    const command = new GetObjectCommand({
      Bucket: "dev-forces",
      Key: s3key

    })
    const response = await s3client.send(command)
    const writeStream = fs.createWriteStream(`${process.cwd()}/${s3key}`)
    // @ts-ignore
    response.Body.pipe(writeStream)
    return new Promise((resolve, reject) => {
      writeStream.on("finish", () => {
        console.log("Successfully written")
        resolve("/uploads")
      })
      writeStream.on("error", (error: any) => {
        console.log("Error while writing the stream : ", error)
        reject()
      })
    })
  } catch (error) {
    return error
  }
}



export default s3client;


