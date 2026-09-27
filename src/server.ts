import { prisma } from "../prisma/lib/prisma";
import app from "./index";
import express from "express"

import dotenv from "dotenv"
import multer from "multer"
import submissionRouter from "./submission/submission";
import challengeRouter from "./challenge/challenge";
import cors from "cors";


// Single file upload endpoint
// 'avatar' must match the key/name attribute of your form input


// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


dotenv.config({
    path : '.env'
})


app.use(express.json());

app.use(cors());

app.use("/admin",submissionRouter)
app.use("/",challengeRouter);


app.post("/signup",async (req,res)=>{
    const {email , password } = req.body;

    try {
        if(!email || !password){
            return res.status(422).json({
                "message" : "unprocessable entity"
            })
        }
        const user = await prisma.user.findUnique({
            where : {
                email
            }
        })
        if(user){
            return res.status(409).json({
                "message" : "user already exists"
            })
        }
        const response = await prisma.user.create({
            data : {
                email : email,
                password : password
            }
        })
        return res.status(201).json({
            "message" : "user created successfully",
            "data" : response
        })
    } catch (error) {
        console.log(error)
    }
 })


app.get("/",(req,res) => {
    res.send("Server is running fine ")
})
async function start(){
    const connection = await connectToRedis();
}
app.listen(3000,() => {
    console.log("server is listening to port 3000")
})