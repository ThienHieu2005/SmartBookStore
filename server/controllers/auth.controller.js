const { google } = require('googleapis')
const OAuth2 = google.auth.OAuth2

const OAuth2Client = new OAuth2()
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { isObjectIdOrHexString } = require('mongoose')

const { generateAccessToken, generateRefreshToken, generateVerifyCode } = require('../utils/auth')
const { transporter, ensureEmailConfigured, isEmailConfigured } = require('../config/nodemailer')
const userService = require('../services/user.service')
const { RoleEnum } = require('../utils/enum')

const authController = {
    loginWithGoogle: async(req, res) => {
        try {
            const { accessToken } = req.body
            OAuth2Client.setCredentials({
                access_token: accessToken,
              });
            const oAuth2 = google.oauth2({
                auth: OAuth2Client,
                version: "v2",
            })
            const { data } = await oAuth2.userinfo.get()

            if (data) {
                const  { verified_email, email, name, picture, id } = data
                if (verified_email) {
                    const user = await userService.getByServiceId(id, 'Google')
                    
                    if (user) {
                        if (user.status !== 1) return res.status(403).json({ message: '403 Forbidden' })
                        const { fullName, email, avatar, phoneNumber, role, _id } = user
                        const token = generateAccessToken({ userId: _id, role })
                        const refreshToken = generateRefreshToken(_id)
                        res.cookie('refreshToken', refreshToken, {
                            httpOnly: true,
                            secure: false,
                            maxAge: 1000 * 60 * 60 * 24 * 7,
                        })
                        return res.status(200).json({
                            token,
                            user: { fullName, email, avatar, phoneNumber, userId: _id, role }
                        })
                    } else {
                        const newUser = await userService.create({
                            email, fullName: name, 
                            avatar: { url: picture }, 
                            service: "Google", serviceId: id,
                            status: 1,
                        })
                        const token = generateAccessToken({ userId: newUser?._id, role: newUser?.role ?? RoleEnum.Customer })
                        const refreshToken = generateRefreshToken(newUser?._id)
                        res.cookie('refreshToken', refreshToken, {
                            httpOnly: true,
                            secure: false,
                            maxAge: 1000 * 60 * 60 * 24 * 7,
                        })
                        return res.status(200).json({
                            token,
                            user: { fullName: name, email, avatar: newUser.avatar, userId: newUser._id, role: newUser.role }
                        })
                    }
                }
              
            } 

            return res.status(500).json({
                message: 'Error',
                error: 1,
            })
            
        } catch (error) {
            console.log(error)
            res.status(500).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    loginWithFacebook: (req, res) => {
        return res.status(503).json({ error: 1, message: 'Đăng nhập Facebook chưa có xác minh phía máy chủ.' })
    },
    register: async(req, res) => {
        try {
            const { email, fullName, password } = req.body
            if (![email, fullName, password].every((value) => typeof value === 'string' && value.trim())) {
                return res.status(400).json({ error: 1, message: 'Vui lòng điền đầy đủ thông tin đăng ký!' })
            }

            const checkEmail = await userService.getByEmail(email)
            if (checkEmail)  return res.status(400).json({ message: 'Email đã tồn tại!', error: 1,})
            const isDevelopment = (process.env.NODE_ENV || 'development') === 'development'
            if (!isEmailConfigured && !isDevelopment) ensureEmailConfigured()
            
            const hashPassword = await bcrypt.hash(password, 10)

            // Local development can be used without Gmail; activate only local accounts.
            const result = await userService.register({
                email,
                fullName,
                password: hashPassword,
                status: !isEmailConfigured && isDevelopment ? 1 : undefined,
            })

            if (isEmailConfigured) {
                const code = generateVerifyCode({email})
                const host = req.get('origin')
                const link = `${host}/services/user/verify?active_code=${code}`
                await transporter.sendMail({
                    from: '"BookStore" <project.php.nhncomputer@gmail.com>',
                    to: email,
                    subject: `[BookStore] Chúc mừng bạn đăng ký thành công!`,
                    html: ` <h3>Xin chào ${fullName},</h3>
                            <h3>Bạn vừa tiến hành đăng ký tài khoản tại BookStore!</h3>
                            <p>Chúc mừng bạn trở thành thành viên BookStore.</p>
                            <p>Username : ${email}</p>
                            <a href="${link}">Nhấn vào đây để kích hoạt</a>`
                })
            }
            res.status(201).json({
                message: isEmailConfigured ? 'success' : 'Tạo tài khoản thành công trong môi trường development; tài khoản đã được kích hoạt vì Gmail chưa cấu hình.',
                error: 0,
                emailSent: isEmailConfigured,
                data: result
            })
            
        } catch (error) {
            console.log(error)
            res.status(500).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    sendVerificationEmail: async(req, res) => {
        try {
            const { email } = req.params

            const user = await userService.getByEmailRegister(email)
            if (!user) return res.status(400).json({status: "error", error: "User không tồn tại!"})

            const code = generateVerifyCode({email})
            const host = req.get('origin')
            const link = `${host}/services/user/verify?active_code=${code}`
            const resultSendMail = await transporter.sendMail({
                from: '"BookStore" <project.php.nhncomputer@gmail.com>',
                to: email,
                subject: `[BookStore] Chúc mừng bạn đăng ký thành công!`,
                html: ` <h3>Xin chào ${user.fullName},</h3>
                        <h3>Bạn vừa tiến hành đăng ký tài khoản tại BookStore!</h3>
                        <p>Chúc mừng bạn trở thành thành viên BookStore.</p>
                        <p>Username : ${email}</p>
                        <a href="${link}">Nhấn vào đây để kích hoạt</a>`
            })
            res.status(200).json({
                message: 'Ok',
                resultSendMail
            })
            
        } catch (error) {
            res.status(500).json({
                status: "error",
                error: error.message
            })
        }
    },
    verifyEmail: async(req, res) => {
        try {
            const { active_code } = req.query

            const { email } = jwt.verify(active_code, process.env.JWT_ACCESS_TOKEN_SECRET);
            if (typeof email !== 'string') return res.status(400).json({ error: 'Token không hợp lệ!' })
            const user = await userService.getByEmailRegister(email)
            if (user && user.role === RoleEnum.Customer) {
                await userService.updateStatus(user._id, { status: 1 })
                return res.status(200).json({message: "Xác minh tài khoản thành công!!"})
                
            }
            return res.status(400).json({error: "Không tìm thấy khách hàng!!"})
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) return res.status(400).json({ error: 'Token không hợp lệ!' })
            res.status(500).json({
                status: "error",
                error: error.message
            })
        }
    },
    loginBookStore: async(req, res) => {
        try {
            const { email, password } = req.body
            if (typeof email !== 'string' || typeof password !== 'string') {
                return res.status(400).json({ error: 1, message: 'Tài khoản, mật khẩu không đúng!' })
            }
            const user = await userService.getByEmailRegister(email)

            if (!user?.password) return res.status(400).json({error: 1, message: 'Tài khoản, mật khẩu không đúng!'})

            const { password: passwordDB, status,  fullName, phoneNumber, avatar, role, _id } = user

            const checkPassword = await bcrypt.compare(password, passwordDB)
            if (!checkPassword) return res.status(400).json({error: 1, message: 'Tài khoản, mật khẩu không đúng!'})

            if (status !== 1 && role === RoleEnum.Customer) return res.status(400).json({ error: 2, message: 'Tài khoản của bạn chưa được kích hoạt!' })
            if (status !== 1) return res.status(400).json({ error: 3, message: 'Tài khoản của bạn đã bị khóa!' })
            
            const token = generateAccessToken({ userId: _id, role })
            const refreshToken = generateRefreshToken(_id)
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: false,
                maxAge: 1000 * 60 * 60 * 24 * 7,
            })
            return res.status(200).json({
                token,
                user: {fullName, phoneNumber, email, avatar, userId: _id, role}
            })
            
        } catch (error) {
            res.status(500).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    handleForgotPassword: async(req, res) => {
        try {
            const { email } = req.body
            const user = await userService.getByEmailRegister(email)

            if (!user) {
                return res.status(400).json({
                    message: 'Tài khoản không tồn tại!',
                    error: 1,
                })
            }
            const tokenReset = generateVerifyCode({ userId: user._id, purpose: 'password-reset' })
            const host = req.get('origin')
            const link = `${host}/dat-lai-mat-khau/${tokenReset}`
            const resultSendMail = await transporter.sendMail({
                from: '"BOOKSTORE" <project.php.nhncomputer@gmail.com>',
                to: email,
                subject: `[BOOKSTORE] Hãy đặt lại mật khẩu tài khoản của bạn`,
                html: ` <h2>Xin chào bạn ${user.fullName},</h2>
                        <p>Chúng tôi biết rằng bạn đã mất mật khẩu BookStore của mình.</p>
                        <p>
                            Nhưng đừng lo lắng, bạn có thể truy cập link sau để đặt lại mật khẩu của mình:
                        </p>
                        <a href="${link}"><h3>Đặt lại mật khẩu</h3></a>
                        <p>Trân trọng,</p>
                        <p><b>BOOKSTORE</b></p>`
            })
            return res.status(200).json({
                error: 0,
                message: 'success'
            })
            
        } catch (error) {
            console.log(error)
            res.status(500).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    handleResetPassword: async(req, res) => {
        try {
            const { token, password } = req.body

            const { userId, purpose } = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET)
            if (purpose !== 'password-reset' || !isObjectIdOrHexString(userId)) {
                return res.status(400).json({ error: 1, message: 'Token không hợp lệ!' })
            }
            if (typeof password !== 'string' || !password.trim()) {
                return res.status(400).json({ error: 1, message: 'Vui lòng nhập mật khẩu mới!' })
            }
            const hashPassword = await bcrypt.hash(password, 10)
            const result = await userService.handleResetPassword(userId, { password: hashPassword })
            if (!result) return res.status(400).json({ error: 1, message: 'Tài khoản không tồn tại!' })
            return res.status(200).json({ error: 0, message: 'success' })
            
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                return res.status(400).json({ error: 1, message: 'Token không hợp lệ!' })
            }
            res.status(500).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    getCurrentUser: async(req, res) => {
        try {
            const { user } = req
            const { userId } = user
            const data = await userService.getById(userId)
            return res.status(200).json({
                user: data,
                message: 'success'
            })
            
        } catch (error) {
            res.status(500).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    handleRefreshToken: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken
            if (!refreshToken) return res.status(401).json({message: '401 Unauthorized'})
            let data
            try {
                data = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET)
            } catch {
                return res.status(403).json({message: '403 Forbidden'})
            }

            // Older social logins wrapped the ID in an object.
            const userId = typeof data?.userId === 'string' ? data.userId : data?.userId?.userId
            if (!isObjectIdOrHexString(userId)) return res.status(403).json({message: '403 Forbidden'})
            const user = await userService.getById(userId)
            if (!user || user.status !== 1) return res.status(403).json({message: '403 Forbidden'})

            const newToken = generateAccessToken({userId, role: user.role})
            const newRefreshToken = generateRefreshToken(userId)
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: false,
                maxAge: 1000 * 60 * 60 * 24 * 7,
            })
            return res.status(200).json({
                token: newToken,
            })
            
        } catch (error) {
            res.status(500).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    handleLogout: async(req, res) => {
        try {
            res.clearCookie("refreshToken")
            return res.status(200).json({message: 'Logout sucesss', error: 0})
            
        } catch (error) {
            res.status(500).json({
                message: `Có lỗi xảy ra! ${error.message}`,
                error: 1,
            })
        }
    },
    
}

module.exports = authController
