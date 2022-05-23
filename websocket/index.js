const express = require("express");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const queryString = require("query-string");

const app = express();
app.use(cors());
const PORT = 4000;

const expressServer = app.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
});

const websocketServer = new WebSocketServer({
  noServer: true,
  path: "/websockets",
});

const clients = [];

expressServer.on("upgrade", (request, socket, head) => {
  websocketServer.handleUpgrade(request, socket, head, (websocket) => {
    websocketServer.emit("connection", websocket, request);
  });
});

websocketServer.on("connection", (websocketConnection, connectionRequest) => {
  const [_path, params] = connectionRequest?.url.split("?");
  const connectionParams = queryString.parse(params);
  websocketConnection.send(JSON.stringify({ event: "connection" }));
  clients.push(websocketConnection);
  console.log("🚀 ~ file: index.js ~ line 32 ~ websocketServer.on ~ clients", clients)

  websocketConnection.on("open", () => {
    websocketConnection.send(JSON.stringify({ event: "open" }));
  });

  websocketConnection.on("close", () => {
    websocketConnection.send(JSON.stringify({ event: "open" }));
  });

  console.log(
    "🚀 ~ file: index.js ~ line 30 ~ websocketServer.on ~ connectionParams",
    connectionParams
  );

  websocketConnection.on("message", (message) => {
    const parsedMessage = JSON.parse(message);
    console.log(clients);
    clients.forEach(function (client) {
      client.send(JSON.stringify(parsedMessage));
    });
  });
});
