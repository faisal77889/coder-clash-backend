import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3"
import Dockerode from "dockerode"
import { Readable } from "node:stream";
import tar from "tar-stream"
const docker = new Dockerode();
import path from "node:path";

const s3client = new S3Client({
    region: process.env.AWS_REGION! || "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
})


export const saveS3FileToDocker = async (client: S3Client, bucketName: string, Key: string, containerId: string,targetDir : string) => {
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
        throw new Error("Some error while fetching the code from s3");
    }
}

export default s3client;


