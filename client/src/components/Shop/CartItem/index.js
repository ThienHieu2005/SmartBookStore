import React from "react";
import { useDispatch } from "react-redux";
import { updateQuantity, removeItem } from "../../../redux/actions/cart";

import { FaTrashAlt } from "react-icons/fa"

import format from "../../../helper/format";
import styles from "./CartItem.module.css";
import { Button } from "react-bootstrap";

export default function CartItem(props) {
  const dispatch = useDispatch();

  const { productId, quantity, totalPriceItem } = props;
  const changeQuantity = (value) => dispatch(updateQuantity({ productId, quantity: Math.max(1, value || 1) }));

  const handleRemoveItem = (productId) => {
    dispatch(removeItem({productId}));
  }

  return (
    <tr>
      <td style={{maxWidth: 450, textAlign: "left"}}>
        <div className="d-flex align-items-center">
          <img src={props.imageUrl} alt={props.name} style={{width: 100}} />
          <p style={{marginLeft: 10}}>{props.name}</p>
        </div>
      </td>
      <td className="price">{format.formatPrice(props.price)}</td>
      <td>
        <div className="d-flex align-items-center justify-content-center">
          <button className={styles.btnChange} onClick={() => changeQuantity(quantity - 1)}>
            -
          </button>
          <input type="number" min="1" className={styles.inputQuantity} value={quantity} onChange={(e) => changeQuantity(parseInt(e.target.value, 10))} />
          <button className={styles.btnChange} onClick={() => changeQuantity(quantity + 1)}>
            +
          </button>
        </div>
      </td>
      <td className="price" style={{fontWeight: "bold"}}>{format.formatPrice(totalPriceItem)}</td>
      <td>
        <Button variant="danger" aria-label={`Bỏ ${props.name} khỏi giỏ`} onClick={() => handleRemoveItem(props.productId)}><FaTrashAlt /></Button>
      </td>
    </tr>
  );
}
