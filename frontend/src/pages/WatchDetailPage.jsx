import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { getWatchById, addToCart } from "../services/api";
import KronosHeader from "../components/KronosHeader";
import "../styles/WatchDetailPage.css";

export default function WatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [watch, setWatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    async function loadWatch() {
      setLoading(true);
      try {
        const data = await getWatchById(id);
        setWatch(data);
      } catch (err) {
        console.error("Error loading watch details:", err);
        setError("Unable to load watch details.");
      } finally {
        setLoading(false);
      }
    }
    loadWatch();
  }, [id]);

  async function handleAddToCart() {
    if (!watch) return;
    try {
      await addToCart(watch.id ?? watch.watch_id);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to add to cart:", err);
    }
  }

  if (loading) {
    return (
      <div className="page-shell watch-detail-page">
        <KronosHeader />
        <div className="watch-detail__loading">
          <p>Loading luxury timepieces...</p>
        </div>
      </div>
    );
  }

  if (error || !watch) {
    return (
      <div className="page-shell watch-detail-page">
        <KronosHeader />
        <div className="watch-detail__error">
          <p>{error || "Watch not found."}</p>
          <Link to="/shopnow" className="kronos-pill-outline">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell watch-detail-page">
      <KronosHeader />

      {showSuccess && (
        <div className="cart-notification-popup">
          <p>✓ {watch.brand} {watch.watch_name} added to cart!</p>
          <Link to="/cart">View Cart</Link>
        </div>
      )}

      <div className="watch-detail__breadcrumb">
        <Link to="/">Home</Link>
        <span>›</span>
        <Link to="/shopnow">Shop Now</Link>
        <span>›</span>
        <span>{watch.watch_name}</span>
      </div>

      <div className="watch-detail__container">
        <aside className="watch-detail__media kronos-card">
          <div className="watch-detail__image-wrapper">
            {watch.image_url ? (
              <img src={watch.image_url} alt={`${watch.brand} ${watch.watch_name}`} />
            ) : (
              <div className="image-placeholder">No Image Available</div>
            )}
          </div>

          <div className="watch-detail__meta-box">
            <div className="watch-detail__meta-card">
              <span>Seller</span>
              <strong>{watch.seller_name || "Official Dealer"}</strong>
            </div>
            <div className="watch-detail__meta-card">
              <span>Condition</span>
              <strong>{watch.condition}</strong>
            </div>
          </div>
        </aside>

        <section className="watch-detail__content kronos-card">
          <div className="watch-detail__heading">
            <div>
              <h1 className="watch-detail__title">
                {watch.brand} {watch.watch_name}
              </h1>
              <p className="watch-detail__subtitle">Reference No. {watch.reference_number}</p>
            </div>
            <div>
              <div className="watch-detail__price">
                {watch.currency || "₱"}{watch.sale_price}
              </div>
              <div className="watch-detail__status">{watch.availability}</div>
            </div>
          </div>

          <div className="watch-detail__description-section">
            <h2 className="watch-detail__section-heading">Description</h2>
            <p className="watch-detail__description">{watch.description || "No description available."}</p>
          </div>

          <div className="watch-detail__specs">
            <div className="watch-detail__spec">
              <span>Brand</span>
              <strong>{watch.brand}</strong>
            </div>
            <div className="watch-detail__spec">
              <span>Model</span>
              <strong>{watch.watch_name}</strong>
            </div>
            <div className="watch-detail__spec">
              <span>Reference</span>
              <strong>{watch.reference_number}</strong>
            </div>
            <div className="watch-detail__spec">
              <span>Movement</span>
              <strong>{watch.movement || "—"}</strong>
            </div>
            <div className="watch-detail__spec">
              <span>Case Material</span>
              <strong>{watch.case_material || "—"}</strong>
            </div>
            <div className="watch-detail__spec">
              <span>Bracelet</span>
              <strong>{watch.bracelet_material || "—"}</strong>
            </div>
            <div className="watch-detail__spec">
              <span>Year</span>
              <strong>{watch.year_of_production || "—"}</strong>
            </div>
            <div className="watch-detail__spec">
              <span>Gender</span>
              <strong>{watch.gender || "—"}</strong>
            </div>
            <div className="watch-detail__spec">
              <span>Location</span>
              <strong>{watch.location || "—"}</strong>
            </div>
            <div className="watch-detail__spec">
              <span>Negotiable</span>
              <strong>{watch.negotiable ? "Yes" : "No"}</strong>
            </div>
          </div>

          <div className="watch-detail__actions">
            <button type="button" className="kronos-pill" onClick={handleAddToCart}>
              {showSuccess ? "Added!" : "Add to Cart"}
            </button>
            <button type="button" className="kronos-pill-outline" onClick={() => navigate("/shopnow")}>
              Continue Browsing
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}