const Redis = require("ioredis")

const host = process.env.REDIS_HOST?.trim()
const useRedis = host || process.env.NODE_ENV === 'production'
const redisClient = useRedis
    ? new Redis({
        port: process.env.REDIS_PORT,
        host,
        username: process.env.REDIS_USER,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        commandTimeout: 2000,
        tls: true,
    })
    : null

module.exports = redisClient
