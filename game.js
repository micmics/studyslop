/*
DINO STUDY RUN — GAME + PAGE INTERACTION
Controls: Space / Up Arrow / tap Jump.
The game pauses on collision until at least one flashcard is flipped.
*/
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    const $ = (id) => document.getElementById(id);
    const scoreEl = $("score"), bestEl = $("high-score"), statusEl = $("game-status");
    const overlay = $("start-overlay"), studyPanel = $("study-panel");
    const deckPicker = $("deck-picker"), deckList = $("deck-list"), deckError = $("deck-error");
    const cardArea = $("card-area"), deckNameEl = $("active-deck-name"), positionEl = $("card-position");
    const flashcard = $("flashcard"), sideLabel = $("card-side-label"), cardText = $("card-text");
    const feedback = $("card-feedback"), nextButton = $("next-card"), continueButton = $("continue-button");

    const W = 900, H = 260, GROUND = 210, DINO_X = 92, DINO_W = 36, DINO_H = 42;
    let state = "ready", raf = 0, lastTime = 0, score = 0, best = 0, speed = 5.2;
    let spawnTimer = 55, groundOffset = 0, obstacles = [];
    let clouds = [{ x: 180, y: 44 }, { x: 520, y: 72 }, { x: 760, y: 35 }];
    let dino = { y: GROUND - DINO_H, vy: 0, onGround: true, step: 0 };
    let activeDeckId = null, currentCard = null, flipped = false;

    try { best = Number(localStorage.getItem("dinoStudyHighScore")) || 0; } catch (_) {}
    bestEl.textContent = fmt(best);
    function fmt(n) { return String(Math.floor(n)).padStart(5, "0"); }
    function status(s) { statusEl.textContent = s; }

    function drawDino(x, y, running) {
      ctx.fillStyle = "#202124";
      ctx.fillRect(x + 7, y + 9, 22, 23); ctx.fillRect(x + 19, y + 1, 15, 16);
      ctx.fillRect(x + 26, y + 5, 10, 6); ctx.fillRect(x + 1, y + 15, 9, 5);
      ctx.fillStyle = "#fff"; ctx.fillRect(x + 29, y + 4, 3, 3); ctx.fillStyle = "#202124";
      if (running && dino.onGround && Math.floor(dino.step / 5) % 2 === 0) {
        ctx.fillRect(x + 10, y + 31, 6, 11); ctx.fillRect(x + 22, y + 31, 6, 7);
      } else {
        ctx.fillRect(x + 10, y + 31, 6, 7); ctx.fillRect(x + 22, y + 31, 6, 11);
      }
    }
    function drawCactus(o) {
      const x = o.x, y = GROUND - o.h; ctx.fillStyle = "#202124";
      ctx.fillRect(x + 7, y, 9, o.h); ctx.fillRect(x, y + 13, 7, 6);
      ctx.fillRect(x, y + 8, 4, 12); ctx.fillRect(x + 16, y + 20, 7, 6); ctx.fillRect(x + 19, y + 15, 4, 12);
    }
    function drawScene() {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#dfe2e7";
      clouds.forEach(c => { ctx.fillRect(c.x, c.y, 28, 5); ctx.fillRect(c.x + 7, c.y - 5, 13, 5); });
      ctx.fillStyle = "#202124"; ctx.fillRect(0, GROUND, W, 2);
      for (let x = -20; x < W; x += 42) ctx.fillRect(x - (groundOffset % 42), GROUND + 12, 17, 2);
      obstacles.forEach(drawCactus); drawDino(DINO_X, dino.y, state === "running");
    }
    function jump() {
      if (state === "ready") { startGame(); return; }
      if (state === "running" && dino.onGround) { dino.vy = -13.2; dino.onGround = false; }
    }
    function startGame(resetRun = true) {
      state = "running"; status("RUNNING"); overlay.hidden = true;
      if (resetRun) { score = 0; speed = 5.2; }
      spawnTimer = 45; obstacles = []; dino.y = GROUND - DINO_H; dino.vy = 0; dino.onGround = true;
      lastTime = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    }
    function showError(message) { deckError.textContent = message; deckError.hidden = false; }
    function renderDeckPicker() {
      deckList.replaceChildren(); deckError.hidden = true;
      const api = window.DinoStudyDecks;
      if (!api) { showError("The deck system did not load. Check deck-cards.js and refresh the page."); return; }
      const errors = api.getDeckErrors(), decks = api.getDecks();
      if (errors.length) showError("Some deck entries were skipped: " + errors.join(" "));
      if (!decks.length) { showError("No valid decks found. Add a valid deck in PART 2 of deck-cards.js."); return; }
      decks.forEach(deck => {
        const button = document.createElement("button"); button.type = "button"; button.className = "deck-option";
        const name = document.createElement("strong"), detail = document.createElement("span");
        name.textContent = deck.name;
        detail.textContent = `${deck.cardCount} card${deck.cardCount === 1 ? "" : "s"}` + (deck.description ? ` · ${deck.description}` : "");
        button.append(name, detail); button.addEventListener("click", () => selectDeck(deck.id)); deckList.append(button);
      });
    }
    function gameOver() {
      if (state !== "running") return;
      state = "choosing"; status("STUDY BREAK");
      if (score > best) { best = score; bestEl.textContent = fmt(best); try { localStorage.setItem("dinoStudyHighScore", String(best)); } catch (_) {} }
      scoreEl.textContent = fmt(score); studyPanel.hidden = false; deckPicker.hidden = false; cardArea.hidden = true;
      activeDeckId = null; currentCard = null; flipped = false; renderDeckPicker(); drawScene();
      studyPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function selectDeck(id) {
      const card = window.DinoStudyDecks && window.DinoStudyDecks.getCard(id);
      if (!card) { showError("Could not load that deck. Check its format in deck-cards.js."); return; }
      activeDeckId = id; currentCard = card; flipped = false; deckPicker.hidden = true; cardArea.hidden = false; renderCard();
    }
    function renderCard() {
      deckNameEl.textContent = currentCard.deckName;
      positionEl.textContent = `Card ${currentCard.index + 1} of ${currentCard.total}`;
      flashcard.setAttribute("aria-pressed", "false"); sideLabel.textContent = "QUESTION · TAP TO REVEAL";
      cardText.textContent = currentCard.front; feedback.textContent = "Reveal the answer to unlock Continue.";
      nextButton.disabled = true; continueButton.disabled = true;
    }
    function flipCard() {
      if (!currentCard || flipped) return;
      flipped = true; flashcard.setAttribute("aria-pressed", "true"); sideLabel.textContent = "ANSWER";
      cardText.textContent = currentCard.back; feedback.textContent = "Answer revealed. Continue running or study another card.";
      nextButton.disabled = false; continueButton.disabled = false;
    }
    function nextCard() {
      if (!flipped || !activeDeckId) return;
      const next = window.DinoStudyDecks.advanceCard(activeDeckId);
      if (!next) { showError("Could not load the next card. Check this deck in deck-cards.js."); return; }
      currentCard = next; flipped = false; renderCard();
    }
    function resumeGame() {
      if (!flipped) return;
      studyPanel.hidden = true; startGame(false);
    }
    function loop(time) {
      if (state !== "running") return;
      const dt = lastTime ? Math.min((time - lastTime) / 16.67, 2) : 1; lastTime = time;
      score += dt * 0.12 * speed; speed = Math.min(10, 5.2 + score / 850); scoreEl.textContent = fmt(score); dino.step += dt;
      dino.vy += 0.72 * dt; dino.y += dino.vy * dt;
      if (dino.y >= GROUND - DINO_H) { dino.y = GROUND - DINO_H; dino.vy = 0; dino.onGround = true; }
      groundOffset += speed * dt;
      clouds.forEach(c => { c.x -= speed * 0.18 * dt; if (c.x < -35) { c.x = W + Math.random() * 100; c.y = 30 + Math.random() * 55; } });
      spawnTimer -= dt;
      if (spawnTimer <= 0) { obstacles.push({ x: W + 10, h: 27 + Math.floor(Math.random() * 17), w: 23 }); spawnTimer = Math.max(43, 76 + Math.random() * 40 - speed * 2); }
      obstacles.forEach(o => { o.x -= speed * dt; }); obstacles = obstacles.filter(o => o.x > -35);
      const d = { left: DINO_X + 5, right: DINO_X + DINO_W - 2, top: dino.y + 4, bottom: dino.y + DINO_H };
      for (const o of obstacles) {
        const b = { left: o.x, right: o.x + o.w, top: GROUND - o.h, bottom: GROUND };
        if (d.right > b.left + 2 && d.left < b.right - 2 && d.bottom > b.top + 2 && d.top < b.bottom) { gameOver(); return; }
      }
      drawScene(); raf = requestAnimationFrame(loop);
    }

    $("start-button").addEventListener("click", startGame);
    $("jump-button").addEventListener("click", jump);
    canvas.addEventListener("pointerdown", jump);
    flashcard.addEventListener("click", flipCard);
    nextButton.addEventListener("click", nextCard);
    continueButton.addEventListener("click", resumeGame);
    $("choose-another-deck").addEventListener("click", () => { deckPicker.hidden = false; cardArea.hidden = true; flipped = false; renderDeckPicker(); });
    document.addEventListener("keydown", event => {
      if (event.code === "Enter" && event.target === flashcard) { event.preventDefault(); flipCard(); return; }
      if (event.code !== "Space" && event.code !== "ArrowUp") return;
      const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (event.target === flashcard) { event.preventDefault(); flipCard(); return; }
      if (tag === "button") return;
      event.preventDefault(); jump();
    });
    drawScene();
    window.addEventListener("resize", drawScene);
  });
})();
