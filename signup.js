const fs = require('node:fs')
const crypto = require('node:crypto')

const utils = require('./utils.js')

const page = (req, res, _db, ss) => {
    const cookies = utils.parseCookies(req)
    
    if (Object.hasOwn(ss, cookies.sessionId)) {
        res.writeHead(302, { Location: 'http://localhost:8653/dashboard' })
        res.end()
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

        if (Object.hasOwn(session, cookies.sessionId)) {
            utils.errorReturner(res, 400, 'You are already logged in')
            return
        }

        let formData = JSON.parse(body)

        const query = db.prepare(`
            SELECT * FROM users
            WHERE email = :email
        `).all({ ':email': formData.email })

        if (Object.keys(query).length !== 0) {
            utils.errorReturner(res, 400, 'This email is already used')
            return
        }

        const hash = crypto.createHash('sha256')
        hash.update(formData.password)
        const passhash = hash.digest('hex')

        let userId = crypto.randomUUID().toString()
        const insert = db.prepare(`
            INSERT INTO users (user_id, username, email, passhash)
            VALUES (:userId, :username, :email, :passhash)
        `)

        insert.run({
            ':userId': userId,
            ':username': formData.username,
            ':email': formData.email,
            ':passhash': passhash
        })

        let sessionId = crypto.randomUUID().toString()
        ss[sessionId] = {
            userId: userId
        }

        res.writeHead(201, {
            'Content-Type': 'application/json',
            'Set-Cookie': `sessionId=${sessionId}; Path=/; SameSite=Lax`,
        })
        res.end(JSON.stringify({ ok: 'New user created' }))
    })
}

module.exports = { page, api }
