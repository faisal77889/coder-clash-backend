import { WebSocketServer } from 'ws';
import Dockerode from 'dockerode';
import http from "node:http"
import url  from 'node:url';
import Jwt, { type JwtPayload } from "jsonwebtoken";

const docker = new Dockerode();
const wss = new WebSocketServer({ noServer : true });


const server = http.createServer((req,res) => {
  res.writeHead(200,{"content-type" : "text/plan"});
  res.end("Http server is started before websocket conversion")
})


const authenticateUser = (req : Request,callback : any) => {
  const parsedUrl = url.parse(req.url,true);
  const token = parsedUrl.query.token;
  // validate token 
  const secret = process.env.JWT_SECRET;
  
    if (!token) {
      return callback(new Error('Unauthorized'))
    }
  
    try {
      const decoded = Jwt.verify(token, secret) as JwtPayload;
      return callback(null,decoded)
    } catch (error) {
      return callback(new Error('Unauthorized'));
    }
}


server.on('upgrade', (request : Request, socket, head) => {
  authenticateUser(request, (err : any, user : any) => {
    if (err || !user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      // Pass the authenticated user to the connection event
      wss.emit('connection', ws, request, user);
    });
  });
});


// as sson as challenge khole user , 


// authentication karnin

// why client are needed ?

// for one challenge , there should be a userId , challengeId , may be submissionId 


// user app par aaya , problem khola , to challengeId create kar do with status not_submitted and store it in the db
// upar ek submission ka button dikhao aur agar user ne us par submit kiya to us sumbission ko wo open kar sakta hai 
// for ex - agar user aaya aur usne kuch code likh rakha tha pehle se aur submit nahi kiya tha to bhi uski ek submission id ban jayegi
// aur agar code submit nahi hua hai to user ko hamesha wohi dikhni chahiye , to iske liye hume loop karna padega submission pe and then status se nikal sakte hai 
// submission wale button me only there will be completed submission

const Idcontainers = [];

wss.on('connection', async function connection(ws,request, user) {
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
    // now write the logic of fetching the code from the user s3


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


server.listen(8080, () => {
  console.log('Server is listening on http://localhost:8080');
});
