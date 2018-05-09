const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;

var wss = new WebSocketServer({port: 8080});
console.log("Listening on port 8080");

wss.broadcast = function(data) {
  this.clients.forEach(function(client) {
    if(client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        console.log('received: %s', message);
        wss.broadcast(message);
    });
});