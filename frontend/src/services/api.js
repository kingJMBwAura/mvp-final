const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = `http://${API_HOST}:8000/api/`;

async function parseJsonResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || data.detail || "Request failed");
    error.responseData = data;
    throw error;
  }
  return data;
}

export async function getHello() {
  const response = await fetch(`${API_BASE}hello/`);
  return response.json();
}

export async function getWatches(search = "") {
  const params = new URLSearchParams();
  const trimmedSearch = search.trim();
  if (trimmedSearch) params.set("search", trimmedSearch);

  const queryString = params.toString();
  const response = await fetch(`${API_BASE}watches/${queryString ? `?${queryString}` : ""}`);
  if (!response.ok) throw new Error("Failed to fetch watches");
  return response.json();
}

export async function getWatchById(id) {
  const response = await fetch(`${API_BASE}watches/${id}/`);
  return response.json();
}

export async function createWatchListing(payload) {
  const isFormData = payload instanceof FormData;
  const response = await fetch(`${API_BASE}watches/create/`, {
    method: "POST",
    credentials: "include",
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
    body: isFormData ? payload : JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Failed to create watch listing");
    error.responseData = data;
    throw error;
  }
  return data;
}

export async function signup(payload) {
  const response = await fetch(`${API_BASE}auth/signup/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
}

export async function login(payload) {
  const response = await fetch(`${API_BASE}auth/login/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
}

export async function logout() {
  const response = await fetch(`${API_BASE}auth/logout/`, {
    method: "POST",
    credentials: "include",
  });
  return parseJsonResponse(response);
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE}auth/me/`, {
    credentials: "include",
  });
  return parseJsonResponse(response);
}

export async function getPendingListings() {
  const response = await fetch(`${API_BASE}watches/pending/`, {
    credentials: "include",
  });
  return parseJsonResponse(response);
}

export async function approveListing(id) {
  const response = await fetch(`${API_BASE}watches/${id}/approve/`, {
    method: "POST",
    credentials: "include",
  });
  return parseJsonResponse(response);
}

export async function rejectListing(id) {
  const response = await fetch(`${API_BASE}watches/${id}/reject/`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseJsonResponse(response);
}

export async function getCart() {
    const response = await fetch(`${API_BASE}cart/`);
    if (!response.ok) throw new Error("Cart fetch failed");
    return response.json();
  }

export async function applyPromoCode(code, options = {}) {
    const response = await fetch(`${API_BASE}promo/apply/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promo_code: code, ...options }),
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

export async function getOrders(userId = 1) {
  const response = await fetch(`${API_BASE}orders/user/${userId}/`, {
    credentials: "include",
  });
  return parseJsonResponse(response);
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
