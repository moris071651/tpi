const fs = require('node:fs')
const crypto = require('node:crypto')

const utils = require('./utils.js')

const page = (req, res, _db, ss) => {
    if (!utils.isUserLoggedIn(req, ss)) {
        utils.redirectTo(res, 'http://localhost:8653/login')
        return
    }

    const file = fs.createReadStream('./dashboard.html')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    file.pipe(res)
}

const api = (req, res, db, ss) => {
    const cookies = utils.parseCookies(req)
    
    if (!utils.isUserLoggedIn(req, ss)) {
        utils.youAreNotLoggedInReturner(res)
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

const namechangeApi = (req, res, db, ss) => {
    let body = ''
    req.on('data', (chunk) => {
        body += chunk.toString()
    })

    req.on('end', () => {
        const cookies = utils.parseCookies(req)
        
        if (!utils.isUserLoggedIn(req, ss)) {
            utils.youAreNotLoggedInReturner(res)
            return
        }

        const query = db.prepare(`
            UPDATE users
            SET username = :newUsername
            WHERE user_id = :userId
        `)
            
        const data = JSON.parse(body)
        query.run({
            ':userId': ss[cookies.sessionId].userId,
            ':newUsername': data.username
        })

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ok: 'username changed'}))
    })
}

const passchangeApi = (req, res, db, ss) => {
    let body = ''
    req.on('data', (chunk) => {
        body += chunk.toString()
    })

    req.on('end', () => {
        const cookies = utils.parseCookies(req)
        
        if (!utils.isUserLoggedIn(req, ss)) {
            utils.youAreNotLoggedInReturner(res)
            return
        }

        const data = JSON.parse(body)

        const hash1 = crypto.createHash('sha256')
        hash1.update(data.oldpass)
        const oldpasshash = hash1.digest('hex')

        const query1 = db.prepare(`
            SELECT passhash FROM users
            WHERE user_id = :userId
        `)
        const curpasshash = query1.get({
            ':userId': ss[cookies.sessionId].userId
        }).passhash

        if (curpasshash !== oldpasshash) {
            utils.errorReturner(res, 400, 'Wrong current password')
            return
        }

        const hash2 = crypto.createHash('sha256')
        hash2.update(data.newpass)
        const newpasshash = hash2.digest('hex')
        
        const query2 = db.prepare(`
            UPDATE users
            SET passhash = :newPasshash
            WHERE user_id = :userId
        `)
            
        query2.run({
            ':userId': ss[cookies.sessionId].userId,
            ':newPasshash': newpasshash
        })

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ok: 'password changed'}))
    })
}

const logoutApi = (req, res, db, ss) => {
    const cookies = utils.parseCookies(req)
    
    if (!utils.isUserLoggedIn(req, ss)) {
        utils.youAreNotLoggedInReturner(res)
        return
    }

    delete ss[cookies.sessionId]

    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': 'sessionId=; Path=/; Max-Age=0; SameSite=Lax',
    })
    res.end(JSON.stringify({
        ok: 'You are logged out',
        'redirectURL': 'http://localhost:8653/dashboard'
    }))
}

module.exports = { page, api, passchangeApi, namechangeApi, logoutApi }
