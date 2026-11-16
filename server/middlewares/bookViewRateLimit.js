const createBookViewRateLimit = ({ windowMs = 60 * 1000, max = 30, now = Date.now } = {}) => {
    const requests = new Map()

    return (req, res, next) => {
        const key = req.user?.userId || req.body?.anonymousId || 'missing-viewer-id'
        const currentTime = now()
        const timestamps = (requests.get(key) || []).filter(timestamp => currentTime - timestamp < windowMs)
        if (timestamps.length >= max) {
            requests.set(key, timestamps)
            return res.status(429).json({ message: 'Bạn gửi quá nhiều lượt xem. Vui lòng thử lại sau!', error: 1 })
        }
        timestamps.push(currentTime)
        requests.set(key, timestamps)

        // Bound memory use if callers generate many anonymous IDs.
        if (requests.size > 10000) {
            for (const [identity, times] of requests) {
                if (!times.length || currentTime - times[times.length - 1] >= windowMs) requests.delete(identity)
                if (requests.size <= 8000) break
            }
        }
        next()
    }
}

module.exports = createBookViewRateLimit
