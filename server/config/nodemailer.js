const nodemailer = require('nodemailer')

const {
    GOOGLE_GMAIL_CLIENT_ID: clientId,
    GOOGLE_GMAIL_CLIENT_SECRET: clientSecret,
    GOOGLE_GMAIL_REFRESH_TOKEN: refreshToken
} = process.env

const missingConfig = Object.entries({
    GOOGLE_GMAIL_CLIENT_ID: clientId,
    GOOGLE_GMAIL_CLIENT_SECRET: clientSecret,
    GOOGLE_GMAIL_REFRESH_TOKEN: refreshToken
}).filter(([, value]) => !value?.trim()).map(([name]) => name)

const configurationError = missingConfig.length > 0
    ? `Chưa cấu hình gửi email Gmail. Thiếu biến môi trường: ${missingConfig.join(', ')}`
    : null

function ensureEmailConfigured() {
    if (configurationError) throw new Error(configurationError)
}

let transporter
if (configurationError) {
    console.warn(configurationError)
    transporter = {
        async sendMail() {
            ensureEmailConfigured()
        }
    }
} else {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: 'project.php.nhncomputer@gmail.com',
            clientId,
            clientSecret,
            refreshToken
        }
    })
}

module.exports = { transporter, ensureEmailConfigured, isEmailConfigured: !configurationError }
