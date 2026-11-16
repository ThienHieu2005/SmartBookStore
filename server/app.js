const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const app = express()

const allowedOrigins = new Set([
    'http://localhost:3000',
    process.env.REACT_APP_URL,
    process.env.REACT_APP_URL_1
].filter(Boolean))

if ((process.env.NODE_ENV || 'development') === 'development') {
    allowedOrigins.add('http://localhost:3001')
}

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true)
        }
        callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
}
app.use(cors(corsOptions))

app.use(cookieParser())
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

require('./routes')(app)

module.exports = app
