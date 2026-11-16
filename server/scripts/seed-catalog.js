const { createHash } = require('node:crypto')
const { resolve } = require('node:path')
const mongoose = require('mongoose')
const Genre = require('../models/genres.model')
const Book = require('../models/books.model')
const Author = require('../models/authors.model')
const Publisher = require('../models/publishers.model')
const { genres, authors, publishers, books } = require('./catalog-samples')

require('dotenv').config({ path: resolve(__dirname, '../.env') })

const inserted = { books: 0, genres: 0, authors: 0, publishers: 0 }

function isLocalMongoUri(uri) {
    try {
        const url = new URL(uri)
        return url.protocol === 'mongodb:' &&
            ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase())
    } catch {
        return false
    }
}

async function insertIfMissing(Model, filter, data) {
    const now = new Date()
    const result = await Model.findOneAndUpdate(filter, {
        $setOnInsert: { ...data, createdAt: now, updatedAt: now }
    }, {
        upsert: true,
        new: true,
        runValidators: true,
        timestamps: false,
        rawResult: true
    })

    if (result.lastErrorObject.upserted) inserted[Model.collection.name]++
    return result.value._id
}

async function findOrInsertByName(Model, data) {
    const existing = await Model.findOne({ name: data.name }).select('_id').lean()
    if (existing) return existing._id

    // Author and Publisher names lack unique indexes, so give seed rows stable IDs.
    const id = createHash('sha256').update(`bookstore-catalog:${Model.modelName}:${data.name}`)
        .digest('hex').slice(0, 24)
    return insertIfMissing(Model, { _id: new mongoose.Types.ObjectId(id) }, data)
}

async function seedCatalog() {
    const uri = process.env.MONGODB_CONNECT_URI
    if (!isLocalMongoUri(uri)) {
        console.error('Seed chỉ chạy khi MONGODB_CONNECT_URI trỏ tới MongoDB local.')
        process.exitCode = 1
        return
    }

    await mongoose.connect(uri, { directConnection: true, serverSelectionTimeoutMS: 5000 })
    await Promise.all([Genre.init(), Book.init(), Author.init(), Publisher.init()])

    const genreIds = {}
    for (const [slug, name] of Object.entries(genres)) {
        genreIds[slug] = await insertIfMissing(Genre, { slug }, { name, slug })
    }

    const authorIds = {}
    for (const [key, data] of Object.entries(authors)) {
        authorIds[key] = await findOrInsertByName(Author, data)
    }

    const publisherIds = {}
    for (const [key, name] of Object.entries(publishers)) {
        publisherIds[key] = await findOrInsertByName(Publisher, { name })
    }

    for (const { genre, authors: authorKeys, publisher, ...book } of books) {
        await insertIfMissing(Book, { bookId: book.bookId }, {
            ...book,
            genre: [genreIds[genre]],
            author: authorKeys.map((key) => authorIds[key]),
            publisher: publisherIds[publisher],
            imageUrl: '/book-cover-placeholder.svg'
        })
    }

    console.log(`Đã thêm ${inserted.books} sách, ${inserted.genres} thể loại, ${inserted.authors} tác giả và ${inserted.publishers} nhà xuất bản.`)
}

seedCatalog()
    .catch((error) => {
        console.error(`Seed danh mục thất bại (${error.code ?? error.name}).`)
        process.exitCode = 1
    })
    .finally(() => mongoose.disconnect())
