/*
DINO STUDY RUN — GAME + PAGE INTERACTION
Controls: Space / Up Arrow / tap Jump. Down Arrow / S to duck (or hold Jump button with right-click? no — use keys).
Actually: ducking works with Down Arrow / S held. The on-screen DUCK button also works.
The game pauses on collision until at least one flashcard is flipped.
Difficulty ramps over time: faster speed, tighter spawn gaps, and
flying birds appear — duck under high birds, jump over low ones.
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
    const DUCK_H = 24; // dino height while ducking
    const BASE_SPEED = 5.2, MAX_SPEED = 14;
    let state = "ready", raf = 0, lastTime = 0, score = 0, best = 0, speed = BASE_SPEED;
    let spawnTimer = 55, birdTimer = 140, groundOffset = 0, obstacles = [], birds = [];
    let clouds = [{ x: 180, y: 44 }, { x: 520, y: 72 }, { x: 760, y: 35 }];
    let dust = [];
    let dino = { y: GROUND - DINO_H, vy: 0, onGround: true, step: 0, ducking: false, duckHeld: false };
    let activeDeckId = null, currentCard = null, flipped = false;

    try { best = Number(localStorage.getItem("dinoStudyHighScore")) || 0; } catch (_) {}
    bestEl.textContent = fmt(best);
    function fmt(n) { return String(Math.floor(n)).padStart(5, "0"); }
    function status(s) { statusEl.textContent = s; }

    function drawDino(x, y, running) {
      if (dino.ducking && dino.onGround) { drawDinoDuck(x, y, running); return; }
      // tail + body + head
      ctx.fillStyle = "#3f6212";
      ctx.fillRect(x + 7, y + 9, 22, 23); ctx.fillRect(x + 19, y + 1, 15, 16);
      ctx.fillRect(x + 26, y + 5, 10, 6); ctx.fillRect(x + 1, y + 15, 9, 5);
      // back ridge highlights
      ctx.fillStyle = "#a3e635";
      ctx.fillRect(x + 11, y + 9, 4, 3); ctx.fillRect(x + 18, y + 5, 4, 3);
      // belly
      ctx.fillStyle = "#bef264";
      ctx.fillRect(x + 9, y + 24, 17, 7);
      // eye + mouth
      ctx.fillStyle = "#fff"; ctx.fillRect(x + 29, y + 4, 4, 4);
      ctx.fillStyle = "#1c1e21"; ctx.fillRect(x + 31, y + 5, 2, 2); ctx.fillRect(x + 30, y + 9, 6, 1);
      // legs
      const leftLong = !(running && dino.onGround && Math.floor(dino.step / 5) % 2 === 0);
      ctx.fillStyle = "#3f6212";
      if (leftLong) { ctx.fillRect(x + 10, y + 31, 6, 11); ctx.fillRect(x + 22, y + 31, 6, 7); }
      else { ctx.fillRect(x + 10, y + 31, 6, 7); ctx.fillRect(x + 22, y + 31, 6, 11); }
      // toes at each leg's ground contact
      ctx.fillStyle = "#365314";
      ctx.fillRect(x + 10, leftLong ? y + 39 : y + 35, 6, 3);
      ctx.fillRect(x + 22, leftLong ? y + 35 : y + 39, 6, 3);
    }
    // Crouched dino: long body low to the ground (42 wide, 24 tall)
    function drawDinoDuck(x, groundTopY, running) {
      const y = GROUND - DUCK_H; // draw relative to duck height
      ctx.fillStyle = "#3f6212";
      // long horizontal body + head at front
      ctx.fillRect(x + 2, y + 4, 30, 16);
      ctx.fillRect(x + 30, y + 1, 12, 12);
      ctx.fillRect(x + 42, y + 4, 5, 5); // snout
      ctx.fillRect(x - 4, y + 8, 8, 5);  // tail
      // back ridge highlights
      ctx.fillStyle = "#a3e635";
      ctx.fillRect(x + 8, y + 4, 4, 3); ctx.fillRect(x + 18, y + 3, 4, 3);
      // belly
      ctx.fillStyle = "#bef264";
      ctx.fillRect(x + 6, y + 14, 22, 5);
      // eye + mouth
      ctx.fillStyle = "#fff"; ctx.fillRect(x + 37, y + 3, 4, 4);
      ctx.fillStyle = "#1c1e21"; ctx.fillRect(x + 39, y + 4, 2, 2); ctx.fillRect(x + 38, y + 8, 6, 1);
      // scurrying legs (alternate)
      const leftLong = running && Math.floor(dino.step / 4) % 2 === 0;
      ctx.fillStyle = "#3f6212";
      if (leftLong) { ctx.fillRect(x + 10, y + 19, 5, 5); ctx.fillRect(x + 24, y + 19, 5, 3); }
      else { ctx.fillRect(x + 10, y + 19, 5, 3); ctx.fillRect(x + 24, y + 19, 5, 5); }
    }
    function drawCactus(o) {
      const x = o.x, y = GROUND - o.h; ctx.fillStyle = "#4d7c0f";
      ctx.fillRect(x + 7, y, 9, o.h); ctx.fillRect(x, y + 13, 7, 6);
      ctx.fillRect(x, y + 8, 4, 12); ctx.fillRect(x + 16, y + 20, 7, 6); ctx.fillRect(x + 19, y + 15, 4, 12);
      // highlights
      ctx.fillStyle = "#84cc16";
      ctx.fillRect(x + 8, y + 3, 2, Math.max(6, o.h - 8));
      // top flower
      ctx.fillStyle = "#b9ef56"; ctx.fillRect(x + 7, y - 4, 8, 4);
    }
    function drawBird(b) {
      const flap = Math.floor(b.step / 6) % 2 === 0;
      const x = b.x, y = b.y;
      ctx.fillStyle = "#334155";
      // body + head + beak
      ctx.fillRect(x + 8, y + 6, 24, 8);
      ctx.fillRect(x + 28, y + 1, 9, 8);
      ctx.fillStyle = "#f59e0b"; ctx.fillRect(x + 37, y + 4, 5, 3);
      // eye
      ctx.fillStyle = "#fff"; ctx.fillRect(x + 33, y + 3, 3, 3);
      ctx.fillStyle = "#1c1e21"; ctx.fillRect(x + 34, y + 4, 1, 1);
      // wings
      ctx.fillStyle = "#475569";
      if (flap) { ctx.fillRect(x + 12, y - 8, 14, 10); ctx.fillRect(x + 10, y + 2, 10, 4); }
      else { ctx.fillRect(x + 12, y + 12, 14, 10); }
      // tail
      ctx.fillStyle = "#334155"; ctx.fillRect(x + 1, y + 5, 8, 5);
    }
    function drawHillLayer(offset, color, baseY, amp) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 12) {
        const wx = x + offset;
        ctx.lineTo(x, baseY + Math.sin(wx * 0.011) * amp + Math.sin(wx * 0.037) * amp * 0.35);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }
    function drawCloud(c) {
      const puff = (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); };
      ctx.fillStyle = "rgb(188 204 224 / 55%)";
      ctx.fillRect(c.x - 7, c.y + 8, 35, 3);
      ctx.fillStyle = "#ffffff";
      puff(c.x, c.y, 7); puff(c.x + 9, c.y - 6, 9); puff(c.x + 20, c.y - 1, 7); puff(c.x + 9, c.y + 3, 8);
    }
    function drawScene() {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#e8f3ff"); sky.addColorStop(0.75, "#fdfeff"); sky.addColorStop(1, "#ffffff");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // sun with glow
      const sunX = W - 95, sunY = 50;
      const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 48);
      glow.addColorStop(0, "rgb(255 226 108 / 70%)"); glow.addColorStop(1, "rgb(255 226 108 / 0%)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sunX, sunY, 48, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd93b"; ctx.beginPath(); ctx.arc(sunX, sunY, 20, 0, Math.PI * 2); ctx.fill();
      // parallax hills + clouds
      drawHillLayer(groundOffset * 0.22, "#e7edf5", 174, 22);
      drawHillLayer(groundOffset * 0.45, "#e9f1de", 194, 13);
      clouds.forEach(drawCloud);
      // ground band + line + texture
      ctx.fillStyle = "#f3f8ef"; ctx.fillRect(0, GROUND + 2, W, H - GROUND - 2);
      ctx.fillStyle = "#1c1e21"; ctx.fillRect(0, GROUND, W, 2);
      ctx.fillStyle = "#d3ddca";
      for (let x = -20; x < W; x += 42) ctx.fillRect(x - (groundOffset % 42), GROUND + 12, 17, 2);
      // running dust
      dust.forEach(p => { ctx.fillStyle = `rgb(140 155 130 / ${Math.max(0, p.life * 0.45).toFixed(3)})`; ctx.fillRect(p.x, p.y, p.r, p.r); });
      obstacles.forEach(drawCactus); birds.forEach(drawBird); drawDino(DINO_X, dino.y, state === "running");
      if (state === "choosing") { ctx.fillStyle = "rgb(163 41 41 / 7%)"; ctx.fillRect(0, 0, W, H); }
    }
    function jump() {
      if (state === "ready") { startGame(); return; }
      if (state === "running" && dino.onGround) { dino.vy = -13.2; dino.onGround = false; dino.ducking = false; }
    }
    function setDuck(on) {
      dino.duckHeld = on;
      // can only duck while grounded; airborne "fast fall" like the real dino game
      if (on && !dino.onGround && state === "running" && dino.vy < 3) dino.vy = 3;
    }
    function startGame(resetRun = true) {
      state = "running"; status("RUNNING"); overlay.hidden = true;
      if (resetRun) { score = 0; speed = BASE_SPEED; }
      spawnTimer = 45; birdTimer = 160; obstacles = []; birds = []; dust = [];
      dino.y = GROUND - DINO_H; dino.vy = 0; dino.onGround = true; dino.ducking = false; dino.duckHeld = false;
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
      // Difficulty ramps over time: speed grows with score toward a higher cap,
      // and spawn gaps shrink the further you run.
      score += dt * 0.12 * speed;
      speed = Math.min(MAX_SPEED, BASE_SPEED + score / 320);
      scoreEl.textContent = fmt(score); dino.step += dt;
      // ducking state: only applies while grounded
      dino.ducking = dino.duckHeld && dino.onGround;
      dino.vy += 0.72 * dt; dino.y += dino.vy * dt;
      if (dino.y >= GROUND - DINO_H) { dino.y = GROUND - DINO_H; dino.vy = 0; dino.onGround = true; }
      groundOffset += speed * dt;
      if (dino.onGround && state === "running" && Math.random() < 0.45 * dt) {
        dust.push({ x: DINO_X + 6 + Math.random() * 8, y: GROUND - 1, vy: -0.5 - Math.random() * 1.2, life: 1, r: 1 + Math.random() * 2.5 });
      }
      dust.forEach(p => { p.x -= speed * 0.7 * dt; p.y += p.vy * dt; p.vy += 0.05 * dt; p.life -= 0.03 * dt; });
      dust = dust.filter(p => p.life > 0);
      clouds.forEach(c => { c.x -= speed * 0.18 * dt; if (c.x < -35) { c.x = W + Math.random() * 100; c.y = 30 + Math.random() * 55; } });
      // cactus spawning — gaps tighten as speed increases
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        obstacles.push({ x: W + 10, h: 27 + Math.floor(Math.random() * 17), w: 23 });
        spawnTimer = Math.max(30, 80 + Math.random() * 40 - speed * 3.5);
      }
      obstacles.forEach(o => { o.x -= speed * dt; }); obstacles = obstacles.filter(o => o.x > -35);
      // bird spawning — starts after score 250, gets more frequent over time.
      // Low birds must be jumped; mid-height birds must be DUCKED under.
      if (score > 250) {
        birdTimer -= dt;
        if (birdTimer <= 0) {
          const roll = Math.random();
          birds.push({
            x: W + 20,
            // high band: can run under it while ducking OR standing? no —
            // low band: jump over. mid band: duck under (too low to run under standing).
            y: roll < 0.4 ? GROUND - 92 - Math.random() * 14   // high — pass under standing
               : roll < 0.75 ? GROUND - 46                      // mid — duck!
               : GROUND - 58 - Math.random() * 8,               // low-ish — jump
            step: 0
          });
          birdTimer = Math.max(70, 200 + Math.random() * 100 - score / 30);
        }
      }
      birds.forEach(b => { b.x -= (speed + 1.4) * dt; b.step += dt; });
      birds = birds.filter(b => b.x > -50);
      // collisions — hitbox shrinks to the duck box while ducking
      const dinoH = dino.ducking ? DUCK_H : DINO_H;
      const dinoTop = dino.ducking ? GROUND - DUCK_H : dino.y + 4;
      const d = { left: DINO_X + 2, right: DINO_X + (dino.ducking ? 47 : DINO_W - 2), top: dinoTop, bottom: GROUND };
      for (const o of obstacles) {
        const b = { left: o.x, right: o.x + o.w, top: GROUND - o.h, bottom: GROUND };
        if (d.right > b.left + 2 && d.left < b.right - 2 && d.bottom > b.top + 2 && d.top < b.bottom) { gameOver(); return; }
      }
      for (const b of birds) {
        // bird hitbox is roughly the body rectangle
        const hb = { left: b.x + 2, right: b.x + 40, top: b.y + 1, bottom: b.y + 16 };
        if (d.right > hb.left + 2 && d.left < hb.right - 2 && d.bottom > hb.top + 2 && d.top < hb.bottom) { gameOver(); return; }
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
    // optional on-screen duck button (safe to omit from HTML if not present)
    const duckButton = $("duck-button");
    if (duckButton) {
      duckButton.addEventListener("pointerdown", e => { e.preventDefault(); setDuck(true); });
      duckButton.addEventListener("pointerup", () => setDuck(false));
      duckButton.addEventListener("pointerleave", () => setDuck(false));
      duckButton.addEventListener("pointercancel", () => setDuck(false));
    }
    document.addEventListener("keydown", event => {
      if (event.code === "Enter" && event.target === flashcard) { event.preventDefault(); flipCard(); return; }
      // duck keys
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
        if (tag === "input" || tag === "textarea" || tag === "select" || event.target === flashcard) return;
        event.preventDefault(); setDuck(true); return;
      }
      if (event.code !== "Space" && event.code !== "ArrowUp") return;
      const tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (event.target === flashcard) { event.preventDefault(); flipCard(); return; }
      if (tag === "button") return;
      event.preventDefault(); jump();
    });
    document.addEventListener("keyup", event => {
      if (event.code === "ArrowDown" || event.code === "KeyS") setDuck(false);
    });
    drawScene();
    window.addEventListener("resize", drawScene);
  });
})();