const mongoose = require('mongoose')
const Book = require('../models/books.model')
const BookViewHistory = require('../models/bookViewHistory.model')

const createError = (message, status = 400) => Object.assign(new Error(message), { status })

const recordView = async ({ bookId, userId, anonymousId, consent }) => {
    if (typeof bookId !== 'string' || !/^[a-f\d]{24}$/i.test(bookId)) {
        throw createError('Mã sách không hợp lệ!')
    }
    if (!userId && (consent !== true || typeof anonymousId !== 'string' ||
        !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(anonymousId))) {
        throw createError('Cần đồng ý ghi nhận và gửi định danh phiên hợp lệ!')
    }

    const book = new mongoose.Types.ObjectId(bookId)
    if (!await Book.exists({ _id: book })) throw createError('Không tìm thấy sách!', 404)

    const identity = userId
        ? { user: new mongoose.Types.ObjectId(userId) }
        : { anonymousId }
    const filter = { book, ...identity }
    const update = {
        $set: { viewedAt: new Date() },
        $setOnInsert: { book, ...identity }
    }
    try {
        return await BookViewHistory.findOneAndUpdate(filter, update, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        })
    } catch (error) {
        // Handles two simultaneous first views racing to create the same unique key.
        if (error.code !== 11000) throw error
        return await BookViewHistory.findOneAndUpdate(filter, { $set: { viewedAt: new Date() } }, { new: true })
    }
}

const getForUser = async (userId, limit) => BookViewHistory.find({ user: userId })
    .select('book viewedAt')
    .sort({ viewedAt: -1 })
    .limit(limit)
    .populate('book', 'bookId name slug imageUrl price discount year author genre tags language')
    .lean()

const deleteForUser = async (userId) => BookViewHistory.deleteMany({ user: userId })
const deleteForAnonymous = async (anonymousId) => {
    if (typeof anonymousId !== 'string' ||
        !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(anonymousId)) {
        throw createError('Định danh phiên không hợp lệ!')
    }
    return BookViewHistory.deleteMany({ anonymousId, user: { $exists: false } })
}

module.exports = { recordView, getForUser, deleteForUser, deleteForAnonymous }
