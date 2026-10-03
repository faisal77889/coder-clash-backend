import { WebSocket, WebSocketServer } from 'ws';
import Dockerode, { Image } from 'dockerode';
import http from "node:http"
import tar from "tar-stream"
import url from 'node:url';
import Jwt, { type JwtPayload } from "jsonwebtoken";
import { ECRClient, GetAuthorizationTokenCommand } from "@aws-sdk/client-ecr";
import { prisma } from '../prisma/lib/prisma';
import s3client, { saveS3FileToDocker } from '../src/helper/s3';
import { PassThrough } from 'node:stream';
const docker = new Dockerode();
const TAG = "node-22-alpine";
const IMAGE_URI = `${process.env.REGISTRY_URL}:${TAG}`;

const pullingImages = new Map<string, Promise<void>>();

interface docker_set {
  user_id: number,
  challenge_id: number,
  ws: WebSocket,
  docker_id: string
}

const user_challenge_set = new Set<docker_set>();


async function pathExists(container: any, targetPath: string) {
  try {
    const exec = await container.exec({
      Cmd: ["sh", "-c", `test -e "${targetPath}"`],
    });
    const stream = await exec.start({});
    await new Promise((resolve) => stream.on("end", resolve));
    const inspection = await exec.inspect();
    return inspection.ExitCode === 0;
  } catch (error) {
    console.error("Error checking path:", error);
    return false;
  }
}

async function createFolder(container: any, baseFolder: string, newFolder: string) {
  try {
    const fullPath = baseFolder + "/" + newFolder;
    const makeFolder = await container.exec({
      Cmd: ["mkdir", "-p", fullPath]
    })
    const stream = await makeFolder.start({});
    await new Promise((resolve) => stream.on("end", resolve));

  } catch (error) {
    console.log("Some error occured while creating the folder", error);
  }
}


async function createFile(container: any, baseFolder: string, newFile: string) {
  try {
    const fullFilePath = baseFolder.endsWith("/") ? baseFolder + newFile : baseFolder + "/" + newFile;
    const makeFile = await container.exec({
      Cmd: ["touch", fullFilePath]
    });
    const stream = await makeFile.start({});
    await new Promise((resolve) => stream.on("end", resolve));
  } catch (error) {
    console.log("Some error while creating the file", error);
  }
}

async function listDirectory(container: any, folderPath: string) {

  const exec = await container.exec({
    Cmd: ["ls", "-1", "-p", folderPath],
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start({ hijack: true, stdin: false });
  let rawOutput = "";
  let errorOutput = "";
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  stdout.on("data", (chunk) => (rawOutput += chunk.toString("utf-8")));
  stderr.on("data", (chunk) => (errorOutput += chunk.toString("utf-8")));
  container.modem.demuxStream(stream, stdout, stderr);
  await new Promise((resolve) => stream.on("end", resolve));
  const inspection = await exec.inspect();
  if (inspection.ExitCode !== 0) {
    throw new Error(`Failed to list directory: ${errorOutput.trim()}`);
  }

  const items = rawOutput
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((item) => {
      const isFolder = item.endsWith("/");
      return {
        name: isFolder ? item.slice(0, -1) : item,
        type: isFolder ? "folder" : "file",
      };
    });
  return items;
}

async function getContentsOfFile(container: any, filePath: string) {
  const exec = await container.exec({
    Cmd: ["cat", filePath],
    AttachStdout: true,
    AttachStderr: true
  });

  const stream = await exec.start({
    hijack: true,
    stdin: false
  })

  let fileContent = ""
  let errorOutput = ""

  const stdout = new PassThrough()
  const stderr = new PassThrough()

  stdout.on("data", (chunk) => (fileContent += chunk.toString("utf-8")));
  stderr.on("data", (chunk) => (errorOutput += chunk.toString("utf-8")));

  container.modem.demuxStream(stream, stdout, stderr);

  await new Promise((resolve) => stream.on("end", resolve));
  const inspection = await exec.inspect();
  if (inspection.ExitCode !== 0) {
    throw new Error(`Cannot read file "${filePath}": ${errorOutput.trim()}`);
  }
  return fileContent;
}


async function overwriteFile(container: any, filePath: string, newCode: string) {
  const buffer = Buffer.from(newCode, "utf-8");

  const pack = tar.pack();

  const normalized = filePath.startsWith("/") ? filePath : `/app/${filePath}`;
  const parts = normalized.split("/").filter(Boolean);
  const fileName = parts.pop() || "file";
  const folderPath = "/" + parts.join("/");

  const entry = pack.entry(
    {
      name: fileName,
      size: buffer.length,
      mode: 0o644,
    },
    buffer
  );
  pack.finalize();

  await container.putArchive(pack, {
    path: folderPath,
  });
  console.log(` Overwrote ${folderPath}/${fileName} with new code!`);
}


async function pullImageFromECR(IMAGE_URI: string) {
  try {
    console.log("1. Authenticating with AWS ECR...");
    const ecrClient = new ECRClient({
      region: process.env.AWS_REGION as string,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_id as string,
      }
    });
    const authResponse = await ecrClient.send(new GetAuthorizationTokenCommand({}));

    // @ts-ignore
    const authData = authResponse.authorizationData[0];
    // @ts-ignore
    const decodedToken = Buffer.from(authData.authorizationToken, "base64").toString("utf-8");
    const [username, password] = decodedToken.split(":");

    console.log(`2. Pulling image: ${IMAGE_URI}...`);

    const authConfig = {
      username: username,
      password: password,
      serveraddress: process.env.REGISTRY_URL as string,
    };


    const stream = await docker.pull(IMAGE_URI, { authconfig: authConfig });

    await new Promise((resolve, reject) => {
      docker.modem.followProgress(
        stream,
        (err, res) => (err ? reject(err) : resolve(res)),
        (event) => {
          if (event.progress) {
            process.stdout.write(`\r${event.status}: ${event.progress}`);
          } else if (event.status) {
            console.log(event.status);
          }
        }
      );
    });

    console.log("\nImage pulled successfully!");
  } catch (error) {
    console.error("Failed to pull image:", error);
    throw error;
  }
}




const wss = new WebSocketServer({ noServer: true });


const server = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("Http server is started before websocket conversion")
})


