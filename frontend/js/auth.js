import { apiCall } from "./api.js";

window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  const res = await apiCall("/login", "POST", { email, password, role });

  if (res.user) {
    sessionStorage.setItem("user_id", res.user.user_id || res.user.admin_id);
    sessionStorage.setItem("role", role);
    sessionStorage.setItem("department_id", res.user.department_id || "");

    window.location = role === "admin" ? "admin.html" : "dashboard.html";
  } else {
    alert(res.message);
  }
};