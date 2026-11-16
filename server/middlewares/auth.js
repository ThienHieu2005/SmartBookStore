const jwt = require('jsonwebtoken');
const { isObjectIdOrHexString } = require('mongoose')
const User = require('../models/users.model')
const { RoleEnum } = require('../utils/enum')
const validRoles = Object.values(RoleEnum)

const verifyToken = async (req, res, next) => {
    const authorizationHeader = req.headers['authorization']
    if (!authorizationHeader) return res.status(401).json({message: '401 Unauthorized'})

    const token = authorizationHeader.split(' ')[1]
    if (!token) return res.status(401).json({message: '401 Unauthorized'})

    let userId
    try {
        ({ userId } = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET))
    } catch {
        return res.status(403).json({message: '403 Forbidden'})
    }

    if (!isObjectIdOrHexString(userId)) return res.status(403).json({message: '403 Forbidden'})
    try {
        const user = await User.findById(userId).select('role status').lean()
        if (!user || user.status !== 1 || !validRoles.includes(user.role)) {
            return res.status(403).json({message: '403 Forbidden'})
        }
        req.user = { userId: String(user._id), role: user.role }
        next()
    } catch (error) {
        next(error)
    }
}

// Allows public endpoints to accept either an authenticated user or no token.
// A supplied but invalid token is still rejected and is never downgraded to anonymous.
const optionalVerifyToken = async (req, res, next) => {
    const authorizationHeader = req.headers['authorization']
    if (!authorizationHeader) return next()

    const [scheme, token] = authorizationHeader.split(' ')
    if (scheme !== 'Bearer' || !token) return res.status(401).json({message: '401 Unauthorized'})

    let userId
    try {
        ({ userId } = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET))
    } catch {
        return res.status(403).json({message: '403 Forbidden'})
    }

    if (!isObjectIdOrHexString(userId)) return res.status(403).json({message: '403 Forbidden'})
    try {
        const user = await User.findById(userId).select('role status').lean()
        if (!user || user.status !== 1 || !validRoles.includes(user.role)) {
            return res.status(403).json({message: '403 Forbidden'})
        }
        req.user = { userId: String(user._id), role: user.role }
        next()
    } catch (error) {
        next(error)
    }
}

const checkRole = (permissions, { allowSelf = false } = {}) => {
    return (req, res, next) => {
        const { role, userId } = req.user
        const isSelf = allowSelf && req.params.userId === userId
        if (!permissions.includes(role) && !isSelf) return res.status(403).json({message: '403 Forbidden'})
        next()
    }
}

const verifyUser = (req, res, next) => {
    try {
        const id = req.params.userId || req.query.userId
        const { role, userId } = req.user
        if ([RoleEnum.Staff, RoleEnum.Admin].includes(role) || id === userId) {
            next()
        } else {
            return res.status(403).json({message: '403 Forbidden'})
        }
    } catch (error) {
        return res.status(403).json({message: '403 Forbidden'})
    }
}

const isStaff = (req, res, next) => {
    try {
        const id = req.params.userId || req.query.userId
        const { role, userId } = req.user
        if ([RoleEnum.Staff, RoleEnum.Admin].includes(role) || id === userId) {
            next()
        } else {
            return res.status(403).json({message: '403 Forbidden'})
        }
    } catch (error) {
        return res.status(403).json({message: '403 Forbidden'})
    }
}

const isAdmin = (req, res, next) => {
    const role = req.user?.role
    if (role === RoleEnum.Admin) {
        next()
    } else {
        return res.status(403).json({message: '403 Forbidden'})
    }
}


module.exports = { verifyToken, optionalVerifyToken, checkRole, verifyUser, isStaff, isAdmin }
