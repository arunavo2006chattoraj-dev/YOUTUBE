import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER = 'http://localhost:3001';
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = (roomId, userName, onVideoAction, initialVideoId) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const socketRef = useRef();
  const peersRef = useRef({}); // map of socketId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const onVideoActionRef = useRef(onVideoAction);

  useEffect(() => {
    onVideoActionRef.current = onVideoAction;
  }, [onVideoAction]);

  const initSocket = useCallback(() => {
    socketRef.current = io(SOCKET_SERVER);

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join-room', roomId, userName, initialVideoId);
    });

    socketRef.current.on('room-participants', (users) => {
      setParticipants(users);
      // Initiate connection to all existing users
      users.forEach((user) => {
        if (user.id !== socketRef.current.id) {
          createPeerConnection(user.id, true);
        }
      });
    });

    socketRef.current.on('user-joined', (user) => {
      setParticipants((prev) => [...prev, user]);
      // The new user will wait for offers from existing users, 
      // but to ensure both don't create offers, let's say existing users create offers.
      // Actually, since I create offer when receive 'room-participants', 
      // the existing users should create offer when receive 'user-joined'.
      createPeerConnection(user.id, false); 
      // Wait, if existing users create offer when 'user-joined', then the new user shouldn't.
      // Ah: 
      // Existing user receives 'user-joined', creates PC and creates Offer.
      // New user receives 'room-participants', creates PCs but NO offer (waits for offer).
    });

    socketRef.current.on('user-left', (userId) => {
      setParticipants((prev) => prev.filter((p) => p.id !== userId));
      setRemoteStreams((prev) => {
        const newStreams = { ...prev };
        delete newStreams[userId];
        return newStreams;
      });
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
      }
    });

    socketRef.current.on('offer', async (payload) => {
      const pc = createPeerConnection(payload.caller, false);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('answer', {
        target: payload.caller,
        sdp: pc.localDescription
      });
    });

    socketRef.current.on('answer', async (payload) => {
      const pc = peersRef.current[payload.caller];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      }
    });

    socketRef.current.on('ice-candidate', async (payload) => {
      const pc = peersRef.current[payload.sender];
      if (pc && payload.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.error('Error adding ICE candidate', e);
        }
      }
    });

    socketRef.current.on('receive-message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current.on('video-action', (payload) => {
      if (onVideoActionRef.current) {
        onVideoActionRef.current(payload);
      }
    });

    socketRef.current.on('set-video', (vid) => {
      if (onVideoActionRef.current) {
        onVideoActionRef.current({ action: 'set-video', videoId: vid });
      }
    });
  }, [roomId, userName, initialVideoId]);

  const createPeerConnection = (targetId, createOffer) => {
    if (peersRef.current[targetId]) return peersRef.current[targetId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          target: targetId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [targetId]: event.streams[0]
      }));
    };

    if (createOffer) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socketRef.current.emit('offer', {
            target: targetId,
            sdp: pc.localDescription
          });
        })
        .catch(console.error);
    }

    return pc;
  };

  const initLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      initSocket();
    } catch (error) {
      console.error('Error accessing media devices', error);
      // Still init socket even if no camera (for chat)
      initSocket(); 
    }
  };

  useEffect(() => {
    initLocalMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      Object.values(peersRef.current).forEach((pc) => pc.close());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing and revert to camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        replaceVideoTrack(stream.getVideoTracks()[0]);
        setIsScreenSharing(false);
      } catch (err) {
        console.error('Error reverting to camera', err);
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          toggleScreenShare(); // revert when stopped via browser UI
        };
        
        replaceVideoTrack(screenTrack);
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Error sharing screen', err);
      }
    }
  };

  const replaceVideoTrack = (newTrack) => {
    // Replace track in local stream for local preview
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      localStreamRef.current.removeTrack(videoTrack);
      videoTrack.stop();
    }
    localStreamRef.current.addTrack(newTrack);
    setLocalStream(new MediaStream(localStreamRef.current.getTracks())); // trigger re-render

    // Replace track in all peer connections
    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(newTrack);
      }
    });
  };

  const startRecording = () => {
    if (!localStreamRef.current) return;
    
    recordedChunksRef.current = [];
    const options = { mimeType: 'video/webm; codecs=vp9' };
    
    try {
      mediaRecorderRef.current = new MediaRecorder(localStreamRef.current, options);
    } catch (e) {
      console.warn('VP9 not supported, falling back to default');
      mediaRecorderRef.current = new MediaRecorder(localStreamRef.current);
    }
    
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };
    
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.href = url;
      a.download = `watch-party-recording-${Date.now()}.webm`;
      a.click();
      window.URL.revokeObjectURL(url);
    };
    
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendMessage = (text) => {
    if (!socketRef.current || !text.trim()) return;
    const msg = {
      roomId,
      message: text,
      senderName: userName,
      timestamp: Date.now()
    };
    socketRef.current.emit('send-message', msg);
  };

  const broadcastVideoAction = (actionData) => {
    if (!socketRef.current) return;
    socketRef.current.emit('video-action', {
      roomId,
      ...actionData
    });
  };

  const setRoomVideo = (vid) => {
    if (!socketRef.current) return;
    socketRef.current.emit('set-room-video', roomId, vid);
  };

  return {
    localStream,
    remoteStreams,
    participants,
    messages,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isRecording,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
    sendMessage,
    broadcastVideoAction,
    setRoomVideo
  };
};
