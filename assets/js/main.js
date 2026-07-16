const STATUS_LABEL = {
  "in-testing": { text: "In Testing", cls: "" },
  "new": { text: "New", cls: "new" },
  "closed": { text: "Closed Beta", cls: "closed" }
};

let ALL_GAMES = [];
let ACTIVE_CATEGORY = "All";

async function loadGames() {
  const grid = document.getElementById("gameGrid");
  try {
    const res = await fetch("games/games.json", { cache: "no-store" });
    ALL_GAMES = await res.json();
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">Couldn't load the game library right now.</p>`;
    return;
  }

  const statEl = document.getElementById("statGames");
  if (statEl) statEl.textContent = ALL_GAMES.length;

  buildCategoryFilters();
  renderGrid();
}

function buildCategoryFilters() {
  const container = document.getElementById("categoryFilters");
  const categories = ["All", ...new Set(ALL_GAMES.map(g => g.category))];
  container.innerHTML = "";
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = cat;
    btn.setAttribute("aria-pressed", cat === ACTIVE_CATEGORY ? "true" : "false");
    btn.addEventListener("click", () => {
      ACTIVE_CATEGORY = cat;
      [...container.children].forEach(c => c.setAttribute("aria-pressed", c === btn ? "true" : "false"));
      renderGrid();
    });
    container.appendChild(btn);
  });
}

async function renderGrid() {
  const grid = document.getElementById("gameGrid");
  const games = ACTIVE_CATEGORY === "All" ? ALL_GAMES : ALL_GAMES.filter(g => g.category === ACTIVE_CATEGORY);

  if (games.length === 0) {
    grid.innerHTML = `<p class="empty-state">No games in this category yet.</p>`;
    return;
  }

  grid.innerHTML = games.map(g => {
    const status = STATUS_LABEL[g.status] || STATUS_LABEL["in-testing"];
    return `
      <a class="game-card" href="game.html?slug=${encodeURIComponent(g.slug)}">
        <span class="stamp ${status.cls}">${status.text}</span>
        <span class="category">${g.category}</span>
        <h3>${g.title}</h3>
        <p class="desc">${g.description}</p>
        <div class="rule-top"></div>
        <div class="meta-row">
          <span>v${g.version}</span>
          <span class="stars" id="stars-${g.slug}">Loading ratings…</span>
        </div>
      </a>
    `;
  }).join("");

  games.forEach(g => loadRatingSummary(g.slug));
}

async function loadRatingSummary(slug) {
  const el = document.getElementById(`stars-${slug}`);
  if (!el || typeof supabaseClient === "undefined") return;
  try {
    const { data, error } = await supabaseClient
      .from("feedback")
      .select("rating")
      .eq("game_slug", slug)
      .eq("approved", true);
    if (error || !data || data.length === 0) {
      el.textContent = "No ratings yet";
      return;
    }
    const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
    el.textContent = `${"★".repeat(Math.round(avg))}${"☆".repeat(5 - Math.round(avg))} (${data.length})`;
  } catch (e) {
    el.textContent = "No ratings yet";
  }
}

loadGames();
