import app from "./index";
import express from "express"
import dotenv from "dotenv"
import submissionRouter from "./submission/submission";
import challengeRouter from "./challenge/challenge";
import cors from "cors";
import authRouter from "./auth/auth";
import { getRedisClient } from "./helper/redisConnection";



dotenv.config({
    path : '.env'
})


app.use(express.json());

app.use(cors());

app.use("/auth",authRouter)
app.use("/admin",submissionRouter)
app.use("/",challengeRouter);



app.get("/",(req,res) => {
    res.send("Server is running fine ")
})


app.listen(3000,async () => {
    const redisClient = getRedisClient()
    try {
        await redisClient.connect();
        console.log("Connected with the redis server")
    } catch (error) {
        console.log("Failed to connect to redis client");
    }
    console.log("server is listening to port 3000")
})