import { useState } from "react";
import KronosHeader from "../components/KronosHeader";
import "../styles/SellPage.css";

export default function SellPage() {
  const [formData, setFormData] = useState({
    brand: "",
    watch_name: "",
    reference_number: "",
    condition: "",
    sale_price: "",
    currency: "PHP",
    movement: "",
    case_material: "",
    bracelet_material: "",
    year_of_production: "",
    gender: "",
    location: "",
    negotiable: false,
    stock_quantity: 1,
    description: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  }

  function validate() {
    const required = ["brand", "watch_name", "condition", "sale_price", "location"];
    const next = {};
    required.forEach((f) => {
      if (!formData[f] || formData[f].toString().trim() === "") {
        next[f] = "This field is required.";
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    // TODO: wire to real API endpoint when seller auth is ready
    console.log("Submitting listing:", formData);
    setSubmitted(true);
  }

  const getClass = (field) =>
    errors[field] ? "kronos-input kronos-input--error" : "kronos-input";

  if (submitted) {
    return (
      <div className="page-shell sell-page">
        <KronosHeader />
        <div className="sell-page__success">
          <div className="sell-page__success-icon">✓</div>
          <h2 className="section-heading-serif">Listing Submitted!</h2>
          <p>Your watch has been submitted for review. It will appear on the marketplace once approved.</p>
          <button className="kronos-pill" onClick={() => setSubmitted(false)}>
            List Another Watch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell sell-page">
      <KronosHeader />

      <div className="sell-page__hero">
        <p className="sell-page__label">✦ Sell on Kronos</p>
        <h1 className="section-heading-serif">List Your Timepiece</h1>
        <p className="sell-page__sub">
          Reach thousands of serious collectors. Fill in the details below to create your listing.
        </p>
      </div>

      <div className="sell-page__layout">
        {/* FORM */}
        <form className="sell-page__form kronos-card" onSubmit={handleSubmit}>

          <div className="sell-form__section">
            <h2>Watch Details</h2>

            <div className="sell-form__row sell-form__row--two">
              <div className="sell-form__group">
                <label>Brand *</label>
                <input className={getClass("brand")} name="brand" placeholder="e.g. Patek Philippe" value={formData.brand} onChange={handleChange} />
                {errors.brand && <span className="error-text">{errors.brand}</span>}
              </div>
              <div className="sell-form__group">
                <label>Watch Name *</label>
                <input className={getClass("watch_name")} name="watch_name" placeholder="e.g. Nautilus" value={formData.watch_name} onChange={handleChange} />
                {errors.watch_name && <span className="error-text">{errors.watch_name}</span>}
              </div>
            </div>

            <div className="sell-form__row sell-form__row--two">
              <div className="sell-form__group">
                <label>Reference Number</label>
                <input className="kronos-input" name="reference_number" placeholder="e.g. 5711/1A" value={formData.reference_number} onChange={handleChange} />
              </div>
              <div className="sell-form__group">
                <label>Year of Production</label>
                <input className="kronos-input" name="year_of_production" placeholder="e.g. 2021" value={formData.year_of_production} onChange={handleChange} />
              </div>
            </div>

            <div className="sell-form__row sell-form__row--two">
              <div className="sell-form__group">
                <label>Movement</label>
                <input className="kronos-input" name="movement" placeholder="e.g. Automatic" value={formData.movement} onChange={handleChange} />
              </div>
              <div className="sell-form__group">
                <label>Gender</label>
                <select className="kronos-input" name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="Mens">Men's</option>
                  <option value="Womens">Women's</option>
                  <option value="Unisex">Unisex</option>
                </select>
              </div>
            </div>

            <div className="sell-form__row sell-form__row--two">
              <div className="sell-form__group">
                <label>Case Material</label>
                <input className="kronos-input" name="case_material" placeholder="e.g. Stainless Steel" value={formData.case_material} onChange={handleChange} />
              </div>
              <div className="sell-form__group">
                <label>Bracelet Material</label>
                <input className="kronos-input" name="bracelet_material" placeholder="e.g. Stainless Steel" value={formData.bracelet_material} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="sell-form__section">
            <h2>Listing Details</h2>

            <div className="sell-form__row sell-form__row--two">
              <div className="sell-form__group">
                <label>Condition *</label>
                <select className={getClass("condition")} name="condition" value={formData.condition} onChange={handleChange}>
                  <option value="">Select Condition</option>
                  <option value="New">New</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Very Good">Very Good</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
                {errors.condition && <span className="error-text">{errors.condition}</span>}
              </div>
              <div className="sell-form__group">
                <label>Location *</label>
                <input className={getClass("location")} name="location" placeholder="e.g. Manila, Philippines" value={formData.location} onChange={handleChange} />
                {errors.location && <span className="error-text">{errors.location}</span>}
              </div>
            </div>

            <div className="sell-form__row sell-form__row--two">
              <div className="sell-form__group">
                <label>Sale Price *</label>
                <input className={getClass("sale_price")} name="sale_price" type="number" placeholder="e.g. 250000" value={formData.sale_price} onChange={handleChange} />
                {errors.sale_price && <span className="error-text">{errors.sale_price}</span>}
              </div>
              <div className="sell-form__group">
                <label>Currency</label>
                <select className="kronos-input" name="currency" value={formData.currency} onChange={handleChange}>
                  <option value="PHP">PHP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div className="sell-form__row sell-form__row--two">
              <div className="sell-form__group">
                <label>Stock Quantity</label>
                <input className="kronos-input" name="stock_quantity" type="number" min="1" value={formData.stock_quantity} onChange={handleChange} />
              </div>
              <div className="sell-form__group sell-form__group--checkbox">
                <label>
                  <input type="checkbox" name="negotiable" checked={formData.negotiable} onChange={handleChange} />
                  <span>Price is negotiable</span>
                </label>
              </div>
            </div>

            <div className="sell-form__group">
              <label>Description</label>
              <textarea className="kronos-input sell-form__textarea" name="description" placeholder="Describe your watch — box, papers, service history, etc." value={formData.description} onChange={handleChange} rows={4} />
            </div>
          </div>

          <button type="submit" className="kronos-pill sell-page__submit">
            Submit Listing →
          </button>
        </form>

        {/* SIDEBAR */}
        <aside className="sell-page__sidebar">
          <div className="sell-sidebar__card kronos-card">
            <h3>Why sell on Kronos?</h3>
            <ul className="sell-sidebar__list">
              <li>✦ Access to verified luxury watch buyers</li>
              <li>✦ Secure transactions guaranteed</li>
              <li>✦ Real market price insights</li>
              <li>✦ No hidden fees</li>
            </ul>
          </div>

          <div className="sell-sidebar__card kronos-card">
            <h3>How it works</h3>
            <ol className="sell-sidebar__steps">
              <li><span>1</span> Fill in your watch details</li>
              <li><span>2</span> Submit for review</li>
              <li><span>3</span> Get approved and go live</li>
              <li><span>4</span> Buyer places order</li>
              <li><span>5</span> You get paid</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}