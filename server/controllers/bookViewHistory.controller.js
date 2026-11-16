const mongoose = require('mongoose')
const historyService = require('../services/bookViewHistory.service')

const parseLimit = value => {
    if (value === undefined) return 20
    const limit = Number(value)
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        const error = new Error('limit phải là số nguyên từ 1 đến 50!')
        error.status = 400
        throw error
    }
    return limit
}

const bookViewHistoryController = {
    record: async (req, res) => {
        try {
            const data = await historyService.recordView({
                bookId: req.body?.bookId,
                userId: req.user?.userId,
                anonymousId: req.user ? undefined : req.body?.anonymousId,
                consent: req.body?.consent
            })
            return res.status(200).json({ message: 'success', error: 0, data: { recorded: true, viewedAt: data.viewedAt } })
        } catch (error) {
            const status = error.status || (error instanceof mongoose.Error ? 400 : 500)
            return res.status(status).json({ message: status === 500 ? 'Không thể ghi nhận lượt xem sách!' : error.message, error: 1 })
        }
    },
    getMine: async (req, res) => {
        try {
            const limit = parseLimit(req.query.limit)
            const data = await historyService.getForUser(req.user.userId, limit)
            return res.status(200).json({ message: 'success', error: 0, data })
        } catch (error) {
            return res.status(error.status || 500).json({ message: error.status ? error.message : 'Không thể tải lịch sử xem sách!', error: 1 })
        }
    },
    deleteMine: async (req, res) => {
        try {
            const result = await historyService.deleteForUser(req.user.userId)
            return res.status(200).json({ message: 'success', error: 0, deletedCount: result.deletedCount })
        } catch {
            return res.status(500).json({ message: 'Không thể xóa lịch sử xem sách!', error: 1 })
        }
    },
    deleteAnonymous: async (req, res) => {
        try {
            const result = await historyService.deleteForAnonymous(req.body?.anonymousId)
            return res.status(200).json({ message: 'success', error: 0, deletedCount: result.deletedCount })
        } catch (error) {
            return res.status(error.status || 500).json({ message: error.status ? error.message : 'Không thể xóa lịch sử phiên ẩn danh!', error: 1 })
        }
    }
}

module.exports = bookViewHistoryController
