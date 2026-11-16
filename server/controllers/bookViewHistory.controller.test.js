const test = require('node:test')
const assert = require('node:assert/strict')
const service = require('../services/bookViewHistory.service')
const controller = require('./bookViewHistory.controller')

const responseRecorder = () => ({
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this }
})

test('history read and deletion always use the authenticated identity, never a supplied userId', async () => {
    const originalGet = service.getForUser
    const originalDelete = service.deleteForUser
    const ownId = 'authenticated-user-id'
    const requestedOtherId = 'some-other-user-id'
    let readArgs
    let deletedId
    service.getForUser = async (...args) => { readArgs = args; return [{ book: 'book', viewedAt: new Date() }] }
    service.deleteForUser = async (userId) => { deletedId = userId; return { deletedCount: 2 } }
    try {
        const getRes = responseRecorder()
        await controller.getMine({ user: { userId: ownId }, query: { userId: requestedOtherId, limit: '10' } }, getRes)
        assert.deepEqual(readArgs, [ownId, 10])
        assert.equal(getRes.statusCode, 200)
        assert.equal(getRes.body.data[0].user, undefined)

        const deleteRes = responseRecorder()
        await controller.deleteMine({ user: { userId: ownId }, query: { userId: requestedOtherId } }, deleteRes)
        assert.equal(deletedId, ownId)
        assert.equal(deleteRes.body.deletedCount, 2)
    } finally {
        service.getForUser = originalGet
        service.deleteForUser = originalDelete
    }
})

test('history read limit is bounded and validated', async () => {
    const res = responseRecorder()
    await controller.getMine({ user: { userId: 'user' }, query: { limit: '51' } }, res)
    assert.equal(res.statusCode, 400)
})
