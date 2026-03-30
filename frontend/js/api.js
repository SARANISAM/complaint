const PROD_API = "https://complaint-eyfd.onrender.com/api";
const LOCAL_API = "http://localhost:3000/api";
const BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? LOCAL_API : PROD_API;

export async function apiCall(endpoint, method = "GET", body = null) {
  const res = await fetch(BASE_URL + endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : null
  });

  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (responseData && responseData.message) || (responseData && responseData.error) || "Server error";
    throw new Error(error);
  }

  return responseData;
}