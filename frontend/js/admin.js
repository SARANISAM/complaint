import { apiCall } from "./api.js";

const dept = sessionStorage.getItem("department_id");
const admin_id = sessionStorage.getItem("user_id");

const list = document.getElementById("list");
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");
const searchInput = document.getElementById("searchInput");
const sortDate = document.getElementById("sortDate");
const refreshBtn = document.getElementById("refreshBtn");
const statsPanel = document.getElementById("statsPanel");
const deptNameElem = document.getElementById("deptName");

const STATUS = { 1: "Pending", 2: "In Progress", 3: "Resolved" };

function formatDate(dateText) {
  if (!dateText) return "N/A";
  return new Date(dateText).toLocaleString();
}

function getLatestStatus(statusUpdates = []) {
  if (!statusUpdates.length) return { status_id: 1, remarks: "Submitted" };
  return statusUpdates
    .slice()
    .sort((a, b) => new Date(a.updated_date) - new Date(b.updated_date))
    .pop();
}

function getProgressPercent(status_id) {
  if (status_id === 1) return 33;
  if (status_id === 2) return 66;
  if (status_id === 3) return 100;
  return 0;
}

function buildStatusBadge(status_id) {
  return `<span class="badge">${STATUS[status_id]}</span>`;
}

function renderStats(data) {
  const counts = { 1: 0, 2: 0, 3: 0 };

  data.forEach(c => {
    const latest = getLatestStatus(c.status_updates);
    counts[latest.status_id]++;
  });

  statsPanel.innerHTML = `
    <div>Total: ${data.length}</div>
    <div>Pending: ${counts[1]}</div>
    <div>In Progress: ${counts[2]}</div>
    <div>Resolved: ${counts[3]}</div>
  `;
}

function renderCards(data) {
  list.innerHTML = "";

  if (!data.length) {
    list.innerHTML = "<p>No complaints found</p>";
    return;
  }

  data.forEach(c => {
    const latest = getLatestStatus(c.status_updates);
    const resolution = c.resolutions?.slice(-1)[0];

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${c.title}</h3>
      ${buildStatusBadge(latest.status_id)}

      <p><strong>User:</strong> ${c.users?.name}</p>
      <p><strong>Email:</strong> ${c.users?.email}</p>
      <p><strong>Priority:</strong> ${c.priority?.priority_name}</p>
      <p><strong>Date:</strong> ${formatDate(c.date_of_submission)}</p>

      <p>${c.description}</p>

      <div class="progress-bar">
        <div class="progress-inner" style="width:${getProgressPercent(latest.status_id)}%"></div>
      </div>

      <select id="status_${c.complaint_id}">
        <option value="1" ${latest.status_id === 1 ? "selected" : ""}>Pending</option>
        <option value="2" ${latest.status_id === 2 ? "selected" : ""}>In Progress</option>
        <option value="3" ${latest.status_id === 3 ? "selected" : ""}>Resolved</option>
      </select>

      <button onclick="applyStatus('${c.complaint_id}')">Update</button>
      <button onclick="window.location='complaint.html?id=${c.complaint_id}'">View</button>

      <input id="resolve_${c.complaint_id}" placeholder="Resolution remark" />
      <button onclick="resolveNow('${c.complaint_id}')">Resolve</button>

      <div>
        ${resolution ? `<strong>Resolution:</strong> ${resolution.resolution_text}` : "Not resolved"}
      </div>

      <button onclick="toggleTimeline('${c.complaint_id}')">Toggle Timeline</button>

      <div id="timeline_${c.complaint_id}" style="display:none;">
        ${(c.status_updates || []).map(s => `
          <p>
            ${formatDate(s.updated_date)} - 
            ${s.status?.status_name || STATUS[s.status_id]} 
            (${s.remarks})
          </p>
        `).join("")}
      </div>
    `;

    list.appendChild(card);
  });
}

async function loadAdmin() {
  if (!dept) {
    list.innerHTML = "<p>No department assigned</p>";
    return;
  }

  const data = await apiCall(`/admin/complaints/${dept}`);

  let filtered = data;

  if (statusFilter?.value) {
    filtered = filtered.filter(c => {
      const latest = getLatestStatus(c.status_updates);
      return latest.status_id == statusFilter.value;
    });
  }

  if (priorityFilter?.value) {
    filtered = filtered.filter(c => c.priority_id == priorityFilter.value);
  }

  if (searchInput?.value) {
    const term = searchInput.value.toLowerCase();
    filtered = filtered.filter(c =>
      c.title.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term)
    );
  }

  if (sortDate?.value === "oldest") {
    filtered.sort((a, b) => new Date(a.date_of_submission) - new Date(b.date_of_submission));
  } else {
    filtered.sort((a, b) => new Date(b.date_of_submission) - new Date(a.date_of_submission));
  }

  renderStats(filtered);
  renderCards(filtered);
}

window.applyStatus = async function (id) {
  const status_id = document.getElementById(`status_${id}`).value;

  if (status_id == 3) {
    const text = prompt("Enter resolution:");
    if (!text) return;

    await apiCall("/admin/resolve", "POST", {
      complaint_id: id,
      admin_id,
      resolution_text: text
    });
  } else {
    await apiCall("/admin/status", "POST", {
      complaint_id: id,
      admin_id,
      status_id,
      remarks: "Updated"
    });
  }

  alert("Updated");
  loadAdmin();
};

window.resolveNow = async function (id) {
  const text = document.getElementById(`resolve_${id}`).value;

  if (!text) {
    alert("Enter resolution");
    return;
  }

  await apiCall("/admin/resolve", "POST", {
    complaint_id: id,
    admin_id,
    resolution_text: text
  });

  alert("Resolved");
  loadAdmin();
};

window.toggleTimeline = function (id) {
  const el = document.getElementById(`timeline_${id}`);
  el.style.display = el.style.display === "none" ? "block" : "none";
};

refreshBtn?.addEventListener("click", loadAdmin);
statusFilter?.addEventListener("change", loadAdmin);
priorityFilter?.addEventListener("change", loadAdmin);
searchInput?.addEventListener("input", loadAdmin);
sortDate?.addEventListener("change", loadAdmin);

loadAdmin();
setInterval(loadAdmin, 20000);