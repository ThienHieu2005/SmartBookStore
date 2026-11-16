const test = require('node:test')
const assert = require('node:assert/strict')
const createRateLimit = require('./bookViewRateLimit')

test('limits view requests per authenticated or anonymous identity and resets after window', () => {
    let now = 1000
    const middleware = createRateLimit({ windowMs: 60000, max: 2, now: () => now })
    const invoke = (req) => {
        let statusCode = 200
        let continued = false
        const res = { status(code) { statusCode = code; return this }, json() { return this } }
        middleware(req, res, () => { continued = true })
        return { statusCode, continued }
    }
    const guest = { body: { anonymousId: 'session-a' } }
    assert.equal(invoke(guest).continued, true)
    assert.equal(invoke(guest).continued, true)
    assert.deepEqual(invoke(guest), { statusCode: 429, continued: false })
    now += 60001
    assert.equal(invoke(guest).continued, true)
})
