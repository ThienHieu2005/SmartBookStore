const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')

test('importing the application entrypoint does not connect MongoDB or start HTTP', () => {
    process.env.NODE_ENV = 'test'
    process.env.REDIS_HOST = ''
    const app = require('./index')
    assert.equal(typeof app.listen, 'function')
    assert.equal(mongoose.connection.readyState, 0)
})
