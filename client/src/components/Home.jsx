import React, { useState, useEffect } from 'react';
import VideoCard from './VideoCard';
import io from 'socket.io-client';

const CATEGORIES = [
  'All',
  '3D Animation',
  'VFX & Sci-Fi',
  'Tech & Coding',
  'Nature & 8K',
  'Music & Visuals',
  'Cinematic Films',
  'Shorts',
  'Blender',
  'CGI Masterpieces',
  'Recently Uploaded'
];

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://youtube-uz4d.onrender.com';
    
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
      setVideos((prev) => {
        // Prevent duplicate if already in feed (e.g. upload triggered it locally)
        if (prev.find(v => v.id === newVideo.id)) return prev;
        return [newVideo, ...prev];
      });
    });

    return () => socket.disconnect();
  }, []);

  // Filter videos based on category chip
  const filteredVideos = videos.filter((video) => {
    if (selectedCategory === 'Shorts') return video.isShort;
    
    // For other categories, exclude shorts by default unless they specifically want to see it,
    // but usually shorts shouldn't mix with regular 16:9 video cards in the main grid
    if (video.isShort) return false;

    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Recently Uploaded') return true;

    const catLower = selectedCategory.toLowerCase();
    const titleMatch = video.title?.toLowerCase().includes(catLower);
    const categoryMatch = video.category?.toLowerCase().includes(catLower);
    const tagMatch = video.tags?.some(tag => tag.toLowerCase().includes(catLower));
    const channelMatch = video.channel?.toLowerCase().includes(catLower);

    // Special category matches
    if (selectedCategory === '3D Animation') {
      return categoryMatch || titleMatch || video.category?.includes('Animation') || video.tags?.some(t => t.toLowerCase().includes('animation') || t.toLowerCase().includes('blender'));
    }
    if (selectedCategory === 'VFX & Sci-Fi') {
      return categoryMatch || titleMatch || video.tags?.some(t => t.toLowerCase().includes('vfx') || t.toLowerCase().includes('sci-fi') || t.toLowerCase().includes('cgi'));
    }
    if (selectedCategory === 'Tech & Coding') {
      return categoryMatch || titleMatch || video.tags?.some(t => t.toLowerCase().includes('tech') || t.toLowerCase().includes('code') || t.toLowerCase().includes('coding'));
    }
    if (selectedCategory === 'Nature & 8K') {
      return categoryMatch || titleMatch || video.tags?.some(t => t.toLowerCase().includes('nature') || t.toLowerCase().includes('8k') || t.toLowerCase().includes('glacier'));
    }
    if (selectedCategory === 'Music & Visuals') {
      return categoryMatch || titleMatch || video.tags?.some(t => t.toLowerCase().includes('music') || t.toLowerCase().includes('synthwave') || t.toLowerCase().includes('audio'));
    }
    if (selectedCategory === 'Cinematic Films' || selectedCategory === 'CGI Masterpieces') {
      return categoryMatch || titleMatch || video.tags?.some(t => t.toLowerCase().includes('cinematic') || t.toLowerCase().includes('movie') || t.toLowerCase().includes('masterpiece'));
    }
    if (selectedCategory === 'Blender') {
      return titleMatch || channelMatch || video.tags?.some(t => t.toLowerCase().includes('blender'));
    }

    return titleMatch || categoryMatch || tagMatch || channelMatch;
  });

  return (
    <div className="home-container animate-fade-in" style={{ padding: '0 0 40px 0' }}>
      {/* YouTube Style Category Chips Bar */}
      <div className="yt-categories-bar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`yt-category-chip ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
          Loading videos...
        </div>
      ) : filteredVideos.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <h3>No videos found in "{selectedCategory}"</h3>
          <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>Try selecting "All" to view all available videos.</p>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '16px', borderRadius: '18px' }}
            onClick={() => setSelectedCategory('All')}
          >
            Show All Videos
          </button>
        </div>
      ) : (
        <>
          {selectedCategory === 'All' && videos.filter(v => v.isShort).length > 0 && (
            <div className="shorts-shelf" style={{ padding: '0 24px', marginBottom: '24px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#ff0000"><path d="M10 8v8l6-4-6-4z"/></svg> Shorts
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '16px' 
              }}>
                {videos.filter(v => v.isShort).slice(0, 6).map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
              <hr style={{ border: 'none', borderBottom: '4px solid #272727', margin: '24px 0 0 0' }} />
            </div>
          )}
          
          <div className="yt-video-grid">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
