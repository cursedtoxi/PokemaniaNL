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
