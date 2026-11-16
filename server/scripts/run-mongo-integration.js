const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { randomBytes, randomUUID } = require('node:crypto')
const dotenv = require('dotenv')
const { MongoClient } = require('mongodb')

const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const isLoopback = (hostname) => ['localhost', '127.0.0.1', '[::1]'].includes(hostname.toLowerCase())
const closeQuietly = (client) => client?.close().catch(() => {})

async function run() {
    const sourceUri = process.env.MONGODB_CONNECT_URI
    if (!sourceUri) throw new Error('Thiếu cấu hình MongoDB local; integration test đã dừng trước khi ghi dữ liệu.')

    const sourceUrl = new URL(sourceUri)
    if (sourceUrl.protocol !== 'mongodb:' || !isLoopback(sourceUrl.hostname)) {
        throw new Error('Chỉ cho phép integration test với MongoDB loopback local; không có thao tác ghi nào được thực hiện.')
    }

    const sourceDatabase = decodeURIComponent(sourceUrl.pathname.slice(1)) || 'test'
    const testDatabase = `bookstore_step8_test_${randomUUID().replaceAll('-', '')}`
    if (testDatabase === sourceDatabase || !/^bookstore_step8_test_[a-f\d]{32}$/.test(testDatabase)) {
        throw new Error('Không xác minh được database test tách biệt; đã dừng trước khi ghi dữ liệu.')
    }

    const testUrl = new URL(sourceUri)
    testUrl.pathname = `/${testDatabase}`
    const testUri = testUrl.href
    const sourceClient = new MongoClient(sourceUri, { serverSelectionTimeoutMS: 3000 })
    const testClient = new MongoClient(testUri, { serverSelectionTimeoutMS: 3000 })
    let verified = false
    let processId

    try {
        // Read-only checks establish the configured source and test DB are separate namespaces
        // on the same confirmed local mongod process before any index or data writes.
        await sourceClient.connect()
        const sourceHello = await sourceClient.db('admin').command({ hello: 1 })
        processId = sourceHello.topologyVersion?.processId?.toString()
        if (!processId) throw new Error('Không xác minh được định danh tiến trình MongoDB; đã dừng an toàn.')

        await testClient.connect()
        const testHello = await testClient.db('admin').command({ hello: 1 })
        const testProcessId = testHello.topologyVersion?.processId?.toString()
        const collections = await testClient.db(testDatabase).listCollections().toArray()
        if (testClient.db().databaseName !== testDatabase || testDatabase === sourceDatabase ||
            testProcessId !== processId || collections.length !== 0) {
            throw new Error('Database test không rỗng hoặc không khớp tiến trình đã xác minh; đã dừng trước khi ghi.')
        }
        verified = true
        console.log('MongoDB test target verified: local mongod, distinct empty database; source URI and credentials suppressed.')

        const childEnv = {
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            WINDIR: process.env.WINDIR,
            TEMP: process.env.TEMP,
            TMP: process.env.TMP,
            NODE_ENV: 'test',
            REDIS_HOST: '',
            MONGODB_TEST_URI: testUri,
            BOOKSTORE_TEST_DATABASE: testDatabase,
            BOOKSTORE_SOURCE_DATABASE: sourceDatabase,
            BOOKSTORE_MONGO_PROCESS_ID: processId,
            JWT_ACCESS_TOKEN_SECRET: randomBytes(32).toString('hex')
        }
        const result = spawnSync(process.execPath, ['--test', 'integration-tests/bookstore.integration.test.js'], {
            cwd: path.resolve(__dirname, '..'),
            env: childEnv,
            stdio: 'inherit',
            timeout: 120000
        })
        if (result.error) throw result.error
        if (result.status !== 0) process.exitCode = result.status || 1
    } finally {
        if (verified) {
            try {
                const finalHello = await testClient.db('admin').command({ hello: 1 })
                const finalProcessId = finalHello.topologyVersion?.processId?.toString()
                const finalName = testClient.db().databaseName
                if (finalProcessId === processId && finalName === testDatabase && finalName !== sourceDatabase &&
                    /^bookstore_step8_test_[a-f\d]{32}$/.test(finalName)) {
                    await testClient.db(finalName).dropDatabase()
                    console.log('Ephemeral test database cleaned up; configured database was not modified.')
                } else {
                    process.exitCode = 1
                    console.error('Cleanup skipped because the database identity no longer matches the test guard.')
                }
            } catch {
                process.exitCode = 1
                console.error('Test DB cleanup failed; database identity was not disclosed. Remove only the generated bookstore_step8_test_<uuid> database after verifying it.')
            }
        }
        await Promise.all([closeQuietly(sourceClient), closeQuietly(testClient)])
    }
}

run().catch(() => {
    console.error('MongoDB integration setup failed; details and credentials suppressed. No unverified database was written.')
    process.exitCode = 1
})
