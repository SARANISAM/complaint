import { apiCall } from "./api.js";

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function formatDate(raw) {
  if (!raw) return "N/A";
  return new Date(raw).toLocaleString();
}

function statusClass(statusName) {
  const normalized = (statusName || "pending").toLowerCase();
  if (normalized.includes("progress")) return "status-progress";
  if (normalized.includes("resolved")) return "status-resolved";
  return "status-pending";
}

async function loadComplaint() {
  const id = getQueryParam("id");
  if (!id) {
    document.getElementById("title").textContent = "Complaint not found";
    return;
  }

  const data = await apiCall(`/complaint/${id}`);
  const complaint = data.complaint || {};
  const history = data.history || [];
  const resolution = data.resolution || null;

  document.getElementById("title").textContent = complaint.title || "Complaint Details";
  document.getElementById("desc").textContent = complaint.description || "No description";

  const statusSummary = document.getElementById("currentStatus");
  const timelineContainer = document.getElementById("timeline");

  const historySorted = history
    .slice()
    .sort((a, b) => new Date(a.updated_date) - new Date(b.updated_date));

  const latest = historySorted.length
    ? historySorted[historySorted.length - 1]
    : { status: { status_name: "Pending" }, status_id: 1, remarks: "Complaint filed" };

  const statusBadgeClass = statusClass(latest.status?.status_name);
  statusSummary.innerHTML = `
    <strong>Current Status:</strong>
    <span class="badge ${statusBadgeClass}">${latest.status?.status_name || "Pending"}</span>
    <span class="status-note">${latest.remarks || "No remark"}</span>
  `;

  const progressTracker = document.getElementById("progressTracker");
  const hasPending = historySorted.some(h => h.status_id === 1);
  const hasProgress = historySorted.some(h => h.status_id === 2);
  const hasResolved = historySorted.some(h => h.status_id === 3);

  progressTracker.innerHTML = `
    <div class="progress-line">
      <div class="progress-item ${hasPending ? "completed" : ""}">
        <div class="progress-icon">📋</div>
        <div class="progress-label">Pending</div>
      </div>
      <div class="progress-connector ${hasPending ? "filled" : ""}"></div>
      <div class="progress-item ${hasProgress ? "completed" : ""}">
        <div class="progress-icon">⚙️</div>
        <div class="progress-label">In Progress</div>
      </div>
      <div class="progress-connector ${hasProgress ? "filled" : ""}"></div>
      <div class="progress-item ${hasResolved ? "completed" : ""}">
        <div class="progress-icon">✅</div>
        <div class="progress-label">Resolved</div>
      </div>
    </div>
  `;

  timelineContainer.innerHTML = "";

  if (historySorted.length === 0) {
    timelineContainer.innerHTML = "<p>No status updates yet.</p>";
  } else {
    let showAll = false;

    const renderTimeline = () => {
      timelineContainer.innerHTML = "";

      const controls = document.createElement("div");
      controls.className = "timeline-controls";

      if (historySorted.length > 3) {
        const toggleBtn = document.createElement("button");
        toggleBtn.className = "btn small";
        toggleBtn.textContent = showAll ? "Show last 3" : "Show all";
        toggleBtn.addEventListener("click", () => {
          showAll = !showAll;
          renderTimeline();
        });
        controls.appendChild(toggleBtn);
      }

      timelineContainer.appendChild(controls);

      const entries = showAll ? historySorted : historySorted.slice(-3);

      entries.forEach(item => {
        const entry = document.createElement("div");
        entry.className = "timeline-item";
        entry.innerHTML = `
          <p><strong>${item.status?.status_name || "Status"}</strong> - ${formatDate(item.updated_date)}</p>
          <p><em>${item.remarks || "No remarks"}</em></p>
          <p>Updated by: ${item.administrators?.name || "Admin"}</p>
        `;
        timelineContainer.appendChild(entry);
      });
    };

    renderTimeline();
  }

  const resolutionEl = document.getElementById("resolution");
  if (!resolution || !resolution.resolution_text) {
    resolutionEl.innerHTML = "<p><em>Not resolved yet.</em></p>";
  } else {
    resolutionEl.innerHTML = `
      <p>${resolution.resolution_text}</p>
      <p><strong>Resolved at:</strong> ${formatDate(resolution.resolved_at)}</p>
    `;
  }
}

loadComplaint();