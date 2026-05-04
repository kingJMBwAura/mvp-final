import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { getOrderById } from "../services/api";

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadOrder() {
      // 👉 STOP if the ID is actually missing or literally the string "undefined"
      if (!id || id === "undefined") {
        console.warn("Aborting fetch: Order ID is undefined.");
        setError("Invalid order reference accessed.");
        return;
      }

      try {
        const data = await getOrderById(id);
        setOrder(data);
      } catch (err) {
        console.error("Failed to fetch order:", err);
        setError("We couldn't load your order details. Please check back later.");
      }
    }
    loadOrder();
  }, [id]);

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "red" }}>{error}</p>
        <Link to="/" style={{ color: "#b08d57" }}>Return Home</Link>
      </div>
    );
  }

  if (!order) return <p style={{ textAlign: "center", padding: "4rem" }}>Loading...</p>;

  return (
    <div style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
      <h1>Order Confirmed</h1>
      <div style={{ border: "1px solid #ddd", padding: "2rem", marginTop: "2rem", textAlign: "left" }}>
        <p><strong>Order ID:</strong> {order.order_id || order.id}</p>
        <p><strong>Status:</strong> {order.payment_status}</p> 
        <p><strong>Total:</strong> ₱{parseFloat(order.total_price).toFixed(2)}</p>
      </div>
      <div style={{ marginTop: "2rem" }}>
        <Link to="/" style={{ color: "#b08d57" }}>&larr; Continue Shopping</Link>
      </div>
    </div>
  );
}