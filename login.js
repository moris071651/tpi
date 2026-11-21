const fs = require('node:fs')
const crypto = require('node:crypto')

const utils = require('./utils.js')

const page = (req, res, _db, ss) => {
    if (utils.isUserLoggedIn(req, ss)) {
        utils.redirectTo('http://localhost:8653/dashboard')
        return
    }
    
    const file = fs.createReadStream('./login.html')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    file.pipe(res)
}

const api = (req, res, db, ss) => {
    let body = ''
    req.on('data', (chunk) => {
        body += chunk.toString()
    })

    req.on('end', () => {
        if (utils.isUserLoggedIn(req, ss)) {
            utils.youAreLoggedInReturner(res)
            return
        }

        let data = JSON.parse(body)

        const hash = crypto.createHash('sha256')
        hash.update(data.password)
        const passhash = hash.digest('hex')

        const query = db.prepare(`
            SELECT user_id as userId, email, passhash FROM users
            WHERE email = :email
        `)
        const user = query.get({ ':email': data.email })

        if (!user) {
            utils.errorReturner(res, 400, 'Wrong email or password')
            return
        }

        if (user.passhash !== passhash) {
            utils.errorReturner(res, 400, 'Wrong email or password')
            return
        }

        let sessionId = crypto.randomUUID().toString()
        ss[sessionId] = {
            userId: user.userId
        }

        res.writeHead(201, {
            'Content-Type': 'application/json',
            'Set-Cookie': `sessionId=${sessionId}; Path=/; SameSite=Lax`,
        })
        res.end(JSON.stringify({ ok: 'New session created' }))
    })
}

module.exports = { page, api }
