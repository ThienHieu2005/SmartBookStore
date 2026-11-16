const bookService = require('../services/books.service')
const redis = require('../config/redis')
const { cloudinary } = require('../config/cloudinary')
const { invalidateBookCache } = require('../utils/bookCache')
const { parseBookPagination, getTotalPage } = require('../utils/bookPagination')

const logCacheError = (error) => console.warn('Lỗi bộ nhớ đệm sách:', error.message)
const sendBookWriteError = (res, error) => {
    if (error.status === 409 || error.code === 11000) {
        return res.status(409).json({ message: error.code === 11000 ? 'Mã sách đã tồn tại!' : error.message, error: 1 })
    }
    if (error.status === 400 || error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({ message: error.message, error: 1 })
    }
    return res.status(500).json({ message: 'Có lỗi hệ thống khi lưu thông tin sách!', error: 1 })
}

const bookController = {
    getAll: async(req, res) => {
        try {
            const { page, limit } = parseBookPagination(req.query)
            const sort = req.query.sort ? req.query.sort : { createdAt: -1 }
            const { query } = req.query

            const queryObj = !!query ? query : {}

            const key = `Book::${JSON.stringify({queryObj, page, limit, sort})}`

            let count, data, totalPage

            try {
                const cache = await redis?.get(key)

                if (cache) {
                    const json = JSON.parse(cache)
                    count = json.count
                    data = json.data
                } else {
                    const [countNum, bookList] = await bookService.getAll({query: queryObj, page, limit, sort})
                    count = countNum
                    data = bookList
                    redis?.setex(key, 600, JSON.stringify({count, data})).catch(logCacheError)
                }

            } catch (error) {
                const [countNum, bookList] = await bookService.getAll({query: queryObj, page, limit, sort})
                count = countNum
                data = bookList
                logCacheError(error)
            }

            totalPage = getTotalPage(count, limit)
            
            res.status(200).json({
                message: 'success',
                error: 0,
                data,
                count,
                pagination: {
                    page,
                    limit,
                    totalPage,
                }
            })
        } catch (error) {
            const status = error.status === 400 ? 400 : 500
            res.status(status).json({
                message: status === 400 ? error.message : `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    getByBookId: async(req, res) => {
        try {
            const { bookId } = req.params
            const data = await bookService.getByBookId(bookId) 

            if (data) {
                res.status(200).json({
                    message: 'success',
                    error: 0,
                    data
                })
            } else {
                res.status(200).json({
                    message: 'Không tìm thấy sách!',
                    error: 1,
                    data
                })
            }
        } catch (error) {
            res.status(500).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    getById: async(req, res) => {
        try {
            const { id } = req.params
           const data = await bookService.getById(id)

            if (data) {
                res.status(200).json({
                    message: 'success',
                    error: 0,
                    data
                })
            } else {
                res.status(404).json({
                    message: 'Không tìm thấy sách!',
                    error: 1,
                    data
                })
            }
        } catch (error) {
            res.status(500).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    getBySlug: async(req, res) => {
        try {
            const { slug } = req.params

            let response

            const key = `Book::${slug}`

            try {
                const cache = await redis?.get(key)

                if (cache) {
                    response = JSON.parse(cache).response
                } else {
                    response = await bookService.getBySlug(slug)
                    redis?.setex(key, 600, JSON.stringify({response})).catch(logCacheError)
                }

            } catch (error) {
                response = await bookService.getBySlug(slug)
                logCacheError(error)
            }

            if (response) {
                res.status(200).json({
                    message: 'success',
                    error: 0,
                    data: response
                })
            } else {
                res.status(404).json({
                    message: 'Không tìm thấy sách!',
                    error: 1,
                    data: response
                })
            }
        } catch (error) {
            res.status(500).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    checkIsOrdered: async(req, res) => {
        try {
            const { bookId } = req.params
            const data = await bookService.checkIsOrdered(bookId)

            if (data.length > 0) {
                res.status(200).json({
                    message: 'success',
                    error: 0,
                    data
                })
            } else {
                res.status(200).json({
                    message: 'Không tìm thấy!',
                    error: 1,
                    data
                })
            }
        } catch (error) {
            res.status(500).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    searchBook: async(req, res) => {
        try {
            const { key } = req.query
            const { page, limit } = parseBookPagination(req.query)
            const keyword = typeof key === 'string' ? key.trim() : ''
            const escapedKey = keyword.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&')
            const data = escapedKey ? await bookService.search({key: escapedKey, page, limit}) : []

            res.status(200).json({
                message: 'success',
                error: 0,
                data
            })
          
        } catch (error) {
            const status = error.status === 400 ? 400 : 500
            res.status(status).json({
                message: status === 400 ? error.message : `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    create: async(req, res) => {
        try {
            const data = await bookService.create(req.body)
            await invalidateBookCache(redis)
            return res.status(201).json({
                message: 'success',
                error: 0,
                data
            })
        } catch (error) {
            return sendBookWriteError(res, error)
        }
    },
    updateById: async(req, res) => {
        try {
            const { id } = req.params
            const body = req.body || {}
            const { imageUrl, publicId } = body
            const bookBeforeUpdate = await bookService.getById(id)
            if (!bookBeforeUpdate) {
                return res.status(404).json({
                    message: `Không tìm thấy sách có id:${id}`,
                    error: 1,
                    data: null
                })
            }
            const data = await bookService.updateById(id, body)

            if (data && imageUrl && publicId && bookBeforeUpdate.publicId) {
                try {
                    await cloudinary.uploader.destroy(bookBeforeUpdate.publicId)
                } catch (cleanupError) {
                    console.warn('Không thể dọn ảnh bìa cũ trên Cloudinary.')
                }
            }
         
            if (data) {
                await invalidateBookCache(redis)
                
                return res.status(200).json({
                    message: 'success',
                    error: 0,
                    data
                })
            } else {
                return res.status(404).json({
                    message: `Không tìm thấy sách có id:${id}`,
                    error: 1,
                    data
                })
            }
            
        } catch (error) {
            return sendBookWriteError(res, error)
        }
    },
    deleteById: async(req, res) => {
        try {
            const { id } = req.params
            const isOrdered = await bookService.checkIsOrdered(id)
            if (isOrdered.length > 0) return res.status(400).json({message: 'Sản phẩm đã được mua!',error: 1})
            const data = await bookService.deleteById(id)
            if (data) {
                await invalidateBookCache(redis)
                if (data.publicId) await cloudinary.uploader.destroy(data.publicId)

                return res.status(200).json({
                    message: 'success',
                    error: 0,
                    data
                })
            } else {
                return res.status(404).json({
                    message: `Không tìm thấy sách có id:${id}`,
                    error: 1,
                    data
                })
            }
            
        } catch (error) {
            res.status(400).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    }
}

module.exports = bookController
