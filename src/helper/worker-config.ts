import IORedis from "ioredis"
import { Queue } from "bullmq"

export const redisConnection = new IORedis({
    host : "localhost",
    port : 6379
})


export const myQueue = new Queue("evaluator",{
    connection : redisConnection,
})

