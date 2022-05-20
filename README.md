# React WebRTC

## What is WebRTC?

It is a set of javascript API's that allow us to establish peer to peer coneection
between two browsers to exchange data such as audio and video in real time


## What is WebSockets

It is a real time communication through server


## Difference between webRTC and websocket?

* Websocket needs a server for real time communication
* WebRTC do not needs a server it is peer to peer, data never touches the server

* Websocket is great for chat app or notification, it has a latency
* WebRTC transports its data over UDP and UDP is fast


## What is UDP [User Datagram Protocol]?
* UDP is not a reliable protocol for transferring important data.
* It never validates whether the data is received.
* Eg: Video picture or audio degrading in a call
* Eg: File Transfer or message those needs to be exact

