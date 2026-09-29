import { createClient } from 'redis';


export function getRedisClient() {

    const redisClient = createClient({
        url : process.env.REDIS_URL as string
    }
    );

    redisClient.on('error', (err) => console.error('Redis Client Error', err));


    return redisClient;

}


