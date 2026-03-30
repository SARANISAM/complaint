import { apiCall } from "./api.js";

const user_id = sessionStorage.getItem("user_id");

const STATUS = {
  1: "Pending",
  2: "In Progress",
  3: "Resolved"
};

const PRIORITY_ICONS = {
  1: "🟢",
  2: "🟡",
  3: "🔴",
  4: "🔴🔴"
};

const PRIORITY_LABELS = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Critical"
};

let chartInstance = null;

function getLatestStatus(statusUpdates = []) {
  if (!Array.isArray(statusUpdates) || statusUpdates.length === 0) return { status_id: 1 };
  return statusUpdates
    .slice()
    .sort((a, b) => new Date(a.updated_date) - new Date(b.updated_date))
    .pop();
}

function renderChart(data) {
  const counts = { 1: 0, 2: 0, 3: 0 };
  data.forEach(c => {
    const latest = getLatestStatus(c.status_updates);
    counts[latest.status_id]++;
  });

  const chartContainer = document.getElementById("chartContainer");
  if (data.length > 0) {
    chartContainer.classList.add("show");
  } else {
    chartContainer.classList.remove("show");
  }

  const ctx = document.getElementById("statusChart");
  if (!ctx) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Pending", "In Progress", "Resolved"],
      datasets: [
        {
          data: [counts[1], counts[2], counts[3]],
          backgroundColor: [
            "rgba(176, 125, 98, 0.7)",
            "rgba(15, 118, 110, 0.7)",
            "rgba(107, 112, 92, 0.7)"
          ],
          borderColor: [
            "rgba(176, 125, 98, 1)",
            "rgba(15, 118, 110, 1)",
            "rgba(107, 112, 92, 1)"
          ],
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { size: 13, family: "Inter, sans-serif" },
            padding: 15,
            usePointStyle: true
          }
        }
      }
    }
  });
}

let allComplaints = [];

function filterComplaintsByDateRange(complaints, rangeType) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return complaints.filter(c => {
    const complaintDate = new Date(c.date_of_submission);

    switch (rangeType) {
      case "today":
        return complaintDate >= startOfToday;
      case "week":
        return complaintDate >= startOfWeek;
      case "month":
        return complaintDate >= startOfMonth;
      case "custom":
        const fromDate = document.getElementById("customFromDate").value;
        const toDate = document.getElementById("customToDate").value;
        if (!fromDate || !toDate) return true;
        const from = new Date(fromDate);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        return complaintDate >= from && complaintDate <= to;
      case "all":
      default:
        return true;
    }
  });
}

function sortComplaints(complaints, sortType) {
  const sorted = [...complaints];

  switch (sortType) {
    case "newest-date":
      sorted.sort((a, b) => new Date(b.date_of_submission) - new Date(a.date_of_submission));
      break;
    case "oldest-date":
      sorted.sort((a, b) => new Date(a.date_of_submission) - new Date(b.date_of_submission));
      break;
    case "priority-high":
      sorted.sort((a, b) => (b.priority_id || 999) - (a.priority_id || 999));
      break;
    case "priority-low":
      sorted.sort((a, b) => (a.priority_id || 0) - (b.priority_id || 0));
      break;
    case "status-pending":
      sorted.sort((a, b) => {
        const statusA = getLatestStatus(a.status_updates).status_id;
        const statusB = getLatestStatus(b.status_updates).status_id;
        return statusA - statusB;
      });
      break;
    case "status-resolved":
      sorted.sort((a, b) => {
        const statusA = getLatestStatus(a.status_updates).status_id;
        const statusB = getLatestStatus(b.status_updates).status_id;
        return statusB - statusA;
      });
      break;
    default:
      break;
  }

  return sorted;
}

async function loadAndDisplay() {
  const sortType = document.getElementById("sortSelect").value || "newest-date";
  const dateRange = document.getElementById("dateFilter").value || "all";

  let filtered = filterComplaintsByDateRange(allComplaints, dateRange);
  const sorted = sortComplaints(filtered, sortType);

  renderComplaints(sorted);
}

function renderComplaints(data) {
  const list = document.getElementById("list");
  list.innerHTML = "";

  if (!Array.isArray(data) || data.length === 0) {
    list.innerHTML = "<p>No complaints found.</p>";
    return;
  }

  data.forEach(c => {
    const latest = getLatestStatus(c.status_updates);
    const statusName = latest.status?.status_name || STATUS[latest.status_id] || "Pending";

    const currentResolution = (c.resolutions && c.resolutions.length > 0)
      ? c.resolutions[c.resolutions.length - 1]
      : null;

    const priorityId = c.priority_id || 2;
    const priorityIcon = PRIORITY_ICONS[priorityId] || "🟡";
    const priorityLabel = PRIORITY_LABELS[priorityId] || c.priority?.priority_name || "Unknown";

    const submissionDate = new Date(c.date_of_submission);
    const formattedDate = submissionDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <div class="card-header">
        <h3>${c.title}</h3>
        <span class="badge ${statusName.toLowerCase().replace(" ", "-")}">${statusName}</span>
      </div>
      <p><strong>Department:</strong> ${c.departments.department_name}</p>
      <div class="priority-row">
        <span class="priority-badge">${priorityIcon} ${priorityLabel}</span>
        <span class="submission-date">📅 ${formattedDate}</span>
      </div>
      <p><strong>Current remark:</strong> ${latest.remarks || "-"}</p>
      ${currentResolution ? `<p><strong>Resolution Preview:</strong> ${currentResolution.resolution_text.slice(0, 140)}${currentResolution.resolution_text.length > 140 ? "..." : ""}</p>` : ""}
      <button class="btn small" onclick="event.stopPropagation(); window.location='complaint.html?id=${c.complaint_id}'">View Status</button>
    `;

    div.onclick = () => {
      window.location = `complaint.html?id=${c.complaint_id}`;
    };

    list.appendChild(div);
  });
}

document.getElementById("sortSelect").addEventListener("change", loadAndDisplay);
document.getElementById("dateFilter").addEventListener("change", (e) => {
  const customGroup = document.getElementById("customDateGroup");
  customGroup.style.display = e.target.value === "custom" ? "flex" : "none";
  loadAndDisplay();
});

document.getElementById("customFromDate").addEventListener("change", loadAndDisplay);
document.getElementById("customToDate").addEventListener("change", loadAndDisplay);

async function initDashboard() {
  allComplaints = await apiCall(`/my-complaints/${user_id}`);
  renderChart(allComplaints);
  loadAndDisplay();
}

initDashboard();