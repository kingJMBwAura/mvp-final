import { useEffect, useState } from "react";
import { Link } from "react-router";
import KronosHeader from "../components/KronosHeader";
import { useAuth } from "../services/auth";
import { getOrders } from "../services/api";
import "../styles/OrdersPage.css";

function formatCurrency(value) {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return "0.00";

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return "Recently";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setOrders([]);
      setError("");
      setIsLoading(false);
      return;
    }

    async function loadOrders() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getOrders(user.id);
        setOrders(data.orders || []);
      } catch (err) {
        console.error("Failed to load orders:", err);
        setError("We couldn't load your orders right now.");
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
  }, [authLoading, user]);

  return (
    <div className="page-shell orders-page">
      <div className="orders-page__header">
        <KronosHeader />
        <div className="orders-page__breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>Orders</span>
        </div>
      </div>

      <main className="orders-page__content">
        <div className="orders-page__intro">
          <h1 className="orders-page__title">My Orders</h1>
          <p>Review your completed checkout history and order details.</p>
        </div>

        {(authLoading || isLoading) && <p className="orders-page__status">Loading your orders...</p>}

        {!authLoading && !isLoading && !user && (
          <div className="orders-page__empty kronos-card">
            <p>Log in to view your order history.</p>
            <div className="orders-page__empty-actions">
              <Link to="/auth">Log in</Link>
              <Link to="/auth?mode=signup">Create account</Link>
            </div>
          </div>
        )}

        {!authLoading && !isLoading && user && error && (
          <div className="orders-page__empty kronos-card">
            <p>{error}</p>
          </div>
        )}

        {!authLoading && !isLoading && user && !error && orders.length === 0 && (
          <div className="orders-page__empty kronos-card">
            <p>You have not checked out any watches yet.</p>
            <Link to="/shopnow">Browse watches</Link>
          </div>
        )}

        {!authLoading && !isLoading && user && !error && orders.length > 0 && (
          <div className="orders-list">
            {orders.map((order) => {
              const watches = order.watches || [];

              return (
                <article key={order.order_id} className="orders-card kronos-card">
                  <div className="orders-card__summary">
                    <div>
                      <p className="orders-card__eyebrow">Order #{order.order_id}</p>
                      <h2>{watches.map((watch) => watch.watch_name).filter(Boolean).join(", ") || "Watch order"}</h2>
                      <p className="orders-card__meta">
                        {formatDate(order.created_at)} · {order.delivery_method || "Standard"} delivery
                      </p>
                    </div>
                    <div className="orders-card__total">
                      <span>Total</span>
                      <strong>₱{formatCurrency(order.total_price)}</strong>
                    </div>
                  </div>

                  <div className="orders-card__items">
                    {watches.map((watch) => (
                      <div key={watch.id} className="orders-card__watch">
                        <div className="orders-card__image-wrap">
                          {watch.image_url ? (
                            <img src={watch.image_url} alt={`${watch.brand} ${watch.watch_name}`} />
                          ) : (
                            <div className="orders-card__image-placeholder">⌚</div>
                          )}
                        </div>
                        <div>
                          <h3>{watch.brand} {watch.watch_name}</h3>
                          <p>{watch.reference_number || "Reference pending"}</p>
                          <strong>₱{formatCurrency(watch.sale_price)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="orders-card__footer">
                    <span className={`orders-card__status orders-card__status--${order.payment_status || "pending"}`}>
                      {order.payment_status || "pending"}
                    </span>
                    <Link to={`/orders/${order.order_id}`}>View details</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
