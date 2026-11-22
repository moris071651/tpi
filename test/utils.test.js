const http = require('node:http')
const sinon = require('sinon')

const utils = require('../utils.js')
const assert = require('node:assert')

describe('utils', () => {
    let req, res, ss

    beforeEach(() => {
        req = { headers: {} }

        res = {
            writeHead: sinon.spy(),
            end: sinon.spy()
        }

        db = {
            prepare: sinon.stub()
        }

        ss = {
            'valid-session': {
                userId: '394ee0f4-a435-42a1-af52-33c50147cea2'
            }
        }
    })

    afterEach(() => {
        sinon.restore()
    })

    describe('parseCookies(req)', () => {
        it('', () => {
            req.headers = {}

            const result = utils.parseCookies(req)

            assert.deepStrictEqual(result, {})
        })

        it('', () => {
            req.headers = { cookie: '' }

            const result = utils.parseCookies(req)

            assert.deepStrictEqual(result, {})
        })

        it('', () => {
            req.headers = { cookie: 'sessionId=valid-session' }

            const result = utils.parseCookies(req)

            assert.deepStrictEqual(result, { sessionId: 'valid-session' })
        })

        it('', () => {
            req.headers = { cookie: 'token=abc=123==' }

            const result = utils.parseCookies(req)

            assert.deepStrictEqual(result, { token: 'abc=123==' })
        })
    })

    describe('errorReturner(res, code, msg, misc = {})', () => {
        it('', () => {
            utils.errorReturner(res, 400, 'error')

            sinon.assert.calledOnceWithExactly(res.writeHead, 400, { 'Content-Type': 'application/json' })
            sinon.assert.calledOnceWithExactly(res.end, JSON.stringify({ error: 'error' }))
        })

        it('', () => {
            utils.errorReturner(res, 404)

            sinon.assert.calledOnceWithExactly(res.writeHead, 404, { 'Content-Type': 'application/json' })
            sinon.assert.calledOnceWithExactly(res.end, JSON.stringify({ error: http.STATUS_CODES[404] }))
        })

        it('', () => {
            utils.errorReturner(res, 400, 'error', { test: 'test' })

            sinon.assert.calledOnceWithExactly(res.writeHead, 400, { 'Content-Type': 'application/json' })
            sinon.assert.calledOnceWithExactly(res.end, JSON.stringify({ error: 'error', test: 'test' }))
        })
    })

    describe('isUserLoggedIn(req, ss)', () => {
        it('', () => {
            req.headers = { cookie: 'sessionId=not-valid-session' }
            
            let ret = utils.isUserLoggedIn(req, ss)

            assert.strictEqual(ret, false)
        })

        it('', () => {
            req.headers = { cookie: 'sessionId=valid-session' }
            delete (ss['valid-session']).userId
            ss['valid-session'].userId1 = '394ee0f4-a435-42a1-af52-33c50147cea2'

            let ret = utils.isUserLoggedIn(req, ss)

            assert.strictEqual(ret, false)
        })

        it('', () => {
            req.headers = { cookie: 'sessionId=valid-session' }
            
            let ret = utils.isUserLoggedIn(req, ss)

            assert.strictEqual(ret, true)
        })
    })

    describe('redirectTo(res, loc)', () => {
        it('', () => {
            let loc = 'loc'

            utils.redirectTo(res, loc)

            sinon.assert.calledOnceWithMatch(res.writeHead, 302, { 'Location': loc })
            sinon.assert.calledOnceWithMatch(res.end)
        })
    })

    describe('youAreNotLoggedInReturner(res, loc = \'http://localhost:8653/login\')', () => {
        it('', () => {
            utils.youAreNotLoggedInReturner(res)

            sinon.assert.calledOnceWithExactly(res.writeHead, 401, { 'Content-Type': 'application/json' })
            sinon.assert.calledOnceWithExactly(res.end, JSON.stringify({
                error: 'You are not logged in',
                redirectURL: 'http://localhost:8653/login'
            }))
        })

        it('', () => {
            const loc = 'here'

            utils.youAreNotLoggedInReturner(res, loc)

            sinon.assert.calledOnceWithExactly(res.writeHead, 401, { 'Content-Type': 'application/json' })
            sinon.assert.calledOnceWithExactly(res.end, JSON.stringify({
                error: 'You are not logged in',
                redirectURL: loc
            }))
        })
    })

    describe('youAreLoggedInReturner(res, loc = \'http://localhost:8653/dashboard\')', () => {
        it('', () => {
            utils.youAreLoggedInReturner(res)

            sinon.assert.calledOnceWithExactly(res.writeHead, 409, { 'Content-Type': 'application/json' })
            sinon.assert.calledOnceWithExactly(res.end, JSON.stringify({
                error: 'You are already logged in',
                redirectURL: 'http://localhost:8653/dashboard'
            }))
        })

        it('', () => {
            const loc = 'here'

            utils.youAreLoggedInReturner(res, loc)

            sinon.assert.calledOnceWithExactly(res.writeHead, 409, { 'Content-Type': 'application/json' })
            sinon.assert.calledOnceWithExactly(res.end, JSON.stringify({
                error: 'You are already logged in',
                redirectURL: loc
            }))
        })
    })
})
