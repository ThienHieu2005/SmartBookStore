const express = require('express')
const router = express.Router()
const controller = require('../controllers/bookViewHistory.controller')
const { verifyToken, optionalVerifyToken } = require('../middlewares/auth')
const createBookViewRateLimit = require('../middlewares/bookViewRateLimit')

router.post('/', optionalVerifyToken, createBookViewRateLimit(), controller.record)
router.delete('/anonymous', createBookViewRateLimit(), controller.deleteAnonymous)
router.get('/', verifyToken, controller.getMine)
router.delete('/', verifyToken, controller.deleteMine)

module.exports = router
