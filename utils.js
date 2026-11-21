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

const errorReturner = (res, code, msg) => {
    if (msg === undefined) msg = http.STATUS_CODES[code]
    res.writeHead(code, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
        error: msg,
    }))
}

module.exports = { parseCookies, errorReturner }
