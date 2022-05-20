# (React WebRTC)[https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API]

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


## How doe it work ?

* `Peer 1`initate a connection, send this message to peer `2`, through email, networking or signaling
* `Peer 1` needs send the network information to other person
* `Peer 2` accepts the offer
* `Peer 2` sends the network information to `Peer 1`
* Now the data can flow


## How does it work ?

* A process called `signaling`
* In data has `SDP` and `ICE candidates`

## What is SDP [Session Descrption Protocol]?
A session description protocol is an object containing information about the session connection such as the codec, address, media type, audio and video etc

## What is ICE Candiates ?
It is a public IP address and port that could potentially be an address that receives data.


## Exchange SDP and ICE Candidates ?

* Peer 1 sends SDP to a **[Server]** to Peer 2
* Once Peer 2 accepts, Peer 2 sends SDP back to Peer 1 through **[Server]**
* Then webRTC connection is formed, two peers are connected
* **[Problem]** Before data can flow, [devices sit behind firewalls and NAT devices]
* To avoid this, series of request are done to **[Stun]** server
* Peer 1 has a **[Stun]** and peer 2 has a **[Stun]**
* Peer 1 asks the **[Stun]** server what is the public IP?
* **[Stun]** server will reply and send series of ICE Candidates to Peer 1.
* Then peer 1 will send ICE Candidates to peer 2 through **[Server]**
* Then peer 2 will do the same
* Then network will determine the optimal route
* Then the data will pass through each other