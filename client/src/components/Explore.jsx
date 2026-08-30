import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoCard from './VideoCard';
import { FiTrendingUp, FiMusic, FiRadio, FiCrosshair, FiFileText, FiAward, FiBookOpen, FiCoffee } from 'react-icons/fi';
import io from 'socket.io-client';

const Explore = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const fetchVideos = async () => {
      try {
        const res = await fetch(`${API_URL}/api/videos`);
        if (res.ok) {
          const data = await res.json();
          setVideos(data);
        }
      } catch (error) {
        console.error('Failed to fetch videos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
    
    const socket = io(API_URL);
    socket.on('new-video', (newVideo) => {
      setVideos(prev => {
        if (prev.find(v => v.id === newVideo.id)) return prev;
        return [newVideo, ...prev];
      });
    });

    return () => socket.disconnect();
  }, []);

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'trending': return <FiTrendingUp size={28} color="#f43f5e" />;
      case 'music': return <FiMusic size={28} color="#0ea5e9" />;
      case 'live': return <FiRadio size={28} color="#ef4444" />;
      case 'gaming': return <FiCrosshair size={28} color="#f59e0b" />;
      case 'news': return <FiFileText size={28} color="#3b82f6" />;
      case 'sports': return <FiAward size={28} color="#10b981" />;
      case 'learning': return <FiBookOpen size={28} color="#8b5cf6" />;
      case 'podcasts': return <FiCoffee size={28} color="#d946ef" />;
      default: return <FiTrendingUp size={28} />;
    }
  };

  const getCategoryTitle = (cat) => {
    return cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Explore';
  };

  // Filter videos based on URL category
  const filteredVideos = videos.filter((video) => {
    if (!category) return true;
    
    const catLower = category.toLowerCase();
    
    if (catLower === 'trending') return true; // Will sort by views below
    
    const dbCategory = video.category?.toLowerCase() || '';
    const tags = video.tags?.map(t => t.toLowerCase()) || [];
    
    if (catLower === 'music') return dbCategory.includes('music') || tags.includes('music');
    if (catLower === 'gaming') return dbCategory.includes('gaming') || tags.includes('gaming');
    if (catLower === 'sports') return dbCategory.includes('sports') || tags.includes('sports');
    if (catLower === 'learning') return dbCategory.includes('tech') || dbCategory.includes('science') || tags.includes('science');
    if (catLower === 'news') return dbCategory.includes('tech') || dbCategory.includes('news');
    if (catLower === 'live') return true; // Just show all as mock "live"
    if (catLower === 'podcasts') return dbCategory.includes('entertainment') || dbCategory.includes('food');

    return true;
  });

  // Sort if trending
  if (category?.toLowerCase() === 'trending') {
    filteredVideos.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
  }

  return (
    <div className="explore-container animate-fade-in" style={{ padding: '0 0 40px 0' }}>
      <div style={{ 
        padding: '24px 32px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '24px'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {getCategoryIcon(category)}
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
          {getCategoryTitle(category)}
        </h1>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
          Loading {category} videos...
        </div>
      ) : filteredVideos.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>No videos found in {getCategoryTitle(category)}</h3>
          <p style={{ marginTop: '8px', fontSize: '1rem' }}>Check back later for more content.</p>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '24px', borderRadius: '18px' }}
            onClick={() => navigate('/')}
          >
            Go back to Home
          </button>
        </div>
      ) : (
        <div className="yt-video-grid" style={{ padding: '0 24px' }}>
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Explore;
