const http = require('node:http')
const querystring = require('node:querystring')

const server = http.createServer()

const hello = (_, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
        data: 'Hello World!',
    }))
}

const signup = (req, res) => {
    let data = ''
    req.on('data', (chunk) => {
        data += chunk.toString()
    })

    req.on('end', () => {
        let formData = querystring.parse(data)


        console.log(formData)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ data: 'Hello World!' }))
    })
}

const routes = {
    '/api/hello': {
        'GET': hello
    },
    '/api/signup': {
        'POST': signup
    }
}

const errorReturner = (res, code, msg) => {
    if (msg === undefined) msg = http.STATUS_CODES[code]
    res.writeHead(code, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
        error: msg,
    }))
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

    routes[url.pathname][req.method](req, res)
})

server.on('error', (e) => {
  console.error(`Got error: ${e.message}`)
})

server.listen(8653)
