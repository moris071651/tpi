const svgCaptcha = require('svg-captcha')

const utils = require('./utils.js')

const image = (req, res, _db, ss) => {
    const captcha = svgCaptcha.create()

    const cookies = utils.parseCookies(req)
    if (Object.hasOwn(ss, cookies.sessionId)) {
        ss[cookies.sessionId].captchaText = captcha.text
    }
    else {
        const sessionId = crypto.randomUUID().toString()
        ss[sessionId] = {
            captchaText: captcha.text
        }

        res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; SameSite=Lax`)
    }

    res.writeHead(200, { 'Content-Type': 'image/svg+xml' })
    res.end(captcha.data)
}

module.exports = { image }