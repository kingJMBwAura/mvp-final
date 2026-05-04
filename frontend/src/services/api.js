const API_BASE = "http://127.0.0.1:8000/api/";

export async function getHello() {
  const response = await fetch(`${API_BASE}hello/`);
  return response.json();
}

export async function getWatches() {
  const response = await fetch(`${API_BASE}watches/`);
  if (!response.ok) throw new Error("Failed to fetch watches");
  return response.json();
}

export async function getWatchById(id) {
  const response = await fetch(`${API_BASE}watches/${id}/`);
  return response.json();
}

export async function getCart() {
    const response = await fetch(`${API_BASE}cart/`);
    if (!response.ok) throw new Error("Cart fetch failed");
    return response.json();
  }

export async function applyPromoCode(code) {
    const response = await fetch(`${API_BASE}promo/apply/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promo_code: code }),
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || "Invalid promo code");
      throw error;
    }
    return data;
}

export async function addToCart(watchId, userId = 1) {
    const response = await fetch(`${API_BASE}cart/add/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            watch_id: watchId, 
            user_id: userId 
        }),
    });
    return response.json();
}

export async function createOrder(payload) {
  // Ensure this includes the full path your Django app uses
  const response = await fetch(`${API_BASE}orders/create/`, { 
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error("Validation Failed");
    error.responseData = data; // Attach Django's error messages (like "Enter a valid email")
    throw error;
  }
  return data;
}

export async function getOrderById(id) {
  const response = await fetch(`${API_BASE}orders/${id}/`);
  return response.json();
}

export async function removeFromCart(cartItemId) {
  const response = await fetch(`${API_BASE}cart/remove/${cartItemId}/`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to remove item");
  return response.json();
}

export const apiRequest = async (endpoint, method = 'GET', body = null) => {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE}${endpoint}`, options); 
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
};

