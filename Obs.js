# PokemaniaNL
Obs


Set up Node.js and npm:

If you don't have Node.js and npm (Node Package Manager) installed, download and install them from nodejs.org.
2. Create a Project Directory:

Create a new directory for your project (e.g., obs-waiting-list).
Navigate to this directory in your terminal.
3. Initialize a Node.js Project:

Bash
npm init -y
This creates a package.json file in your project directory.

4. Install Dependencies:

You'll need the ws library for WebSockets and the obs-websocket-js library to interact with OBS.

Bash
npm install ws obs-websocket-js
5. Create the Server Script (e.g., server.js):

JavaScript
const WebSocket = require('ws');
const OBSWebSocket = require('obs-websocket-js');

// Your WaitingList class (from previous responses) goes here

const waitingList = new WaitingList();
const wss = new WebSocket.Server({ port: 8080 }); // Choose a port

const obs = new OBSWebSocket();

// Connect to OBS (you might need to configure OBS WebSockets)
obs.connect('ws://localhost:4455') // Default OBS WebSockets port
  .then(() => {
    console.log('Connected to OBS!');
    // You can now interact with OBS using obs.send('...')
  })
  .catch(err => {
    console.error('Error connecting to OBS:', err);
  });


wss.on('connection', ws => {
  console.log('Client connected');

  // Send the initial waiting list to the client
  ws.send(JSON.stringify(waitingList.getOrder()));

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      if (data.action === 'addUser') {
        waitingList.addUser(data.user);
      } else if (data.action === 'removeUser') {
        waitingList.removeUser(data.user);
      } // ... other actions

      // Broadcast the updated list to all connected clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(waitingList.getOrder()));
        }
      });

      // Example interaction with OBS (you'll need to configure this)
      if (data.action === 'addUser') {
        obs.send('SetSceneItemProperties', {
          'scene-name': 'YourSceneName', // Replace with your scene name
          'item-name': 'YourTextSourceName',  // Replace with your text source name
          'visible': true // Example: make a text source visible
        }).catch(console.error);
      }

    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log('WebSocket server started on port 8080');
6. Create the HTML/JavaScript Client (e.g., index.html):

HTML
<!DOCTYPE html>
<html>
<head>
  <title>Waiting List</title>
</head>
<body>
  <h1>Waiting List</h1>
  <ul id="waitingList"></ul>

  <script>
    const ws = new WebSocket('ws://localhost:8080'); // Connect to your server

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    ws.onmessage = event => {
      const waitingList = JSON.parse(event.data);
      const listElement = document.getElementById("waitingList");
      listElement.innerHTML = ""; // Clear existing list
      waitingList.forEach(user => {
        const listItem = document.createElement("li");
        listItem.textContent = user;
        listElement.appendChild(listItem);
      });
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    // Example: send a message to the server
    function addUser(user) {
        ws.send(JSON.stringify({ action: 'addUser', user: user }));
    }

    // Example usage:
    addUser("New User");

  </script>
</body>
</html>
7. Run the Server:

Bash
node server.js
8. Add a Browser Source in OBS:

In OBS, add a "Browser" source.
Point it to your index.html file.
9. Configure OBS WebSockets:

In OBS Studio, go to Tools -> WebSockets Server Settings. Ensure that the server is enabled (it usually is by default). You might need to set a password if you want to secure the connection. The default port is 4455.
Explanation:

Server (server.js):
Sets up a WebSocket server.
Uses obs-websocket-js to connect to OBS.
Listens for WebSocket connections from clients (the HTML page).
Handles messages from clients (e.g., adding/removing users).
Broadcasts the updated waiting list to all connected clients.
Interacts with OBS using the obs object (e.g., changing scene items). You will need to adapt the OBS interactions to your specific needs.
Client (index.html):
Connects to the WebSocket server.
Receives updates from the server and displays the waiting list.
Can send messages to the server (e.g., to add or remove users).
