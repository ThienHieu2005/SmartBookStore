import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { Row, Col, Form, Spinner } from "react-bootstrap";
import Select from "react-select";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import PreviewImage from "../../../../components/PreviewImage";
import * as Yup from "yup";
import styles from "./AddBook.module.css";
import { useEffect, useState } from "react";
import authorApi from "../../../../api/authorApi";
import genreApi from "../../../../api/genreApi";
import publisherApi from "../../../../api/publisherApi";
import bookApi from "../../../../api/bookApi";
import axios from "axios";

function AddBook() {
  const navigate = useNavigate();

  const [authorList, setAuthorList] = useState([]);
  const [genreList, setGenreList] = useState([]);
  const [publisherList, setPublisherList] = useState([]);

  const [loading, setLoading] = useState(false)

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
      bookId: "",
      name: "",
      year: "",
      pages: "",
      size: "",
      price: "",
      discount: 0,
      tags: "",
      language: "",
      stock: "",
      status: "",
      image: "",
      description: "",
      author: [],
      genre: [],
      publisher: publisherList[0] ? publisherList[0]._id : "",
    },
    enableReinitialize: true,
    validateOnChange: false,
    validateOnBlur: true,
    validationSchema: Yup.object({
      bookId: Yup.string()
        .transform((value) => value?.trim())
        .required("Không được bỏ trống trường này!")
        .test("is-use", "Mã sách đã tồn tại!", async function (value) {
          if (!value) return true;
          try {
            const res = await bookApi.getByBookId(value);
            return res?.data?._id ? false : true;
          } catch (error) {
            // Backend vẫn kiểm tra trùng mã khi lưu nếu request kiểm tra này lỗi.
            return true;
          }
        }),
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
      image: Yup.mixed().required("Không được bỏ trống trường này!")
      .test("FILE_SIZE", "Kích thước file quá lớn!", (value) => !value || (value && value.size < 1024 * 1024))
      .test("FILE_FORMAT", "File không đúng định dạng!", (value) => 
        !value || (value && ['image/png', 'image/gif', 'image/jpeg'].includes(value?.type) )
        )
    }),
    onSubmit: async () => {
      const { bookId, name, author, genre, publisher, description, 
        year, pages, size, price, discount, image, tags, language, stock, status } = formik.values;
      const genres = genre.map(item => item.value)
      const authors = author.map(item => item.value)
      try {
        const formData = new FormData();
        formData.append("file", image);
        formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
        setLoading(true)
        const resCloudinary = await axios.post(`https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`, formData)
        const { secure_url, public_id } = resCloudinary.data
        if (secure_url && public_id) {
          const res = await bookApi.create({ 
            bookId, name, year, pages, size, price, discount, description,
            tags: tags.split(",").map(tag => tag.trim()).filter(Boolean),
            language: language.trim() || undefined,
            stock: stock === "" ? undefined : stock,
            status: status || undefined,
            author: authors,
            genre: genres,
            publisher: publisher,
            imageUrl: secure_url,
            publicId: public_id
          })
          setLoading(false)
          console.log(res)
          alert("Thêm sách thành công!")
          navigate({ pathname: "/admin/book" });
        }
        
      } catch (error) {
        setLoading(false)
        alert("That bai! ", error)
        console.log(error);
      }
    },
  });

  return (
    <Row>
      <Col xl={12}>
        <div className="admin-content-wrapper">
          <div className="admin-content-header">Thêm sách mới</div>
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
                        formik.errors.bookId && formik.touched.bookId
                          ? "is-invalid"
                          : formik.values.bookId && "is-valid"
                      }`}
                      placeholder="Mã sách"
                      value={formik.values.bookId}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
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
                        (formik.errors.name && formik.touched.name)
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
                      required={true}
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
                      required={true}
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
                        formik.errors.year && formik.touched.year
                          ? "is-invalid"
                          : formik.values.year && "is-valid"
                      }`}
                      placeholder="Năm xuất bản"
                      value={formik.values.year}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                    />
                    {formik.errors.year && (
                      <Form.Control.Feedback type="invalid">
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
                        formik.errors.pages && formik.touched.pages
                          ? "is-invalid"
                          : formik.values.pages && "is-valid"
                      }`}
                      placeholder="Số trang"
                      value={formik.values.pages}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                    />
                    {formik.errors.pages && (
                      <Form.Control.Feedback type="invalid">
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
                        formik.errors.size && formik.touched.size
                          ? "is-invalid"
                          : formik.values.size && "is-valid"
                      }`}
                      placeholder="Kích thước"
                      value={formik.values.size}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                    />
                    {formik.errors.size && (
                      <Form.Control.Feedback type="invalid">
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
                        formik.errors.price && formik.touched.price
                          ? "is-invalid"
                          : formik.values.price && "is-valid"
                      }`}
                      placeholder="Giá bán"
                      value={formik.values.price}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                    />
                    {formik.errors.price && (
                      <Form.Control.Feedback type="invalid">
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
                      name="discount"
                      min="0"
                      max="100"
                      className={`form-control ${
                        formik.errors.discount && formik.touched.discount
                          ? "is-invalid"
                          : formik.values.discount && "is-valid"
                      }`}
                      placeholder="Giảm giá"
                      value={formik.values.discount}
                      onBlur={formik.handleBlur}
                      onChange={formik.handleChange}
                    />
                    {formik.errors.discount && (
                      <Form.Control.Feedback type="invalid">
                        {formik.errors.discount}
                      </Form.Control.Feedback>
                    )}
                  </div>
                </Col>
              </Row>
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
              <Row>
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
              <Row>
                <Col xl={3}>
                  <div className="form-group">
                    <label className={styles.formLabel}>Hình ảnh</label>
                    <input
                      type="file"
                      name="image"
                      className={`form-control ${
                        formik.errors.image && formik.touched.image
                          ? "is-invalid"
                          : formik.values.image && "is-valid"
                      }`}
                      placeholder="Hình ảnh"
                      accept="image/png, image/gif, image/jpeg"
                      // value={formik.values.image[0]}
                      onBlur={(e) => formik.setFieldValue('image', e.target.files[0])}
                      onChange={(e) => formik.setFieldValue('image', e.target.files[0])}
                    />
                    {formik.errors.image && (
                      <Form.Control.Feedback type="invalid">
                        {formik.errors.image}
                      </Form.Control.Feedback>
                    )}
                  </div>
                </Col>
                <Col xl={3}>
                  {formik.values.image && <PreviewImage file={formik.values.image} />}
                </Col>
              </Row>

              <div className="d-flex-center">
                <button type="submit" className={`bookstore-btn ${styles.submitBtn}`} disabled={loading}>
                  Thêm sách
                </button>
                {loading && <Spinner style={{ marginLeft: "20px" }} animation="border" variant="success" />}
              </div>
            </form>
          </div>
        </div>
      </Col>
    </Row>
  );
}

export default AddBook;