const authenticateUser = (req: http.IncomingMessage, callback: any) => {
  const parsedUrl = url.parse(req.url || '', true);
  const token = parsedUrl.query.token;
  // validate token 
  const secret = process.env.JWT_SECRET;

  if (!token || typeof token !== 'string' || !secret) {
    return callback(new Error('Unauthorized'))
  }

  try {
    const decoded = Jwt.verify(token, secret) as JwtPayload;
    return callback(null, decoded)
  } catch (error) {
    return callback(new Error('Unauthorized'));
  }
}


const validChallenge = async (req: http.IncomingMessage, callback: any) => {
  const parsedUrl = url.parse(req.url || "", true);
  const challengeId = parsedUrl.query.challengeId;
  const id = typeof challengeId === 'string' ? parseInt(challengeId, 10) : NaN;

  if (isNaN(id)) {
    return callback(new Error("Invalid or missing challenge id"));
  }

  try {
    const challengeExist = await prisma.challenges.findFirst({
      where: {
        id
      }
    });
    if (!challengeExist) {
      return callback(new Error("No challenge exists with given challenge id"));
    }
    return callback(null, challengeExist);
  } catch (error) {
    return callback(new Error("Error finding challenge"));
  }
};

async function checkImagePresent(imageName: string) {
  try {
    const image = docker.getImage(imageName);
    await image.inspect();
    return true;
  } catch (error: any) {
    if (error?.statusCode === 404) {
      return false;
    }
    throw error;
  }
}


async function getSubmission(challengeId: number, userId: number, callback: any) {
  try {
    let submission = await prisma.submissions.findFirst({
      where: {
        challenge_id: challengeId,
        user_id: userId
      }
    });
    if (!submission) {
      submission = await prisma.submissions.create({
        data: {
          challenge_id: challengeId,
          user_id: userId
        }
      });
    }
    return callback(null, submission);
  } catch (error) {
    return callback(error);
  }
}


server.on('upgrade', (request: http.IncomingMessage, socket, head) => {
  authenticateUser(request, (err: any, user: any) => {
    if (err || !user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    validChallenge(request, (err: any, challenge: any) => {
      if (err || !challenge) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      const parsedUrl = url.parse(request.url || '', true);
      const userId = Number(user.id || user.userId || parsedUrl.query.userId);

      if (isNaN(userId)) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      getSubmission(challenge.id, userId, (err: any, submission: any) => {
        if (err || !submission) {
          socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          // Pass the authenticated user, challenge, and submission to the connection event
          wss.emit('connection', ws, request, user, challenge, submission);
        });
      });
    });
  });
});


