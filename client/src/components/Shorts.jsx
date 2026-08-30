import React, { useState, useEffect, useRef } from 'react';
import { FiThumbsUp, FiThumbsDown, FiMessageSquare, FiShare2, FiMoreVertical, FiPlayCircle, FiVolume2, FiVolumeX, FiVolume1 } from 'react-icons/fi';
import { useUser } from '../context/UserContext';
import io from 'socket.io-client';

const Shorts = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    const fetchVideos = async () => {
      try {
        const res = await fetch(`${API_URL}/api/videos`);
        if (res.ok) {
          const data = await res.json();
          const shortsOnly = data.filter(v => v.isShort);
          setVideos(shortsOnly.sort(() => 0.5 - Math.random()));
        }
      } catch (error) {
        console.error('Failed to fetch shorts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();

    const socket = io(API_URL);
    socket.on('new-video', (newVideo) => {
      if (newVideo.isShort) {
        setVideos((prev) => {
          if (prev.find(v => v.id === newVideo.id)) return prev;
          return [newVideo, ...prev];
        });
      }
    });

    return () => socket.disconnect();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading shorts...</div>;

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: 'calc(100vh - 60px)',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        backgroundColor: 'var(--bg-dark)'
      }}
      className="shorts-container"
    >
      <style>
        {`
          .shorts-container::-webkit-scrollbar {
            display: none;
          }
          .shorts-container {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
      {videos.length > 0 ? (
        videos.map((video) => (
          <ShortsPlayer key={video.id} video={video} />
        ))
      ) : (
        <div style={{ color: 'var(--text-muted)', marginTop: '40px', textAlign: 'center' }}>
          <h2>No shorts uploaded yet</h2>
          <p>Be the first to upload one from the Creator Studio!</p>
        </div>
      )}
    </div>
  );
};

const SubscribeButton = ({ channelName }) => {
  const { user, toggleSubscribe } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.subscriptions) {
      setIsSubscribed(user.subscriptions.includes(channelName));
    }
  }, [user, channelName]);

  const handleSubscribe = async (e) => {
    e.stopPropagation();
    if (!user) {
      alert('Please log in to subscribe.');
      return;
    }
    setLoading(true);
    const res = await toggleSubscribe(channelName);
    setLoading(false);
    if (res.success) {
      setIsSubscribed(res.isSubscribed);
    }
  };

  return (
    <button 
      onClick={handleSubscribe}
      disabled={loading}
      style={{ 
        background: isSubscribed ? 'rgba(255,255,255,0.2)' : '#fff', 
        color: isSubscribed ? '#fff' : '#000', 
        border: 'none', 
        borderRadius: '16px', 
        padding: '6px 14px', 
        fontWeight: 'bold', 
        cursor: 'pointer', 
        fontSize: '0.85rem' 
      }}
    >
      {loading ? '...' : isSubscribed ? 'Subscribed' : 'Subscribe'}
    </button>
  );
};

const ShortsPlayer = ({ video }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted
  const [volume, setVolume] = useState(1);
  const [showVolumeControl, setShowVolumeControl] = useState(false);

  // Intersection observer to play/pause when in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(e => console.log('Autoplay prevented', e));
            setIsPlaying(true);
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.6 } // Play when 60% visible
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) observer.unobserve(videoRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
      if (!newMutedState && volume === 0) {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const handleVolumeChange = (e) => {
    e.stopPropagation();
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '450px',
      height: 'calc(100vh - 60px)',
      scrollSnapAlign: 'start',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      flexShrink: 0
    }}
    onMouseEnter={() => setShowVolumeControl(true)}
    onMouseLeave={() => setShowVolumeControl(false)}
    >
      <video
        ref={videoRef}
        src={video.url}
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlay}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          cursor: 'pointer'
        }}
      />
      
      {/* Volume Controls */}
      <div 
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0,0,0,0.5)',
          padding: '8px',
          borderRadius: '24px',
          pointerEvents: 'auto',
          opacity: showVolumeControl ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={toggleMute} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#fff', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isMuted || volume === 0 ? <FiVolumeX size={20} /> : volume < 0.5 ? <FiVolume1 size={20} /> : <FiVolume2 size={20} />}
        </button>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          style={{ width: '80px', cursor: 'pointer' }}
        />
      </div>
      
      {!isPlaying && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: '50%',
          padding: '16px'
        }}>
          <FiPlayCircle size={48} color="#fff" />
        </div>
      )}

      {/* Overlay details */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '20px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
        borderBottomLeftRadius: '16px',
        borderBottomRightRadius: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        pointerEvents: 'none'
      }}>
        <div style={{ flex: 1, paddingRight: '20px', pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <img src={video.channel_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.channel}`} alt={video.channel} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #fff' }} />
            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#fff' }}>@{video.channel.replace(/\s+/g, '')}</span>
            <SubscribeButton channelName={video.channel} />
          </div>
          <p style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            {video.title}
          </p>
        </div>

        {/* Action buttons sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button style={{ background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', cursor: 'pointer', transition: 'background 0.2s' }}>
              <FiThumbsUp size={22} />
            </button>
            <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '500' }}>12K</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button style={{ background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', cursor: 'pointer', transition: 'background 0.2s' }}>
              <FiThumbsDown size={22} />
            </button>
            <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '500' }}>Dislike</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button style={{ background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', cursor: 'pointer', transition: 'background 0.2s' }}>
              <FiMessageSquare size={22} />
            </button>
            <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '500' }}>452</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button style={{ background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', cursor: 'pointer', transition: 'background 0.2s' }}>
              <FiShare2 size={22} />
            </button>
            <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '500' }}>Share</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button style={{ background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', cursor: 'pointer', transition: 'background 0.2s' }}>
              <FiMoreVertical size={22} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shorts;
