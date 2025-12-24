// assets/app.js
const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";
const searchForm = document.getElementById("searchForm");
const queryInput = document.getElementById("query");
const resultsEl = document.getElementById("results");
const statusEl = document.getElementById("status");
const favoritesListEl = document.getElementById("favoritesList");
const clearFavsBtn = document.getElementById("clearFavs");
const themeToggle = document.getElementById("themeToggle");

let favorites = new Set(
  JSON.parse(localStorage.getItem("wordly_favs") || "[]")
);

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "var(--danger)" : "inherit";
}

function saveFavorites() {
  localStorage.setItem("wordly_favs", JSON.stringify(Array.from(favorites)));
  renderFavorites();
}

function renderFavorites() {
  favoritesListEl.innerHTML = "";
  if (favorites.size === 0) {
    favoritesListEl.innerHTML = `<li class="muted">No favorites yet.</li>`;
    return;
  }
  for (const word of Array.from(favorites).reverse()) {
    const li = document.createElement("li");
    li.className = "fav-item";
    li.innerHTML = `
      <span>${escapeHtml(word)}</span>
      <div>
        <button class="btn small" data-action="open" data-word="${escapeHtml(
          word
        )}">Open</button>
        <button class="btn small danger" data-action="remove" data-word="${escapeHtml(
          word
        )}">Remove</button>
      </div>
    `;
    favoritesListEl.appendChild(li);
  }
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
}

async function fetchWord(word) {
  setStatus("Searching...");
  resultsEl.innerHTML = "";
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(word)}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error("Word not found.");
      throw new Error("Network error.");
    }
    const data = await res.json();
    setStatus("");
    renderResult(word, data);
  } catch (err) {
    setStatus(err.message || "An error occurred", true);
    resultsEl.innerHTML = `<div class="card"><p class="meta">No results for "${escapeHtml(
      word
    )}".</p></div>`;
  }
}

function renderResult(searched, data) {
  // data is an array; each item may be a different source/meaning
  resultsEl.innerHTML = "";
  // Show primary header (word + phonetics)
  const primary = data[0];
  const word = primary.word || searched;
  const phonetics = (primary.phonetics || [])
    .filter((p) => p.text)
    .map((p) => p.text);
  const audioSrc =
    (primary.phonetics || []).find((p) => p.audio && p.audio.length) || null;

  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `
    <div class="word-row">
      <div>
        <h3 class="word-title">${escapeHtml(word)}</h3>
        <div class="meta">${phonetics.join(" • ")}</div>
      </div>
      <div>
        <button id="saveFav" class="btn small">${
          favorites.has(word) ? "Saved" : "Save"
        }</button>
        ${
          audioSrc
            ? `<button id="playAudio" class="btn small">Play</button>`
            : ""
        }
      </div>
    </div>
  `;

  resultsEl.appendChild(card);

  // Meanings
  (primary.meanings || []).forEach((meaning) => {
    const meaningDiv = document.createElement("div");
    meaningDiv.className = "card";
    meaningDiv.innerHTML = `<div class="meta"><span class="pos">${escapeHtml(
      meaning.partOfSpeech || ""
    )}</span></div>`;
    const defs = meaning.definitions || [];
    defs.forEach((d, i) => {
      const defEl = document.createElement("div");
      defEl.className = "definition";
      defEl.innerHTML = `
        <div>${escapeHtml(d.definition || "")}</div>
        ${
          d.example
            ? `<div class="example">“${escapeHtml(d.example)}”</div>`
            : ""
        }
        ${
          d.synonyms && d.synonyms.length
            ? `<div class="meta">Synonyms: ${escapeHtml(
                d.synonyms.slice(0, 8).join(", ")
              )}</div>`
            : ""
        }
      `;
      meaningDiv.appendChild(defEl);
    });
    resultsEl.appendChild(meaningDiv);
  });

  // Source / raw JSON link (minimal)
  const srcCard = document.createElement("div");
  srcCard.className = "card";
  srcCard.innerHTML = `<div class="meta">Source: Free Dictionary API</div>`;
  resultsEl.appendChild(srcCard);

  // wire up buttons
  const saveBtn = document.getElementById("saveFav");
  saveBtn.addEventListener("click", () => {
    if (favorites.has(word)) favorites.delete(word);
    else favorites.add(word);
    saveFavorites();
    saveBtn.textContent = favorites.has(word) ? "Saved" : "Save";
  });

  if (audioSrc && audioSrc.audio) {
    const playBtn = document.getElementById("playAudio");
    const audio = new Audio(audioSrc.audio);
    playBtn.addEventListener("click", () => {
      audio.play().catch(() => setStatus("Unable to play audio", true));
    });
  }
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = queryInput.value.trim();
  if (!q) {
    setStatus("Please enter a word to search.", true);
    return;
  }
  fetchWord(q.toLowerCase());
});

favoritesListEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const action = btn.dataset.action;
  const word = btn.dataset.word;
  if (action === "open") {
    queryInput.value = word;
    fetchWord(word);
  } else if (action === "remove") {
    favorites.delete(word);
    saveFavorites();
  }
});

clearFavsBtn.addEventListener("click", () => {
  favorites.clear();
  saveFavorites();
});

themeToggle.addEventListener("click", () => {
  const isPressed = themeToggle.getAttribute("aria-pressed") === "true";
  themeToggle.setAttribute("aria-pressed", String(!isPressed));
  document.documentElement.classList.toggle("dark");
});

// initialize
renderFavorites();

// graceful fallback: if dark class exists, define colors (kept small)
if (
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
) {
  document.documentElement.classList.add("dark");
}