wss.on('connection', async function connection(ws: any, request: any, user: any, challenge: any, submission?: any) {
  console.log('New WebSocket connection');

  try {
    const targetImage = process.env.IMAGE_BASE_URL as string;
    const imageExist = await checkImagePresent(targetImage);
    if (!imageExist) {
      if (pullingImages.has(targetImage)) {
        await pullingImages.get(targetImage);
      } else {
        const pullPromise = pullImageFromECR(targetImage).finally(() => {
          pullingImages.delete(targetImage);
        });
        pullingImages.set(targetImage, pullPromise);
        await pullPromise;
      }
    }

    const container = await docker.createContainer({
      Image: process.env.IMAGE_BASE_URL as string,
      Tty: true,
      Cmd: ['/bin/sh'],
      OpenStdin: true,
      StdinOnce: false,
      AttachStdout: true,
      AttachStderr: true
    });

    await container.start();
    console.log("container started with container id ", container.id);
    // now write the logic of fetching the code from the user s3

    user_challenge_set.add({
      user_id: user.id,
      challenge_id: challenge.id,
      docker_id: container.id,
      ws: ws
    })

    // fetch the test and the dependencies


    const makeBaseAppExec = await container.exec({
      Cmd: ["mkdir", "-p", "/app"],
    })
    const streamBase = await makeBaseAppExec.start({});
    await new Promise((resolve) => streamBase.on("end", resolve));

    if ((submission.bucket_name) && (submission.Key)) {
      try {

        await saveS3FileToDocker(s3client, submission.bucket_name, submission.Key, container.id, "/app");
        const exec = await container.exec({
          Cmd: ["unzip", "-o", "/app/" + submission.Key, "-d", "/app"],
          AttachStdout: true,
          AttachStderr: true,
        });

        const stream = await exec.start({ hijack: true, stdin: false });

        await new Promise((resolve, reject) => {
          container.modem.demuxStream(stream, process.stdout, process.stderr);
          stream.on("end", resolve);
          stream.on("error", reject);
        });

        const inspection = await exec.inspect();
        if (inspection.ExitCode !== 0) {
          throw new Error(`Unzip command failed with exit code ${inspection.ExitCode}`);
        }
        console.log(" Files unzipped successfully!");
        const rmExec = await container.exec({
          Cmd: ["rm", "-f", "/app/" + submission.Key],
        });

        await rmExec.start({});

      } catch (error) {
        console.log("some error occured", error);
      }

    } else {
      // copy package.json from the challenge packages into the app 
      const package_json = challenge.packages;
      if (!package_json) {
        ws.send(JSON.stringify({ type: "error", message: "Please install vitest and supertest" }));
      } else {
        await overwriteFile(container, "/app/package.json", package_json);
      }
    }

    const exec = await container.exec({
      Cmd: ['/bin/sh'],
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: true,
      Tty: true,
      WorkingDir: "/app"
    });

    const stream = await exec.start({
      hijack: true,
      stdin: true
    });

    stream.on("data", (chunk) => {
      console.log(chunk.toString())
      ws.send(chunk)
    })

    stream.on('end', () => {
      console.log('Shell session ended');
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      ws.send("hello");
    });


    ws.on('message', async (data: any) => {
      let parsed: any;
      try {
        parsed = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString());
      } catch {
        parsed = { type: 'terminal_command', message: typeof data === 'string' ? data : data.toString() };
      }

      const { type, message } = parsed || {};

      switch (type) {
        case "terminal_command":
          if (message) {
            let cmd = typeof message === 'string' ? message : message.toString();
            if (!cmd.endsWith('\n')) {
              cmd += '\n';
            }
            console.log(cmd);
            stream.write(cmd);
          }
          break;

        case "code_write":
          // [{filePath : "App.tsx", code : "full code"}]
          if (!Array.isArray(message)) {
            ws.send(JSON.stringify({ type: "error", message: "the message must be an array of file and code" }));
            break;
          }
          for (const obj of message) {
            try {
              const fileExist = await pathExists(container, obj.filePath);
              if (!fileExist) {
                ws.send(JSON.stringify({ type: "error", message: `Create the folder and file first for ${obj.filePath}` }));
                continue;
              }
              await overwriteFile(container, obj.filePath, obj.code);
            } catch (error) {
              console.error("Some error occurred while overwriting the code", error);
            }
          }
          break;

        case "file_code":
          // {filePath : "/abc/filePath.tsx"}
          if (!message || !message.filePath) {
            ws.send(JSON.stringify({ type: "error", message: "No file path is provided" }));
            break;
          }

          // check if file exists in docker 
          try {
            const fileExist = await pathExists(container, message.filePath);
            if (!fileExist) {
              ws.send(JSON.stringify({ type: "error", message: "No file exists" }));
              break;
            }
            const fileContent = await getContentsOfFile(container, message.filePath);
            ws.send(JSON.stringify({ type: "file_code", filePath: message.filePath, content: fileContent }));
          } catch (error) {
            console.log("some error while fetching the file", error);
          }
          break;

        case "create_folder":
          // {path : "folder", name : "abc"}
          if (!message || !message.path || !message.name) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid parameters for create_folder" }));
            break;
          }
          // check base folder path 
          if (!(await pathExists(container, message.path))) {
            ws.send(JSON.stringify({ type: "error", message: "Base folder is not there, first create base folder" }));
            break;
          }

          try {
            await createFolder(container, message.path, message.name);
            ws.send(JSON.stringify({ type: "folder_created", path: message.path, name: message.name }));
          } catch (error) {
            console.log("Some error while creating the folder", error);
          }
          break;

        case "create_file":
          if (!message || !message.path || !message.name) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid parameters for create_file" }));
            break;
          }
          // check base folder path 
          if (!(await pathExists(container, message.path))) {
            ws.send(JSON.stringify({ type: "error", message: "Base folder is not there, first create base folder" }));
            break;
          }

          try {
            await createFile(container, message.path, message.name);
            ws.send(JSON.stringify({ type: "file_created", path: message.path, name: message.name }));
          } catch (error) {
            console.log("some error while creating the file", error);
          }
          break;

        case "get_nested_folder":
          // {folderName : abc}
          if (!message || !message.folderName) {
            ws.send(JSON.stringify({ type: "error", message: "Folder name is required" }));
            break;
          }
          if (!(await pathExists(container, message.folderName))) {
            ws.send(JSON.stringify({ type: "error", message: "Base folder is not there" }));
            break;
          }
          try {
            const items = await listDirectory(container, message.folderName);
            ws.send(JSON.stringify({ type: "nested_folder", folderName: message.folderName, items }));
          } catch (error) {
            console.log("some error in fetching", error);
          }
          break;

        case "submit_problem":
          try {

            await saveS3FileToDocker(s3client, challenge.test_bucket_name, challenge.test_bucket_key, container.id, "/app");
            const exec = await container.exec({
              Cmd: ["unzip", "-o", "/app/" + challenge.test_bucket_key, "-d", "/app"],
              AttachStdout: true,
              AttachStderr: true,
            });

            const stream = await exec.start({ hijack: true, stdin: false });

            await new Promise((resolve, reject) => {
              container.modem.demuxStream(stream, process.stdout, process.stderr);
              stream.on("end", resolve);
              stream.on("error", reject);
            });

            const inspection = await exec.inspect();
            if (inspection.ExitCode !== 0) {
              throw new Error(`Unzip command failed with exit code ${inspection.ExitCode}`);
            }
            console.log(" Files unzipped successfully!");
            const rmExec = await container.exec({
              Cmd: ["rm", "-f", "/app/" + challenge.test_bucket_key],
            });

            await rmExec.start({});

            const viteExec = await container.exec({
              Cmd: ["npx", "vitest", "run", "--reporter=json", "--outputFile=/app/test_result.json"],
              WorkingDir: "/app",
              AttachStdout: true,
              AttachStderr: true,
            });

            const viteStream = await viteExec.start({ hijack: true, stdin: false });

            await new Promise((resolve, reject) => {
              container.modem.demuxStream(viteStream, process.stdout, process.stderr);
              viteStream.on("end", resolve);
              viteStream.on("error", reject);
            });

            const resultsRaw = await getContentsOfFile(container, "/app/test_result.json");
            const testResult = JSON.parse(resultsRaw);
            console.log("Test results parsed successfully:", testResult);
            ws.send(JSON.stringify({ type: "test_result", data: testResult }));

            // save it to the db

          } catch (error) {
            console.log("some error", error);
            ws.send(JSON.stringify({ type: "error", message: "Failed to run submission tests" }));
          }
          break;
      }
    });

    ws.on('error', console.error);
    stream.on('error', console.error);

    ws.on('close', async () => {
      try {
        stream.end();
      } catch { }

      try {
        const info = await container.inspect();
        if (info.State.Running) {
          await container.kill();
          console.log("Container with container id : " + container.id + " killed");
        } else {
          console.log("Container with container id : " + container.id + " already killed");
        }
        await container.remove({ force: true }).catch(() => { });
      } catch (err) {
        console.error("Error cleaning up container:", err);
      }

      for (const item of user_challenge_set) {
        if (item.ws === ws) {
          user_challenge_set.delete(item);
        }
      }
    });

  } catch (error: any) {
    console.error(error);
    ws.send('Error: ' + error.message);
    ws.close();
  }
});


server.listen(8080, () => {
  console.log('Server is listening on http://localhost:8080');
});
