const http = require('node:http')

const parseCookies = (req) => {
    const list = {}
    const cookieHeader = req.headers?.cookie
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

const errorReturner = (res, code, msg, misc = {}) => {
    if (msg === undefined) msg = http.STATUS_CODES[code]
    res.writeHead(code, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
        error: msg,
        ...misc
    }))
}

const isUserLoggedIn = (req, ss) => {
    const cookies = parseCookies(req)

    if (!Object.hasOwn(ss, cookies.sessionId)) {
        return false
    }

    if (!Object.hasOwn(ss[cookies.sessionId], 'userId')) {
        return false
    }

    return true;    
}

const redirectTo = (res, loc) => {
    res.writeHead(302, { 'Location': loc })
    res.end()
}

const youAreNotLoggedInReturner = (res, loc = 'http://localhost:8653/login') => {
    errorReturner(res, 401, 'You are not logged in', {
        redirectURL: loc
    })
}

const youAreLoggedInReturner = (res, loc = 'http://localhost:8653/dashboard') => {
    errorReturner(res, 409, 'You are already logged in', {
        redirectURL: loc
    })
}

module.exports = { parseCookies, errorReturner, isUserLoggedIn, redirectTo, youAreNotLoggedInReturner, youAreLoggedInReturner }
