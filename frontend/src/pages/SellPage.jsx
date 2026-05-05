import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import KronosHeader from "../components/KronosHeader";
import { createWatchListing } from "../services/api";
import { useAuth } from "../services/auth";
import heroWatch from "../assets/images/hero-watch.jpg";
import "../styles/SellPage.css";

const conditionOptions = ["New", "Excellent", "Very Good", "Good", "Fair"];
const requiredFields = ["brand", "watch_name", "condition", "sale_price", "location"];

export default function SellPage() {
  const { user, loading } = useAuth();
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
    image: null,
  });

  const [submitted, setSubmitted] = useState(false);
  const [createdWatch, setCreatedWatch] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState({});

  const completion = useMemo(() => {
    const filled = requiredFields.filter((field) => formData[field]?.toString().trim()).length;
    return Math.round((filled / requiredFields.length) * 100);
  }, [formData]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({
      ...prev,
      image: file,
    }));

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(file ? URL.createObjectURL(file) : "");
  }

  function validate() {
    const next = {};
    requiredFields.forEach((field) => {
      if (!formData[field] || formData[field].toString().trim() === "") {
        next[field] = "Required";
      }
    });

    if (formData.sale_price && Number(formData.sale_price) <= 0) {
      next.sale_price = "Enter a valid price";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = new FormData();
      Object.entries({
        ...formData,
        stock_quantity: Number(formData.stock_quantity) || 1,
      }).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          payload.append(key, value);
        }
      });

      const response = await createWatchListing(payload);
      setCreatedWatch(response.watch);
      setSubmitted(true);
    } catch (error) {
      console.error("Listing submission failed:", error.responseData || error);
      setSubmitError(error.message || "Unable to submit listing right now.");
    } finally {
      setSubmitting(false);
    }
  }

  const getClass = (field) =>
    errors[field] ? "sell-input sell-input--error" : "sell-input";

  const formattedPrice = formData.sale_price
    ? Number(formData.sale_price).toLocaleString("en-US")
    : "Price";

  if (submitted) {
    return (
      <div className="page-shell sell-page">
        <KronosHeader />
        <main className="sell-success">
          <div className="sell-success__panel">
            <div className="sell-success__icon">✓</div>
            <p className="sell-eyebrow">Submitted for review</p>
            <h1 className="section-heading-serif">Your listing is in good hands.</h1>
            <p>
              The Kronos team will review the details. Once an admin accepts it, buyers will see it in the store.
            </p>
            {createdWatch?.id && <p>Review ID: {createdWatch.id}</p>}
            <button className="sell-primary-btn" onClick={() => {
              setCreatedWatch(null);
              setSubmitted(false);
            }}>
              List Another Watch
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!loading && !user) {
    return (
      <div className="page-shell sell-page">
        <KronosHeader />
        <main className="sell-success">
          <div className="sell-success__panel">
            <p className="sell-eyebrow">Seller Account Required</p>
            <h1 className="section-heading-serif">Log in before listing.</h1>
            <p>
              Listings are attached to your Kronos account and sent to admins for approval before they appear in the shop.
            </p>
            <Link className="sell-secondary-link" to="/auth?mode=signup">
              Sign Up
            </Link>
            <Link className="sell-primary-btn sell-login-link" to="/auth">
              Log In
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell sell-page">
      <KronosHeader />

      <main className="sell-page__content">
        <section className="sell-intro" aria-labelledby="sell-title">
          <div className="sell-intro__copy">
            <p className="sell-eyebrow">Sell on Kronos</p>
            <h1 id="sell-title" className="section-heading-serif">Create a trusted watch listing.</h1>
            <p>
              Add the essentials collectors look for first: model, condition, location, and a clear
              asking price. The preview updates while you work.
            </p>
          </div>
        </section>

        <section className="sell-workspace">
          <form className="sell-form" onSubmit={handleSubmit}>
            <div className="sell-progress" aria-label="Listing completion">
              <div>
                <span>{completion}% complete</span>
                <strong>{requiredFields.length - Math.round((completion / 100) * requiredFields.length)} essentials left</strong>
              </div>
              <div className="sell-progress__track">
                <span style={{ width: `${completion}%` }} />
              </div>
            </div>

            <fieldset className="sell-section">
              <legend>Core Details</legend>
              <div className="sell-grid sell-grid--two">
                <label className="sell-field">
                  <span>Brand *</span>
                  <input className={getClass("brand")} name="brand" placeholder="Patek Philippe" value={formData.brand} onChange={handleChange} />
                  {errors.brand && <small>{errors.brand}</small>}
                </label>
                <label className="sell-field">
                  <span>Watch Name *</span>
                  <input className={getClass("watch_name")} name="watch_name" placeholder="Nautilus" value={formData.watch_name} onChange={handleChange} />
                  {errors.watch_name && <small>{errors.watch_name}</small>}
                </label>
                <label className="sell-field">
                  <span>Reference Number</span>
                  <input className="sell-input" name="reference_number" placeholder="5711/1A" value={formData.reference_number} onChange={handleChange} />
                </label>
                <label className="sell-field">
                  <span>Year</span>
                  <input className="sell-input" name="year_of_production" type="number" min="1900" max="2026" placeholder="2021" value={formData.year_of_production} onChange={handleChange} />
                </label>
              </div>
            </fieldset>

            <fieldset className="sell-section">
              <legend>Condition & Specs</legend>
              <div className="sell-grid sell-grid--three">
                <label className="sell-field">
                  <span>Condition *</span>
                  <select className={getClass("condition")} name="condition" value={formData.condition} onChange={handleChange}>
                    <option value="">Select condition</option>
                    {conditionOptions.map((condition) => (
                      <option key={condition} value={condition}>{condition}</option>
                    ))}
                  </select>
                  {errors.condition && <small>{errors.condition}</small>}
                </label>
                <label className="sell-field">
                  <span>Movement</span>
                  <input className="sell-input" name="movement" placeholder="Automatic" value={formData.movement} onChange={handleChange} />
                </label>
                <label className="sell-field">
                  <span>Gender</span>
                  <select className="sell-input" name="gender" value={formData.gender} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="Mens">Men's</option>
                    <option value="Womens">Women's</option>
                    <option value="Unisex">Unisex</option>
                  </select>
                </label>
                <label className="sell-field">
                  <span>Case Material</span>
                  <input className="sell-input" name="case_material" placeholder="Stainless steel" value={formData.case_material} onChange={handleChange} />
                </label>
                <label className="sell-field">
                  <span>Bracelet Material</span>
                  <input className="sell-input" name="bracelet_material" placeholder="Stainless steel" value={formData.bracelet_material} onChange={handleChange} />
                </label>
                <label className="sell-field">
                  <span>Stock</span>
                  <input className="sell-input" name="stock_quantity" type="number" min="1" value={formData.stock_quantity} onChange={handleChange} />
                </label>
              </div>
            </fieldset>

            <fieldset className="sell-section">
              <legend>Pricing & Location</legend>
              <div className="sell-grid sell-grid--price">
                <label className="sell-field">
                  <span>Sale Price *</span>
                  <input className={getClass("sale_price")} name="sale_price" type="number" min="1" placeholder="250000" value={formData.sale_price} onChange={handleChange} />
                  {errors.sale_price && <small>{errors.sale_price}</small>}
                </label>
                <label className="sell-field">
                  <span>Currency</span>
                  <select className="sell-input" name="currency" value={formData.currency} onChange={handleChange}>
                    <option value="PHP">PHP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>
                <label className="sell-field">
                  <span>Location *</span>
                  <input className={getClass("location")} name="location" placeholder="Manila, Philippines" value={formData.location} onChange={handleChange} />
                  {errors.location && <small>{errors.location}</small>}
                </label>
              </div>

              <label className="sell-toggle">
                <input type="checkbox" name="negotiable" checked={formData.negotiable} onChange={handleChange} />
                <span />
                Open to offers
              </label>
            </fieldset>

            <fieldset className="sell-section">
              <legend>Listing Photo</legend>
              <label className="sell-upload">
                <input type="file" name="image" accept="image/*" onChange={handleImageChange} />
                <span className="sell-upload__thumb">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Selected watch preview" />
                  ) : (
                    "Add Photo"
                  )}
                </span>
                <span className="sell-upload__copy">
                  <strong>{formData.image ? formData.image.name : "Upload a watch photo"}</strong>
                  <small>PNG, JPG, JPEG, AVIF, or WebP. This will appear in the shop listing.</small>
                </span>
              </label>
            </fieldset>

            <fieldset className="sell-section">
              <legend>Listing Notes</legend>
              <label className="sell-field">
                <span>Description</span>
                <textarea className="sell-input sell-textarea" name="description" placeholder="Mention box, papers, service history, visible wear, and anything a buyer should know." value={formData.description} onChange={handleChange} rows={5} />
              </label>
            </fieldset>

            <div className="sell-form__actions">
              <p>{submitError || "Listings go live only after an admin accepts them."}</p>
              <button type="submit" className="sell-primary-btn" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Listing"}
              </button>
            </div>
          </form>

          <aside className="sell-preview" aria-label="Listing preview">
            <div className="sell-preview__panel">
              <p className="sell-preview__label">Live Preview</p>
              <div className="sell-preview__image">
                <img src={imagePreview || heroWatch} alt="" />
              </div>
              <div className="sell-preview__body">
                <div>
                  <h2>{formData.brand || "Brand"} {formData.watch_name || "Model"}</h2>
                  <p>{formData.reference_number || "Reference number"}</p>
                </div>
                <strong>{formData.currency} {formattedPrice}</strong>
                <dl>
                  <div>
                    <dt>Condition</dt>
                    <dd>{formData.condition || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{formData.location || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Terms</dt>
                    <dd>{formData.negotiable ? "Open to offers" : "Fixed price"}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="sell-checklist">
              <h3>Before you submit</h3>
              <ul>
                <li>Use the exact reference when available.</li>
                <li>Include box, papers, and service history.</li>
                <li>Price in the currency buyers should pay.</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
