import { useEffect, useState } from "react";
import { Link } from "react-router";
import KronosHeader from "../components/KronosHeader";
import { useAuth } from "../services/auth";
import { getCart, removeFromCart, applyPromoCode } from "../services/api";
import "../styles/CartPage.css";

function formatCurrency(value) {
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function computeTotals(items, shippingValue = "100.00", discountValue = 0) {
  const subtotalValue = items.reduce((sum, item) => {
    const priceString = item.watch?.sale_price?.toString() || "0";
    const numericPrice = parseFloat(priceString.replace(/[^\d.]+/g, "")) || 0;
    const quantity = item.quantity || 1;
    return sum + numericPrice * quantity;
  }, 0);

  const shippingNumeric = parseFloat(shippingValue.toString().replace(/[^\d.]+/g, "")) || 0;
  const totalValue = subtotalValue - Number(discountValue || 0) + shippingNumeric;

  return {
    subtotal: formatCurrency(subtotalValue),
    total: formatCurrency(totalValue),
    shipping: formatCurrency(shippingNumeric),
    discount: formatCurrency(Number(discountValue || 0)),
  };
}

const PROMO_STORAGE_KEY = "kronosPromoCode";

export default function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const [promoStatus, setPromoStatus] = useState("");

  useEffect(() => {
    if (authLoading) return;

    async function loadCart() {
      try {
        const data = await getCart();
        localStorage.removeItem(PROMO_STORAGE_KEY);
        const savedPromo = JSON.parse(sessionStorage.getItem(PROMO_STORAGE_KEY) || "null");
        if (savedPromo?.discount_amount && savedPromo.user_id === user?.id) {
          const totals = computeTotals(data.items || [], data.shipping || "100.00", savedPromo.discount_amount);
          setCart({
            ...data,
            ...totals,
            discount: savedPromo.discount_amount,
            promo_code: savedPromo.code,
          });
          setPromoCode(savedPromo.code || "");
          setPromoStatus("success");
          setPromoMessage(`Promo code applied: ${savedPromo.code}`);
        } else {
          sessionStorage.removeItem(PROMO_STORAGE_KEY);
          setCart(data);
        }
      } catch (error) {
        console.error("Failed to load cart:", error);
      }
    }
    loadCart();
  }, [authLoading, user?.id]);

  async function handleApplyPromo(event) {
    event.preventDefault();
    setPromoMessage("");
    setPromoStatus("");

    if (!promoCode.trim()) {
      setPromoStatus("error");
      setPromoMessage("Please enter a promo code.");
      return;
    }

    try {
      const subtotalValue = cart?.subtotal?.toString().replace(/[^\d.]+/g, "") || "0";
      const data = await applyPromoCode(promoCode, {
        account_id: user?.id,
        subtotal: subtotalValue,
      });
      const discountValue = parseFloat(data.discount_amount) || 0;
      const discountLabel = data.discount_type === "percentage"
        ? `${parseFloat(data.discount_value) || 0}% off`
        : `₱${formatCurrency(discountValue)} off`;

      setPromoStatus("success");
      setPromoMessage(`Promo code applied: ${data.code} — ${discountLabel}`);
      sessionStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify({
        code: data.code,
        discount_amount: data.discount_amount,
        user_id: user?.id,
      }));

      setCart((prevCart) => {
        const nextCart = { ...prevCart, discount: discountValue };
        const totals = computeTotals(nextCart.items, nextCart.shipping || "100.00", discountValue);
        return { ...nextCart, ...totals };
      });
    } catch (error) {
      setPromoStatus("error");
      setPromoMessage(error.message || "Invalid promo code.");
    }
  }

  async function handleRemove(cartItemId) {
    try {
      await removeFromCart(cartItemId);
      sessionStorage.removeItem(PROMO_STORAGE_KEY);
      localStorage.removeItem(PROMO_STORAGE_KEY);
      setPromoMessage("");
      setPromoStatus("");
      setCart((prevCart) => {
        const nextItems = prevCart.items.filter((item) => item.id !== cartItemId);
        const totals = computeTotals(nextItems, prevCart.shipping || "100.00", 0);
        return { ...prevCart, items: nextItems, discount: 0, promo_code: null, ...totals };
      });
    } catch (error) {
      console.error("Error removing item:", error);
    }
  }

  if (!cart) {
    return (
      <div className="page-shell cart-page">
        <KronosHeader />
        <div className="cart-page__empty-state">
          <h1 className="cart-page__empty-title section-heading-serif">Cart is empty!</h1>
          <div className="cart-page__empty-actions">
            <Link to="/" className="cart-page__empty-button">Back to Home</Link>
            <Link to="/shopnow" className="cart-page__empty-button">Go to Shop Now</Link>
          </div>
        </div>
      </div>
    );
  }

  const items = cart.items || [];
  const subtotal = cart.subtotal || "0.00";
  const shipping = cart.shipping || "100.00";
  const discount = cart.discount ? formatCurrency(cart.discount) : "0.00";
  const total = cart.total || "0.00";

  return (
    <div className="page-shell cart-page">
      <div className="cart-page__header">
        <KronosHeader />
      </div>

      <div className="cart-page__content">
        <div className="cart-page__left">
          <div className="cart-page__breadcrumb">
            <Link to="/">Home</Link>
            <span>›</span>
            <span>Shopping Cart</span>
          </div>

          <h1 className="cart-page__title section-heading-serif">Shopping Cart</h1>

          {items.length === 0 ? (
            <div className="cart-page__empty kronos-card">
              <p>Your cart is empty.</p>
              <Link to="/" className="cart-page__shop-link">Continue shopping</Link>
            </div>
          ) : (
            <div className="cart-list">
              {items.map((item) => (
                <div key={item.id} className="cart-item kronos-card">
                  <div className="cart-item__image-wrap">
                    {item.watch?.image_url ? (
                      <img
                        src={item.watch.image_url}
                        alt={`${item.watch.brand} ${item.watch.watch_name}`}
                        className="cart-item__image"
                      />
                    ) : (
                      <div className="cart-item__image cart-item__image--placeholder">⌚</div>
                    )}
                  </div>

                  <div className="cart-item__details">
                    <h2 className="cart-item__name">
                      {item.watch?.brand} {item.watch?.watch_name}
                    </h2>
                    {item.watch?.reference_number && (
                      <p className="cart-item__ref">{item.watch.reference_number}</p>
                    )}
                    <p className="cart-item__quantity">Qty: {item.quantity || 1}</p>
                    <p className="cart-item__price">₱{item.watch?.sale_price}</p>
                  </div>

                  <div className="cart-item__actions">
                    <button
                      className="cart-item__remove-btn"
                      onClick={() => handleRemove(item.id)}
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cart-page__right">
          <div className="cart-summary kronos-card">
            <h2 className="cart-summary__title">Order Summary</h2>

            <div className="cart-summary__promo">
              <form className="cart-summary__promo-form" onSubmit={handleApplyPromo}>
                <input
                  className="cart-summary__promo-input"
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  aria-label="Promo code"
                />
                <button className="cart-summary__promo-button" type="submit">Apply</button>
              </form>
              {promoMessage && (
                <p className={`cart-summary__promo-message ${promoStatus}`}>{promoMessage}</p>
              )}
            </div>

            <div className="cart-summary__line">
              <span>Subtotal</span>
              <span>₱ {subtotal}</span>
            </div>
            <div className="cart-summary__line">
              <span>Shipping</span>
              <span>₱ {shipping}</span>
            </div>
            {Number(cart.discount || 0) > 0 && (
              <div className="cart-summary__line cart-summary__line--discount">
                <span>Discount</span>
                <span>-₱ {discount}</span>
              </div>
            )}

            <hr />

            <div className="cart-summary__line cart-summary__line--total">
              <span>Total</span>
              <span>₱ {total}</span>
            </div>

            <Link to="/checkout" className="cart-summary__checkout">
              Proceed to Checkout →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
