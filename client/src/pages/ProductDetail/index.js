import React, {useEffect, useRef, useState} from 'react'
import { Col, Container, Row } from 'react-bootstrap'
import { AiOutlineMinus, AiOutlinePlus, AiOutlineShoppingCart } from 'react-icons/ai'
import { toast } from 'react-toastify';

import DetailedBookInfo from '../../components/Shop/DetailedBookInfo'
import Loading from "../../components/Loading"

import { useNavigate, useParams } from 'react-router-dom';
import bookApi from "../../api/bookApi";
import bookViewApi from "../../api/bookViewApi";
import { addToCart } from "../../redux/actions/cart"
import { useDispatch, useSelector } from "react-redux"
import format from "../../helper/format";
import styles from './ProductDetail.module.css'

export default function ProductDetail() {

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const params = useParams()
  const { slug } = params

  const cartOwnerId = useSelector((state) => state.cart.ownerId);
  const currentUser = useSelector((state) => state.auth);

  const [bookData, setBookData] = useState({})
  const [loading, setLoading] = useState(false)

  const [quantity, setQuantity] = useState(1);
  const [anonymousConsent, setAnonymousConsent] = useState(() => bookViewApi.hasConsent());
  const [showViewNotice, setShowViewNotice] = useState(false);
  const lastRecordedView = useRef("");

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true)
        const res = await bookApi.getBySlug(slug);
        setLoading(false)
        setBookData(res.data)
      } catch (error) {
        setLoading(false)
        console.log(error);
      }
    };
    fetchBook();
  }, [slug]);

  useEffect(() => {
    if (!bookData?._id) return;
    const hasSessionToken = (() => {
      try { return Boolean(localStorage.getItem('accessToken')); } catch { return false; }
    })();
    const viewerKey = currentUser.userId || (hasSessionToken ? 'authenticated-session' : 'anonymous-session');
    const viewKey = `${bookData._id}:${viewerKey}`;
    if (lastRecordedView.current === viewKey) return;
    lastRecordedView.current = viewKey;

    if (currentUser.userId || hasSessionToken) {
      setShowViewNotice(false);
      bookViewApi.record(bookData._id).catch(() => {});
      return;
    }
    if (anonymousConsent) {
      setShowViewNotice(false);
      bookViewApi.record(bookData._id, true).catch(() => {});
    } else if (bookViewApi.getConsentChoice() !== 'declined') {
      setShowViewNotice(true);
    }
  }, [bookData?._id, currentUser.userId, anonymousConsent]);

  const chooseAnonymousConsent = (accepted) => {
    bookViewApi.setConsent(accepted);
    setAnonymousConsent(accepted);
    setShowViewNotice(false);
    if (accepted && bookData?._id) {
      // Reset the key so opting in on the already-open detail page records this view.
      lastRecordedView.current = '';
    }
  };

  const deleteAnonymousHistory = async () => {
    try {
      await bookViewApi.deleteAnonymous();
      bookViewApi.setConsent(false);
      setAnonymousConsent(false);
      setShowViewNotice(false);
      lastRecordedView.current = '';
    } catch {
      // Keep the opt-in active if the delete request did not complete.
    }
  };


  const decQuantity = () => {
    if(quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  const incQuantity = () => {
    setQuantity(parseInt(quantity + 1))
  }

  const handleChange = (e) => {
    console.log(e.target.value);
    // /^[0-9]+$/.test(newQuantity)
    //sai khi them chu
    const newQuantity = parseInt(e.target.value)
    if(newQuantity){
      setQuantity(newQuantity)
    }
    else {
      setQuantity('')
    }
  }

  const addCurrentBook = () => {
    if (!currentUser.userId) {
      toast.info('Vui lòng đăng nhập để thực hiện!', {autoClose: 2000})
      return false
    }
    if (cartOwnerId !== currentUser.userId) {
      toast.info('Giỏ hàng đang tải, vui lòng thử lại!', {autoClose: 2000})
      return false
    }
    if (bookData._id && quantity > 0) {
      const { _id: productId, name, imageUrl, slug, price, discount } = bookData
      let newPrice = price
      if (discount > 0) {
        newPrice = price - price * discount / 100
      }
      const action = addToCart({quantity, productId, name, imageUrl, slug, 
        price: newPrice, 
        totalPriceItem: newPrice * quantity})
      dispatch(action)
      return true
    }
    return false
  }

  const handleAddToCart = () => {
    if (addCurrentBook()) toast.success('Thêm sản phẩm vào giỏ hàng thành công!', {autoClose: 2000})
  }

  const handleBuyNow = () => {
    if (addCurrentBook()) navigate({ pathname: "/gio-hang" })
  }

  return (
    <div className="main">
      <Container>
        {!loading ?
        <Row className={styles.productBriefing}>
           <Col xl={4} xs={12}>
            <div className={styles.imgBriefing}>
                <img src={bookData && bookData.imageUrl} alt="" />
              </div>
            </Col>

            <Col xl={8}>
              <div className={styles.infoBriefing}>
                <div>
                  <h2>{bookData && bookData.name}</h2>
                  <div className={styles.price}>
                    {bookData.discount > 0 ? 
                    (<p>
                      <span>{format.formatPrice(bookData.price - bookData.price * bookData.discount / 100)}</span>
                      <span className={styles.oldPrice}>{format.formatPrice(bookData.price)}</span>
                    </p>)
                    : format.formatPrice(bookData.price)}
                  </div>
                  <div className={`d-flex ${styles.itemBriefing}`}>
                    <div>Tác giả: &nbsp;</div>
                    <div className={styles.author}>{bookData && format.arrayToString(bookData?.author || [])}</div>
                  </div>

                  <div className={`d-flex ${styles.itemBriefing}`}>
                    <div>Nhà xuất bản: &nbsp;</div>
                    <div className={styles.author}>
                      {bookData && bookData.publisher?.name} - {bookData && bookData.year} 
                    </div>
                  </div>

                  <div className={`d-flex ${styles.itemBriefing} ${styles.description}`}>
                    <div dangerouslySetInnerHTML={{__html:bookData?.description}} />
                  </div>

                  <div className={`d-flex ${styles.itemBriefing}`}>
                    <div className={styles.textBold}>Số lượng: </div>
                    <div className='d-flex'>
                      <button className={styles.descreaseBtn} onClick={decQuantity}>
                        <AiOutlineMinus />
                      </button>
                      <input type="text" className={styles.quantityInput} value={quantity} onChange={handleChange} />
                      <button className={styles.increaseBtn} onClick={incQuantity}>
                        <AiOutlinePlus />
                      </button>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <div className={styles.actions_bottom}>
                      <button className={styles.addToCartBtn} onClick={handleAddToCart}>
                        <AiOutlineShoppingCart className={styles.addToCartIcon} />
                        Thêm vào giỏ hàng
                      </button>
                      <button className={styles.buyBtn} onClick={handleBuyNow}>Mua ngay</button>
                    </div>
                  </div>
                </div>
             </div> 
            </Col>
          <DetailedBookInfo data={bookData} /> 
        </Row> : <Loading />}
        {showViewNotice && bookData?._id && (
          <div className="alert alert-light border mt-3" role="note">
            <p className="mb-2">Bạn có thể đồng ý lưu sách đã xem trong phiên này để hỗ trợ tính năng cá nhân hóa sau này. Mã phiên ngẫu nhiên được lưu trong sessionStorage và lịch sử tự hết hạn sau 180 ngày.</p>
            <button type="button" className="btn btn-success btn-sm me-2" onClick={() => chooseAnonymousConsent(true)}>Đồng ý trong phiên này</button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => chooseAnonymousConsent(false)}>Không đồng ý</button>
          </div>
        )}
        {anonymousConsent && !currentUser.userId && !bookViewApi.hasAuthenticatedSession() && (
          <button type="button" className="btn btn-link btn-sm mt-2" onClick={deleteAnonymousHistory}>
            Xóa lịch sử phiên này và tắt ghi nhận
          </button>
        )}
      </Container>
    </div>
  )
}
