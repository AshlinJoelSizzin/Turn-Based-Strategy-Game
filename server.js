const express = require("express"); // Importing Express framework
const http = require("http"); // Importing HTTP module to create the server
const WebSocket = require("ws"); // Importing WebSocket for real-time communication
const path = require("path"); // Importing path module for path operations
const bodyParser = require("body-parser"); // Importing body-parser to parse incoming request bodies

const app = express(); // Creating an instance of Express
const server = http.createServer(app); // Creating an HTTP server with Express
const wss = new WebSocket.Server({ server }); // Creating a WebSocket server that uses the HTTP server

let clients = []; // Array to keep track of connected WebSocket clients

// Set up EJS as the templating engine and configure views directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Middleware to parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("Client connected"); // Log when a client connects
  clients.push(ws); // Add the new client to the clients array

  // Handle incoming messages from clients
  ws.on("message", (message) => {
    console.log("Received:", message); // Log the received message
    const data = JSON.parse(message); // Parse the message to JSON

    if (data.type === "update") {
      // Check for game state updates
      if (data.player1.length === 0) {
        // Player 1 has lost
        const winMessage = JSON.stringify({ type: "win", winner: "Player 2" });
        broadcastToAll(winMessage); // Notify all clients of Player 2's win
      } else if (data.player2.length === 0) {
        // Player 2 has lost
        const winMessage = JSON.stringify({ type: "win", winner: "Player 1" });
        broadcastToAll(winMessage); // Notify all clients of Player 1's win
      } else {
        // Update game state and broadcast to other clients
        broadcastToOthers(ws, message); // Send the message to all clients except the sender
      }
    } else if (data.type === "reset") {
      // Reset game state
      broadcastToAll(JSON.stringify({ type: "reset" })); // Notify all clients to reset the game
    }
  });

  // Handle WebSocket disconnections
  ws.on("close", () => {
    console.log("Client disconnected"); // Log when a client disconnects
    clients = clients.filter((client) => client !== ws); // Remove the client from the array
  });
});

// Broadcast a message to all connected WebSocket clients
function broadcastToAll(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      // Check if the client is open
      client.send(message); // Send the message
    }
  });
}

// Broadcast a message to all WebSocket clients except the sender
function broadcastToOthers(sender, message) {
  clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      // Check if the client is not the sender and is open
      client.send(message); // Send the message
    }
  });
}

// Serve the main page
app.get("/", (req, res) => {
  res.render("index", { winner: null }); // Render the index view with no winner
});

// Start the server on port 8080
server.listen(8080, () => {
  console.log("Server is listening on port 8080"); // Log when the server starts
});
