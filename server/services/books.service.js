const Book = require('../models/books.model')
const Order = require('../models/orders.model')
const Genre = require('../models/genres.model')
const Author = require('../models/authors.model')
const Publisher = require('../models/publishers.model')
const mongoose = require("mongoose");

const createBookError = (message, status = 400) => {
    const error = new Error(message)
    error.status = status
    return error
}

const normalizeNumber = (field, value, { required = false, defaultValue } = {}) => {
    if (value == null) {
        if (defaultValue !== undefined) return defaultValue
        if (required) throw createBookError(`${field} là bắt buộc!`)
        return undefined
    }
    if (typeof value === 'string') {
        if (!value.trim()) {
            if (defaultValue !== undefined) return defaultValue
            if (required) throw createBookError(`${field} là bắt buộc!`)
            return undefined
        }
        value = Number(value.trim())
    } else if (typeof value !== 'number') {
        throw createBookError(`${field} phải là số hợp lệ!`)
    }
    if (!Number.isFinite(value)) throw createBookError(`${field} phải là số hữu hạn!`)
    return value
}

const normalizeReferenceId = (value, field) => {
    const isObjectId = value instanceof mongoose.Types.ObjectId
    const isHexObjectId = typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
    if (!isObjectId && !isHexObjectId) {
        throw createBookError(`${field} không hợp lệ!`)
    }
    return String(value)
}

const normalizeBookPayload = (body, existing = {}) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw createBookError('Dữ liệu sách không hợp lệ!')
    }

    const value = (field) => Object.prototype.hasOwnProperty.call(body, field) ? body[field] : existing[field]
    const bookIdValue = value('bookId')
    if (typeof bookIdValue !== 'string' || !bookIdValue.trim()) throw createBookError('Mã sách không được để trống!')
    const nameValue = value('name')
    if (typeof nameValue !== 'string' || !nameValue.trim()) throw createBookError('Tên sách không được để trống!')

    const year = normalizeNumber('Năm xuất bản', value('year'))
    const pages = normalizeNumber('Số trang', value('pages'))
    const price = normalizeNumber('Giá sách', value('price'), { required: true })
    const discount = normalizeNumber('Giảm giá', value('discount'), { defaultValue: 0 })
    if (price <= 0) throw createBookError('Giá sách phải lớn hơn 0!')
    if (discount < 0 || discount > 100) throw createBookError('Giảm giá phải nằm trong khoảng từ 0 đến 100!')
    if (pages !== undefined && (!Number.isInteger(pages) || pages <= 0)) throw createBookError('Số trang phải là số nguyên dương!')
    const currentYear = new Date().getFullYear()
    if (year !== undefined && (!Number.isInteger(year) || year < 1000 || year > currentYear + 1)) {
        throw createBookError(`Năm xuất bản phải là số nguyên từ 1000 đến ${currentYear + 1}!`)
    }

    const normalizeReferences = (field, label) => {
        const references = value(field)
        if (!Array.isArray(references) || references.length === 0) throw createBookError(`Sách phải có ít nhất một ${label} hợp lệ!`)
        return [...new Set(references.map(reference => normalizeReferenceId(reference, label)))]
    }
    const genre = normalizeReferences('genre', 'thể loại')
    const author = normalizeReferences('author', 'tác giả')
    const publisher = normalizeReferenceId(value('publisher'), 'Nhà xuất bản')

    const tagsValue = value('tags')
    let tags
    if (tagsValue !== undefined && tagsValue !== null) {
        if (!Array.isArray(tagsValue) && typeof tagsValue !== 'string') throw createBookError('Từ khóa phải là danh sách chuỗi hợp lệ!')
        const items = Array.isArray(tagsValue) ? tagsValue : tagsValue.split(',')
        if (items.some(item => typeof item !== 'string')) throw createBookError('Mỗi từ khóa phải là chuỗi hợp lệ!')
        const uniqueTags = new Map()
        items.map(item => item.trim()).filter(Boolean).forEach(item => {
            const key = item.toLocaleLowerCase()
            if (!uniqueTags.has(key)) uniqueTags.set(key, item)
        })
        tags = [...uniqueTags.values()]
        if (tags.length > 20) throw createBookError('Không thể nhập quá 20 từ khóa!')
        if (tags.some(item => item.length > 40)) throw createBookError('Mỗi từ khóa không được vượt quá 40 ký tự!')
    }

    const languageValue = value('language')
    let language
    if (languageValue !== undefined && languageValue !== null && languageValue !== '') {
        if (typeof languageValue !== 'string') throw createBookError('Ngôn ngữ phải là chuỗi hợp lệ!')
        language = languageValue.trim()
        if (!language || language.length > 50) throw createBookError('Ngôn ngữ phải có từ 1 đến 50 ký tự!')
    }

    const stockValue = value('stock')
    let stock
    if (stockValue !== undefined && stockValue !== null && stockValue !== '') {
        stock = normalizeNumber('Tồn kho', stockValue)
        if (!Number.isInteger(stock) || stock < 0) throw createBookError('Tồn kho phải là số nguyên không âm!')
    }

    const statusValue = value('status')
    let status
    if (statusValue !== undefined && statusValue !== null && statusValue !== '') {
        if (typeof statusValue !== 'string' || !['active', 'hidden', 'discontinued'].includes(statusValue)) {
            throw createBookError('Trạng thái sách không hợp lệ!')
        }
        status = statusValue
    }

    const optionalString = (field, label) => {
        const item = value(field)
        if (item == null || item === '') return undefined
        if (typeof item !== 'string') throw createBookError(`${label} phải là chuỗi hợp lệ!`)
        return item
    }
    const imageUrl = optionalString('imageUrl', 'URL hình ảnh')
    const publicId = optionalString('publicId', 'Mã hình ảnh')
    const hasImageUrl = Object.prototype.hasOwnProperty.call(body, 'imageUrl')
    const hasPublicId = Object.prototype.hasOwnProperty.call(body, 'publicId')
    if (hasImageUrl !== hasPublicId) throw createBookError('Thông tin ảnh phải có đồng thời URL và mã ảnh!')

    return {
        bookId: bookIdValue.trim(),
        name: nameValue.trim(),
        year,
        pages,
        size: optionalString('size', 'Kích thước'),
        price,
        discount,
        description: optionalString('description', 'Mô tả'),
        author,
        genre,
        publisher,
        ...(tags !== undefined ? { tags } : {}),
        ...(language !== undefined ? { language } : {}),
        ...(stock !== undefined ? { stock } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(imageUrl !== undefined ? { imageUrl, publicId } : {})
    }
}

