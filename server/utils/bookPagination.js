const MAX_BOOK_PAGE_SIZE = 1000
const MAX_BOOK_SKIP = 2147483647

const invalidPagination = (message) => {
    const error = new Error(message)
    error.status = 400
    return error
}

const parsePositiveInteger = (value, name, defaultValue, maxValue = Number.MAX_SAFE_INTEGER) => {
    if (value === undefined) return defaultValue
    if (!(typeof value === 'string' || typeof value === 'number')) {
        throw invalidPagination(`${name} phải là số nguyên dương!`)
    }

    const stringValue = String(value)
    if (!/^\d+$/.test(stringValue)) throw invalidPagination(`${name} phải là số nguyên dương!`)

    const parsed = Number(stringValue)
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maxValue) {
        throw invalidPagination(`${name} nằm ngoài phạm vi cho phép!`)
    }
    return parsed
}

const parseBookPagination = (query = {}) => {
    const page = parsePositiveInteger(query.page, 'page', 1)
    const hasLimit = query.limit !== undefined

    if (!hasLimit) {
        if (page !== 1) throw invalidPagination('Muốn chọn page lớn hơn 1, cần truyền limit!')
        return { page: 1, limit: 0, skip: 0 }
    }

    const limit = parsePositiveInteger(query.limit, 'limit', undefined, MAX_BOOK_PAGE_SIZE)
    const skip = (page - 1) * limit
    if (!Number.isSafeInteger(skip) || skip > MAX_BOOK_SKIP) {
        throw invalidPagination('page và limit tạo ra vị trí phân trang quá lớn!')
    }
    return { page, limit, skip }
}

const getTotalPage = (count, limit) => {
    if (limit > 0) return Math.ceil(count / limit)
    return count > 0 ? 1 : 0
}

module.exports = { MAX_BOOK_PAGE_SIZE, parseBookPagination, getTotalPage }
