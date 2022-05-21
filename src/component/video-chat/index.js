import get from "lodash/get";
import React from "react";
import {
  PHONE,
  SERVER_PORT,
  WEBSOCKET_CUSTOM_EVENTS,
  WEBSOCKET_EVENTS,
} from "../../constants/settings";
import "./VideoChat.css";

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

const VideoChat = () => {
  const userOneRef = React.useRef(null);
  const userTwoRef = React.useRef(null);
  const [peerConnection, setPeerConnection] = React.useState(null);
  const [socket, setSocket] = React.useState(null);
  const [currentUser, setCurrentUser] = React.useState("");

  const handleChangeText = React.useCallback(
    (event) => setCurrentUser(get(event, "target.value", "")),
    []
  );

  const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection(servers);
    setPeerConnection(peerConnection);
    return peerConnection;
  };

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
  }, [peerConnection]);

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
            phoneType: PHONE.CALL,
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
        event: WEBSOCKET_CUSTOM_EVENTS.OFFER,
        offer: offerDescription,
        user: currentUser,
        phoneType: PHONE.CALL,
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
            phoneType: PHONE.ANSWER,
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
        event: WEBSOCKET_CUSTOM_EVENTS.OFFER,
        offer: answerDescription,
        user: currentUser,
        phoneType: PHONE.ANSWER,
      })
    );
  }, [peerConnection, currentUser]);

  React.useEffect(() => {
    if (socket && peerConnection) {
      socket.addEventListener(WEBSOCKET_EVENTS.OPEN, () =>
        console.debug("WebSocket is open")
      );
      socket.addEventListener(WEBSOCKET_EVENTS.CLOSE, () =>
        console.debug("WebSocket is closed")
      );
      socket.addEventListener(WEBSOCKET_EVENTS.ERROR, (_error) =>
        console.debug("Socker Events Error", _error)
      );
      socket.addEventListener(WEBSOCKET_EVENTS.MESSAGE, (event) => {
        const data = JSON.parse(get(event, "data", {}));
        const dataEvent = get(data, "event", "");
        const datePhoneType = get(data, "phoneType", "");
        const dataAnswer = get(data, "answer", null);
        const dataOffer = get(data, "offer", null);
        const dataCandidate = get(data, "candidate", null);
        const dataUser = get(data, "user", "");

        /**
         * Events from the call
         */
        // Receiving the answer from the other peer
        if (
          dataEvent === WEBSOCKET_CUSTOM_EVENTS.OFFER &&
          datePhoneType === PHONE.ANSWER
        ) {
          if (!peerConnection.currentRemoteDescription) {
            console.log(`Received answer from ${dataUser}`);
            const answerDescription = new RTCSessionDescription(dataAnswer);
            peerConnection.setRemoteDescription(answerDescription);
          }
        }
        // Receiving the ice candidates from the other peer
        if (
          dataEvent === WEBSOCKET_CUSTOM_EVENTS.CANDIDATE &&
          datePhoneType === PHONE.ANSWER
        ) {
          const candidate = new RTCIceCandidate(dataCandidate);
          peerConnection.addIceCandidate(candidate);
        }

        /**
         * Events from the answer
         */
        // Receiving the offer from the other peer
        if (
          dataEvent === WEBSOCKET_CUSTOM_EVENTS.OFFER &&
          datePhoneType === PHONE.CALL
        ) {
          if (!peerConnection.currentRemoteDescription) {
            const offerDescription = new RTCSessionDescription(dataOffer);
            peerConnection.setRemoteDescription(offerDescription);
          }
        }
        // Receiving the ice candidates from the other peer
        if (
          dataEvent === WEBSOCKET_CUSTOM_EVENTS.CANDIDATE &&
          datePhoneType === PHONE.CALL
        ) {
          const candidate = new RTCIceCandidate(dataCandidate);
          peerConnection.addIceCandidate(candidate);
        }
      });

      return () => {
        if (socket) socket.close();
      };
    }
  }, [socket, peerConnection]);

  React.useEffect(() => {
    const socketString = `ws://localhost:${SERVER_PORT}/websockets`;
    const skt = new WebSocket(socketString);
    setSocket(skt);

    createPeerConnection(); // Create Peer Connection
  }, []);

  return (
    <>
      <div>
        <button onClick={startWebcam}>Start Webcam</button>
        <input
          type="text"
          value={currentUser}
          placeholder="username"
          onChange={handleChangeText}
        />
        {currentUser ? (
          <>
            <button onClick={call}>Call</button>
            <button onClick={answer}>Answer</button>
          </>
        ) : (
          <></>
        )}
      </div>
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
