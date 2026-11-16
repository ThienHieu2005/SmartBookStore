const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')

test('book write handlers preserve HTTP contracts for success, validation, conflicts, and missing records', async () => {
    const controllerPath = require.resolve('./books.controller')
    const originalLoad = Module._load
    const service = {
        create: async () => ({ _id: 'created' }),
        getById: async () => ({ _id: 'existing' }),
        updateById: async () => ({ _id: 'updated' }),
        checkIsOrdered: async () => [],
        deleteById: async () => ({ _id: 'deleted' })
    }
    Module._load = function (request, parent, isMain) {
        if (parent?.filename === controllerPath) {
            if (request === '../services/books.service') return service
            if (request === '../config/redis') return null
            if (request === '../config/cloudinary') return { cloudinary: { uploader: { destroy: async () => {} } } }
            if (request === '../utils/bookCache') return { invalidateBookCache: async () => true }
            if (request === '../utils/bookPagination') return {
                parseBookPagination: () => ({ page: 1, limit: 10 }), getTotalPage: () => 1
            }
        }
        return originalLoad.call(this, request, parent, isMain)
    }
    delete require.cache[controllerPath]
    let controller
    try { controller = require(controllerPath) } finally { Module._load = originalLoad }
    const invoke = async (handler, req = {}) => {
        const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
        await handler(req, res)
        return res
    }
    try {
        const created = await invoke(controller.create, { body: {} })
        assert.equal(created.statusCode, 201)
        assert.deepEqual(created.body, { message: 'success', error: 0, data: { _id: 'created' } })

        service.create = async () => { throw Object.assign(new Error('required'), { status: 400 }) }
        const invalid = await invoke(controller.create, { body: {} })
        assert.equal(invalid.statusCode, 400)
        assert.deepEqual(invalid.body, { message: 'required', error: 1 })
        service.create = async () => { throw Object.assign(new Error('duplicate'), { status: 409 }) }
        assert.equal((await invoke(controller.create, { body: {} })).statusCode, 409)

        service.updateById = async () => { throw Object.assign(new Error('immutable'), { status: 400 }) }
        const immutable = await invoke(controller.updateById, { params: { id: 'valid-id' }, body: { bookId: 'new-id' } })
        assert.equal(immutable.statusCode, 400)
        service.getById = async () => null
        assert.equal((await invoke(controller.updateById, { params: { id: 'missing' }, body: {} })).statusCode, 404)

        service.checkIsOrdered = async () => [{ _id: 'ordered-book' }]
        assert.equal((await invoke(controller.deleteById, { params: { id: 'ordered-book' } })).statusCode, 400)
        service.checkIsOrdered = async () => []
        service.deleteById = async () => null
        assert.equal((await invoke(controller.deleteById, { params: { id: 'missing' } })).statusCode, 404)
        service.deleteById = async () => ({ _id: 'deleted' })
        assert.equal((await invoke(controller.deleteById, { params: { id: 'valid' } })).statusCode, 200)
    } finally {
        delete require.cache[controllerPath]
    }
})