const validateReferences = async ({ genre, author, publisher }) => {
    const [genreCount, authorCount, publisherExists] = await Promise.all([
        Genre.countDocuments({ _id: { $in: genre } }),
        Author.countDocuments({ _id: { $in: author } }),
        Publisher.exists({ _id: publisher })
    ])
    if (genreCount !== genre.length) throw createBookError('Một hoặc nhiều thể loại không tồn tại!')
    if (authorCount !== author.length) throw createBookError('Một hoặc nhiều tác giả không tồn tại!')
    if (!publisherExists) throw createBookError('Nhà xuất bản không tồn tại!')
}

const bookService = {
    getAll: async({query, page, limit, sort}) => {
        const skip = (page - 1) * limit
            
        return await Promise.all([
            Book.countDocuments(query), 
            Book.find(query).populate('genre author publisher').skip(skip).limit(limit).sort(sort)])
    },
    getByBookId: async(bookId) => {
        return await Book.findOne({bookId: bookId}).populate('author publisher genre')
    },
    getById: async(id) => {
        return await Book.findById(id).populate('author publisher genre')
       
    },
    getBySlug: async(slug) => {
        return await Book.findOne({slug}).populate('author publisher genre')
    },
    checkIsOrdered: async(id) => {
        const ObjectId = mongoose.Types.ObjectId;
        return await Order.aggregate([
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.product", 
                }
            },
            { $match : { _id : ObjectId(id) } }
        ])
    },
    search: async({key, page, limit}) => {
        const query = [
            {
                $lookup: {
                    from: "authors",
                    localField: "author",
                    foreignField: "_id",
                    as: "author"
                }
            },
            { 
                $match: {
                    $or: [
                        { name: { $regex: key, $options:"i" } }, 
                        { "author.name": { $regex: key, $options:"i" } } 
                    ]
                }
            },
        ]
        if (limit && +limit > 0) {
            const skip = (page - 1) * limit
            query.push({ $skip : skip }, { $limit: limit })
        }
        return await Book.aggregate(query)
    },
    create: async(body) => {
        const payload = normalizeBookPayload(body)
        if (await Book.exists({ bookId: payload.bookId })) {
            throw createBookError('Mã sách đã tồn tại!', 409)
        }
        await validateReferences(payload)
        const newBook = new Book(payload)
        return await newBook.save()
    },
    updateById: async(id, body) => {
        if (!/^[a-f\d]{24}$/i.test(String(id))) throw createBookError('ID sách không hợp lệ!')
        const existing = await Book.findById(id)
        if (!existing) return null

        const current = existing.toObject()
        const payload = normalizeBookPayload(body, current)
        if (Object.prototype.hasOwnProperty.call(body, 'bookId') && payload.bookId !== current.bookId) {
            throw createBookError('Mã sách không thể thay đổi sau khi tạo!')
        }
        const duplicate = await Book.exists({ bookId: payload.bookId, _id: { $ne: existing._id } })
        if (duplicate) throw createBookError('Mã sách đã tồn tại!', 409)
        await validateReferences(payload)

        const { bookId, ...updateFields } = payload
        const unsetFields = {}
        for (const field of ['year', 'pages', 'size', 'description', 'tags', 'language', 'stock', 'status']) {
            if (Object.prototype.hasOwnProperty.call(body, field) && updateFields[field] === undefined) {
                unsetFields[field] = 1
                delete updateFields[field]
            }
        }
        const update = { $set: updateFields }
        if (Object.keys(unsetFields).length) update.$unset = unsetFields
        return await Book.findByIdAndUpdate(id, update, {
            new: true,
            runValidators: true,
            context: 'query'
        })
    },
    deleteById: async(id) => {
        return await Book.findByIdAndDelete(id)
    }
}

module.exports = bookService
