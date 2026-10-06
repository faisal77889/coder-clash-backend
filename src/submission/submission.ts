import express from "express"
import { isAdmin, userAuth } from "../middleware/auth"
import { prisma } from "../../prisma/lib/prisma";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "node:path";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3client from "../helper/s3";
// import { runSpecificTest } from "../../test/vite_program";
import { myQueue } from "../helper/worker-config";

const submissionRouter = express.Router()

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const fileId = req.params.fileId as string
        const uniqueSuffix = fileId;
        console.log(file.originalname)
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });


submissionRouter.post("/submit/:submissionId", userAuth, async (req, res) => {
    const is_admin = isAdmin(req.user);
    

    const submission_id = req.params.submissionId as string;
    const submission = await prisma.submissions.findFirst({
        where : {
            id : parseInt(submission_id)
        }
    })
 
    res.status(200).json({
        "message": "uploaded successfully"
    })





})



submissionRouter.get("/upload-url/:challengeId", async (req, res) => {
    const challengeId = req.params.challengeId as string
    const is_valid_challenge = await prisma.challenges.findFirst({
        where: {
            id: parseInt(challengeId)
        }
    })
    if (!is_valid_challenge) {
        return res.status(400).json({
            "message": "Challenge id not found"
        })
    }
    const submission = await prisma.submissions.create({
        data: {
            user_id: 1,
            challenge_id: parseInt(challengeId)

        }
    })
    const s3_key = `submissions/${submission.user_id}/${submission.challenge_id}.zip`
    const command = new PutObjectCommand({
        Bucket: 'dev-forces',
        Key: s3_key,
        ContentType: 'application/zip',
    });

    const upload_url = await getSignedUrl(s3client, command, { expiresIn: 3600, signableHeaders: new Set(['content-type']) })

    res.status(200).json({
        "message": "ok",
        "upload_url": upload_url,
        "submission_id": submission.id,
        "s3_key": s3_key
    })
})



submissionRouter.post("/complete/:submissionId",async (req,res)=>{
    const submissionId = req.params.submissionId as string;
    if(!submissionId){
        return res.status(404).json({
            "message" : "No submission found for the given submission Id"
        })
    }
    const submission = await prisma.submissions.findFirst({
        where : {
            id : parseInt(submissionId)
        }
    })
    if(!submission?.challenge_id){
        return res.status(400).json({
            "message" : "this submission has no corresponding challenge"
        })
    }
    
    if(!submission || !submission.s3_key || !submission.s3_base_url){
        return res.status(404).json({
            "message" : "No submission found for this submission id"
        })
    }
    if(submission.status == "failed" || submission.status == "passed"){
         return res.status(409).json({
            "message" : "This submission is already processed"
         })
    }
    if(submission.status == 'processing'){
        //check if present in the queue and then push
        const isPresent = await myQueue.getJob(submissionId)
        if(isPresent){
            return res.status(400).json({
                "message" : "Submission is already in the processing state"
            }) 
        }
        await myQueue.add("evaluate",{submission : submission},{jobId : submissionId})
        return res.status(200).json({
            "message" : "Job was not in the queue but now has been added"
        })
    }
    if(submission.status == "pending_upload"){
        //check if present in the queue , if not then  push to the redis queue 
        await myQueue.add("evaluate",{"submission":submission},{jobId : (submissionId)})
        await prisma.submissions.update({
            where : {
                id : parseInt(submissionId)
            },
            data : {
                status : "processing"
            }
        })
    }
    return res.status(200).json({
        "message" : `Submission with the submission id : ${submissionId} is pushed in the queue and is in the processing state`
    })

})


submissionRouter.get("/", (req, res) => {
    return res.status(200).json({
        "message": "ok"
    })
})

export default submissionRouter