const fs = require('node:fs')
const http = require('node:http')
const crypto = require('node:crypto')
const { Database } = require('node:sqlite')

const db = new Database('app.db')
db.exec(`
    CREATE TABLE IF NOT EXISTS users(
        user_id TEXT PRIMARY KEY,
        username TEXT,
        email TEXT UNIQUE,
        passhash TEXT
    ) STRICT
`)

const session = {}
const server = http.createServer()

const parseCookies = (request) => {
    const list = {}
    const cookieHeader = request.headers?.cookie
    if (!cookieHeader) return list

    cookieHeader.split(';').forEach(function(cookie) {
        let [ name, ...rest] = cookie.split('=')
        name = name?.trim()

        if (!name) return
        const value = rest.join('=').trim()

        if (!value) return
        list[name] = value
    })

    return list
}

const hello = (_, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
        data: 'Hello World!',
    }))
}

const errorReturner = (res, code, msg) => {
    if (msg === undefined) msg = http.STATUS_CODES[code]
    res.writeHead(code, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
        error: msg,
    }))
}

const signupPage = (_, res) => {
    const file = fs.createReadStream('./signup.html')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    file.pipe(res)
}

const signup = (req, res) => {
    let data = ''
    req.on('data', (chunk) => {
        data += chunk.toString()
    })

    req.on('end', () => {
        const cookies = parseCookies(req)

        if (Object.hasOwn(session, cookies.sessionId)) {
            errorReturner(res, 400, 'You are already logged in')
            return
        }

        let formData = JSON.parse(data)

        const query = db.prepare(`
            SELECT * FROM users
            WHERE email = :email
        `).all({ ':email': formData.email })

        if (Object.keys(query).length !== 0) {
            errorReturner(res, 400, 'This email is already used')
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
        session[sessionId] = {
            userId: userId
        }

        res.writeHead(201, {
            'Content-Type': 'application/json',
            'Set-Cookie': `sessionId=${sessionId}; Path=/; SameSite=Lax`,
        })
        res.end(JSON.stringify({ ok: 'New user created' }))
    })
}

const loginPage = (_, res) => {
    const file = fs.createReadStream('./login.html')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    file.pipe(res)
}

const login = (req, res) => {
    let data = ''
    req.on('data', (chunk) => {
        data += chunk.toString()
    })

    req.on('end', () => {
        const cookies = parseCookies(req)

        if (Object.hasOwn(session, cookies.sessionId)) {
            errorReturner(res, 400, 'You are already logged in')
            return
        }

        let formData = JSON.parse(data)

        const hash = crypto.createHash('sha256')
        hash.update(formData.password)
        const passhash = hash.digest('hex')

        const query = db.prepare(`
            SELECT user_id as userId, email, passhash FROM users
            WHERE email = :email
        `)
        const user = query.get({ ':email': formData.email })

        if (!user) {
            errorReturner(res, 400, 'Wrong email or password')
            return
        }

        if (user.passhash !== passhash) {
            errorReturner(res, 400, 'Wrong email or password')
            return
        }

        let sessionId = crypto.randomUUID().toString()
        session[sessionId] = {
            userId: user.userId
        }

        res.writeHead(201, {
            'Content-Type': 'application/json',
            'Set-Cookie': `sessionId=${sessionId}; Path=/; SameSite=Lax`,
        })
        res.end(JSON.stringify({ ok: 'New session created' }))
    })
}


const routes = {
    '/api/hello': {
        'GET': hello
    },
    '/api/signup': {
        'POST': signup
    },
    '/signup': {
        'GET': signupPage
    },
    '/api/login': {
        'POST': login
    },
    '/login': {
        'GET': loginPage
    }
}


server.on('request', (req, res) => {
    let url = new URL(`http://${process.env.HOST ?? 'localhost'}${req.url}`)
    
    if (!routes.hasOwnProperty(url.pathname)) {
        errorReturner(res, 404)
        return
    }

    if (!routes[url.pathname].hasOwnProperty(req.method)) {
        errorReturner(res, 405)
        return
    }

    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8653');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    routes[url.pathname][req.method](req, res)
})

server.on('error', (e) => {
  console.error(`Got error: ${e.message}`)
})

server.listen(8653)
