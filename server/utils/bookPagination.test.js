const test = require('node:test')
const assert = require('node:assert/strict')
const { parseBookPagination, getTotalPage } = require('./bookPagination')

test('defaults to an unbounded list when limit is omitted', () => {
    assert.deepEqual(parseBookPagination({}), { page: 1, limit: 0, skip: 0 })
    assert.equal(getTotalPage(18, 0), 1)
    assert.equal(getTotalPage(0, 0), 0)
})

test('parses valid page and limit and computes page counts without rounding down', () => {
    assert.deepEqual(parseBookPagination({ page: '1', limit: '10' }), { page: 1, limit: 10, skip: 0 })
    assert.deepEqual(parseBookPagination({ page: '3', limit: '10' }), { page: 3, limit: 10, skip: 20 })
    assert.equal(getTotalPage(11, 10), 2)
    assert.equal(getTotalPage(0, 10), 0)
})

test('rejects malformed, zero, negative, decimal, and oversized pagination values', () => {
    for (const page of ['0', '-1', '1.5', '2abc', '', '9007199254740992']) {
        assert.throws(() => parseBookPagination({ page, limit: '10' }), { status: 400 })
    }
    for (const limit of ['0', '-1', '1.5', '10abc', '', '1001']) {
        assert.throws(() => parseBookPagination({ page: '1', limit }), { status: 400 })
    }
    assert.throws(() => parseBookPagination({ page: '2' }), { status: 400 })
    assert.throws(() => parseBookPagination({ page: '214748366', limit: '10' }), { status: 400 })
})
