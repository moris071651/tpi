const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const crypto = require('node:crypto')
const sinon = require('sinon')

const utils = require('../utils.js')
const dashboard = require('../dashboard.js')
const assert = require('node:assert')

describe('dashboard', () => {
    let req, res, db, ss
    let password = 'Qwerty1234!'
    let userId = '394ee0f4-a435-42a1-af52-33c50147cea2'

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
                userId: userId
            }
        }

        sinon.stub(utils, 'isUserLoggedIn').returns(true)
        sinon.stub(utils, 'redirectTo')
        sinon.stub(utils, 'parseCookies').returns({ sessionId: 'valid-session' })
        sinon.stub(utils, 'errorReturner')
        sinon.stub(utils, 'youAreNotLoggedInReturner')
    })

    afterEach(() => {
        sinon.restore()
    })

    describe('page(req, res, _db, ss)', () => {
        it('',  () => {
            utils.isUserLoggedIn.returns(false)

            dashboard.page(req, res, db, ss)

            sinon.assert.calledOnceWithMatch(utils.redirectTo, res, 'http://localhost:8653/login')
        })
        it('',  () => {
            const mockStream = { pipe: sinon.spy() }
            sinon.stub(fs, 'createReadStream').returns(mockStream)

            dashboard.page(req, res, db, ss)

            sinon.assert.calledOnceWithMatch(fs.createReadStream, './dashboard.html')
            sinon.assert.calledOnceWithMatch(res.writeHead, 200, { 'Content-Type': 'text/html' })
            sinon.assert.calledOnceWithMatch(mockStream.pipe, res)
        })
    })

    describe('api(req, res, db, ss)', () => {
        it('', async () => {
            utils.isUserLoggedIn.returns(false)
    
            await dashboard.api(req, res, db, ss)
    
            sinon.assert.calledOnceWithMatch(utils.youAreNotLoggedInReturner, res)
        })

        it('', async () => {
            const data = { username: 'hello', email: 'fake'}
            db.query.resolves({ rows: [data] })
    
            await dashboard.api(req, res, db, ss)
    
            sinon.assert.calledOnceWithMatch(res.writeHead, 200, { 'Content-Type': 'application/json' })
            sinon.assert.calledOnceWithMatch(res.end, JSON.stringify(data))
        })
    })

    describe('namechangeApi(req, res, db, ss)', () => {
        const helpEmitter = async (data) => {
            req.emit('data', JSON.stringify(data))
            req.emit('end')
            await new Promise(resolve => setImmediate(resolve))
        }

        it('',  async () => {
            utils.isUserLoggedIn.returns(false)

            dashboard.namechangeApi(req, res, db, ss)
            await helpEmitter({})

            sinon.assert.calledOnceWithMatch(utils.youAreNotLoggedInReturner, res)
        })

        it('', async () => {
            db.query.resolves({ rows: [{ passhash: 'password' }] })

            dashboard.namechangeApi(req, res, db, ss)
            await helpEmitter({ username: 'hello' })

            sinon.assert.calledOnceWithMatch(res.writeHead, 200, { 'Content-Type': 'application/json' })
            sinon.assert.calledOnceWithMatch(res.end, JSON.stringify({ok: 'username changed'}))
        })
    })

    describe('passchangeApi(req, res, db, ss)', () => {
        const helpEmitter = async (data) => {
            req.emit('data', JSON.stringify(data))
            req.emit('end')
            await new Promise(resolve => setImmediate(resolve))
        }

        it('', async () => {
            utils.isUserLoggedIn.returns(false)

            dashboard.passchangeApi(req, res, db, ss)
            await helpEmitter({})

            sinon.assert.calledOnceWithMatch(utils.youAreNotLoggedInReturner, res)
        })

        it('1', async () => {
            db.query.resolves({ rows: [{ passhash: password }] })

            let func2 = sinon.spy()
            let func3 = sinon.stub().returns(password + '1')
            sinon.stub(crypto, 'createHash').returns({ update: func2, digest: func3 })

            dashboard.passchangeApi(req, res, db, ss)
            await helpEmitter({})

            sinon.assert.calledOnceWithMatch(utils.errorReturner, res, 400, 'Wrong current password')
        })

        it('2', async () => {
            let newpass = password + '1'

            db.query
                .onFirstCall().resolves({ rows: [{ passhash: password }] })
                .onSecondCall().resolves({ rows: [] })

            let func3 = sinon.spy()
            let func4 = sinon.stub()
            func4.onFirstCall().returns(password)
            func4.onSecondCall().returns(newpass)
            sinon.stub(crypto, 'createHash').returns({ update: func3, digest: func4 })

            dashboard.passchangeApi(req, res, db, ss)
            await helpEmitter({
                oldpass: password,
                newpass: newpass
            })

            sinon.assert.calledOnceWithMatch(res.writeHead, 200, { 'Content-Type': 'application/json' })
            sinon.assert.calledOnceWithMatch(res.end, JSON.stringify({ok: 'password changed'}))
        })
    })

    describe('logoutApi(req, res, _db, ss)', () => {
        it('',  () => {
            utils.isUserLoggedIn.returns(false)

            dashboard.logoutApi(req, res, db, ss)

            sinon.assert.calledOnceWithMatch(utils.youAreNotLoggedInReturner, res)
        })

        it('', () => {
            dashboard.logoutApi(req, res, db, ss)

            assert.strictEqual(Object.hasOwn(ss, 'valid-session'), false)
            sinon.assert.calledOnceWithMatch(res.writeHead, 200, {
                'Content-Type': 'application/json',
                'Set-Cookie': 'sessionId=; Path=/; Max-Age=0; SameSite=Lax',
            })
            sinon.assert.calledOnceWithMatch(res.end, JSON.stringify({
                ok: 'You are logged out',
                redirectURL: 'http://localhost:8653/dashboard'
            }))
        })
    })
})