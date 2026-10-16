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
  },
  {
    id: "physics-hand-rules",
    name: "Physics: Hand Rules",
    description: "Electromagnetism hand rules and direction conventions",
    cards: [
      { front: "Right-hand grip rule (straight wire): how do you find the direction of the magnetic field around a current-carrying wire?", back: "Point your right thumb along the conventional current. Your curled fingers show the direction of the circular field lines around the wire." },
      { front: "Right-hand grip rule (coil or solenoid): how do you find the magnetic poles?", back: "Curl your right fingers in the direction the current flows around the coils. Your thumb points to the North pole (the direction of the field inside the coil)." },
      { front: "Right-hand rule for the force on a moving positive charge (F = qv × B): how do you apply it?", back: "Fingers along v (velocity), curl them toward B (field), and your thumb gives F (force). Alternative: index finger = v, middle finger = B, thumb = F." },
      { front: "What changes in the force rule when the moving charge is negative (e.g. an electron)?", back: "Use the same right-hand rule as for a positive charge, then reverse the force direction. (Equivalent: treat the electron as a positive charge moving in the opposite direction to v.)" },
      { front: "Right-hand rule for the force on a current-carrying wire (F = IL × B): how do you apply it?", back: "Fingers along the conventional current, curl them toward B, and your thumb gives the force on the wire." },
      { front: "Fleming's left-hand rule: what does each digit represent, and when is it used?", back: "Thumb = Thrust (force/motion). First finger = Field (N to S). Second finger = Current (conventional, + to -). Held mutually perpendicular. Used for MOTORS: current in a field gives motion." },
      { front: "Fleming's right-hand rule: what does each digit represent, and when is it used?", back: "Thumb = Motion of the conductor. First finger = Field (N to S). Second finger = induced Current. Held mutually perpendicular. Used for GENERATORS: motion in a field gives induced current (emf)." },
      { front: "How do you remember which Fleming rule is for motors and which is for generators?", back: "Left hand = Motor (current in, motion out). Right hand = Generator (motion in, current out). Memory hook: GeneRator has an R for Right. In the left-hand rule the thumb is the force you get out; in the right-hand rule the thumb is the motion you put in." },
      { front: "How do you find the direction of an induced current using the right hand?", back: "First use Lenz's law to decide which way the induced field must point (it opposes the change in flux). Then use the grip rule: thumb along that induced field direction, and your curled fingers show the direction of the induced current." },
      { front: "What does Lenz's law say about induced current?", back: "The induced current flows in a direction that opposes the change in magnetic flux that caused it. This is the origin of the minus sign in Faraday's law: emf = -dΦ/dt." },
      { front: "How do you find the direction of any cross product A × B?", back: "Point your fingers along A, curl them toward B (through the smaller angle), and your thumb points along A × B. Reversing the order reverses the direction: A × B = -(B × A)." },
      { front: "How do you find the direction of angular velocity or torque?", back: "Curl your right fingers in the direction of rotation and your thumb points along the angular velocity vector. For torque (τ = r × F), curl from r toward F and your thumb gives τ." },
      { front: "How do you find the direction of the magnetic dipole moment (μ) of a current loop?", back: "Curl your right fingers in the direction of the current in the loop. Your thumb points along μ, which is the same as the loop's North pole direction." },
      { front: "How do you decide whether two parallel current-carrying wires attract or repel?", back: "Use the grip rule to find the field of wire 1 at wire 2, then use the force rule on wire 2. Result: currents in the SAME direction attract; currents in OPPOSITE directions repel." },
      { front: "What do the symbols ⊙ and ⊗ mean in diagrams?", back: "⊙ (dot) = vector pointing OUT of the page (the tip of an arrow coming at you). ⊗ (cross) = vector pointing INTO the page (the tail feathers going away)." },
      { front: "A wire carries current out of the page (⊙). Which way do the magnetic field lines circulate around it?", back: "Anticlockwise. Thumb points out of the page toward you, and your curled fingers go anticlockwise. If the current is into the page (⊗), the field circulates clockwise." }
    ]
  }
];
/* PART 2: EDITABLE DECK CONTENT END */

// Keep this call outside the editable section so deck edits cannot remove it.
window.initializeDinoStudyDeckSystem();
delete window.initializeDinoStudyDeckSystem;