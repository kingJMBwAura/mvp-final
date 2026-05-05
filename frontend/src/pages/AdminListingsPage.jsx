import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import KronosHeader from "../components/KronosHeader";
import { approveListing, getPendingListings, rejectListing } from "../services/api";
import { useAuth } from "../services/auth";
import "../styles/SellPage.css";
import "../styles/AdminListingsPage.css";

export default function AdminListingsPage() {
  const { user, loading, isAdmin } = useAuth();
  const [listings, setListings] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setFetching(false);
      return;
    }

    getPendingListings()
      .then(setListings)
      .catch((err) => setError(err.message || "Unable to load pending listings."))
      .finally(() => setFetching(false));
  }, [isAdmin]);

  async function handleApprove(id) {
    setBusyId(id);
    setError("");
    try {
      await approveListing(id);
      setListings((current) => current.filter((listing) => listing.id !== id));
    } catch (err) {
      setError(err.message || "Unable to approve listing.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setBusyId(id);
    setError("");
    try {
      await rejectListing(id);
      setListings((current) => current.filter((listing) => listing.id !== id));
    } catch (err) {
      setError(err.message || "Unable to reject listing.");
    } finally {
      setBusyId(null);
    }
  }

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (!loading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page-shell admin-page">
      <KronosHeader />
      <main className="admin-layout">
        <section className="admin-heading">
          <p className="sell-eyebrow">Admin Review</p>
          <h1 className="section-heading-serif">Pending listings</h1>
          <p>Approve a listing to publish it in the store, or reject it to delete it from the system.</p>
        </section>

        {error && <p className="admin-alert">{error}</p>}

        <section className="admin-list" aria-label="Pending watch listings">
          {fetching || loading ? (
            <p className="admin-empty">Loading listings...</p>
          ) : listings.length === 0 ? (
            <p className="admin-empty">No listings are waiting for review.</p>
          ) : (
            listings.map((listing) => (
              <article className="admin-listing" key={listing.id}>
                <div className="admin-listing__image">
                  {listing.image_url ? <img src={listing.image_url} alt="" /> : <span>No photo</span>}
                </div>
                <div className="admin-listing__body">
                  <div>
                    <p className="admin-listing__meta">{listing.brand}</p>
                    <h2>{listing.watch_name}</h2>
                    <p>{listing.description || "No description provided."}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Price</dt>
                      <dd>{listing.currency || "PHP"} {Number(listing.sale_price).toLocaleString("en-US")}</dd>
                    </div>
                    <div>
                      <dt>Seller</dt>
                      <dd>{listing.seller_name || "Unknown"}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>{listing.location || "Not set"}</dd>
                    </div>
                  </dl>
                </div>
                <div className="admin-listing__actions">
                  <button className="sell-primary-btn" type="button" disabled={busyId === listing.id} onClick={() => handleApprove(listing.id)}>
                    Accept
                  </button>
                  <button className="admin-reject-btn" type="button" disabled={busyId === listing.id} onClick={() => handleReject(listing.id)}>
                    Reject
                  </button>
                  <Link className="auth-link" to="/shopnow">
                    Store
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
