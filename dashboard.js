const fs = require('node:fs')

const utils = require('./utils.js')

const page = (req, res, _db, ss) => {
    const cookies = utils.parseCookies(req)
    
    if (!Object.hasOwn(ss, cookies.sessionId)) {
        res.writeHead(302, { Location: 'http://localhost:8653/login' })
        res.end()
        return
    }

    const file = fs.createReadStream('./dashboard.html')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    file.pipe(res)
}

const api = (req, res, db, ss) => {
    const cookies = utils.parseCookies(req)
    
    if (!Object.hasOwn(ss, cookies.sessionId)) {
        utils.errorReturner(res, 400, 'You are not logged in')
        return
    }
    
    const query = db.prepare(`
        SELECT username, email FROM users
        WHERE user_id = :userId
    `)
    const user = query.get({ ':userId':  ss[cookies.sessionId].userId })

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(user))
}

module.exports = { page, api }
