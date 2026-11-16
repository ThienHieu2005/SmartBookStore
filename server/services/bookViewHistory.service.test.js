const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const Book = require('../models/books.model')
const History = require('../models/bookViewHistory.model')
const service = require('./bookViewHistory.service')

test('records authenticated views from the server identity and upserts one row per book', async () => {
    const originalExists = Book.exists
    const originalUpsert = History.findOneAndUpdate
    const bookId = new mongoose.Types.ObjectId()
    const userId = new mongoose.Types.ObjectId()
    const calls = []
    Book.exists = async () => true
    History.findOneAndUpdate = async (...args) => { calls.push(args); return { _id: 'history' } }
    try {
        await service.recordView({ bookId: String(bookId), userId: String(userId), anonymousId: 'ignored', consent: false })
        await service.recordView({ bookId: String(bookId), userId: String(userId) })
        assert.equal(calls.length, 2)
        assert.equal(String(calls[0][0].user), String(userId))
        assert.equal(calls[0][0].anonymousId, undefined)
        assert.equal(calls[0][1].$setOnInsert.book.toString(), bookId.toString())
        assert.deepEqual(calls[0][2], { new: true, upsert: true, setDefaultsOnInsert: true })
    } finally {
        Book.exists = originalExists
        History.findOneAndUpdate = originalUpsert
    }
})

test('anonymous writes require explicit consent and a valid session UUID', async () => {
    const originalExists = Book.exists
    const originalUpsert = History.findOneAndUpdate
    const bookId = new mongoose.Types.ObjectId()
    Book.exists = async () => true
    let capturedFilter
    History.findOneAndUpdate = async (filter) => { capturedFilter = filter; return {} }
    try {
        await assert.rejects(service.recordView({ bookId: String(bookId), anonymousId: 'not-a-uuid', consent: true }), { status: 400 })
        await assert.rejects(service.recordView({ bookId: String(bookId), anonymousId: '9f5c2c04-23aa-4b3f-961c-4afac90f1742' }), { status: 400 })
        const anonymousId = '9f5c2c04-23aa-4b3f-961c-4afac90f1742'
        await service.recordView({ bookId: String(bookId), anonymousId, consent: true })
        assert.equal(capturedFilter.anonymousId, anonymousId)
        assert.equal(capturedFilter.user, undefined)
    } finally {
        Book.exists = originalExists
        History.findOneAndUpdate = originalUpsert
    }
})

test('rejects malformed or missing books without writing history', async () => {
    const originalExists = Book.exists
    const originalUpsert = History.findOneAndUpdate
    Book.exists = async () => false
    History.findOneAndUpdate = async () => assert.fail('Must not write')
    try {
        await assert.rejects(service.recordView({ bookId: 'bad', userId: new mongoose.Types.ObjectId() }), { status: 400 })
        await assert.rejects(service.recordView({ bookId: new mongoose.Types.ObjectId().toString(), userId: new mongoose.Types.ObjectId() }), { status: 404 })
    } finally {
        Book.exists = originalExists
        History.findOneAndUpdate = originalUpsert
    }
})

test('retention and identity indexes are configured in the schema', () => {
    const indexes = History.schema.indexes()
    assert.ok(indexes.some(([fields, options]) => fields.viewedAt === 1 && options.expireAfterSeconds === 60 * 60 * 24 * 180))
    assert.ok(indexes.some(([fields, options]) => fields.user === 1 && fields.book === 1 && options.unique))
    assert.ok(indexes.some(([fields, options]) => fields.anonymousId === 1 && fields.book === 1 && options.unique))
})

test('history queries are scoped to user, sorted newest-first, and limited', async () => {
    const originalFind = History.find
    const observed = {}
    const query = {
        select(fields) { observed.select = fields; return this },
        sort(fields) { observed.sort = fields; return this },
        limit(value) { observed.limit = value; return this },
        populate(path, fields) { observed.populate = [path, fields]; return this },
        lean() { return Promise.resolve([]) }
    }
    History.find = (filter) => { observed.filter = filter; return query }
    try {
        await service.getForUser('verified-user', 12)
        assert.deepEqual(observed.filter, { user: 'verified-user' })
        assert.deepEqual(observed.sort, { viewedAt: -1 })
        assert.equal(observed.limit, 12)
        assert.equal(observed.select, 'book viewedAt')
    } finally {
        History.find = originalFind
    }
})

test('anonymous deletion is scoped to a valid session UUID and cannot read that session history', async () => {
    const originalDelete = History.deleteMany
    let filter
    History.deleteMany = async (query) => { filter = query; return { deletedCount: 1 } }
    try {
        await assert.rejects(service.deleteForAnonymous('not-a-uuid'), { status: 400 })
        await service.deleteForAnonymous('9f5c2c04-23aa-4b3f-961c-4afac90f1742')
        assert.deepEqual(filter, {
            anonymousId: '9f5c2c04-23aa-4b3f-961c-4afac90f1742',
            user: { $exists: false }
        })
    } finally {
        History.deleteMany = originalDelete
    }
})
