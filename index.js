const http = require('node:http')
const { Database } = require('node:sqlite')

const utils = require('./utils.js')
const signup = require('./signup.js')
const login = require('./login.js')

const db = new Database('app.db')
db.exec(`
    CREATE TABLE IF NOT EXISTS users(
        user_id TEXT PRIMARY KEY,
        username TEXT,
        email TEXT UNIQUE,
        passhash TEXT
    ) STRICT
`)

const ss = {}
const server = http.createServer()

const routes = {
    '/api/signup': {
        'POST': signup.signup
    },
    '/signup': {
        'GET': signup.signupPage
    },
    '/api/login': {
        'POST': login.login
    },
    '/login': {
        'GET': login.loginPage
    }
}

server.on('request', (req, res) => {
    let url = new URL(`http://${process.env.HOST ?? 'localhost'}${req.url}`)
    
    if (!routes.hasOwnProperty(url.pathname)) {
        utils.errorReturner(res, 404)
        return
    }

    if (!routes[url.pathname].hasOwnProperty(req.method)) {
        utils.errorReturner(res, 405)
        return
    }

    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8653');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    routes[url.pathname][req.method](req, res, db, ss)
})

server.on('error', (e) => {
  console.error(`Got error: ${e.message}`)
})

server.listen(8653)
