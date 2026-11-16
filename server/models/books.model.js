const mongoose = require('mongoose')

const slug = require('mongoose-slug-generator')

mongoose.plugin(slug)

const Schema = mongoose.Schema

const bookSchema = new Schema({
    bookId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate: {
            validator: value => typeof value === 'string' && value.trim().length > 0,
            message: 'Mã sách không được để trống!'
        }
    },
    name: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: value => typeof value === 'string' && value.trim().length > 0,
            message: 'Tên sách không được để trống!'
        }
    },
    slug: {
        type: String,
        slug: 'name',
        unique: true
    },
    year: {
        type: Number,
        validate: {
            validator: value => value == null || (Number.isInteger(value) && value >= 1000 && value <= new Date().getFullYear() + 1),
            message: 'Năm xuất bản phải là số nguyên hợp lệ (từ 1000 đến năm sau)!'
        }
    },
    genre: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Genre' }],
        validate: {
            validator: value => Array.isArray(value) && value.length > 0,
            message: 'Sách phải có ít nhất một thể loại!'
        }
    },
    author: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Author' }],
        validate: {
            validator: value => Array.isArray(value) && value.length > 0,
            message: 'Sách phải có ít nhất một tác giả!'
        }
    },
    publisher: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Publisher'
    },
    description: { type: String },
    pages: {
        type: Number,
        validate: {
            validator: value => value == null || (Number.isInteger(value) && value > 0),
            message: 'Số trang phải là số nguyên dương!'
        }
    },
    size: { type: String },
    price: {
        type: Number,
        required: true,
        validate: {
            validator: value => Number.isFinite(value) && value > 0,
            message: 'Giá sách phải là số hữu hạn lớn hơn 0!'
        }
    },
    discount: {
        type: Number,
        default: 0,
        validate: {
            validator: value => Number.isFinite(value) && value >= 0 && value <= 100,
            message: 'Giảm giá phải nằm trong khoảng từ 0 đến 100!'
        }
    },
    tags: {
        type: [{ type: String, trim: true, maxlength: 40 }],
        validate: {
            validator: value => Array.isArray(value) && value.length <= 20 &&
                value.every(tag => typeof tag === 'string' && tag.trim().length > 0 && tag.trim().length <= 40) &&
                new Set(value.map(tag => tag.trim().toLocaleLowerCase())).size === value.length,
            message: 'Từ khóa phải có tối đa 20 mục, mỗi mục 1–40 ký tự và không trùng nhau!'
        }
    },
    language: { type: String, trim: true, maxlength: 50 },
    stock: {
        type: Number,
        min: [0, 'Tồn kho không được âm!'],
        validate: {
            validator: value => value == null || Number.isInteger(value),
            message: 'Tồn kho phải là số nguyên không âm!'
        }
    },
    status: {
        type: String,
        enum: { values: ['active', 'hidden', 'discontinued'], message: 'Trạng thái sách không hợp lệ!' }
    },
    imageUrl: { type: String, default: 'https://itbook.store/img/books/9781617294136.png'},
    publicId: { type: String }
  
}, {
    timestamps: true
})


module.exports = mongoose.model('Book', bookSchema)
