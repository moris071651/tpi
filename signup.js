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

    req.on('end', async () => {
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

        const user = (await db.query(
            'SELECT * FROM users WHERE email = $1',
            [data.email]
        )).rows[0]

        if (user) {
            utils.errorReturner(res, 400, 'This email is already used')
            return
        }

        const hash = crypto.createHash('sha256')
        hash.update(data.password)
        const passhash = hash.digest('hex')

        const userId = (await db.query(`
            INSERT INTO users (user_id, username, email, passhash)
            VALUES (gen_random_uuid(), $1, $2, $3)
            RETURNING user_id
            `, [data.username, data.email, passhash]
        )).rows[0].user_id

        ss[cookies.sessionId].userId = userId
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: 'New user created' }))
    })
}

module.exports = { page, api }
