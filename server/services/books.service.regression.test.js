const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const Book = require('../models/books.model')
const Genre = require('../models/genres.model')
const Author = require('../models/authors.model')
const Publisher = require('../models/publishers.model')
const service = require('./books.service')

const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()]
const payload = () => ({
    bookId: 'TEST-STEP7', name: 'Test Book', author: [ids[0]], genre: [ids[1]], publisher: ids[2], price: 120000
})
const restoreModelMethods = (t, model, names) => {
    const originals = Object.fromEntries(names.map(name => [name, model[name]]))
    t.after(() => Object.entries(originals).forEach(([name, method]) => { model[name] = method }))
}

test('book create accepts valid new attributes and rejects required-field omissions and duplicate bookId', async (t) => {
    restoreModelMethods(t, Book, ['exists'])
    restoreModelMethods(t, Genre, ['countDocuments'])
    restoreModelMethods(t, Author, ['countDocuments'])
    restoreModelMethods(t, Publisher, ['exists'])
    const originalSave = Book.prototype.save
    t.after(() => { Book.prototype.save = originalSave })

    let duplicate = false
    let stored
    Book.exists = async () => duplicate
    Genre.countDocuments = async ({ _id }) => _id.$in.length
    Author.countDocuments = async ({ _id }) => _id.$in.length
    Publisher.exists = async () => true
    Book.prototype.save = async function () { stored = this.toObject(); return this }

    await assert.rejects(service.create({ name: 'Missing ID', price: 10 }), { status: 400 })
    duplicate = true
    await assert.rejects(service.create(payload()), { status: 409 })
    duplicate = false
    await service.create({ ...payload(), tags: [' Fiction ', '', 'fiction'], language: ' English ', stock: 0, status: 'active' })
    assert.deepEqual(stored.tags, ['Fiction'])
    assert.equal(stored.language, 'English')
    assert.equal(stored.stock, 0)
    assert.equal(stored.status, 'active')
    for (const invalid of [
        { tags: Array.from({ length: 21 }, (_, index) => `tag${index}`) },
        { tags: ['x'.repeat(41)] }, { language: 9 }, { language: 'x'.repeat(51) },
        { stock: -1 }, { stock: 1.5 }, { status: 'invalid' }
    ]) {
        await assert.rejects(service.create({ ...payload(), ...invalid }), { status: 400 })
    }
})

test('book update preserves omitted optional fields, allows explicit clearing, and prevents changing bookId', async (t) => {
    restoreModelMethods(t, Book, ['findById', 'findByIdAndUpdate', 'exists'])
    restoreModelMethods(t, Genre, ['countDocuments'])
    restoreModelMethods(t, Author, ['countDocuments'])
    restoreModelMethods(t, Publisher, ['exists'])
    const id = new mongoose.Types.ObjectId()
    const current = {
        ...payload(), _id: id, tags: ['Existing'], language: 'English', stock: 5, status: 'hidden',
        toObject() { return { ...this } }
    }
    let update
    Book.findById = async () => current
    Book.findByIdAndUpdate = async (_id, doc) => { update = doc; return doc }
    Book.exists = async () => false
    Genre.countDocuments = async ({ _id }) => _id.$in.length
    Author.countDocuments = async ({ _id }) => _id.$in.length
    Publisher.exists = async () => true

    await service.updateById(String(id), { name: 'Renamed Book' })
    assert.deepEqual(update.$set.tags, ['Existing'])
    assert.equal(update.$set.language, 'English')
    assert.equal(update.$set.stock, 5)
    assert.equal(update.$set.status, 'hidden')
    await service.updateById(String(id), { name: 'Renamed Book', tags: [], language: '', stock: '', status: '' })
    assert.deepEqual(update.$set.tags, [])
    assert.deepEqual(update.$unset, { language: 1, stock: 1, status: 1 })
    current.tags = undefined
    current.language = undefined
    current.stock = undefined
    current.status = undefined
    await service.updateById(String(id), { name: 'Old Book Edited' })
    assert.equal(update.$set.tags, undefined)
    assert.equal(update.$unset, undefined)
    await assert.rejects(service.updateById(String(id), { bookId: 'CHANGED' }), { status: 400 })
    Book.findById = async () => null
    assert.equal(await service.updateById(String(id), {}), null)
})

test('new schema fields remain optional and do not assign fabricated stock or status defaults', () => {
    for (const field of ['tags', 'language', 'stock', 'status']) assert.ok(Book.schema.path(field))
    assert.equal(Book.schema.path('stock').defaultValue, undefined)
    assert.equal(Book.schema.path('status').defaultValue, undefined)
    assert.equal(Book.schema.path('language').defaultValue, undefined)
})
