const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const User = require('../models/users.model')
const { optionalVerifyToken, verifyToken, checkRole } = require('./auth')
const { RoleEnum } = require('../utils/enum')

const responseRecorder = () => ({
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this }
})

test('optional authentication allows a missing token but rejects a supplied invalid token', async () => {
    const originalVerify = jwt.verify
    let continued = false
    try {
        await optionalVerifyToken({ headers: {} }, responseRecorder(), () => { continued = true })
        assert.equal(continued, true)
        jwt.verify = () => { throw new Error('invalid') }
        const res = responseRecorder()
        await optionalVerifyToken({ headers: { authorization: 'Bearer invalid' } }, res, () => { continued = true })
        assert.equal(res.statusCode, 403)
    } finally {
        jwt.verify = originalVerify
    }
})

test('optional authentication derives active user identity from the verified JWT and database', async () => {
    const originalVerify = jwt.verify
    const originalFind = User.findById
    const userId = '507f1f77bcf86cd799439011'
    jwt.verify = () => ({ userId, role: 3 })
    User.findById = () => ({ select: () => ({ lean: async () => ({ _id: userId, role: 0, status: 1 }) }) })
    const req = { headers: { authorization: 'Bearer valid' }, body: { userId: 'spoofed' } }
    try {
        let continued = false
        await optionalVerifyToken(req, responseRecorder(), () => { continued = true })
        assert.equal(continued, true)
        assert.deepEqual(req.user, { userId, role: 0 })
        assert.notEqual(req.user.userId, req.body.userId)
    } finally {
        jwt.verify = originalVerify
        User.findById = originalFind
    }
})

test('required authentication trusts the database role and rejects invalid or disabled accounts', async () => {
    const originalVerify = jwt.verify
    const originalFind = User.findById
    const userId = '507f1f77bcf86cd799439011'
    jwt.verify = () => ({ userId, role: RoleEnum.Admin })
    let databaseUser = { _id: userId, role: RoleEnum.Customer, status: 1 }
    User.findById = () => ({ select: () => ({ lean: async () => databaseUser }) })
    try {
        const req = { headers: { authorization: 'Bearer signed-token' } }
        let continued = false
        await verifyToken(req, responseRecorder(), () => { continued = true })
        assert.equal(continued, true)
        assert.equal(req.user.role, RoleEnum.Customer)

        for (const invalidUser of [
            { _id: userId, role: 99, status: 1 },
            { _id: userId, role: RoleEnum.Admin, status: 0 }
        ]) {
            databaseUser = invalidUser
            const res = responseRecorder()
            await verifyToken({ headers: { authorization: 'Bearer signed-token' } }, res, () => assert.fail('Must reject'))
            assert.equal(res.statusCode, 403)
        }
    } finally {
        jwt.verify = originalVerify
        User.findById = originalFind
    }
})

test('backend permissions distinguish customer, staff, admin, and admin-only routes', () => {
    const invoke = (role, permissions) => {
        const res = responseRecorder()
        let continued = false
        checkRole(permissions)({ user: { role, userId: 'u1' }, params: {} }, res, () => { continued = true })
        return { continued, statusCode: res.statusCode }
    }
    const staffOrAdmin = [RoleEnum.Staff, RoleEnum.Admin]
    const adminOnly = [RoleEnum.Admin]
    assert.equal(invoke(RoleEnum.Customer, staffOrAdmin).statusCode, 403)
    assert.equal(invoke(RoleEnum.Staff, staffOrAdmin).continued, true)
    assert.equal(invoke(RoleEnum.Admin, staffOrAdmin).continued, true)
    assert.equal(invoke(RoleEnum.Staff, adminOnly).statusCode, 403)
    assert.equal(invoke(RoleEnum.Admin, adminOnly).continued, true)
    assert.equal(invoke(99, staffOrAdmin).statusCode, 403)
})
