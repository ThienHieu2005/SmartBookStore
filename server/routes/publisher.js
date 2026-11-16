const express = require('express')
const router = express.Router()

const publisherController = require('../controllers/publishers.controller')
const { verifyToken, checkRole } = require('../middlewares/auth')
const { RoleEnum } = require('../utils/enum')
const staffOrAdmin = checkRole([RoleEnum.Staff, RoleEnum.Admin])


router.get('/', publisherController.getAll)
router.get('/:id', publisherController.getById)
router.post('/', verifyToken, staffOrAdmin, publisherController.create)
router.put('/:id', verifyToken, staffOrAdmin, publisherController.updateById)
router.delete('/:id', verifyToken, staffOrAdmin, publisherController.deleteById)


module.exports = router;
