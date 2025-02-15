const WebSocket = require('ws');
const OBSWebSocket = require('obs-websocket-js');

class WaitingList {
    constructor() {
        this.users = [];
    }

    addUser(user) {
        if (!this.users.includes(user)) { // Prevent duplicates
            this.users.push(user);
            return true; // Indicate success
        }
        return false; // Indicate failure (user already exists)
    }

    removeUser(user) {
        this.users = this.users.filter(u => u !== user);
    }

    getOrder() {
        return this.users;
    }

    toString(){
        return this.users.join('\n'); // Format for OBS Text Source
    }
}


const waitingList = new WaitingList();
const wss = new WebSocket.Server({ port: 8080 });

const obs = new OBSWebSocket();

obs.connect('ws://localhost:4455')
    .then(() => {
        console.log('Connected to OBS!');
    })
    .catch(err => {
        console.error('Error connecting to OBS:', err);
    });

wss.on('connection', ws => {
    console.log('Client connected');
    ws.send(JSON.stringify(waitingList.getOrder()));

    ws.on('message', message => {
        try {
            const data = JSON.parse(message);
            let updateNeeded = false;

            if (data.action === 'addUser') {
                if (waitingList.addUser(data.user)) {
                    updateNeeded = true;
                } else {
                  ws.send(JSON.stringify({ error: "Gebruiker bestaat al"})); // Send error to client
                }
            } else if (data.action === 'removeUser') {
                waitingList.removeUser(data.user);
                updateNeeded = true;
            }

            if (updateNeeded) {
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(waitingList.getOrder()));
                    }
                });

                // Update OBS Text Source:
                obs.send('SetSceneItemProperties', {
                    'scene-name': 'YourSceneName', // Vervang met je scene naam
                    'item-name': 'YourTextSourceName', // Vervang met je text source naam
                    'visible': true,
                    'text': waitingList.toString() // Set the text
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




__________

Html


<!DOCTYPE html>
<html>
<head>
    <title>Waiting List</title>
</head>
<body>
    <h1>Waiting List</h1>
    <ul id="waitingList"></ul>
    <input type="text" id="newUser">
    <button onclick="addUser()">Add User</button>
    <input type="text" id="removeUser">
    <button onclick="removeUser()">Remove User</button>
    <div id="error-message"></div>

    <script>
        const ws = new WebSocket('ws://localhost:8080');

        ws.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        ws.onmessage = event => {
            try {
                const data = JSON.parse(event.data);
                if (data.error) {
                    document.getElementById("error-message").textContent = data.error;
                } else {
                    const waitingList = data;
                    const listElement = document.getElementById("waitingList");
                    listElement.innerHTML = "";
                    waitingList.forEach(user => {
                        const listItem = document.createElement("li");
                        listItem.textContent = user;
                        listElement.appendChild(listItem);
                    });
                }
            } catch (error) {
                console.error("Error parsing message:", error);
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from WebSocket server');
        };

        function addUser() {
            const user = document.getElementById("newUser").value;
            ws.send(JSON.stringify({ action: 'addUser', user: user }));
            document.getElementById("newUser").value = ""; // Clear input field
            document.getElementById("error-message").textContent = ""; // Clear any previous error message
        }

        function removeUser() {
            const user = document.getElementById("removeUser").value;
            ws.send(JSON.stringify({ action: 'removeUser', user: user }));
            document.getElementById("removeUser").value = ""; // Clear input field
        }
    </script>
</body>
</html>