import express from "express";
import { prisma } from "../../prisma/lib/prisma";
import Jwt, { type JwtPayload } from "jsonwebtoken";



const authRouter = express.Router()




authRouter.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(422).json({
                "message": "name , email and password are mandatory"
            })
        }
        const userexists = await prisma.user.findFirst({
            where: {
                email
            }
        })
        if (userexists) {
            return res.status(409).json({
                "message": "The user with this email already exists"
            })
        }
        const response = await prisma.user.create({
            data: {
                name,
                email,
                password
            }
        })
        const accessToken = Jwt.sign({id : response.id,role : response.role},process.env.JWT_SECRET!,{algorithm : "HS256"})
        return res.status(201).json({
            "message": "user created successfully",
            "access_token" : accessToken,
            "data": response
        })
    } catch (error) {
        console.log(error)
    }
})



authRouter.post("/login",async (req,res) => {
    const {email,password} = req.body;
    if(!email || !password){
        return res.status(422).json({
            "message" : "Either email or password is missing"
        })
    }
    try {
        const user = await prisma.user.findFirst({
            where : {
                email,
                password
            }
        })
        if(!user){
            return res.status(401).json({
                "message" : "Unauthorized"
            })
        }
        const access_token = Jwt.sign({"id" : user.id,role : user.role},process.env.JWT_SECRET!,{algorithm : "HS256"})
        return res.status(200).json({
            "access_token" : access_token,
            "user" : user
        })
    } catch (error) {
        console.log(error)
    }
})


export default authRouter;





