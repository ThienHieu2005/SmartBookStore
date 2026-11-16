const test = require('node:test')
const assert = require('node:assert/strict')
const router = require('./bookViewHistory')

test('history reads require authentication; anonymous users have no read route', () => {
    const routes = router.stack.filter(layer => layer.route).map(layer => layer.route)
    const historyRead = routes.find(route => route.path === '/' && route.methods.get)
    const anonymousDelete = routes.find(route => route.path === '/anonymous' && route.methods.delete)
    assert.ok(historyRead)
    assert.equal(historyRead.stack[0].name, 'verifyToken')
    assert.ok(anonymousDelete)
    assert.equal(routes.some(route => route.methods.get && route.path === '/anonymous'), false)
})
