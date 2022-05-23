import get from "lodash/get";
import React from "react";
import "./VideoChat.css";

export const WEBSOCKET_EVENTS = {
  OPEN: "open",
  CLOSE: "close",
  ERROR: "error",
  MESSAGE: "message",
};

export const WEBSOCKET_CUSTOM_EVENTS = {
  CANDIDATE: "candidate",
  DESCRIPTION: "description",
};

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

const WEBSOCKET_URL = `wss://9101-103-217-111-153.ap.ngrok.io/websockets`;

const VideoChat = () => {
  const userOneRef = React.useRef(null);
  const userTwoRef = React.useRef(null);
  const [peerConnection, setPeerConnection] = React.useState(null);
  const [socket, setSocket] = React.useState(null);
  const [currentUser, setCurrentUser] = React.useState("";)
  const [enter, setEnter] = React.useState < boolean > false;

  const handleChangeText = React.useCallback(
    (event) => setCurrentUser(get(event, "target.value", "")),
    []
  );

  /**
   * Starting the webcam
   */
  const startWebcam = React.useCallback(async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    const remoteStream = new MediaStream();

    // Push tracks from local stream to peer connection
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    // Pull tracks from remote stream, add to video stream
    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };

    if (userOneRef.current) userOneRef.current.srcObject = localStream;
    if (userTwoRef.current) userTwoRef.current.srcObject = remoteStream;
  }, [peerConnection, enter]);

  /**
   * Initiate a call
   */
  const call = React.useCallback(async () => {
    // Get candidates for caller,
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({
            event: WEBSOCKET_CUSTOM_EVENTS.CANDIDATE,
            candidate: event.candidate.toJSON(),
            user: currentUser,
          })
        );
      }
    };

    // Create Offer
    const offerDescription = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offerDescription); // add offer to peer connection

    // Send the offer
    socket.send(
      JSON.stringify({
        event: WEBSOCKET_CUSTOM_EVENTS.DESCRIPTION,
        description: offerDescription,
        user: currentUser,
      })
    );
  }, [currentUser, socket, peerConnection]);

  /**
   * Receives the call
   */
  const answer = React.useCallback(async () => {
    // Get candidates for receiver
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({
            event: WEBSOCKET_CUSTOM_EVENTS.CANDIDATE,
            candidate: event.candidate.toJSON(),
            user: currentUser,
          })
        );
      }
    };

    // Create Answer
    const answerDescription = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answerDescription); // add answer to peer connection

    // Send the answer
    socket.send(
      JSON.stringify({
        event: WEBSOCKET_CUSTOM_EVENTS.DESCRIPTION,
        description: answerDescription,
        user: currentUser,
      })
    );
  }, [peerConnection, currentUser]);

  const start = React.useCallback(() => {
    setEnter(true);
  }, []);

  React.useEffect(() => {
    if (enter) {
      const skt = new WebSocket(WEBSOCKET_URL);
      setSocket(skt);

      const peerConnection = new RTCPeerConnection(servers);
      setPeerConnection(peerConnection);

      skt.addEventListener(WEBSOCKET_EVENTS.OPEN, () =>
        console.debug("WebSocket is open")
      );
      skt.addEventListener(WEBSOCKET_EVENTS.CLOSE, () =>
        console.debug("WebSocket is closed")
      );
      skt.addEventListener(WEBSOCKET_EVENTS.ERROR, (_error) =>
        console.debug("Socker Events Error", _error)
      );
      skt.addEventListener(WEBSOCKET_EVENTS.MESSAGE, (event) => {
        const data = JSON.parse(get(event, "data", {}));
        const dataEvent = get(data, "event", "");
        const dataCandidate = get(data, "candidate", null);
        const dataUser = get(data, "user", "");
        const dataDescription = get(data, "description", null);

        if (
          dataEvent === WEBSOCKET_CUSTOM_EVENTS.DESCRIPTION &&
          dataUser !== currentUser
        ) {
          const description = new RTCSessionDescription(dataDescription);
          peerConnection.setRemoteDescription(description);
        }

        if (
          dataEvent === WEBSOCKET_CUSTOM_EVENTS.CANDIDATE &&
          dataUser !== currentUser
        ) {
          const candidate = new RTCIceCandidate(dataCandidate);
          peerConnection.addIceCandidate(candidate);
        }
      });

      return () => {
        if (socket) skt.close();
      };
    }
  }, [enter, currentUser]);

  const EnterRoomContent = (
    <>
      <input
        type="text"
        value={currentUser}
        placeholder="username"
        onChange={handleChangeText}
      />
      <button onClick={start}>Enter Room</button>
    </>
  );

  const ActionContent = (
    <>
      <button onClick={startWebcam}>Webcam Start</button>
      <button onClick={call}>Call</button>
      <button onClick={answer}>Answer</button>
    </>
  );

  return (
    <>
      <div>{enter ? ActionContent : EnterRoomContent}</div>
      <div className="videos">
        <video
          autoPlay
          playsInline
          className="video-player user-1"
          ref={userOneRef}
        ></video>
        <video
          autoPlay
          playsInline
          className="video-player user-2"
          ref={userTwoRef}
        ></video>
      </div>
    </>
  );
};

export default React.memo(VideoChat);
