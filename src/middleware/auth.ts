import type { Request,Response,NextFunction } from "express"


declare global {
    namespace Express {
        interface Request {
            user : JwtPayload
        }
    }
}
import Jwt, { type JwtPayload } from "jsonwebtoken";
export const userAuth = (req:Request,res:Response,next:NextFunction) => {
    const authorizationHeader = req.headers.authorization;
    const token = authorizationHeader?.split(" ")[1];
    if(!token){
        return res.status(404).json({
            "message" : "Unauthorized"
        })
    }
    const decode  = Jwt.verify(token,process.env.JWT_SECRET!) as JwtPayload
    
    req.user = decode;
    next()

}

export const isAdmin = (user : JwtPayload) => {
    const role = user.role;
    
    if(role == "admin"){
        return true
    }
    return false;
}

