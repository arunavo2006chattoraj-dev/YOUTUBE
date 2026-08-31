import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  FiPlay, FiPause, FiVolume2, FiVolumeX, 
  FiMaximize, FiMinimize, FiSkipForward 
} from 'react-icons/fi';

const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds)) return '00:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const CustomVideoPlayer = forwardRef(({ src, poster, onNextVideo, onPlayAction, onPauseAction, onSeekAction }, ref) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useImperativeHandle(ref, () => ({
    play: () => {
      if (videoRef.current) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    },
    pause: () => {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    },
    seek: (time) => {
      if (videoRef.current && Math.abs(videoRef.current.currentTime - time) > 1) {
        videoRef.current.currentTime = time;
      }
    }
  }));

  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  
  const [doubleTapFeedback, setDoubleTapFeedback] = useState(null); // 'left' or 'right'
  let clickTimeout = null;

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Autoplay prevented:", error);
          setIsPlaying(false);
          setShowControls(true);
        });
      }
    }
  }, [src]);

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        if (onPauseAction) onPauseAction();
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          if (onPlayAction) onPlayAction();
        }).catch(err => {
          console.error("Playback failed:", err);
          setIsPlaying(false);
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleProgressClick = (e) => {
    e.stopPropagation();
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newTime = pos * duration;
      videoRef.current.currentTime = newTime;
      if (onSeekAction) onSeekAction(newTime);
    }
  };

  const toggleMute = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const handleVolumeChange = (e) => {
    e.stopPropagation();
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      if (newVolume === 0) {
        videoRef.current.muted = true;
        setIsMuted(true);
      } else {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  const toggleFullscreen = (e) => {
    if (e) e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock('landscape').catch(err => console.log('Orientation lock failed:', err));
        }
      }).catch(err => console.log(err));
    } else {
      document.exitFullscreen().then(() => {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      }).catch(err => console.log(err));
    }
  };

  const handleVideoAreaClick = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftSide = clickX < rect.width / 2;

    if (clickTimeout) {
      // Double click detected
      clearTimeout(clickTimeout);
      clickTimeout = null;
      
      if (videoRef.current) {
        if (isLeftSide) {
          const newTime = Math.max(0, videoRef.current.currentTime - 10);
          videoRef.current.currentTime = newTime;
          setDoubleTapFeedback('left');
          if (onSeekAction) onSeekAction(newTime);
        } else {
          const newTime = Math.min(duration, videoRef.current.currentTime + 10);
          videoRef.current.currentTime = newTime;
          setDoubleTapFeedback('right');
          if (onSeekAction) onSeekAction(newTime);
        }
        setTimeout(() => setDoubleTapFeedback(null), 500);
      }
    } else {
      // Single click
      clickTimeout = setTimeout(() => {
        togglePlay();
        clickTimeout = null;
      }, 250); // 250ms delay to distinguish single from double tap
    }
  };

  const handleWaiting = () => setIsLoading(true);
  const handlePlaying = () => {
    setIsLoading(false);
    setIsPlaying(true);
  };
  const handlePause = () => setIsPlaying(false);

  return (
    <div 
      ref={containerRef} 
      style={styles.container}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => { if (isPlaying) setShowControls(false) }}
    >
      {/* We add CSS styles for animations here inline for simplicity, 
          though ideally they'd be in a CSS file */}
      <style>
        {`
          @keyframes custom-spin { 100% { transform: rotate(360deg); } }
          @keyframes custom-pulse { 0% { transform: translateY(-50%) scale(0.9); opacity: 1; } 100% { transform: translateY(-50%) scale(1.2); opacity: 0; } }
          .custom-spinner { animation: custom-spin 1s linear infinite; }
          .custom-feedback-pulse { animation: custom-pulse 0.5s ease-out; }
          .custom-progress-container:hover .custom-progress-bg { height: 6px !important; }
        `}
      </style>

      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        style={styles.video}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onEnded={() => setIsPlaying(false)}
        onClick={handleVideoAreaClick}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div style={styles.centerOverlay}>
          <div className="custom-spinner" style={styles.spinner}></div>
        </div>
      )}

      {/* Double Tap Feedback Overlay */}
      {doubleTapFeedback === 'left' && (
        <div className="custom-feedback-pulse" style={{...styles.feedbackOverlay, left: '20%'}}>
          <div style={styles.feedbackRipple}>-10s</div>
        </div>
      )}
      {doubleTapFeedback === 'right' && (
        <div className="custom-feedback-pulse" style={{...styles.feedbackOverlay, right: '20%'}}>
          <div style={styles.feedbackRipple}>+10s</div>
        </div>
      )}

      {/* Controls */}
      <div 
        style={{
          ...styles.controlsContainer, 
          opacity: showControls || !isPlaying ? 1 : 0,
          pointerEvents: showControls || !isPlaying ? 'auto' : 'none'
        }}
      >
        {/* Progress Bar */}
        <div 
          className="custom-progress-container"
          style={styles.progressContainer} 
          onClick={handleProgressClick}
        >
          <div className="custom-progress-bg" style={styles.progressBarBg}>
            <div 
              style={{
                ...styles.progressBarFill, 
                width: `${duration ? (currentTime / duration) * 100 : 0}%`
              }} 
            />
          </div>
        </div>

        <div style={styles.controlsRow}>
          <div style={styles.leftControls}>
            <button style={styles.controlBtn} onClick={togglePlay}>
              {isPlaying ? <FiPause size={22} /> : <FiPlay size={22} />}
            </button>
            <button style={styles.controlBtn} onClick={(e) => { e.stopPropagation(); if(onNextVideo) onNextVideo(); }}>
              <FiSkipForward size={22} />
            </button>

            <div style={styles.volumeContainer}>
              <button style={styles.controlBtn} onClick={toggleMute}>
                {isMuted || volume === 0 ? <FiVolumeX size={22} /> : <FiVolume2 size={22} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                style={styles.volumeSlider}
              />
            </div>

            <div style={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div style={styles.rightControls}>
            <button style={styles.controlBtn} onClick={toggleFullscreen}>
              {isFullscreen ? <FiMinimize size={22} /> : <FiMaximize size={22} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 'inherit' // Inherit from parent to maintain rounded corners
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },
  centerOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid #fff',
    borderRadius: '50%'
  },
  feedbackOverlay: {
    position: 'absolute',
    top: '50%',
    pointerEvents: 'none',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '50%',
    width: '80px',
    height: '80px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transform: 'translateY(-50%)'
  },
  feedbackRipple: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '1.2rem'
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
    padding: '40px 16px 12px 16px',
    transition: 'opacity 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  progressContainer: {
    width: '100%',
    height: '16px', // larger hit area
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer'
  },
  progressBarBg: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '2px',
    position: 'relative',
    transition: 'height 0.1s ease'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ff0000', // YouTube red
    borderRadius: '2px',
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none'
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  leftControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  rightControls: {
    display: 'flex',
    alignItems: 'center'
  },
  controlBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'opacity 0.2s',
    opacity: 0.9
  },
  volumeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  volumeSlider: {
    width: '80px',
    cursor: 'pointer',
    accentColor: '#fff'
  },
  timeDisplay: {
    color: '#fff',
    fontSize: '0.85rem',
    fontFamily: 'Roboto, Arial, sans-serif',
    marginLeft: '8px'
  }
};

export default CustomVideoPlayer;
