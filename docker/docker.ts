import Docker from "dockerode";
import {ECRClient,GetAuthorizationTokenCommand} from "@aws-sdk/client-ecr"

const docker = new Docker();

const portBindings = {
    "3000/tcp": [{ HostPort: '3000' }]
};



// const createAndStartContainer = async () => {
//     try {
//         // First check if container already exists and remove it
//         const existingContainer = docker.getContainer("wordpress-site");
//         try {
//             await existingContainer.inspect();
//             // Container exists, remove it
//             console.log('Removing existing container...');
//             await existingContainer.remove({ force: true });
//         } catch (err) {
//             // Container doesn't exist, that's fine
//         }

//         // Create the container
//         const container = await docker.createContainer({
//             Image: "wordpress",
//             AttachStdin: false,
//             AttachStdout: true,
//             AttachStderr: true,
//             Tty: true,
//             ExposedPorts: { '80/tcp': {} },
//             HostConfig: {
//                 PortBindings: {
//                     '80/tcp': [{ HostPort: '3001' }] // Map container port 80 to host port 3000
//                 }
//             },
//             name: "wordpress-site"
//         });

//         console.log('Container created successfully!');

//         // Start the container
//         await container.start();
//         console.log('Container started successfully!');
//         console.log('WordPress is now running at: http://localhost:3000');

//         // Optional: Wait a few seconds and show container info
//         setTimeout(async () => {
//             const inspectData = await container.inspect();
//             console.log(`Container Status: ${inspectData.State.Status}`);
//             console.log(`Container ID: ${inspectData.Id.substring(0, 12)}`);
//         }, 2000);

//     } catch (error) {
//         console.error('Error creating/starting container:', error);
//     }
// }

// pullContainer();


// const containers = await docker.listContainers()
// console.log(containers.length)

const buildImage = async () => {
    console.log(`${process.cwd()}/Dockerfile`)
    try {
        const stream = await docker.buildImage(
            {
                context: './',
                src: ['./Dockerfile']  
            },
            { t : "my-image-ecr:latest"}
        )

        await new Promise((resolve,reject) => {
            stream.on("data",(chunk) => console.log(chunk.toString()))
            stream.on("end",resolve)
            stream.on("error",reject)
        })
        console.log("Image built successfully")
    } catch (error) {
        console.log(error)
    }
}

await buildImage()



const pushImageToECR = async () => {
    const awsRegion = "ap-south-1"
    const ecrRepositoryUrl = ""
    const imageTag = "latest"

    try {
        const ecrClient = new ECRClient({region : awsRegion})
        const authCommand = new GetAuthorizationTokenCommand({})
    } catch (error) {
        
    }
}


const pullImageFromECR = async () => {
    const awsRegion = "ap-south-1"
    const ecrRepositoryUrl = ""
    const imageTag = "latest"

    try {
        const ecrClient = new ECRClient({region : awsRegion})
        const authCommand = new GetAuthorizationTokenCommand({})
    } catch (error) {
        
    }
}





