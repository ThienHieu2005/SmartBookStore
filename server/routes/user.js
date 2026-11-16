const express = require('express')
const router = express.Router()

const userController = require('../controllers/users.controller')
const { verifyToken, checkRole } = require('../middlewares/auth')
const { RoleEnum } = require('../utils/enum')

const staffOrAdmin = checkRole([RoleEnum.Staff, RoleEnum.Admin])
const staffAdminOrSelf = checkRole([RoleEnum.Staff, RoleEnum.Admin], { allowSelf: true })
const selfOnly = checkRole([], { allowSelf: true })

router.get('/', verifyToken, staffOrAdmin, userController.getAll)
router.get('/:userId', verifyToken, staffAdminOrSelf, userController.getById)
router.get('/:userId/address', verifyToken, staffAdminOrSelf, userController.getAddress)
router.get('/:userId/cart', verifyToken, selfOnly, userController.getCart)

router.post('/:userId/address', verifyToken, selfOnly, userController.addAddress)
router.post('/staff', verifyToken, checkRole([RoleEnum.Admin]), userController.createStaff)

router.post('/:userId/addtocart', verifyToken, selfOnly, userController.addToCart)
router.put('/:userId/cart', verifyToken, selfOnly, userController.updateCart)
router.put('/:userId/status', verifyToken, checkRole([RoleEnum.Admin]), userController.updateStatus)
router.put('/:userId/avatar', verifyToken, selfOnly, userController.updateAvatar)

router.patch('/:userId/address/status/:addressId', verifyToken, selfOnly, userController.updateDefaultAddressById)

router.put('/:userId', verifyToken, staffAdminOrSelf, userController.updateProfileById)

router.delete('/:userId', verifyToken, checkRole([RoleEnum.Admin]), userController.deleteById)
router.delete('/:userId/address/:addressId', verifyToken, selfOnly, userController.deleteAddressById)


module.exports = router;
