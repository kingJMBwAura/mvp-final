import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { createOrder, getCart } from "../services/api";
import KronosHeader from "../components/KronosHeader";
import { useAuth } from "../services/auth";
import "../styles/CheckoutPage.css";

const PROMO_STORAGE_KEY = "kronosPromoCode";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [cart, setCart] = useState(null);
  const [errors, setErrors] = useState({});
  const [appliedPromo, setAppliedPromo] = useState(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    address_line1: "",
    address_line2: "",
    city: "",
    region: "",
    zip_code: "",
    delivery_method: "Standard", 
    payment_method: "Credit Card"
  });

  useEffect(() => {
    if (authLoading) return;

    async function loadCart() {
      try {
        const data = await getCart();
        setCart(data);
        localStorage.removeItem(PROMO_STORAGE_KEY);
        const savedPromo = JSON.parse(sessionStorage.getItem(PROMO_STORAGE_KEY) || "null");
        if (savedPromo?.user_id === user?.id) {
          setAppliedPromo(savedPromo);
        } else {
          sessionStorage.removeItem(PROMO_STORAGE_KEY);
          setAppliedPromo(null);
        }
      } catch (error) {
        console.error("Failed to load cart for checkout:", error);
      }
    }
    loadCart();
  }, [authLoading, user?.id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }

  function validateForm() {
    const requiredFields = [
      'first_name', 'last_name', 'email',
      'address_line1', 'city', 'region', 'zip_code',
    ];
    const nextErrors = {};
    requiredFields.forEach((field) => {
      if (!formData[field] || formData[field].trim() === '') {
        nextErrors[field] = 'This field is required.';
      }
    });
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function formatCurrency(value) {
    return Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const subtotalNumeric = cart
    ? parseFloat(cart.subtotal.toString().replace(/[^\d.]/g, ""))
    : 0;
  const shippingCost = formData.delivery_method === "Express" ? 500.00 : 100.00;
  const discountAmount = parseFloat(appliedPromo?.discount_amount || 0) || 0;
  const finalTotal = Math.max(subtotalNumeric + shippingCost - discountAmount, 0);

  async function handleSubmit() {
    if (!validateForm()) return;

    try {
      const payload = {
        buyer: user?.id ?? 1,
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        shipping_address_line_1: formData.address_line1,
        shipping_address_line_2: formData.address_line2 || "",
        shipping_city: formData.city,
        shipping_region: formData.region,
        shipping_zip_code: formData.zip_code,
        total_price: finalTotal,
        shipping_cost: shippingCost,
        delivery_method: formData.delivery_method,
        payment_method: formData.payment_method,
        promo_code: appliedPromo?.code || "",
        watches: cart.items
          .map((item) => item.watch?.watch_id ?? item.watch?.id)
          .filter((id) => id != null),
        payment_status: 'pending'
      };

      console.log("Submitting payload:", payload);
      const order = await createOrder(payload);
      const finalOrderId = order.order_id || order.id;

      if (finalOrderId) {
        sessionStorage.removeItem(PROMO_STORAGE_KEY);
        localStorage.removeItem(PROMO_STORAGE_KEY);
        navigate(`/orders/${finalOrderId}`);
      } else {
        console.error("No ID returned from backend:", order);
        alert("Order created, but couldn't retrieve the ID to redirect you.");
      }
    } catch (err) {
      console.error("Order submission failed:", err.responseData || err);
      alert("There was an issue processing your order. Check the console for details.");
    }
  }

  const getClassName = (fieldName) =>
    errors[fieldName] ? "kronos-input kronos-input--error" : "kronos-input";

  const requiredFields = ['first_name', 'last_name', 'email', 'address_line1', 'city', 'region', 'zip_code'];
  const isFormValid = requiredFields.every(
    (field) => formData[field] && formData[field].trim() !== ''
  ) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  if (!cart) {
    return (
      <div className="page-shell checkout-page">
        <KronosHeader />
        <div className="checkout-page__content">
          <p>Loading your order details...</p>
        </div>
      </div>
    );
  }

  const items = cart.items || [];

  return (
    <div className="page-shell checkout-page">
      <div className="checkout-page__header">
        <KronosHeader />
        <div className="checkout-page__breadcrumb">
          <Link to="/cart">Shopping Cart</Link>
          <span>&lsaquo;</span>
          <span>Check-Out</span>
        </div>
      </div>

      <div className="checkout-page__content">
        <div className="checkout-page__left">
          <h1 className="checkout-page__title">Check Out</h1>

          <div className="checkout-form">
            <div className="checkout-form__section">
              <h2>Contact Details</h2>
              <div className="checkout-form__row">
                <input
                  className={getClassName("email")}
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>
            </div>

            <div className="checkout-form__section">
              <h2>Delivery Details</h2>
              <div className="checkout-form__row checkout-form__row--two">
                <div className="input-group">
                  <input
                    className={getClassName("first_name")}
                    name="first_name"
                    placeholder="First Name"
                    value={formData.first_name}
                    onChange={handleChange}
                  />
                  {errors.first_name && <span className="error-text">{errors.first_name}</span>}
                </div>
                <div className="input-group">
                  <input
                    className={getClassName("last_name")}
                    name="last_name"
                    placeholder="Last Name"
                    value={formData.last_name}
                    onChange={handleChange}
                  />
                  {errors.last_name && <span className="error-text">{errors.last_name}</span>}
                </div>
              </div>

              <div className="checkout-form__row">
                <input
                  className={getClassName("address_line1")}
                  name="address_line1"
                  placeholder="Address Line 1"
                  value={formData.address_line1}
                  onChange={handleChange}
                />
                {errors.address_line1 && <span className="error-text">{errors.address_line1}</span>}
              </div>

              <div className="checkout-form__row">
                <input
                  className="kronos-input"
                  name="address_line2"
                  placeholder="Address Line 2"
                  value={formData.address_line2}
                  onChange={handleChange}
                />
              </div>

              <div className="checkout-form__row checkout-form__row--three">
                <div className="input-group">
                  <input
                    className={getClassName("city")}
                    name="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={handleChange}
                  />
                  {errors.city && <span className="error-text">{errors.city}</span>}
                </div>
                <input
                  className="kronos-input"
                  name="region"
                  placeholder="Region"
                  value={formData.region}
                  onChange={handleChange}
                />
                <div className="input-group">
                  <input
                    className={getClassName("zip_code")}
                    name="zip_code"
                    placeholder="ZIP Code"
                    value={formData.zip_code}
                    onChange={handleChange}
                  />
                  {errors.zip_code && <span className="error-text">{errors.zip_code}</span>}
                </div>
              </div>
            </div>

            <div className="checkout-form__section">
              <h2>Delivery Method</h2>
              <div className="checkout-method-options">
                <label className="kronos-radio">
                  <input
                    type="radio" name="delivery_method" value="Standard"
                    checked={formData.delivery_method === "Standard"} onChange={handleChange}
                  />
                  <span>Standard Delivery (₱100.00)</span>
                </label>
                <label className="kronos-radio">
                  <input
                    type="radio" name="delivery_method" value="Express"
                    checked={formData.delivery_method === "Express"} onChange={handleChange}
                  />
                  <span>Express Delivery (₱500.00)</span>
                </label>
              </div>
            </div>

            <div className="checkout-form__section">
              <h2>Payment Method</h2>
              <select
                className="kronos-input" name="payment_method"
                value={formData.payment_method} onChange={handleChange}
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="PayPal">PayPal</option>
              </select>
            </div>
          </div>
        </div>

        <div className="checkout-page__right">
          <div className="checkout-summary kronos-card">
            {items.map((item) => (
              <div key={item.id} className="checkout-summary__item">
                <div className="checkout-summary__image-wrap">
                  {item.watch?.image_url ? (
                    <img
                      className="checkout-summary__image"
                      src={item.watch.image_url}
                      alt={`${item.watch?.brand} ${item.watch?.watch_name}`}
                    />
                  ) : (
                    <div className="checkout-summary__image--placeholder">⌚</div>
                  )}
                </div>
                <div className="checkout-summary__info">
                  <h3>{item.watch?.brand} {item.watch?.watch_name}</h3>
                  <p className="checkout-summary__ref">{item.watch?.reference_number}</p>
                  <p className="checkout-summary__price">₱{item.watch?.sale_price}</p>
                </div>
              </div>
            ))}

            <div className="checkout-summary__totals">
              <div className="checkout-summary__line">
                <span>Subtotal</span>
                <span>₱ {formatCurrency(subtotalNumeric)}</span>
              </div>
              <div className="checkout-summary__line">
                <span>Shipping</span>
                <span>₱ {formatCurrency(shippingCost)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="checkout-summary__line checkout-summary__line--discount">
                  <span>Discount</span>
                  <span>-₱ {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <hr />
              <div className="checkout-summary__line checkout-summary__line--total">
                <span>Total</span>
                <span>₱ {formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>

          <div className="checkout-page__next">
            <button type="button" onClick={handleSubmit} disabled={!isFormValid}>
              Next <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
