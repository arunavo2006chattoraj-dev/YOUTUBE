import React, { useRef, useEffect } from 'react';

const VideoPlayer = ({ stream, isLocal, name }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={styles.container} className="glass-panel">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={styles.video}
      />
      <div style={styles.nameBadge}>
        {name} {isLocal ? '(You)' : ''}
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '200px',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#000'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  nameBadge: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    backdropFilter: 'blur(4px)'
  }
};

export default VideoPlayer;
