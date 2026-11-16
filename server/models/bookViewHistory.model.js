const mongoose = require('mongoose')

const bookViewHistorySchema = new mongoose.Schema({
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    anonymousId: {
        type: String,
        minlength: 36,
        maxlength: 36
    },
    viewedAt: {
        type: Date,
        required: true,
        default: Date.now
    }
}, { timestamps: false })

bookViewHistorySchema.pre('validate', function (next) {
    const hasUser = this.user != null
    const hasAnonymousId = typeof this.anonymousId === 'string' && this.anonymousId.length > 0
    if (hasUser === hasAnonymousId) {
        this.invalidate('user', 'Lịch sử phải thuộc tài khoản hoặc khách ẩn danh duy nhất!')
    }
    if (hasAnonymousId && !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(this.anonymousId)) {
        this.invalidate('anonymousId', 'Định danh khách phải là UUID phiên hợp lệ!')
    }
    next()
})

bookViewHistorySchema.index({ user: 1, book: 1 }, {
    unique: true,
    partialFilterExpression: { user: { $exists: true } }
})
bookViewHistorySchema.index({ anonymousId: 1, book: 1 }, {
    unique: true,
    partialFilterExpression: { anonymousId: { $exists: true } }
})
bookViewHistorySchema.index({ viewedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 })
bookViewHistorySchema.index({ user: 1, viewedAt: -1 })
bookViewHistorySchema.index({ anonymousId: 1, viewedAt: -1 })

module.exports = mongoose.model('BookViewHistory', bookViewHistorySchema)
