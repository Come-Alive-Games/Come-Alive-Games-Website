const STATUS_LABEL = {
  "in-testing": "In Testing",
  "new": "New",
  "closed": "Closed Beta"
};

const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");
let selectedRating = 0;
let currentGame = null;

async function init() {
  if (!slug) {
    document.getElementById("gameTitle").textContent = "Game not found";
    return;
  }

  const res = await fetch("games/games.json", { cache: "no-store" });
  const games = await res.json();
  currentGame = games.find(g => g.slug === slug);

  if (!currentGame) {
    document.getElementById("gameTitle").textContent = "Game not found";
    document.getElementById("gameDescription").textContent = "We couldn't find a game with that link. It may have been removed or renamed.";
    return;
  }

  document.title = `${currentGame.title} — Come Alive Games`;
  document.getElementById("gameCategory").textContent = currentGame.category;
  document.getElementById("gameTitle").textContent = currentGame.title;
  document.getElementById("gameStatus").textContent = STATUS_LABEL[currentGame.status] || "In Testing";
  document.getElementById("gameVersion").textContent = `v${currentGame.version}`;
  document.getElementById("gameDescription").textContent = currentGame.description;
  document.getElementById("gameInstructions").textContent = currentGame.instructions;

  const issuesList = document.getElementById("gameIssues");
  issuesList.innerHTML = (currentGame.knownIssues || []).map(i => `<li>${i}</li>`).join("") || "<li>No known issues reported yet.</li>";

  const framePath = `games/${currentGame.file}`;
  document.getElementById("gameFrame").src = framePath;
  document.getElementById("openNewTab").href = framePath;

  loadRatingSummary();
  loadComments();
  setupStarPicker();
  setupForm();
}

function setupStarPicker() {
  const buttons = document.querySelectorAll("#starPicker button");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      selectedRating = parseInt(btn.dataset.value);
      buttons.forEach(b => b.classList.toggle("active", parseInt(b.dataset.value) <= selectedRating));
    });
  });
}

function setupForm() {
  const form = document.getElementById("feedbackForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("formMsg");
    const name = document.getElementById("name").value.trim();
    const comment = document.getElementById("comment").value.trim();

    if (!selectedRating) {
      msg.textContent = "Please select a star rating.";
      msg.className = "form-msg err";
      return;
    }

    try {
      const { error } = await supabaseClient.from("feedback").insert({
        game_slug: slug,
        name: name,
        rating: selectedRating,
        comment: comment,
        approved: true
      });
      if (error) throw error;

      msg.textContent = "Thanks — your feedback was submitted!";
      msg.className = "form-msg ok";
      form.reset();
      selectedRating = 0;
      document.querySelectorAll("#starPicker button").forEach(b => b.classList.remove("active"));
      loadRatingSummary();
      loadComments();
    } catch (err) {
      msg.textContent = "Something went wrong submitting your feedback. Please try again.";
      msg.className = "form-msg err";
    }
  });
}

async function loadRatingSummary() {
  try {
    const { data, error } = await supabaseClient
      .from("feedback")
      .select("rating")
      .eq("game_slug", slug)
      .eq("approved", true);
    if (error) throw error;

    if (!data || data.length === 0) {
      document.getElementById("avgStars").textContent = "☆☆☆☆☆";
      document.getElementById("avgNumber").textContent = "–";
      document.getElementById("ratingCount").textContent = "No ratings yet";
      return;
    }
    const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
    document.getElementById("avgStars").textContent = "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));
    document.getElementById("avgNumber").textContent = avg.toFixed(1);
    document.getElementById("ratingCount").textContent = `${data.length} rating${data.length === 1 ? "" : "s"}`;
  } catch (e) {
    document.getElementById("ratingCount").textContent = "Ratings unavailable";
  }
}

async function loadComments() {
  const list = document.getElementById("commentsList");
  try {
    const { data, error } = await supabaseClient
      .from("feedback")
      .select("*")
      .eq("game_slug", slug)
      .eq("approved", true)
      .order("created_at", { ascending: false });
    if (error) throw error;

    if (!data || data.length === 0) {
      list.innerHTML = `<p class="empty-state">No feedback yet — be the first to play and share your thoughts.</p>`;
      return;
    }

    list.innerHTML = data.map(c => `
      <div class="comment">
        <div class="top-row">
          <span class="name">${escapeHtml(c.name || "Anonymous")}</span>
          <span class="stars">${"★".repeat(c.rating)}${"☆".repeat(5 - c.rating)}</span>
        </div>
        <div class="date">${new Date(c.created_at).toLocaleDateString()}</div>
        <p>${escapeHtml(c.comment)}</p>
      </div>
    `).join("");
  } catch (e) {
    list.innerHTML = `<p class="empty-state">Feedback isn't available right now. Make sure Supabase is configured (see README).</p>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

init();
