import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import VideoPlayer from './VideoPlayer';
import Chat from './Chat';
import Controls from './Controls';
import CustomVideoPlayer from './CustomVideoPlayer';
import { FiUsers, FiMessageSquare, FiCopy } from 'react-icons/fi';

const Room = ({ roomId, userName, onLeave, videoId }) => {
  const playerRef = useRef(null);
  const navigate = useNavigate();

  const handleVideoAction = (payload) => {
    if (payload.action === 'set-video') {
      if (payload.videoId !== videoId) {
        navigate(`/party?v=${payload.videoId}`, { replace: true });
      }
      return;
    }
    if (!playerRef.current) return;
    if (payload.action === 'play') playerRef.current.play();
    if (payload.action === 'pause') playerRef.current.pause();
    if (payload.action === 'seek') playerRef.current.seek(payload.currentTime);
  };

  const {
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
    broadcastVideoAction
  } = useWebRTC(roomId, userName, handleVideoAction);

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'participants'
  const [video, setVideo] = useState(null);

  useEffect(() => {
    if (videoId) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      fetch(`${API_URL}/api/videos/${videoId}`)
        .then(res => res.json())
        .then(data => setVideo(data))
        .catch(console.error);
    }
  }, [videoId]);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('Room ID copied to clipboard!');
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header} className="glass-panel">
        <div style={styles.headerLeft}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Watch Party</h2>
          <div style={styles.roomBadge} onClick={copyRoomId} title="Click to copy">
            Room: {roomId} <FiCopy style={{ marginLeft: '6px' }} />
          </div>
        </div>
        {isRecording && (
          <div style={styles.recordingBadge}>
            <span style={styles.recordDot}></span> Recording
          </div>
        )}
      </header>

      <div style={styles.mainContent}>
        {/* Video Grid Area */}
        <div style={styles.videoArea}>
          {video ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: '80px' }}>
              <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: 'black', borderRadius: '12px', overflow: 'hidden' }}>
                <CustomVideoPlayer 
                  ref={playerRef}
                  src={video.url} 
                  poster={video.thumbnail}
                  onNextVideo={() => {}}
                  onPlayAction={() => broadcastVideoAction({ action: 'play' })}
                  onPauseAction={() => broadcastVideoAction({ action: 'pause' })}
                  onSeekAction={(time) => broadcastVideoAction({ action: 'seek', currentTime: time })}
                />
              </div>
              <h2 style={{ marginTop: '16px', fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 'bold' }}>{video.title}</h2>
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                <div style={{ minWidth: '200px', width: '200px', aspectRatio: '16/9' }}>
                  <VideoPlayer stream={localStream} isLocal={true} name={userName} />
                </div>
                {Object.keys(remoteStreams).map((userId) => {
                  const user = participants.find(p => p.id === userId);
                  return (
                    <div key={userId} style={{ minWidth: '200px', width: '200px', aspectRatio: '16/9' }}>
                      <VideoPlayer stream={remoteStreams[userId]} isLocal={false} name={user?.name || 'Remote'} />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={styles.gridContainer}>
              {/* Local Video */}
              <div style={styles.gridItem}>
                <VideoPlayer stream={localStream} isLocal={true} name={userName} />
              </div>

              {/* Remote Videos */}
              {Object.keys(remoteStreams).map((userId) => {
                const user = participants.find(p => p.id === userId);
                return (
                  <div key={userId} style={styles.gridItem}>
                    <VideoPlayer stream={remoteStreams[userId]} isLocal={false} name={user?.name || 'Remote'} />
                  </div>
                );
              })}
            </div>
          )}

          <div style={styles.controlsWrapper}>
            <Controls
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
              isRecording={isRecording}
              onToggleMute={toggleMute}
              onToggleVideo={toggleVideo}
              onToggleScreenShare={toggleScreenShare}
              onToggleRecording={handleToggleRecording}
              onLeave={onLeave}
            />
          </div>
        </div>

        {/* Sidebar Area */}
        <div style={styles.sidebar} className="glass-panel">
          <div style={styles.tabs}>
            <button 
              style={{ ...styles.tabBtn, ...(activeTab === 'chat' ? styles.activeTab : {}) }}
              onClick={() => setActiveTab('chat')}
            >
              <FiMessageSquare /> Chat
            </button>
            <button 
              style={{ ...styles.tabBtn, ...(activeTab === 'participants' ? styles.activeTab : {}) }}
              onClick={() => setActiveTab('participants')}
            >
              <FiUsers /> People ({participants.length})
            </button>
          </div>

          <div style={styles.tabContent}>
            {activeTab === 'chat' ? (
              <Chat messages={messages} onSendMessage={sendMessage} />
            ) : (
              <div style={styles.participantsList}>
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-muted)' }}>In this room</h3>
                {participants.map((p) => (
                  <div key={p.id} style={styles.participantItem}>
                    <div style={styles.avatar}>{p.name.charAt(0).toUpperCase()}</div>
                    <span>{p.name} {p.name === userName ? '(You)' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    padding: '16px',
    gap: '16px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    borderRadius: '12px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  roomBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  recordingBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600'
  },
  recordDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    animation: 'pulse 1.5s infinite'
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    gap: '16px',
    overflow: 'hidden'
  },
  videoArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  gridContainer: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    overflowY: 'auto',
    paddingBottom: '80px' // space for controls
  },
  gridItem: {
    aspectRatio: '16/9',
    width: '100%'
  },
  controlsWrapper: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10
  },
  sidebar: {
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--glass-border)'
  },
  tabBtn: {
    flex: 1,
    padding: '16px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  activeTab: {
    color: 'var(--accent-color)',
    borderBottom: '2px solid var(--accent-color)',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  tabContent: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  participantsList: {
    padding: '20px',
    overflowY: 'auto'
  },
  participantItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
  }
};

export default Room;
