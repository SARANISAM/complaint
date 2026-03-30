import { apiCall } from "./api.js";

// Load departments
async function loadDepartments() {
  const data = await apiCall("/meta");

  const deptSelect = document.getElementById("department");
  deptSelect.innerHTML = "";

  data.departments.forEach(d => {
    const option = document.createElement("option");
    option.value = d.department_id;
    option.textContent = d.department_name;
    deptSelect.appendChild(option);
  });
}

loadDepartments();

// Show department for admin
document.getElementById("role").addEventListener("change", (e) => {
  document.getElementById("department").style.display =
    e.target.value === "admin" ? "block" : "none";
});

// Register function
window.register = async function () {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const department_id = document.getElementById("department").value;

  if (!name || !email || !password) {
    alert("Fill all fields");
    return;
  }

  let endpoint =
    role === "admin" ? "/register/admin" : "/register/user";

  let body =
    role === "admin"
      ? { name, email, password, department_id }
      : { name, email, password };

  const res = await apiCall(endpoint, "POST", body);

  if (res.message) {
    alert("Registered successfully!");
    window.location = "index.html";
  } else {
    alert("Error occurred");
  }
};