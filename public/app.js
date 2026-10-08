// ==========================================
// GLOBAL VARIABLES
// ==========================================

const coffeeGrid =
  document.getElementById("coffeeGrid");

const leaderboard =
  document.getElementById("leaderboard");

const statusText =
  document.getElementById("status");

// Anonymous voter ID
let voterId =
  localStorage.getItem("coffeeVoterId");

// ==========================================
// INITIALIZE VOTER
// ==========================================

async function initializeVoter() {

  // If voter ID already exists,
  // use the existing ID.
  if (voterId) {
    return true;
  }

  try {

    const response =
      await fetch("/api/voter");

    if (!response.ok) {
      throw new Error(
        "Unable to create voter ID."
      );
    }

    const data =
      await response.json();

    voterId =
      data.voterId;

    // Save voter ID in browser
    localStorage.setItem(
      "coffeeVoterId",
      voterId
    );

    return true;

  } catch (error) {

    console.error(
      "Voter initialization failed:",
      error
    );

    return false;
  }
}

// ==========================================
// LOAD COFFEES
// ==========================================

async function loadCoffees() {

  statusText.textContent =
    "Loading coffees...";

  try {

    const response =
      await fetch("/api/coffees");

    if (!response.ok) {
      throw new Error(
        "Failed to load coffees."
      );
    }

    const coffees =
      await response.json();

    renderCoffees(coffees);

    statusText.textContent =
      `${coffees.length} coffees available for voting.`;

    await loadLeaderboard();

  } catch (error) {

    console.error(error);

    statusText.textContent =
      "Unable to load coffees.";

    coffeeGrid.innerHTML = `
      <div class="empty">
        Unable to load coffee data.
        Please check the server and database.
      </div>
    `;
  }
}

// ==========================================
// RENDER COFFEE CARDS
// ==========================================

function renderCoffees(coffees) {

  if (!coffees.length) {

    coffeeGrid.innerHTML = `
      <div class="empty">
        No coffee blends found.
      </div>
    `;

    return;
  }

  coffeeGrid.innerHTML =
    coffees.map((coffee) => {

      return `
        <article class="card">

          <img
            src="${coffee.image}"
            alt="${escapeHtml(coffee.name)}"
            loading="lazy"
          >

          <div class="card-body">

            <h3>
              ${escapeHtml(coffee.name)}
            </h3>

            <p>
              ${escapeHtml(coffee.description)}
            </p>

            <div class="vote-row">

              <span class="votes">
                <span id="votes-${coffee._id}">
                  ${coffee.votes}
                </span>
                votes
              </span>

              <button
                class="vote-btn"
                onclick="vote('${coffee._id}', this)"
              >
                Vote ☕
              </button>

            </div>

          </div>

        </article>
      `;

    }).join("");

  // If this browser already voted,
  // disable all voting buttons.
  checkExistingLocalVote();
}

// ==========================================
// VOTE
// ==========================================

async function vote(id, button) {

  // Make sure voter ID exists
  if (!voterId) {

    alert(
      "Unable to identify voter. Please refresh the page and try again."
    );

    return;
  }

  // Prevent multiple clicks
  button.disabled = true;

  button.textContent =
    "Voting...";

  try {

    const response =
      await fetch(
        `/api/coffees/${id}/vote`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            voterId: voterId
          })
        }
      );

    const data =
      await response.json();

    // ======================================
    // ALREADY VOTED
    // ======================================

    if (response.status === 409) {

      alert(
        data.message ||
        "You have already voted."
      );

      // Remember locally too
      localStorage.setItem(
        "coffeeHasVoted",
        "true"
      );

      disableAllVotingButtons();

      return;
    }

    // Other errors
    if (!response.ok) {

      throw new Error(
        data.message ||
        "Vote failed."
      );
    }

    // ======================================
    // SUCCESS
    // ======================================

    const coffee =
      data.coffee;

    // Update the vote count
    // without refreshing page

    const voteElement =
      document.getElementById(
        `votes-${coffee._id}`
      );

    if (voteElement) {

      voteElement.textContent =
        coffee.votes;
    }

    // Remember that this browser voted
    localStorage.setItem(
      "coffeeHasVoted",
      "true"
    );

    // Disable EVERY vote button
    // because one person can vote only once
    disableAllVotingButtons();

    // Update leaderboard
    await loadLeaderboard();

    // Change status text
    statusText.textContent =
      "Your vote has been recorded successfully!";

    alert(
      "Your vote has been recorded successfully!"
    );

  } catch (error) {

    console.error(
      "Voting error:",
      error
    );

    alert(
      error.message ||
      "Unable to submit vote."
    );

    // Re-enable button if vote wasn't successful
    button.disabled = false;

    button.textContent =
      "Vote ☕";
  }
}

// ==========================================
// DISABLE ALL VOTE BUTTONS
// ==========================================

function disableAllVotingButtons() {

  const buttons =
    document.querySelectorAll(
      ".vote-btn"
    );

  buttons.forEach((button) => {

    button.disabled = true;

    button.textContent =
      "Already Voted ✓";

  });
}

// ==========================================
// CHECK LOCAL VOTE STATUS
// ==========================================

function checkExistingLocalVote() {

  const hasVoted =
    localStorage.getItem(
      "coffeeHasVoted"
    );

  if (hasVoted === "true") {

    disableAllVotingButtons();

    statusText.textContent =
      "You have already voted. Thank you!";
  }
}

// ==========================================
// LOAD LEADERBOARD
// ==========================================

async function loadLeaderboard() {

  try {

    const response =
      await fetch(
        "/api/leaderboard"
      );

    if (!response.ok) {

      throw new Error(
        "Leaderboard request failed."
      );
    }

    const topCoffees =
      await response.json();

    if (!topCoffees.length) {

      leaderboard.innerHTML = `
        <div class="empty">
          No votes yet.
        </div>
      `;

      return;
    }

    leaderboard.innerHTML =
      topCoffees.map(
        (coffee, index) => {

          return `
            <div class="rank-row">

              <div class="rank">
                #${index + 1}
              </div>

              <div class="rank-name">
                ${escapeHtml(coffee.name)}
              </div>

              <div class="rank-votes">
                ${coffee.votes} votes
              </div>

            </div>
          `;

        }
      ).join("");

  } catch (error) {

    console.error(error);

    leaderboard.innerHTML = `
      <div class="empty">
        Unable to load leaderboard.
      </div>
    `;
  }
}

// ==========================================
// HTML SECURITY
// ==========================================

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ==========================================
// INITIALIZE APPLICATION
// ==========================================

async function initializeApp() {

  statusText.textContent =
    "Preparing voting system...";

  const voterReady =
    await initializeVoter();

  if (!voterReady) {

    statusText.textContent =
      "Unable to initialize voting system.";

    return;
  }

  await loadCoffees();
}

// Start application
initializeApp();
