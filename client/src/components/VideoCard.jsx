import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const VideoCard = ({ video }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleChannelClick = (e) => {
    e.stopPropagation();
    if (video.channel) {
      navigate(`/channel/${video.channel}`);
    }
  };

  return (
    <div 
      className="yt-card" 
      onClick={() => navigate(`/watch/${video.id}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: video.isShort ? '9/16' : '16/9', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#272727' }}>
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: isHovered ? 'none' : 'block' }} 
        />
        {isHovered && (
          <video 
            src={video.url} 
            autoPlay 
            muted 
            loop 
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>
      <div className="yt-card-info">
        <img 
          src={video.channel_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.channel}`} 
          alt={video.channel} 
          className="yt-card-avatar"
          onClick={handleChannelClick}
          title={`View ${video.channel}'s Channel`}
        />
        <div className="yt-card-text">
          <h3 className="yt-card-title">{video.title}</h3>
          <p 
            className="yt-card-subtitle" 
            style={{ marginTop: '4px', cursor: 'pointer' }}
            onClick={handleChannelClick}
            title={`View ${video.channel}'s Channel`}
          >
            {video.channel || 'Unknown Channel'}
          </p>
          <p className="yt-card-subtitle">{video.views || '0 views'} • {video.timestamp || 'Just now'}</p>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
