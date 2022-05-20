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
  const [text, setText] = React.useState("");
  const [type, setType] = React.useState(null);

  const handleChangeText = React.useCallback(
    (event) => setText(get(event, "target.value", "")),
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

  const call = React.useCallback(async () => {
    const localStream = await createUserOneStream(); // Create Local Stream
    const remoteStream = await createUserTwoStream(); // Create Remote Stream
    const peerConnection = createPeerConnection(); // Create Peer Connection

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
      console.log("🚀 ~ file: index.js ~ line 62 ~ init ~ event", event);
    };

    // Create Offer
    const offer = await createOffer(peerConnection);
    await peerConnection.setLocalDescription(offer); // add offer to peer connection

    socket.send(
      JSON.stringify({
        event: WEBSOCKET_CUSTOM_EVENTS.OFFER,
        type: "call",
        user: text,
        offer,
      })
    );

    setType(PHONE.CALL);
  }, [text, socket]);

  const answer = () => {
    setType(PHONE.RECEIVE);
  };

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
        const dataType = get(data, "type", "");
        // Receiving the answer from the other peer
        if (dataType === PHONE.RECEIVE && type === PHONE.CALL) {
          if (!peerConnection.currentRemoteDescription) {
            const callOffer = new RTCSessionDescription(
              get(data, "answer", {})
            );
            peerConnection.setRemoteDescripton(callOffer);
          }
        }
      });

      return () => {
        if (socket) socket.close();
      };
    }
  }, [socket, peerConnection, type]);

  React.useEffect(() => {
    const socketString = `ws://localhost:${SERVER_PORT}/websockets`;
    const skt = new WebSocket(socketString);
    setSocket(skt);
  }, []);

  return (
    <>
      <div>
        <input
          type="text"
          value={text}
          placeholder="username"
          onChange={handleChangeText}
        />
        {text ? (
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
