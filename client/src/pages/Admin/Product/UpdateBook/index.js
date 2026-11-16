import axios from "axios";
import { useEffect, useState } from "react";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import Select from "react-select";
import { Row, Col, Form } from "react-bootstrap";
import { useFormik } from "formik";
import { useNavigate, useParams } from "react-router-dom";

import * as Yup from "yup";
import PreviewImage from "../../../../components/PreviewImage";
import authorApi from "../../../../api/authorApi";
import genreApi from "../../../../api/genreApi";
import bookApi from "../../../../api/bookApi";
import publisherApi from "../../../../api/publisherApi";
import styles from "./UpdateBook.module.css";

function UpdateBook() {

  const params = useParams()
  const { id } = params

  const navigate = useNavigate();

  const [authorList, setAuthorList] = useState([]);
  const [genreList, setGenreList] = useState([]);
  const [publisherList, setPublisherList] = useState([]);

  const [bookData, setBookData] = useState({})

  const [updateImage, setUpdateImage] = useState(false)

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const { data } = await bookApi.getById(id)
        const genres = data.genre.map(item => {
          return {
            value: item._id,
            label: item.name
          }
        })
        const authors = data.author.map(item => {
          return {
            value: item._id,
            label: item.name
          }
        })
        setBookData({...data, genre: genres, author: authors})
      } catch (error) {
        console.log(error);
      }
    };
    fetchBook();
  }, [id]);


  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const { data } = await authorApi.getAll({ limit: 0 })
        const opts = data.map(item => { return {value: item._id, label: item.name} })
        setAuthorList(opts)
      } catch (error) {
        console.log(error)
      }
    };
    const fetchPublishers = async () => {
      try {
        const res = await publisherApi.getAll({})
        setPublisherList(res.data)
      } catch (error) {
        console.log(error)
      }
    };
    const fetchGenres = async () => {
      try {
        const { data } = await genreApi.getAll({})
        const opts = data.map(item => { return {value: item._id, label: item.name} })
        setGenreList(opts)
      } catch (error) {
        console.log(error)
      }
    };
    fetchAuthors();
    fetchGenres();
    fetchPublishers();
  }, []);


  const formik = useFormik({
    initialValues: {
      bookId: bookData.bookId ? bookData.bookId : "",
      name: bookData.name ? bookData.name : "",
      year: bookData.year ? bookData.year : "",
      pages: bookData.pages ? bookData.pages : "",
      size: bookData.size ? bookData.size : "",
      price: bookData.price ? bookData.price : "",
      discount: bookData.discount ? bookData.discount : "",
      tags: Array.isArray(bookData.tags) ? bookData.tags.join(", ") : "",
      language: bookData.language || "",
      stock: bookData.stock == null ? "" : bookData.stock,
      status: bookData.status || "",
      description: bookData.description ? bookData.description : "",
      author: bookData.author ? bookData.author : [],
      genre: bookData?.genre ? bookData.genre : [],
      publisher: bookData?.publisher?._id ? bookData.publisher._id : "",
    },
    enableReinitialize: true,
    validateOnChange: false,
    validateOnBlur: true,
    validationSchema: Yup.object({
      bookId: Yup.string()
        .transform((value) => value?.trim())
        .required("Không được bỏ trống trường này!"),
      name: Yup.string()
        .transform((value) => value?.trim())
        .required("Không được bỏ trống trường này!"),
      year: Yup.number()
        .transform((value, originalValue) => originalValue === "" ? undefined : value)
        .typeError("Năm xuất bản phải là số nguyên hợp lệ!")
        .integer("Năm xuất bản phải là số nguyên!")
        .min(1000, "Năm xuất bản phải từ 1000 trở đi!")
        .max(new Date().getFullYear() + 1, `Năm xuất bản không được vượt quá ${new Date().getFullYear() + 1}!`)
        .test("finite", "Năm xuất bản phải là số hữu hạn!", value => value === undefined || Number.isFinite(value))
        .notRequired(),
      pages: Yup.number()
        .transform((value, originalValue) => originalValue === "" ? undefined : value)
        .typeError("Số trang phải là số nguyên dương!")
        .integer("Số trang phải là số nguyên dương!")
        .moreThan(0, "Số trang phải lớn hơn 0!")
        .test("finite", "Số trang phải là số hữu hạn!", value => value === undefined || Number.isFinite(value))
        .notRequired(),
      price: Yup.number()
        .typeError("Vui lòng nhập giá hợp lệ!")
        .required("Không được bỏ trống trường này!")
        .moreThan(0, "Giá sách phải lớn hơn 0!")
        .test("finite", "Giá sách phải là số hữu hạn!", value => value === undefined || Number.isFinite(value)),
      discount: Yup.number()
        .transform((value, originalValue) => originalValue === "" ? 0 : value)
        .typeError("Giảm giá phải là số từ 0 đến 100!")
        .min(0, "Giảm giá không được nhỏ hơn 0!")
        .max(100, "Giảm giá không được vượt quá 100!")
        .test("finite", "Giảm giá phải là số hữu hạn!", value => value === undefined || Number.isFinite(value)),
      genre: Yup.array()
        .of(Yup.object({ value: Yup.string().required() }))
        .min(1, "Vui lòng chọn ít nhất một thể loại!"),
      author: Yup.array()
        .of(Yup.object({ value: Yup.string().required() }))
        .min(1, "Vui lòng chọn ít nhất một tác giả!"),
      publisher: Yup.string().required("Vui lòng chọn nhà xuất bản!"),
      tags: Yup.string().test("tags", "Tối đa 20 từ khóa, mỗi từ khóa không quá 40 ký tự!", value => {
        const tags = (value || "").split(",").map(tag => tag.trim()).filter(Boolean);
        return tags.length <= 20 && tags.every(tag => tag.length <= 40);
      }),
      language: Yup.string().trim().max(50, "Ngôn ngữ không được vượt quá 50 ký tự!"),
      stock: Yup.number().transform((value, originalValue) => originalValue === "" ? undefined : value)
        .typeError("Tồn kho phải là số nguyên không âm!").integer("Tồn kho phải là số nguyên!").min(0, "Tồn kho không được âm!").notRequired(),
      status: Yup.string().oneOf(["", "active", "hidden", "discontinued"], "Trạng thái không hợp lệ!"),
      image: updateImage
        ? Yup.mixed().required("Vui lòng chọn ảnh bìa mới!")
          .test("FILE_SIZE", "Kích thước file quá lớn!", (value) => !value || (value && value.size < 1024 * 1024))
          .test("FILE_FORMAT", "File không đúng định dạng!", (value) =>
            !value || (value && ['image/png', 'image/gif', 'image/jpeg'].includes(value?.type))
          )
        : Yup.mixed().notRequired()
    }),
    onSubmit: async () => {
      const { bookId, name, author, genre, publisher, description, 
        year, pages, size, price, discount, image, tags, language, stock, status } = formik.values;
      const getSelectedIds = (selection) => (Array.isArray(selection) ? selection : selection ? [selection] : [])
        .map((item) => typeof item === "string" ? item : item?.value ?? item?._id)
        .filter(Boolean);
      const publisherId = typeof publisher === "string" ? publisher : publisher?.value ?? publisher?._id;
      const bookUpdate = {
        bookId, name, year, pages, size, price, discount, description,
        tags: tags.split(",").map(tag => tag.trim()).filter(Boolean),
        language: language.trim(),
        stock: stock === "" ? "" : stock,
        status,
        author: getSelectedIds(author),
        genre: getSelectedIds(genre),
        publisher: publisherId,
      };
      try {
        if (image) {
          const formData = new FormData();
          formData.append("file", image);
          formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
          const resCloudinary = await axios.post(`https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`, formData)
          const { secure_url, public_id } = resCloudinary.data
          if (!secure_url || !public_id) throw new Error("Cloudinary không trả về URL và mã ảnh hợp lệ.");
          await bookApi.update(id, { ...bookUpdate, imageUrl: secure_url, publicId: public_id });
        } else {
          await bookApi.update(id, bookUpdate);
        }
        alert("Lưu thay đổi thành công!")
        navigate({ pathname: "/admin/book" });
        
      } catch (error) {
        const errorMessage = error.response?.data?.error?.message
          || error.response?.data?.message
          || error.message;
        alert(`Lưu thay đổi thất bại: ${errorMessage}`)
        console.log(error);
      }
    },
  });

  return (
    <Row>
      <Col xl={12}>
        <div className="admin-content-wrapper">
          <div className="admin-content-header">Cập nhật sách thông tin sách</div>
          <div className="admin-content-body">
            <form onSubmit={formik.handleSubmit}>
              <Row>
                <Col xl={3}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Mã sách</label>
                    <input
                      type="text"
                      name="bookId"
                      className={`form-control ${
                        formik.errors.bookId
                          ? "is-invalid"
                          : formik.values.bookId && "is-valid"
                      }`}
                      placeholder="Mã sách"
                      value={formik.values.bookId}
                      readOnly
                    />
                    {formik.errors.bookId && (
                      <Form.Control.Feedback type="invalid">
                        {formik.errors.bookId}
                      </Form.Control.Feedback>
                    )}
                  </div>
                </Col>
                <Col xl={9}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Tên sách</label>
                    <input
                      type="text"
                      name="name"
                      className={`form-control ${
                        formik.errors.name
                          ? "is-invalid"
                          : formik.values.name && "is-valid"
                      }`}
                      placeholder="Tên sách"
                      value={formik.values.name}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                    />
                    {formik.errors.name && (
                      <Form.Control.Feedback type="invalid">
                        {formik.errors.name}
                      </Form.Control.Feedback>
                    )}
                  </div>
                </Col>
              </Row>

              <Row>
                <Col xl={4}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Tác giả</label>
                    <Select
                      isMulti={true}
                      value={formik.values.author}
                      name="author"
                      onChange={(option) => formik.setFieldValue("author", option)}
                      options={authorList}
                    />
                    {formik.errors.author && <Form.Control.Feedback type="invalid" className="d-block">{formik.errors.author}</Form.Control.Feedback>}
                  </div>
                </Col>
                <Col xl={4}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Thể loại</label>
                    <Select
                      isMulti={true}
                      value={formik.values.genre}
                      name="genre"
                      onChange={(option) => formik.setFieldValue("genre", option)}
                      options={genreList}
                    />
                    {formik.errors.genre && <Form.Control.Feedback type="invalid" className="d-block">{formik.errors.genre}</Form.Control.Feedback>}
                  </div>
                </Col>
                <Col xl={4}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Nhà xuất bản</label>
                    <select
                      className="form-select"
                      name="publisher"
                      value={formik.values.publisher}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                    >
                      {publisherList.length > 0 &&
                        publisherList.map((publisher) => (
                          <option key={publisher._id} value={publisher._id}>
                            {publisher.name}
                          </option>
                        ))}
                    </select>
                    {formik.errors.publisher && <Form.Control.Feedback type="invalid" className="d-block">{formik.errors.publisher}</Form.Control.Feedback>}
                  </div>
                </Col>
              </Row>
              <Row>
                <Col xl={3}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Năm xuất bản</label>
                    <input
                      type="text"
                      name="year"
                      className={`form-control ${
                        formik.errors.year
                          ? "is-invalid"
                          : formik.values.year && "is-valid"
                      }`}
                      placeholder="Năm xuất bản"
                      value={formik.values.year}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                    />
                    {formik.errors.year && (
                      <Form.Control.Feedback
                        type="invalid"
                        className={styles.feedback}
                      >
                        {formik.errors.year}
                      </Form.Control.Feedback>
                    )}
                  </div>
                </Col>
                <Col xl={3}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Số trang</label>
                    <input
                      type="text"
                      name="pages"
                      className={`form-control ${
                        formik.errors.pages
                          ? "is-invalid"
                          : formik.values.pages && "is-valid"
                      }`}
                      placeholder="Số trang"
                      value={formik.values.pages}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                    />
                    {formik.errors.pages && (
                      <Form.Control.Feedback
                        type="invalid"
                        className={styles.feedback}
                      >
                        {formik.errors.pages}
                      </Form.Control.Feedback>
                    )}
                  </div>
                </Col>
                <Col xl={3}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Kích thước</label>
                    <input
                      type="text"
                      name="size"
                      className={`form-control ${
                        formik.errors.size
                          ? "is-invalid"
                          : formik.values.size && "is-valid"
                      }`}
                      placeholder="Kích thước"
                      value={formik.values.size}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                    />
                    {formik.errors.size && (
                      <Form.Control.Feedback
                        type="invalid"
                        className={styles.feedback}
                      >
                        {formik.errors.size}
                      </Form.Control.Feedback>
                    )}
                  </div>
                </Col>
              </Row>
              <Row>
                <Col xl={3}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Giá bán</label>
                    <input
                      type="number"
                      min="0"
                      name="price"
                      className={`form-control ${
                        formik.errors.price
                          ? "is-invalid"
                          : formik.values.price && "is-valid"
                      }`}
                      placeholder="Giá bán"
                      value={formik.values.price}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                    />
                    {formik.errors.price && (
                      <Form.Control.Feedback
                        type="invalid"
                        className={styles.feedback}
                      >
                        {formik.errors.price}
                      </Form.Control.Feedback>
                    )}
                  </div>
                </Col>
                <Col xl={3}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Giảm giá</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      name="discount"
                      className={`form-control ${
                        formik.errors.discount
                          ? "is-invalid"
                          : formik.values.discount && "is-valid"
                      }`}
                      placeholder="Giảm giá"
                      value={formik.values.discount}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                    />
                    {formik.errors.discount && (
                      <Form.Control.Feedback
                        type="invalid"
                        className={styles.feedback}
                      >
                        {formik.errors.discount}
                      </Form.Control.Feedback>
                    )}
                  </div>
                </Col>
                <Col xl={3}>
                  {bookData.imageUrl && <PreviewImage src={bookData.imageUrl} />}
                </Col>
                <Col xl={12}>
                  <label className={styles.formLabel}>Mô tả</label>
                  <CKEditor
                      editor={ ClassicEditor }
                      data={formik.values.description}
                      onReady={ editor => {
                          // You can store the "editor" and use when it is needed.
                          console.log( 'Editor is ready to use!', editor );
                      } }
                      onChange={ ( event, editor ) => {
                          const data = editor.getData();
                          formik.setFieldValue("description", data);
                      } }
                      onBlur={ ( event, editor ) => {
                          console.log( 'Blur.', editor );
                      } }
                      onFocus={ ( event, editor ) => {
                          console.log( 'Focus.', editor );
                      } }
                  />
                </Col>
              </Row>
              <div>
                <button type="button" className={`bookstore-btn ${styles.updateImage}`}
                  onClick={() => setUpdateImage(!updateImage)}
                >Thay đổi hình ảnh</button>
              </div>
              {updateImage && (
                <Row>
                  <Col xl={3}>
                    <div className="form-group">
                      <label className={styles.formLabel}>Thay đổi hình ảnh</label>
                      <input
                        type="file"
                        name="image"
                        className={`form-control ${
                          formik.errors.image
                            ? "is-invalid"
                            : formik.values.image && "is-valid"
                        }`}
                        placeholder="Hình ảnh"
                        accept="image/png, image/gif, image/jpeg"
                        // value={formik.values.image[0]}
                        onChange={(e) => formik.setFieldValue('image', e.target.files[0])}
                      />
                    {formik.values.image && <PreviewImage file={formik.values.image} />}
                      {formik.errors.image && (
                        <Form.Control.Feedback
                          type="invalid"
                          className={styles.feedback}
                        >
                          {formik.errors.image}
                        </Form.Control.Feedback>
                      )}
                    </div>
                  </Col>
                </Row>
              )}

              <button
                type="submit"
                className={`bookstore-btn ${styles.submitBtn}`}
              >
                Lưu thay đổi
              </button>
              <Row>
                <Col xl={6}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Từ khóa (cách nhau bằng dấu phẩy)</label>
                    <input className={`form-control ${formik.errors.tags ? "is-invalid" : ""}`} name="tags" value={formik.values.tags} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="Python, Lập trình, Người mới bắt đầu" />
                    {formik.errors.tags && <Form.Control.Feedback type="invalid">{formik.errors.tags}</Form.Control.Feedback>}
                  </div>
                </Col>
                <Col xl={3}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Ngôn ngữ</label>
                    <input className={`form-control ${formik.errors.language ? "is-invalid" : ""}`} name="language" value={formik.values.language} onChange={formik.handleChange} onBlur={formik.handleBlur} maxLength={50} placeholder="Tiếng Việt" />
                    {formik.errors.language && <Form.Control.Feedback type="invalid">{formik.errors.language}</Form.Control.Feedback>}
                  </div>
                </Col>
                <Col xl={3}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Tồn kho (để trống nếu chưa biết)</label>
                    <input type="number" min="0" step="1" className={`form-control ${formik.errors.stock ? "is-invalid" : ""}`} name="stock" value={formik.values.stock} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                    {formik.errors.stock && <Form.Control.Feedback type="invalid">{formik.errors.stock}</Form.Control.Feedback>}
                  </div>
                </Col>
                <Col xl={3}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Trạng thái</label>
                    <select className="form-select" name="status" value={formik.values.status} onChange={formik.handleChange}>
                      <option value="">Chưa đặt</option><option value="active">Đang bán</option><option value="hidden">Đang ẩn</option><option value="discontinued">Ngừng kinh doanh</option>
                    </select>
                  </div>
                </Col>
              </Row>
            </form>
          </div>
        </div>
      </Col>
    </Row>
  );
}

export default UpdateBook;
