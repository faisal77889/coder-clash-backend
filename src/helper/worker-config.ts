import {Redis} from "ioredis"
import { Queue } from "bullmq"

export const redisConnection = new Redis(process.env.REDIS_URL as string,{
    maxRetriesPerRequest : null  
})




export const myQueue = new Queue("evaluator",{
    connection : redisConnection,
})

