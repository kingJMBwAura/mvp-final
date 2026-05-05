import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { addToCart, getWatches } from "../services/api";
import KronosHeader from "../components/KronosHeader";
import "../styles/ShopNow.css";

export default function ShopNowSection() {
  const [watches, setWatches] = useState([]);
  const [addingId, setAddingId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastAddedWatch, setLastAddedWatch] = useState(null);
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("search")?.trim() || "";

useEffect(() => {
    async function loadWatches() {
      try {
        const data = await getWatches(searchTerm);
        const watchList = Array.isArray(data) ? data : (data.results || []);
        setWatches(watchList);
      } catch (error) {
        console.error("Failed to load watches:", error);
      }
    }
    loadWatches();
  }, [searchTerm]);

  async function handleAddToCart(watchId) {
    try {
      setAddingId(watchId);
      await addToCart(watchId);
      
      // 2. Find the watch details to show in the message
      const watch = watches.find(w => (w.id ?? w.watch_id) === watchId);
      setLastAddedWatch(watch);
      
      // 3. Trigger the success notification
      setShowSuccess(true);
      
      // Automatically hide the message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setAddingId(null);
    }
  }
  
return (
    <div className="page-shell shop-now-page">
      <KronosHeader />

      {/* 4. Add the Popup Notification UI (matching WatchDetailPage) */}
      {showSuccess && lastAddedWatch && (
        <div className="cart-notification-popup">
          <p>
            ✓ {lastAddedWatch.brand} {lastAddedWatch.model ?? lastAddedWatch.watch_name} added to cart!
          </p>
          <Link to="/cart">View Cart</Link>
        </div>
      )}

      <section className="shop-now">
        <h2 className="shop-now__title section-heading-serif">Shop Now</h2>

        <div className="shop-now__grid">
          {watches.length > 0 ? watches.map((watch) => {
            const id = watch.id ?? watch.watch_id;
            const brand = watch.brand ?? "";
            const model = watch.model ?? watch.watch_name ?? "";
            const image = watch.image_url || watch.market_external_image || watch.image || null; 

            return (
              <div key={id} className="shop-now__card">
                <Link to={`/watches/${id}`} className="shop-now__image-link">
                  {image ? (
                    <img className="shop-now__image" src={image} alt={`${brand} ${model}`} />
                  ) : (
                    <div className="shop-now__image-placeholder">No Image</div>
                  )}
                </Link>

              <div className="shop-now__meta">
                <h3 className="shop-now__name">{model}</h3>
                <p className="shop-now__brand">{brand}</p>
                <p className="shop-now__listings">{watch.stock_quantity ?? 0} {watch.stock_quantity === 1 ? "Listing" : "Listings"}</p>
              </div>

              <button
              type="button" className="shop-now__button" onClick={() => handleAddToCart(id)}
              disabled={addingId === id || watch.stock_quantity === 0}
              >
  {addingId === id ? "Adding..." : watch.stock_quantity === 0 ? "Out of Stock" : "Add to cart"}
</button>
            </div>
            );
          }) : (
            <p className="shop-now__empty">
              {searchTerm ? `No watches found for "${searchTerm}".` : "No watches available."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
