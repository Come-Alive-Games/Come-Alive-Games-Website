let ALL_FEEDBACK = [];
let ACTIVE_GAME = "All";

document.getElementById("gateForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const pw = document.getElementById("pw").value;
  const msg = document.getElementById("gateMsg");
  if (pw === ADMIN_PASSWORD) {
    document.getElementById("gate").style.display = "none";
    document.getElementById("panel").style.display = "block";
    loadAllFeedback();
  } else {
    msg.textContent = "Incorrect password.";
  }
});

async function loadAllFeedback() {
  const tbody = document.getElementById("feedbackBody");
  try {
    const { data, error } = await supabaseClient
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    ALL_FEEDBACK = data || [];
    buildGameFilter();
    renderTable();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6">Couldn't load feedback. Check your Supabase config in assets/js/supabase-config.js.</td></tr>`;
  }
}

function buildGameFilter() {
  const container = document.getElementById("gameFilter");
  const games = ["All", ...new Set(ALL_FEEDBACK.map(f => f.game_slug))];
  container.innerHTML = "";
  games.forEach(slug => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = slug;
    btn.setAttribute("aria-pressed", slug === ACTIVE_GAME ? "true" : "false");
    btn.addEventListener("click", () => {
      ACTIVE_GAME = slug;
      [...container.children].forEach(c => c.setAttribute("aria-pressed", c === btn ? "true" : "false"));
      renderTable();
    });
    container.appendChild(btn);
  });
}

function renderTable() {
  const tbody = document.getElementById("feedbackBody");
  const rows = ACTIVE_GAME === "All" ? ALL_FEEDBACK : ALL_FEEDBACK.filter(f => f.game_slug === ACTIVE_GAME);

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No feedback yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(f => `
    <tr>
      <td>${f.game_slug}</td>
      <td>${escapeHtml(f.name || "Anonymous")}</td>
      <td>${"★".repeat(f.rating)}</td>
      <td>${escapeHtml(f.comment)}</td>
      <td>${new Date(f.created_at).toLocaleDateString()}</td>
      <td><button class="btn btn-small" onclick="removeFeedback('${f.id}')">Remove</button></td>
    </tr>
  `).join("");
}

async function removeFeedback(id) {
  if (!confirm("Permanently remove this comment?")) return;
  try {
    const { error } = await supabaseClient.from("feedback").delete().eq("id", id);
    if (error) throw error;
    ALL_FEEDBACK = ALL_FEEDBACK.filter(f => f.id !== id);
    renderTable();
  } catch (e) {
    alert("Couldn't remove that entry. Please try again.");
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}
