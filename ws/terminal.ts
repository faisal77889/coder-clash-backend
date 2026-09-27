import { WebSocketServer } from 'ws';
import Dockerode from 'dockerode';

const docker = new Dockerode();
const wss = new WebSocketServer({ port: 8080 });


// authentication karnin

// why client are needed ?

// for one challenge , there should be a userId , challengeId , may be submissionId 


// user app par aaya , problem khola , to challengeId create kar do with status not_submitted and store it in the db
// upar ek submission ka button dikhao aur agar user ne us par submit kiya to us sumbission ko wo open kar sakta hai 
// for ex - agar user aaya aur usne kuch code likh rakha tha pehle se aur submit nahi kiya tha to bhi uski ek submission id ban jayegi
// aur agar code submit nahi hua hai to user ko hamesha wohi dikhni chahiye , to iske liye hume loop karna padega submission pe and then status se nikal sakte hai 
// submission wale button me only there will be completed submission

const Idcontainers = [];

wss.on('connection', async function connection(ws) {
  console.log('New WebSocket connection');

  try {
    const container = await docker.createContainer({
      Image: 'node:22-alpine',
      Tty: true,
      Cmd: ['/bin/sh'],
      OpenStdin: true,
      StdinOnce: false,
      AttachStdout: true,
      AttachStderr: true
    });

    await container.start();
    console.log("container started with container id ", container.id);
    Idcontainers.push(container.id)
    const exec = await container.exec({
      Cmd: ['/bin/sh'],
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: true,
      Tty: true
    });



    const stream = await exec.start({
      hijack: true,
      stdin: true
    });


    stream.on("data", (chunk) => {
      console.log(chunk.toString())
      ws.send(chunk)
    })



    // 7. Handle cleanup on exit
    stream.on('end', () => {
      console.log('Shell session ended');
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      ws.send("hello");
    });


    ws.on('message', (data) => {
      let command = typeof data === 'string' ? data : data.toString();
      if (!command.endsWith('\n')) {
        command += '\n';
      }
      console.log(command)
      stream.write(command);
    });

    ws.on('error', console.error);
    stream.on('error', console.error);

    ws.on('close', () => {
      stream.end();
      container.stop().catch(() => { });
      // @ts-ignore
      Idcontainers.map(async (id) =>{
        const state = await docker.getContainer(id);
        const info = await state.inspect();
        if(info.State.Running){

          await docker.getContainer(id).kill();
          console.log("Container with container id : " + id + " killed");
        }else {

          console.log("Container with container id : " + id + " already killed")
        }
      })
    });

  } catch (error) {
    console.error(error);
    ws.send('Error: ' + error.message);
    ws.close();
  }
});

console.log('WebSocket server running on port 8080');