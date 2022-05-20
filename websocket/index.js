const express = require("express");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const queryString = require('query-string')

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

expressServer.on("upgrade", (request, socket, head) => {
  websocketServer.handleUpgrade(request, socket, head, (websocket) => {
    websocketServer.emit("connection", websocket, request);
  });
});

websocketServer.on("connection", (websocketConnection, connectionRequest) => {
  const [_path, params] = connectionRequest?.url.split("?");
  const connectionParams = queryString.parse(params);

  console.log(connectionParams);

  websocketConnection.on("message", (message) => {
    const parsedMessage = JSON.parse(message);
    websocketConnection.send(JSON.stringify(parsedMessage));
  });
});
