/*
DINO STUDY RUN — DECK SYSTEM + FLASHCARD CONTENT
================================================
AI INSTRUCTIONS — READ BEFORE EDITING THIS FILE

This file contains the permanent deck system (PART 1) and all flashcard data
(PART 2). For normal deck changes, edit PART 2 ONLY.

WHEN ADDING, EDITING, OR REMOVING DECKS:
1. Never change PART 1 for a deck-content request.
2. Replace only the complete PART 2 section, from its START marker through
   its END marker. Keep the system code before and after that section intact.
3. Preserve existing decks unless the user explicitly asks to remove or
   replace them. Never silently discard study material.
4. Provide the complete replacement PART 2, not scattered snippets.
5. Each deck must have a unique lowercase id, a readable name, an optional
   description, and a non-empty cards array.
6. Every card must contain non-empty string fields named front and back.
7. PART 2 must be data only: a JavaScript array of deck objects. Do not put
   imports, functions, or other executable code in PART 2.
8. Check quotes, commas, brackets, duplicate IDs, and card fields.
9. Do not claim you tested the live site unless you actually did.
10. For deck-only requests, do not change index.html, game.js, or style.css.
11. If preserving existing decks matters and you cannot see the current PART 2,
    ask the user to paste it before generating a replacement.

EXPECTED FORMAT:
{
  id: "chemistry",
  name: "Chemistry",
  description: "Bonding revision",
  cards: [{ front: "Question?", back: "Answer." }]
}

GAME RULES:
- Each deck gets a random starting card when first used in the page session.
- After a card is flipped, Next card advances sequentially and wraps to the
  beginning after the final card.
- At least one card must be flipped after each death before continuing.
- Decks are chosen after each death. Each deck keeps its own position during
  the current page session.
================================================
PART 1: PERMANENT DECK SYSTEM — DO NOT MODIFY
================================================
*/

(function () {
  "use strict";

  function nonEmpty(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function initializeDeckSystem() {
    const source = DECKS;
    const errors = [];
    const seenIds = new Set();
    const validDecks = [];

    if (!Array.isArray(source)) {
      errors.push("Deck content must be an array.");
    } else {
      source.forEach((deck, deckIndex) => {
        const label = deck && nonEmpty(deck.name) ? deck.name : `Deck ${deckIndex + 1}`;
        if (!deck || typeof deck !== "object" || Array.isArray(deck)) {
          errors.push(`${label}: deck entry must be an object.`);
          return;
        }
        let valid = true;
        if (!nonEmpty(deck.id)) {
          errors.push(`${label}: missing a non-empty id.`);
          valid = false;
        } else if (seenIds.has(deck.id)) {
          errors.push(`${label}: duplicate deck id "${deck.id}".`);
          valid = false;
        } else {
          seenIds.add(deck.id);
        }
        if (!nonEmpty(deck.name)) {
          errors.push(`Deck ${deckIndex + 1}: missing a non-empty name.`);
          valid = false;
        }
        if (!Array.isArray(deck.cards) || deck.cards.length === 0) {
          errors.push(`${label}: cards must be a non-empty array.`);
          valid = false;
        } else {
          deck.cards.forEach((card, cardIndex) => {
            if (!card || typeof card !== "object" ||
                !nonEmpty(card.front) || !nonEmpty(card.back)) {
              errors.push(`${label}, card ${cardIndex + 1}: front and back must be non-empty strings.`);
              valid = false;
            }
          });
        }
        if (valid) validDecks.push(deck);
      });
    }

    const progress = new Map();
    validDecks.forEach((deck) => {
      progress.set(deck.id, { index: Math.floor(Math.random() * deck.cards.length) });
    });

    function getDecks() {
      return validDecks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        description: nonEmpty(deck.description) ? deck.description : "",
        cardCount: deck.cards.length
      }));
    }

    function getCard(deckId) {
      const deck = validDecks.find((item) => item.id === deckId);
      const state = progress.get(deckId);
      if (!deck || !state) return null;
      const card = deck.cards[state.index];
      return {
        deckId: deck.id,
        deckName: deck.name,
        front: card.front,
        back: card.back,
        index: state.index,
        total: deck.cards.length
      };
    }

    function advanceCard(deckId) {
      const deck = validDecks.find((item) => item.id === deckId);
      const state = progress.get(deckId);
      if (!deck || !state) return null;
      state.index = (state.index + 1) % deck.cards.length;
      return getCard(deckId);
    }

    window.DinoStudyDecks = Object.freeze({
      getDecks,
      getDeckErrors: () => errors.slice(),
      getCard,
      advanceCard
    });
  }

  // Called after PART 2 has defined DECKS below.
  window.initializeDinoStudyDeckSystem = initializeDeckSystem;
})();

/*
================================================
PART 2: EDITABLE DECK CONTENT START
AI: Replace the entire deck array below when updating decks.
Do not change anything outside the START and END markers.
================================================
*/
const DECKS = [
  {
    id: "biology",
    name: "Biology",
    description: "Starter biology revision cards",
    cards: [
      { front: "What is mitosis?", back: "Cell division that produces two daughter cells with the same chromosome number." },
      { front: "What is osmosis?", back: "The net movement of water across a selectively permeable membrane." },
      { front: "What is a cell membrane?", back: "A selectively permeable boundary that controls what enters and leaves a cell." },
      { front: "What is photosynthesis?", back: "The process plants use to convert light energy into chemical energy." },
      { front: "What is an enzyme?", back: "A biological catalyst that speeds up a chemical reaction." }
    ]
  },
  {
    id: "math",
    name: "Mathematics",
    description: "Starter arithmetic and algebra cards",
    cards: [
      { front: "What is 7 × 8?", back: "56" },
      { front: "Solve: x + 5 = 12.", back: "x = 7" },
      { front: "What is the area of a rectangle?", back: "Length multiplied by width." },
      { front: "What is 15% of 200?", back: "30" },
      { front: "What is the square root of 81?", back: "9" }
    ]
  },
  {
    id: "history",
    name: "History",
    description: "Starter history skills cards",
    cards: [
      { front: "What is a primary source?", back: "Evidence created during the time being studied, such as a letter, photograph, or diary." },
      { front: "What does chronology mean?", back: "Arranging events in the order in which they happened." },
      { front: "What is an empire?", back: "Territories or peoples governed by one central power or ruler." }
    ]
  }
];
/* PART 2: EDITABLE DECK CONTENT END */

// Keep this call outside the editable section so deck edits cannot remove it.
window.initializeDinoStudyDeckSystem();
delete window.initializeDinoStudyDeckSystem;
