const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const crypto = require('node:crypto')
const sinon = require('sinon')

const utils = require('../utils.js')
const signup = require('../signup.js')

describe('signup', () => {
    let req, res, db, ss

    beforeEach(() => {
        req = new EventEmitter()
        req.headers = {}

        res = {
            writeHead: sinon.spy(),
            end: sinon.spy()
        }

        db = {
            query: sinon.stub()
        }

        ss = {
            'valid-session': {
                captchaText: 'AAAA'
            }
        }

        sinon.stub(utils, 'isUserLoggedIn').returns(false)
        sinon.stub(utils, 'redirectTo')
        sinon.stub(utils, 'parseCookies').returns({ sessionId: 'valid-session' })
        sinon.stub(utils, 'errorReturner')
        sinon.stub(utils, 'youAreLoggedInReturner')
    })

    afterEach(() => {
        sinon.restore()
    })

    describe('page(req, res, _db, ss)', () => {
        it('',  () => {
            utils.isUserLoggedIn.returns(true)

            signup.page(req, res, db, ss)

            sinon.assert.calledOnceWithMatch(utils.redirectTo, res, 'http://localhost:8653/dashboard')
        })
        it('',  () => {
            const mockStream = { pipe: sinon.spy() }
            sinon.stub(fs, 'createReadStream').returns(mockStream)

            signup.page(req, res, db, ss)

            sinon.assert.calledOnceWithMatch(fs.createReadStream, './signup.html')
            sinon.assert.calledOnceWithMatch(res.writeHead, 200, { 'Content-Type': 'text/html' })
            sinon.assert.calledOnceWithMatch(mockStream.pipe, res)
        })
    })

    describe('api()', () => {
        const helpEmitter = (data) => {
            req.emit('data', JSON.stringify(data))
            req.emit('end')
        }

        it('', () => {
            utils.parseCookies.returns({ sessionId: 'not-valid-session' })

            signup.api(req, res, db, ss)
            helpEmitter({})

            sinon.assert.calledOnceWithMatch(utils.errorReturner, res, 400, 'generate captcha first')
        })

        it('', () => {
            utils.parseCookies.returns({ notSessionId: 'valid-session' })

            signup.api(req, res, db, ss)
            helpEmitter({})

            sinon.assert.calledOnceWithMatch(utils.errorReturner, res, 400, 'generate captcha first')
        })

        it('', () => {
            utils.isUserLoggedIn.returns(true)

            signup.api(req, res, db, ss)
            helpEmitter({})

            sinon.assert.calledOnceWithMatch(utils.youAreLoggedInReturner, res)
        })

        it('', () => {
            signup.api(req, res, db, ss)
            helpEmitter({ captcha: 'BBBB' })

            sinon.assert.calledOnceWithMatch(utils.errorReturner, res, 400, 'wrong captcha')
        })

        it('', async () => {
            db.query.returns({ rows: [{}] })

            signup.api(req, res, db, ss)
            helpEmitter({ captcha: 'AAAA', email: 'fake' })

            await new Promise(resolve => setImmediate(resolve))

            sinon.assert.calledOnceWithMatch(utils.errorReturner, res, 400, 'This email is already used')
        })

        it('', async () => {
            let password = 'Qwerty1234!'
            let userId = '394ee0f4-a435-42a1-af52-33c50147cea2'

            db.query
                .onFirstCall().returns({ rows: [] })
                .onSecondCall().returns({ rows: [{ user_id: userId }] })

            let func1 = sinon.spy()
            let func2 = sinon.stub().returns(password)
            sinon.stub(crypto, 'createHash').returns({ update: func1, digest: func2 })

            signup.api(req, res, db, ss)
            helpEmitter({
                captcha: 'AAAA',
                email: 'fake',
                password: password,
                username: 'hello'
            })

            await new Promise(resolve => setImmediate(resolve))

            sinon.assert.calledOnceWithMatch(res.writeHead, 201, { 'Content-Type': 'application/json' })
            sinon.assert.calledOnceWithMatch(res.end, JSON.stringify({ ok: 'New user created' }))
        })
    })
})
