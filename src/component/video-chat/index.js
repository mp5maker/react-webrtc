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

  const createUserTwoStream = React.useCallback(() => {
    const userTwoStream = new MediaStream();
    if (userTwoRef.current) userTwoRef.current.srcObject = userTwoStream;
    return userTwoStream;
  }, []);

  const createUserOneStream = React.useCallback(async () => {
    const userOneStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    if (userOneRef.current) userOneRef.current.srcObject = userOneStream;
    return userOneStream;
  }, []);

  const createOffer = React.useCallback(async (peerConnection) => {
    const offer = await peerConnection.createOffer();
    return offer;
  }, []);

  const createAnswer = React.useCallback(async (peerConnection) => {
    const answer = await peerConnection.createAnswer();
    return answer;
  }, []);

  const call = React.useCallback(async () => {
    const localStream = await createUserOneStream(); // Create Local Stream
    const remoteStream = await createUserTwoStream(); // Create Remote Stream

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
    const offerDescription = await createOffer(peerConnection);
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
    const answerDescription = await createAnswer();
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
    if (socket) {
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

        /**
         * Events from the call
         */
        // Receiving the answer from the other peer
        if (
          dataEvent === WEBSOCKET_CUSTOM_EVENTS.OFFER &&
          datePhoneType === PHONE.ANSWER
        ) {
          if (!peerConnection.currentRemoteDescription) {
            const answerDescription = new RTCSessionDescription(dataAnswer);
            peerConnection.setRemoteDescripton(answerDescription);
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
            peerConnection.setRemoteDescripton(offerDescription);
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
  }, [socket]);

  React.useEffect(() => {
    const socketString = `ws://localhost:${SERVER_PORT}/websockets`;
    const skt = new WebSocket(socketString);
    setSocket(skt);

    createPeerConnection(); // Create Peer Connection
  }, []);

  return (
    <>
      <div>
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
