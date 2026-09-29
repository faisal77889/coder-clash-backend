import { Router } from "express";
import { prisma } from "../../prisma/lib/prisma";
import { userAuth } from "../middleware/auth";


const challengeRouter = Router()


challengeRouter.get("/challenge",userAuth, async (req, res) => {
    const challengeId = req.query.challengeId as string;
    let response = null;
    try {
        if (challengeId) {
            response = await prisma.challenges.findFirst({
                where: {
                    id: parseInt(challengeId)
                }
            })
        }else{

            response = await prisma.challenges.findMany()
        }
        return res.status(200).send(response)
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            "message": "Internal Server Error"
        })
    }
})


challengeRouter.post("/challenge",userAuth, async (req, res) => {
    const { title, description, packages, difficulty } = req.body;
    if (!title || !description || !packages || !difficulty) {
        return res.status(400).json({
            "message": "Title , Description , Packages or difficulty is missing"
        })
    }
    try {
        const response = await prisma.challenges.create({
            data: {
                title,
                description,
                packages: packages,
                difficulty_level: difficulty
            }
        })
        return res.status(200).json({
            "message": "Challenge Created Successfully",
            "data": response
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            "message": "Internal Server Error"
        })
    }

})


export default challengeRouter;