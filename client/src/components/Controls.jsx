import React from 'react';
import { 
  FiMic, FiMicOff, 
  FiVideo, FiVideoOff, 
  FiMonitor, FiStopCircle, 
  FiDisc, FiLogOut 
} from 'react-icons/fi';

const Controls = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isRecording,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onLeave
}) => {
  return (
    <div style={styles.container} className="glass-panel">
      <div style={styles.controlsGroup}>
        <button 
          className={`btn-icon ${isMuted ? 'danger' : ''}`} 
          onClick={onToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
        </button>
        
        <button 
          className={`btn-icon ${isVideoOff ? 'danger' : ''}`} 
          onClick={onToggleVideo}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? <FiVideoOff size={20} /> : <FiVideo size={20} />}
        </button>
      </div>

      <div style={styles.controlsGroup}>
        <button 
          className={`btn-icon ${isScreenSharing ? 'active' : ''}`} 
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
        >
          {isScreenSharing ? <FiStopCircle size={20} /> : <FiMonitor size={20} />}
        </button>

        <button 
          className={`btn-icon ${isRecording ? 'danger active' : ''}`} 
          onClick={onToggleRecording}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <FiStopCircle size={20} /> : <FiDisc size={20} />}
        </button>
      </div>

      <div style={styles.controlsGroup}>
        <button className="btn-icon danger" onClick={onLeave} title="Leave room">
          <FiLogOut size={20} />
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    padding: '12px 24px',
    marginTop: '16px',
    borderRadius: '100px' // Pill shape
  },
  controlsGroup: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  }
};

export default Controls;
