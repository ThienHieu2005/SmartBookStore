require('dotenv').config()

const app = require('./app')
const connectMongoDB = require('./db')
const PORT = process.env.PORT || 5000

if (require.main === module) {
    connectMongoDB()
    app.listen(PORT, function() {
        console.log(`Server đang chạy PORT ${PORT}`)
    })
}

module.exports = app
