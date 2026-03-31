const BASE_URL = "https://complaint-eyfd.onrender.com";



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