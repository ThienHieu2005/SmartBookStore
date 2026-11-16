const BOOK_CACHE_PATTERN = 'Book::*'
const SCAN_COUNT = 100
const DELETE_BATCH_SIZE = 100

const invalidateBookCache = async (redis) => {
    if (!redis) return false

    try {
        let cursor = '0'
        do {
            const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', BOOK_CACHE_PATTERN, 'COUNT', SCAN_COUNT)
            cursor = String(nextCursor)
            const bookKeys = keys.filter(key => typeof key === 'string' && key.startsWith('Book::'))

            for (let index = 0; index < bookKeys.length; index += DELETE_BATCH_SIZE) {
                await redis.del(...bookKeys.slice(index, index + DELETE_BATCH_SIZE))
            }
        } while (cursor !== '0')
        return true
    } catch (error) {
        console.warn('Không thể vô hiệu hóa cache sách:', error.message)
        return false
    }
}

module.exports = { BOOK_CACHE_PATTERN, invalidateBookCache }
