const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const { BOOK_CACHE_PATTERN, invalidateBookCache } = require('./bookCache')

test('invalidates only Book namespace keys with SCAN and bounded DEL batches', async () => {
    const scanCalls = []
    const deleted = []
    const redis = {
        async scan(cursor, ...args) {
            scanCalls.push([cursor, ...args])
            return cursor === '0'
                ? ['19', ['Book::list-a', 'Other::keep']]
                : ['0', ['Book::slug-a']]
        },
        async del(...keys) { deleted.push(...keys) }
    }

    assert.equal(await invalidateBookCache(redis), true)
    assert.deepEqual(scanCalls, [
        ['0', 'MATCH', BOOK_CACHE_PATTERN, 'COUNT', 100],
        ['19', 'MATCH', BOOK_CACHE_PATTERN, 'COUNT', 100]
    ])
    assert.deepEqual(deleted, ['Book::list-a', 'Book::slug-a'])
})

test('is a no-op without Redis and degrades safely when SCAN fails', async () => {
    assert.equal(await invalidateBookCache(null), false)
    const originalWarn = console.warn
    console.warn = () => {}
    try {
        assert.equal(await invalidateBookCache({ scan: async () => { throw new Error('offline') } }), false)
    } finally {
        console.warn = originalWarn
    }
})

test('invalidates cache only after successful book writes and falls back to Mongo reads', async () => {
    const controllerPath = require.resolve('../controllers/books.controller')
    const originalLoad = Module._load
    const scanCalls = []
    let createFails = false
    let updateFails = false
    let blockDelete = false
    let deleteMissing = false
    let getFails = false
    let scanFails = false
    let getAllArgs
    const redis = {
        async get() {
            if (getFails) throw new Error('offline')
            return null
        },
        async setex() {},
        async scan(cursor, ...args) {
            scanCalls.push([cursor, ...args])
            if (scanFails) throw new Error('offline')
            return ['0', ['Book::list-cache', 'Book::detail-cache']]
        },
        async del(...keys) { assert(keys.every(key => key.startsWith('Book::'))) }
    }
    const service = {
        async getAll(args) { getAllArgs = args; return args.page > 2 ? [11, []] : [11, [{ name: 'sample' }]] },
        async search() { return [] },
        async create() { if (createFails) throw new Error('write failed'); return { _id: 'new-book' } },
        async getById() { return { _id: 'existing-book' } },
        async updateById() { if (updateFails) throw new Error('write failed'); return { _id: 'existing-book' } },
        async checkIsOrdered() { return blockDelete ? [{ _id: 'existing-book' }] : [] },
        async deleteById() { return deleteMissing ? null : { _id: 'existing-book' } }
    }
    const cloudinary = { uploader: { async destroy() {} } }

    Module._load = function (request, parent, isMain) {
        if (parent?.filename === controllerPath) {
            if (request === '../services/books.service') return service
            if (request === '../config/redis') return redis
            if (request === '../config/cloudinary') return { cloudinary }
        }
        return originalLoad.call(this, request, parent, isMain)
    }
    delete require.cache[controllerPath]
    let controller
    try {
        controller = require(controllerPath)
    } finally {
        Module._load = originalLoad
    }

    const invoke = async (handler, req = {}) => {
        const res = {
            statusCode: 200,
            body: null,
            status(code) { this.statusCode = code; return this },
            json(body) { this.body = body; return this }
        }
        await handler(req, res)
        return res
    }

    const list = await invoke(controller.getAll, { query: { page: '1', limit: '10', sort: { price: 1 }, query: { genre: 'g1' } } })
    assert.equal(list.statusCode, 200)
    assert.deepEqual(getAllArgs, { query: { genre: 'g1' }, page: 1, limit: 10, sort: { price: 1 } })
    assert.equal(list.body.pagination.totalPage, 2)

    const beyondLastPage = await invoke(controller.getAll, { query: { page: '3', limit: '10' } })
    assert.equal(beyondLastPage.statusCode, 200)
    assert.deepEqual(beyondLastPage.body.data, [])
    assert.equal(beyondLastPage.body.pagination.totalPage, 2)

    const invalidPage = await invoke(controller.getAll, { query: { page: '1.5', limit: '10' } })
    assert.equal(invalidPage.statusCode, 400)
    const invalidLimit = await invoke(controller.getAll, { query: { page: '1', limit: '0' } })
    assert.equal(invalidLimit.statusCode, 400)

    const emptySearch = await invoke(controller.searchBook, { query: { key: 'no-match' } })
    assert.equal(emptySearch.statusCode, 200)
    assert.deepEqual(emptySearch.body.data, [])

    getFails = true
    const fallback = await invoke(controller.getAll, { query: {} })
    assert.equal(fallback.statusCode, 200)
    assert.equal(fallback.body.pagination.limit, 0)
    assert.equal(fallback.body.pagination.totalPage, 1)
    assert.equal(getAllArgs.limit, 0)
    getFails = false

    const beforeCreate = scanCalls.length
    assert.equal((await invoke(controller.create, { body: {} })).statusCode, 201)
    assert.equal(scanCalls.length, beforeCreate + 1)
    createFails = true
    const beforeFailedCreate = scanCalls.length
    assert.equal((await invoke(controller.create, { body: {} })).statusCode, 500)
    assert.equal(scanCalls.length, beforeFailedCreate)
    createFails = false

    scanFails = true
    const originalWarn = console.warn
    console.warn = () => {}
    try {
        assert.equal((await invoke(controller.create, { body: {} })).statusCode, 201)
    } finally {
        console.warn = originalWarn
        scanFails = false
    }

    const beforeUpdate = scanCalls.length
    assert.equal((await invoke(controller.updateById, { params: { id: 'book-id' }, body: {} })).statusCode, 200)
    assert.equal(scanCalls.length, beforeUpdate + 1)
    updateFails = true
    const beforeFailedUpdate = scanCalls.length
    assert.equal((await invoke(controller.updateById, { params: { id: 'book-id' }, body: {} })).statusCode, 500)
    assert.equal(scanCalls.length, beforeFailedUpdate)
    updateFails = false

    const beforeDelete = scanCalls.length
    assert.equal((await invoke(controller.deleteById, { params: { id: 'book-id' } })).statusCode, 200)
    assert.equal(scanCalls.length, beforeDelete + 1)
    blockDelete = true
    const beforeBlockedDelete = scanCalls.length
    assert.equal((await invoke(controller.deleteById, { params: { id: 'book-id' } })).statusCode, 400)
    assert.equal(scanCalls.length, beforeBlockedDelete)
    blockDelete = false
    deleteMissing = true
    const beforeMissingDelete = scanCalls.length
    assert.equal((await invoke(controller.deleteById, { params: { id: 'book-id' } })).statusCode, 404)
    assert.equal(scanCalls.length, beforeMissingDelete)
})
