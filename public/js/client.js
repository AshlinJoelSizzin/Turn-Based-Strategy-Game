document.addEventListener("DOMContentLoaded", () => {
  // Get references to DOM elements
  const gameBoard = document.getElementById("game-board");
  const currentPlayerElement = document.getElementById("current-player");
  const moveButtons = document.querySelectorAll(".move-btn");
  const resetButton = document.createElement("button");

  // Initialize game state
  let currentPlayer = "Player 1";
  let selectedCharacter = null;

  // Initial positions and types for each player's characters
  let player1 = [
    { type: "P", id: "P1", position: [0, 0] },
    { type: "P", id: "P2", position: [0, 1] },
    { type: "H1", id: "H1", position: [0, 2] },
    { type: "P", id: "P3", position: [0, 3] },
    { type: "H2", id: "H2", position: [0, 4] },
  ];

  let player2 = [
    { type: "P", id: "P1", position: [4, 0] },
    { type: "P", id: "P2", position: [4, 1] },
    { type: "H1", id: "H1", position: [4, 2] },
    { type: "P", id: "P3", position: [4, 3] },
    { type: "H2", id: "H2", position: [4, 4] },
  ];

  // Store initial game state for resetting
  const initialPlayer1 = JSON.parse(JSON.stringify(player1));
  const initialPlayer2 = JSON.parse(JSON.stringify(player2));

  // Initialize game state matrix and lost tokens lists
  let gameState = Array.from(Array(5), () => Array(5).fill(""));
  let lostPlayer1Tokens = [];
  let lostPlayer2Tokens = [];

  // Initialize WebSocket connection
  const socket = new WebSocket("ws://localhost:8080");

  // Handle WebSocket messages
  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "update") {
      // Update game state from server
      gameState = data.gameState;
      currentPlayer = data.currentPlayer;
      player1 = data.player1;
      player2 = data.player2;
      renderBoard();
      updateLostTokensDisplay();
    } else if (data.type === "win") {
      // Announce the winner
      announceWinner(data.winner);
    } else if (data.type === "reset") {
      // Reset the game
      resetGame();
    }
  });

  function initializeGame() {
    // Set up initial positions for player characters on the game board
    player1.forEach((char) => {
      const [row, col] = char.position;
      gameState[row][col] = `A-${char.type}${char.id}`;
    });

    player2.forEach((char) => {
      const [row, col] = char.position;
      gameState[row][col] = `B-${char.type}${char.id}`;
    });

    renderBoard();
    updateLostTokensDisplay();
    updateMoveButtons();
  }

  function renderBoard() {
    // Render the game board with current game state
    gameBoard.innerHTML = "";
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.textContent = gameState[row][col];
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.addEventListener("click", () => selectCharacter(row, col));
        gameBoard.appendChild(cell);
      }
    }
    currentPlayerElement.textContent = currentPlayer;
  }

  function updateLostTokensDisplay() {
    // Update display of lost tokens for each player
    document.getElementById(
      "lost-player1-tokens"
    ).textContent = `Player 1 Lost Tokens: ${lostPlayer1Tokens.join(", ")}`;
    document.getElementById(
      "lost-player2-tokens"
    ).textContent = `Player 2 Lost Tokens: ${lostPlayer2Tokens.join(", ")}`;
  }

  function checkWin() {
    // Check if a player has won
    if (player2.length === 0) {
      announceWinner("Player 1");
    } else if (player1.length === 0) {
      announceWinner("Player 2");
    }
  }

  function disableGame() {
    // Disable game interactions
    moveButtons.forEach((button) => (button.disabled = true));
    gameBoard.style.pointerEvents = "none";
  }

  function enableGame() {
    // Enable game interactions
    moveButtons.forEach((button) => (button.disabled = false));
    gameBoard.style.pointerEvents = "auto";
  }

  function resetGame() {
    // Reset the game state to initial conditions
    currentPlayer = "Player 1";
    selectedCharacter = null;
    player1 = JSON.parse(JSON.stringify(initialPlayer1));
    player2 = JSON.parse(JSON.stringify(initialPlayer2));
    gameState = Array.from(Array(5), () => Array(5).fill(""));
    lostPlayer1Tokens = [];
    lostPlayer2Tokens = [];
    initializeGame();
    enableGame();
    document.getElementById("winner-announcement").style.display = "none";
  }

  function announceWinner(winner) {
    // Display the winner announcement and provide a reset option
    const winnerElement = document.getElementById("winner-announcement");
    winnerElement.innerHTML = `<h2>${winner} wins!</h2><button id="reset-game">Reset Game</button>`;
    winnerElement.style.display = "block";
    document.getElementById("reset-game").addEventListener("click", () => {
      socket.send(JSON.stringify({ type: "reset" }));
    });
    disableGame();
  }

  function selectCharacter(row, col) {
    // Select a character based on the cell clicked
    const charId = gameState[row][col];
    if (
      charId &&
      charId.startsWith(currentPlayer === "Player 1" ? "A-" : "B-")
    ) {
      selectedCharacter = { charId, row, col };
      updateMoveButtons();
    }
  }

  function updateMoveButtons() {
    // Update the move buttons based on the selected character's type
    moveButtons.forEach((button) => {
      button.style.display = "none";
    });

    if (!selectedCharacter) return;

    const charType = selectedCharacter.charId.split("-")[1][0];

    switch (charType) {
      case "P":
        showButtons(["L", "R", "F", "B"]);
        break;
      case "H":
        if (selectedCharacter.charId.includes("H1")) {
          showButtons(["L", "R", "F", "B"]);
        } else if (selectedCharacter.charId.includes("H2")) {
          showButtons(["FL", "FR", "BL", "BR"]);
        }
        break;
    }
  }

  function showButtons(directions) {
    // Show buttons for the specified directions
    directions.forEach((direction) => {
      const button = document.querySelector(`[data-direction="${direction}"]`);
      if (button) button.style.display = "inline-block";
    });
  }

  function makeMove(direction) {
    // Execute a move in the specified direction
    if (!selectedCharacter) {
      alert("Please select a character to move.");
      return;
    }

    const { charId, row: currentRow, col: currentCol } = selectedCharacter;
    let player = currentPlayer === "Player 1" ? player1 : player2;
    let opponent = currentPlayer === "Player 1" ? player2 : player1;
    let character = player.find(
      (c) =>
        `${currentPlayer === "Player 1" ? "A" : "B"}-${c.type}${c.id}` ===
        charId
    );

    if (!character) {
      alert("Invalid move: Character does not exist.");
      return;
    }

    let [newRow, newCol] = [currentRow, currentCol];
    let moveDistance = character.type === "H1" ? 2 : 1;

    switch (direction) {
      case "L":
        newCol -= moveDistance;
        break;
      case "R":
        newCol += moveDistance;
        break;
      case "F":
        newRow += currentPlayer === "Player 1" ? moveDistance : -moveDistance;
        break;
      case "B":
        newRow -= currentPlayer === "Player 1" ? moveDistance : -moveDistance;
        break;
      case "FL":
        newRow += currentPlayer === "Player 1" ? 2 : -2;
        newCol -= 2;
        break;
      case "FR":
        newRow += currentPlayer === "Player 1" ? 2 : -2;
        newCol += 2;
        break;
      case "BL":
        newRow -= currentPlayer === "Player 1" ? 2 : -2;
        newCol -= 2;
        break;
      case "BR":
        newRow -= currentPlayer === "Player 1" ? 2 : -2;
        newCol += 2;
        break;
      default:
        alert("Invalid move: Direction is not valid.");
        return;
    }

    // Check if the move is within bounds
    if (newRow < 0 || newRow >= 5 || newCol < 0 || newCol >= 5) {
      alert("Invalid move: Move out of bounds.");
      return;
    }

    let destinationCell = gameState[newRow][newCol];
    if (
      destinationCell.startsWith(currentPlayer === "Player 1" ? "A-" : "B-")
    ) {
      alert("Invalid move: Destination cell occupied by your own character.");
      return;
    }

    // Check if the destination cell has an opponent's character
    let opponentChar = opponent.find(
      (c) => c.position[0] === newRow && c.position[1] === newCol
    );
    if (opponentChar) {
      opponent = opponent.filter((c) => c !== opponentChar);
      if (currentPlayer === "Player 1") {
        lostPlayer2Tokens.push(opponentChar.id);
        player2 = opponent;
      } else {
        lostPlayer1Tokens.push(opponentChar.id);
        player1 = opponent;
      }
      updateLostTokensDisplay();
    }

    // Update the game state with the new position
    gameState[currentRow][currentCol] = "";
    gameState[newRow][newCol] = charId;
    character.position = [newRow, newCol];

    // Switch to the other player
    currentPlayer = currentPlayer === "Player 1" ? "Player 2" : "Player 1";
    selectedCharacter = null;

    // Send updated game state to the server
    socket.send(
      JSON.stringify({
        type: "update",
        gameState,
        currentPlayer,
        player1,
        player2,
      })
    );
    checkWin();

    // Re-render the board and update move buttons
    renderBoard();
    updateMoveButtons();
  }

  // Attach event listeners to move buttons
  moveButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.getAttribute("data-direction");
      makeMove(direction);
    });
  });

  // Initialize the game when the DOM is fully loaded
  initializeGame();
});
