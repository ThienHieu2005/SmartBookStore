const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const { randomUUID } = require('node:crypto')

const testUri = process.env.MONGODB_TEST_URI

if (!testUri) {
    test('MongoDB integration suite requires the guarded test runner', { skip: 'No isolated test URI supplied.' }, () => {})
} else {
    test('BookStore API integration on an isolated MongoDB test database', async () => {
        const testUrl = new URL(testUri)
        const databaseName = decodeURIComponent(testUrl.pathname.slice(1))
        assert.equal(testUrl.protocol, 'mongodb:')
        assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(testUrl.hostname.toLowerCase()))
        assert.match(databaseName, /^bookstore_step8_test_[a-f\d]{32}$/)
        assert.notEqual(databaseName, process.env.BOOKSTORE_SOURCE_DATABASE)
        assert.equal(databaseName, process.env.BOOKSTORE_TEST_DATABASE)

        process.env.NODE_ENV = 'test'
        process.env.REDIS_HOST = ''
        process.env.JWT_ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET || 'integration-test-only-secret'
        mongoose.set('autoIndex', false)
        mongoose.set('autoCreate', false)

        let httpServer
        try {
            await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000, autoIndex: false, autoCreate: false })
            assert.equal(mongoose.connection.name, databaseName)
            const hello = await mongoose.connection.db.admin().command({ hello: 1 })
            assert.equal(hello.topologyVersion?.processId?.toString(), process.env.BOOKSTORE_MONGO_PROCESS_ID)
            assert.deepEqual(await mongoose.connection.db.listCollections().toArray(), [])

            const app = require('../app')
            const Book = require('../models/books.model')
            const Genre = require('../models/genres.model')
            const Author = require('../models/authors.model')
            const Publisher = require('../models/publishers.model')
            const User = require('../models/users.model')
            const Order = require('../models/orders.model')
            const History = require('../models/bookViewHistory.model')

            // Index creation is intentionally explicit and occurs only after the guards above.
            await Promise.all([Book.createIndexes(), Genre.createIndexes(), History.createIndexes()])
            const indexes = await History.collection.indexes()
            assert.ok(indexes.some(index => index.key.user === 1 && index.key.book === 1 && index.unique))
            assert.ok(indexes.some(index => index.key.anonymousId === 1 && index.key.book === 1 && index.unique))
            assert.ok(indexes.some(index => index.key.user === 1 && index.key.viewedAt === -1))
            assert.ok(indexes.some(index => index.key.anonymousId === 1 && index.key.viewedAt === -1))
            assert.ok(indexes.some(index => index.key.viewedAt === 1 && index.expireAfterSeconds === 60 * 60 * 24 * 180))

            const genre = await new Genre({ name: 'Step 8 integration genre' }).save()
            const author = await new Author({ name: 'Step 8 synthetic author' }).save()
            const publisher = await new Publisher({ name: 'Step 8 synthetic publisher' }).save()
            const customer = await new User({ fullName: 'Synthetic customer', role: 0, status: 1 }).save()
            const secondCustomer = await new User({ fullName: 'Synthetic second customer', role: 0, status: 1 }).save()
            const staff = await new User({ fullName: 'Synthetic staff', role: 2, status: 1 }).save()
            const admin = await new User({ fullName: 'Synthetic admin', role: 3, status: 1 }).save()
            const disabledUser = await new User({ fullName: 'Synthetic disabled user', role: 3, status: 0 }).save()
            const invalidRoleId = new mongoose.Types.ObjectId()
            await User.collection.insertOne({ _id: invalidRoleId, fullName: 'Synthetic invalid role', role: 99, status: 1 })

            const secret = process.env.JWT_ACCESS_TOKEN_SECRET
            const tokenFor = (user, claimedRole = user.role) => jwt.sign({ userId: String(user._id), role: claimedRole }, secret, { expiresIn: '5m' })
            const customerToken = tokenFor(customer, 3)
            const secondCustomerToken = tokenFor(secondCustomer)
            const staffToken = tokenFor(staff, 3)
            const adminToken = tokenFor(admin, 0)
            const disabledToken = tokenFor(disabledUser, 3)
            const invalidRoleToken = jwt.sign({ userId: String(invalidRoleId), role: 3 }, secret, { expiresIn: '5m' })

            httpServer = app.listen(0)
            await new Promise(resolve => httpServer.once('listening', resolve))
            const baseUrl = `http://127.0.0.1:${httpServer.address().port}/api/v1`
            const request = async (path, { method = 'GET', token, body } = {}) => {
                const headers = {}
                if (body !== undefined) headers['Content-Type'] = 'application/json'
                if (token) headers.Authorization = `Bearer ${token}`
                const response = await fetch(`${baseUrl}${path}`, {
                    method,
                    headers,
                    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
                })
                return { status: response.status, body: await response.json() }
            }
            const payload = (bookId, name, extra = {}) => ({
                bookId,
                name,
                year: 2025,
                pages: 180,
                price: 120000,
                discount: 5,
                author: [String(author._id)],
                genre: [String(genre._id)],
                publisher: String(publisher._id),
                ...extra
            })

            assert.equal((await request('/books/', { method: 'POST', token: customerToken, body: payload('STEP8-CUSTOMER', 'Denied customer book') })).status, 403)
            assert.equal((await request('/books/', { method: 'POST', token: disabledToken, body: payload('STEP8-DISABLED', 'Denied disabled book') })).status, 403)
            assert.equal((await request('/books/', { method: 'POST', token: invalidRoleToken, body: payload('STEP8-INVALID-ROLE', 'Denied invalid role book') })).status, 403)
            assert.equal((await request('/users/staff', { method: 'POST', token: staffToken, body: { fullName: 'Must be rejected' } })).status, 403)

            const requiredMissing = await request('/books/', { method: 'POST', token: staffToken, body: { name: 'Missing required data' } })
            assert.equal(requiredMissing.status, 400)
            assert.equal(requiredMissing.body.error, 1)
            for (const invalid of [
                { price: 0 }, { discount: 101 }, { pages: 2.5 }, { status: 'invalid' },
                { stock: -1 }, { stock: 1.5 }, { language: 15 }, { tags: ['x'.repeat(41)] }
            ]) {
                assert.equal((await request('/books/', { method: 'POST', token: staffToken, body: payload(`STEP8-INVALID-${randomUUID()}`, 'Invalid field book', invalid) })).status, 400)
            }
            const invalidGenre = await request('/books/', {
                method: 'POST', token: staffToken,
                body: payload('STEP8-INVALID-REF', 'Invalid reference', { genre: [String(new mongoose.Types.ObjectId())] })
            })
            assert.equal(invalidGenre.status, 400)
            const invalidPublisher = await request('/books/', {
                method: 'POST', token: staffToken,
                body: payload('STEP8-INVALID-PUBLISHER', 'Invalid publisher', { publisher: String(new mongoose.Types.ObjectId()) })
            })
            assert.equal(invalidPublisher.status, 400)

            const bookAResponse = await request('/books/', {
                method: 'POST', token: staffToken,
                body: payload('STEP8-BOOK-A', 'Step 8 Book A', {
                    tags: [' Fiction ', '', 'fiction', 'Novel'], language: ' Vietnamese ', stock: 8, status: 'active'
                })
            })
            assert.equal(bookAResponse.status, 201)
            assert.deepEqual(bookAResponse.body.data.tags, ['Fiction', 'Novel'])
            assert.equal(bookAResponse.body.data.language, 'Vietnamese')
            assert.equal(bookAResponse.body.data.stock, 8)

            const duplicate = await request('/books/', { method: 'POST', token: adminToken, body: payload('STEP8-BOOK-A', 'Duplicate ID') })
            assert.equal(duplicate.status, 409)
            const bookAId = bookAResponse.body.data._id
            assert.equal((await request(`/books/${bookAId}`, { method: 'PUT', token: staffToken, body: { bookId: 'STEP8-CHANGED' } })).status, 400)
            const partialUpdate = await request(`/books/${bookAId}`, {
                method: 'PUT', token: adminToken, body: { name: 'Step 8 Book A Updated', stock: 0, status: 'hidden' }
            })
            assert.equal(partialUpdate.status, 200)
            assert.equal(partialUpdate.body.data.bookId, 'STEP8-BOOK-A')
            assert.equal(partialUpdate.body.data.stock, 0)
            assert.deepEqual(partialUpdate.body.data.tags, ['Fiction', 'Novel'])
            const readNewFields = await request(`/books/${bookAId}`)
            assert.equal(readNewFields.body.data.language, 'Vietnamese')
            assert.equal(readNewFields.body.data.status, 'hidden')
            assert.equal(readNewFields.body.data.stock, 0)
            const cleared = await request(`/books/${bookAId}`, {
                method: 'PUT', token: staffToken, body: { tags: [], language: '', stock: '', status: '' }
            })
            assert.equal(cleared.status, 200)
            assert.deepEqual(cleared.body.data.tags, [])
            assert.equal(cleared.body.data.language, undefined)
            assert.equal(cleared.body.data.stock, undefined)
            assert.equal(cleared.body.data.status, undefined)
            assert.equal((await request(`/books/${new mongoose.Types.ObjectId()}`, { method: 'PUT', token: staffToken, body: {} })).status, 404)

            const bookBResponse = await request('/books/', { method: 'POST', token: adminToken, body: payload('STEP8-BOOK-B', 'Step 8 Book B') })
            assert.equal(bookBResponse.status, 201)
            const bookBId = bookBResponse.body.data._id
            const byId = await request(`/books/${bookBId}`)
            assert.equal(byId.status, 200)
            assert.equal(byId.body.data.bookId, 'STEP8-BOOK-B')
            const bySlug = await request(`/books/slug/${bookBResponse.body.data.slug}`)
            assert.equal(bySlug.status, 200)
            assert.equal(bySlug.body.data._id, bookBId)

            const listAll = await request('/books/')
            assert.equal(listAll.status, 200)
            assert.equal(listAll.body.pagination.limit, 0)
            assert.ok(listAll.body.count >= 2)
            assert.equal((await request('/books/?page=1&limit=0')).status, 400)
            assert.equal((await request('/books/?page=1.5&limit=10')).status, 400)
            const onePage = await request('/books/?page=1&limit=1')
            assert.equal(onePage.status, 200)
            assert.equal(onePage.body.data.length, 1)
            const beyondLastPage = await request('/books/?page=999&limit=1')
            assert.equal(beyondLastPage.status, 200)
            assert.deepEqual(beyondLastPage.body.data, [])
            const filtered = await request(`/books/?page=1&limit=50&query%5Bgenre%5D=${genre._id}`)
            assert.equal(filtered.status, 200)
            assert.ok(filtered.body.data.some(item => item.bookId === 'STEP8-BOOK-A'))
            const emptyList = await request('/books/?page=1&limit=10&query%5Bname%5D=NO_STEP8_MATCH')
            assert.equal(emptyList.status, 200)
            assert.equal(emptyList.body.count, 0)
            assert.deepEqual(emptyList.body.data, [])
            const searched = await request('/books/search?key=Step%208%20Book%20B')
            assert.equal(searched.status, 200)
            assert.ok(searched.body.data.some(item => String(item._id) === bookBId))

            const oldBookId = new mongoose.Types.ObjectId()
            await Book.collection.insertOne({
                _id: oldBookId, bookId: 'STEP8-LEGACY', name: 'Legacy book without new fields', slug: 'step8-legacy',
                year: 2020, pages: 100, price: 50000, discount: 0,
                genre: [genre._id], author: [author._id], publisher: publisher._id
            })
            const legacy = await request(`/books/${oldBookId}`)
            assert.equal(legacy.status, 200)
            assert.equal(legacy.body.data.language, undefined)
            assert.equal(legacy.body.data.stock, undefined)
            assert.equal(legacy.body.data.status, undefined)

            const orderedBookResponse = await request('/books/', { method: 'POST', token: staffToken, body: payload('STEP8-ORDERED', 'Step 8 Ordered Book') })
            assert.equal(orderedBookResponse.status, 201)
            const order = new Order({
                user: customer._id,
                products: [{ product: orderedBookResponse.body.data._id, quantity: 1, price: 120000, totalItem: 120000 }],
                delivery: { fullName: 'Synthetic recipient', email: 'test@example.invalid', phoneNumber: '0000000000', address: 'Test-only address' },
                cost: { subTotal: 120000, shippingFee: 0, discount: 0, total: 120000 }
            })
            await order.save()
            const blockedDelete = await request(`/books/${orderedBookResponse.body.data._id}`, { method: 'DELETE', token: staffToken })
            assert.equal(blockedDelete.status, 400)
            assert.equal((await request(`/books/${new mongoose.Types.ObjectId()}`, { method: 'DELETE', token: staffToken })).status, 404)
            const removableResponse = await request('/books/', { method: 'POST', token: staffToken, body: payload('STEP8-REMOVABLE', 'Step 8 Removable Book') })
            assert.equal((await request(`/books/${removableResponse.body.data._id}`, { method: 'DELETE', token: adminToken })).status, 200)

            const viewA = await request('/book-views/', { method: 'POST', token: customerToken, body: { bookId: bookAId, userId: String(secondCustomer._id) } })
            assert.equal(viewA.status, 200)
            await new Promise(resolve => setTimeout(resolve, 15))
            assert.equal((await request('/book-views/', { method: 'POST', token: customerToken, body: { bookId: bookBId } })).status, 200)
            assert.equal((await request('/book-views/', { method: 'POST', token: customerToken, body: { bookId: bookAId } })).status, 200)
            assert.equal(await History.countDocuments({ user: customer._id }), 2)
            const ownHistory = await request('/book-views/?limit=10&userId=' + secondCustomer._id, { token: customerToken })
            assert.equal(ownHistory.status, 200)
            assert.equal(ownHistory.body.data.length, 2)
            assert.equal(ownHistory.body.data[0].book._id, bookAId)
            assert.equal(ownHistory.body.data[1].book._id, bookBId)
            assert.equal((await request('/book-views/')).status, 401)
            assert.equal((await request('/book-views/', { token: secondCustomerToken })).body.data.length, 0)
            const deletedOwn = await request('/book-views/', { method: 'DELETE', token: customerToken })
            assert.equal(deletedOwn.status, 200)
            assert.equal(deletedOwn.body.deletedCount, 2)
            assert.equal((await request('/book-views/', { token: secondCustomerToken })).body.data.length, 0)

            const anonymousId = randomUUID()
            assert.equal((await request('/book-views/', { method: 'POST', body: { bookId: bookAId, anonymousId } })).status, 400)
            assert.equal(await History.countDocuments({ anonymousId }), 0)
            for (const bookId of [bookAId, bookAId, bookBId]) {
                assert.equal((await request('/book-views/', {
                    method: 'POST', body: { bookId, anonymousId, consent: true }
                })).status, 200)
            }
            assert.equal(await History.countDocuments({ anonymousId }), 2)
            assert.equal((await request('/book-views/', { token: secondCustomerToken })).body.data.length, 0)
            const deletedGuest = await request('/book-views/anonymous', { method: 'DELETE', body: { anonymousId } })
            assert.equal(deletedGuest.status, 200)
            assert.equal(deletedGuest.body.deletedCount, 2)

            const rateLimitedId = randomUUID()
            for (let index = 0; index < 30; index++) {
                const result = await request('/book-views/', {
                    method: 'POST', body: { bookId: bookAId, anonymousId: rateLimitedId, consent: true }
                })
                assert.equal(result.status, 200)
            }
            assert.equal((await request('/book-views/', {
                method: 'POST', body: { bookId: bookAId, anonymousId: rateLimitedId, consent: true }
            })).status, 429)
            await request('/book-views/anonymous', { method: 'DELETE', body: { anonymousId: rateLimitedId } })

            const duplicateHistory = new History({ book: bookAId, user: customer._id })
            await duplicateHistory.save()
            await assert.rejects(new History({ book: bookAId, user: customer._id }).save(), error => error.code === 11000)
        } finally {
            if (httpServer) await new Promise(resolve => httpServer.close(resolve))
            await mongoose.disconnect()
        }
    })
}
