const fs = require('node:fs')
const crypto = require('node:crypto')

const utils = require('./utils.js')

const page = (req, res, _db, ss) => {
    if (utils.isUserLoggedIn(req, ss)) {
        utils.redirectTo(res, 'http://localhost:8653/dashboard')
        return
    }
    
    const file = fs.createReadStream('./signup.html')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    file.pipe(res)
}

const api = (req, res, db, ss) => {
    let body = ''
    req.on('data', (chunk) => {
        body += chunk.toString()
    })

    req.on('end', () => {
        const cookies = utils.parseCookies(req)
        if (!Object.hasOwn(ss, cookies.sessionId)) {
            utils.errorReturner(res, 400, 'generate captcha first')
            return
        }
        
        if (utils.isUserLoggedIn(req, ss)) {
            utils.youAreLoggedInReturner(res)
            return
        }

        let data = JSON.parse(body)

        if (ss[cookies.sessionId].captchaText !== data.captcha) {
            utils.errorReturner(res, 400, 'wrong captcha')
            return
        }

        const query = db.prepare(`
            SELECT * FROM users
            WHERE email = :email
        `).all({ ':email': data.email })

        if (Object.keys(query).length !== 0) {
            utils.errorReturner(res, 400, 'This email is already used')
            return
        }

        const hash = crypto.createHash('sha256')
        hash.update(data.password)
        const passhash = hash.digest('hex')

        let userId = crypto.randomUUID().toString()
        const insert = db.prepare(`
            INSERT INTO users (user_id, username, email, passhash)
            VALUES (:userId, :username, :email, :passhash)
        `)

        insert.run({
            ':userId': userId,
            ':username': data.username,
            ':email': data.email,
            ':passhash': passhash
        })

        ss[cookies.sessionId].userId = userId
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: 'New user created' }))
    })
}

module.exports = { page, api }
