const express = require('express')
const router = express.Router()

const analyticsController = require('../controllers/analytics.controller')
const { verifyToken, checkRole } = require('../middlewares/auth')
const { RoleEnum } = require('../utils/enum')

router.use(verifyToken, checkRole([RoleEnum.Staff, RoleEnum.Admin]))


router.get('/revenue/all', analyticsController.getTotalRevenue)
router.get('/revenue/week', analyticsController.getRevenueWeek)
router.get('/revenue/lifetime', analyticsController.getRevenueLifeTime)
router.get('/ordercount/lifetime', analyticsController.getOrderCountLifeTime)
router.get('/product/bestseller', analyticsController.getBestSeller)


module.exports = router;
