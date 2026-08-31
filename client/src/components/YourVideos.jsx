import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import io from 'socket.io-client';
import { FiPlus, FiX, FiUsers, FiEye, FiVideo, FiTrendingUp, FiSettings, FiExternalLink } from 'react-icons/fi';
import ChannelCustomizerModal from './ChannelCustomizerModal';

const YourVideos = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [analytics, setAnalytics] = useState({
    subscribersCount: 0,
    totalViews: 0,
    subscribers: []
  });
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isShortUpload, setIsShortUpload] = useState(false);
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    thumbnail: '',
    tags: ''
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchChannelData = async () => {
    if (!user) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://youtube-uz4d.onrender.com';
      
      // 1. Fetch channel videos
      const resVideos = await fetch(`${API_URL}/api/videos/user/${encodeURIComponent(user.name || user.username)}`);
      let userVideos = [];
      if (resVideos.ok) {
        userVideos = await resVideos.json();
        setVideos(userVideos);
      }

      // 2. Fetch channel analytics & subscribers
      const resAnalytics = await fetch(`${API_URL}/api/channel/${encodeURIComponent(user.name || user.username)}/analytics`);
      if (resAnalytics.ok) {
        const data = await resAnalytics.json();
        setAnalytics({
          subscribersCount: data.subscribersCount || 0,
          totalViews: data.totalViews || userVideos.reduce((sum, v) => sum + (v.viewsCount || 0), 0),
          subscribers: data.subscribers || []
        });
      }

      // 3. Fetch channel posts
      const resPosts = await fetch(`${API_URL}/api/channel/${encodeURIComponent(user.name || user.username)}/posts`);
      if (resPosts.ok) {
        const postsData = await resPosts.json();
        setPosts(postsData);
      }
    } catch (error) {
      console.error('Failed to fetch creator data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setPosting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://youtube-uz4d.onrender.com';
      const res = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName: user.name || user.username,
          channelAvatar: user.avatar || '',
          content: newPostContent
        })
      });
      if (res.ok) {
        const newPost = await res.json();
        setPosts([newPost, ...posts]);
        setNewPostContent('');
      }
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setPosting(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChannelData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Real-time live Socket.IO listener for subscribers and views
  useEffect(() => {
    if (!user) return;
    const socket = io('https://youtube-uz4d.onrender.com');

    socket.on('subscriber-updated', (data) => {
      const channelIdentifier = user.name || user.username;
      if (data.channelName?.toLowerCase() === channelIdentifier?.toLowerCase()) {
        setAnalytics(prev => {
          let updatedSubs = [...prev.subscribers];
          if (data.action === 'subscribed' && data.subscriber) {
            if (!updatedSubs.some(s => s.userId === data.subscriber.userId)) {
              updatedSubs.unshift({ ...data.subscriber, date: new Date() });
            }
          } else if (data.action === 'unsubscribed' && data.subscriber) {
            updatedSubs = updatedSubs.filter(s => s.userId !== data.subscriber.userId);
          }
          return {
            ...prev,
            subscribersCount: data.subscribersCount,
            subscribers: updatedSubs
          };
        });
      }
    });

    socket.on('video-view-updated', (data) => {
      const channelIdentifier = user.name || user.username;
      if (data.channel?.toLowerCase() === channelIdentifier?.toLowerCase()) {
        // Update video item and total views
        setVideos(prev => prev.map(v => v.id === data.videoId ? { ...v, views: data.views, viewsCount: data.viewsCount } : v));
        setAnalytics(prev => ({
          ...prev,
          totalViews: prev.totalViews + 1
        }));
      }
    });

    return () => socket.disconnect();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || (!formData.url && !videoFile)) {
      alert("Title and Video URL/File are required.");
      return;
    }

    setSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://youtube-uz4d.onrender.com';
      
      let finalVideoUrl = formData.url;
      if (videoFile) {
        const videoData = new FormData();
        videoData.append('file', videoFile);
        const upRes = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: videoData });
        const upData = await upRes.json();
        if (upData.url) finalVideoUrl = upData.url;
      }

      let finalThumbnailUrl = formData.thumbnail || `https://picsum.photos/seed/${encodeURIComponent(formData.title)}/640/360`;
      if (thumbnailFile) {
        const thumbData = new FormData();
        thumbData.append('file', thumbnailFile);
        const upRes = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: thumbData });
        const upData = await upRes.json();
        if (upData.url) finalThumbnailUrl = upData.url;
      }

      const tagList = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [user.name || user.username, 'video'];

      const res = await fetch(`${API_URL}/api/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          url: finalVideoUrl,
          thumbnail: finalThumbnailUrl,
          channel: user.name || user.username,
          channel_avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
          tags: tagList,
          isShort: isShortUpload
        })
      });

      if (res.ok) {
        const newVideo = await res.json();
        setVideos(prev => [newVideo, ...prev]);
        setShowUploadModal(false);
        setIsShortUpload(false);
        setFormData({ title: '', description: '', url: '', thumbnail: '', tags: '' });
        setVideoFile(null);
        setThumbnailFile(null);
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error}`);
      }
    } catch (error) {
      console.error('Failed to create video:', error);
      alert('An error occurred while creating the video.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return (num || 0).toLocaleString();
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-main)', textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔐</div>
        <h2>Sign in to access Creator Studio</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '8px 0 20px 0' }}>
          Upload videos, track your real-time subscriber counter, total channel views, and customize your channel banner.
        </p>
        <button onClick={() => navigate('/profile')} className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: '20px' }}>
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* 1. Channel Banner & Profile Header Bar */}
      <div style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e1e38, #0f1115)',
        marginBottom: '28px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.35)'
      }}>
        {/* Banner image */}
        <div style={{ height: '160px', position: 'relative' }}>
          <img 
            src={user.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80'} 
            alt="Channel Banner" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,17,21,0.9) 0%, transparent 70%)' }} />
          
          <button 
            onClick={() => setShowCustomizerModal(true)}
            className="channel-banner-edit-btn"
          >
            <FiSettings size={14} /> Customize Banner & Profile
          </button>
        </div>

        {/* Creator Info Bar */}
        <div style={{ padding: '0 28px 20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img 
              src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
              alt={user.name} 
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                border: '4px solid var(--bg-dark)',
                marginTop: '-36px',
                objectFit: 'cover',
                background: '#222'
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  {user.name || user.username}
                </h1>
                <span style={{ 
                  background: 'rgba(99, 102, 241, 0.2)', 
                  border: '1px solid rgba(99, 102, 241, 0.4)', 
                  color: '#a5b4fc', 
                  fontSize: '0.75rem', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  fontWeight: '600'
                }}>
                  CREATOR STUDIO
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>@{user.username}</span>
                <span>•</span>
                <span 
                  onClick={() => navigate(`/channel/${user.name || user.username}`)}
                  style={{ color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  View Public Channel <FiExternalLink size={12} />
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => { setIsShortUpload(true); setShowUploadModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '24px', background: '#eab308' }}
            >
              <FiPlus size={18} /> Upload Short
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => { setIsShortUpload(false); setShowUploadModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '24px' }}
            >
              <FiPlus size={18} /> Upload Video
            </button>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Channel Analytics Overview Cards */}
      <div className="creator-stats-grid">
        {/* Live Subscribers Counter */}
        <div className="glass-panel stat-metric-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-metric-title">
            <FiUsers size={16} /> Live Subscribers
          </div>
          <div className="stat-metric-value" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{analytics.subscribersCount}</span>
            <span className="live-dot" title="Live real-time counter active" />
          </div>
          <div className="stat-metric-sub">
            <FiTrendingUp size={14} /> Real-time active counter
          </div>
        </div>

        {/* Total Views across all videos */}
        <div className="glass-panel stat-metric-card" style={{ borderLeft: '4px solid #6366f1' }}>
          <div className="stat-metric-title">
            <FiEye size={16} /> Total Channel Views
          </div>
          <div className="stat-metric-value">
            {formatNumber(analytics.totalViews)}
          </div>
          <div className="stat-metric-sub" style={{ color: '#818cf8' }}>
            Across all {videos.length} videos
          </div>
        </div>

        {/* Uploaded Videos */}
        <div className="glass-panel stat-metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-metric-title">
            <FiVideo size={16} /> Total Uploads
          </div>
          <div className="stat-metric-value">
            {videos.length}
          </div>
          <div className="stat-metric-sub" style={{ color: '#fbbf24' }}>
            Published to YouTube
          </div>
        </div>

        {/* Average Views Per Video */}
        <div className="glass-panel stat-metric-card" style={{ borderLeft: '4px solid #ec4899' }}>
          <div className="stat-metric-title">
            <FiTrendingUp size={16} /> Avg Views / Video
          </div>
          <div className="stat-metric-value">
            {videos.length > 0 ? formatNumber(Math.round(analytics.totalViews / videos.length)) : 0}
          </div>
          <div className="stat-metric-sub" style={{ color: '#f472b6' }}>
            Viewer retention metric
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs within Studio */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button 
          className={`channel-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Uploaded Videos ({videos.filter(v => !v.isShort).length})
        </button>
        <button 
          className={`channel-tab ${activeTab === 'shorts' ? 'active' : ''}`}
          onClick={() => setActiveTab('shorts')}
        >
          Shorts ({videos.filter(v => v.isShort).length})
        </button>
        <button 
          className={`channel-tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Posts
        </button>
        <button 
          className={`channel-tab ${activeTab === 'subscribers' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscribers')}
        >
          Subscribers List ({analytics.subscribersCount})
        </button>
      </div>

      {/* 4. Tab Content */}
      {activeTab === 'dashboard' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading your studio content...
            </div>
          ) : videos.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--glass-bg)',
              borderRadius: '16px',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎬</div>
              <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>No videos uploaded yet</h3>
              <p style={{ maxWidth: '400px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
                Upload your first video to start collecting views and growing your subscriber base!
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowUploadModal(true)}
                style={{ borderRadius: '20px', padding: '10px 24px' }}
              >
                <FiPlus size={18} /> Upload Your First Video
              </button>
            </div>
          ) : (
            <div className="yt-video-grid" style={{ padding: 0 }}>
              {videos.filter(v => !v.isShort).map((vid) => (
                <div 
                  key={vid.id} 
                  className="yt-card"
                  onClick={() => navigate(`/watch/${vid.id}`)}
                >
                  <img src={vid.thumbnail} alt={vid.title} className="yt-card-thumbnail" />
                  <div className="yt-card-info">
                    <div className="yt-card-text">
                      <div className="yt-card-title">{vid.title}</div>
                      <div className="yt-card-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{vid.views || '0 views'} • {vid.timestamp || 'Recently'}</span>
                        <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '600' }}>Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'shorts' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading your shorts...
            </div>
          ) : videos.filter(v => v.isShort).length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--glass-bg)',
              borderRadius: '16px',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📱</div>
              <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>No shorts uploaded yet</h3>
              <p style={{ maxWidth: '400px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
                Upload your first short video!
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => { setIsShortUpload(true); setShowUploadModal(true); }}
                style={{ borderRadius: '20px', padding: '10px 24px', background: '#eab308' }}
              >
                <FiPlus size={18} /> Upload Your First Short
              </button>
            </div>
          ) : (
            <div className="yt-video-grid" style={{ padding: 0 }}>
              {videos.filter(v => v.isShort).map((vid) => (
                <div 
                  key={vid.id} 
                  className="yt-card"
                  onClick={() => navigate(`/watch/${vid.id}`)}
                >
                  <img src={vid.thumbnail} alt={vid.title} className="yt-card-thumbnail" style={{ aspectRatio: '9/16', objectFit: 'cover' }} />
                  <div className="yt-card-info">
                    <div className="yt-card-text">
                      <div className="yt-card-title">{vid.title}</div>
                      <div className="yt-card-subtitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{vid.views || '0 views'} • {vid.timestamp || 'Recently'}</span>
                        <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '600' }}>Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'posts' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', marginBottom: '24px' }}>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What's on your mind?"
              style={{
                width: '100%',
                minHeight: '80px',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '12px',
                color: 'var(--text-main)',
                resize: 'vertical',
                marginBottom: '12px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleCreatePost}
                disabled={posting || !newPostContent.trim()}
                className="btn btn-primary"
                style={{ borderRadius: '20px', padding: '8px 20px' }}
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>

          {posts && posts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {posts.map((post) => (
                <div key={post.id} className="glass-panel" style={{ padding: '20px', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <img 
                      src={post.channelAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.channelName}`} 
                      alt={post.channelName} 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{post.channelName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {post.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📝</div>
              <h3>No posts yet</h3>
              <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>
                Share updates, thoughts, and announcements with your community!
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'subscribers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Your Channel Subscribers <span className="live-dot" />
            </h3>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {analytics.subscribersCount} Total live subscribers
            </span>
          </div>

          {analytics.subscribers && analytics.subscribers.length > 0 ? (
            <div className="subscribers-list-container">
              {analytics.subscribers.map((sub, idx) => (
                <div key={sub.userId || idx} className="subscriber-row-card">
                  <div className="subscriber-user-info">
                    <img 
                      src={sub.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.username}`} 
                      alt={sub.username} 
                      className="subscriber-avatar" 
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                        {sub.username}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Subscribed on {sub.date ? new Date(sub.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently'}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate(`/channel/${sub.username}`)}
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '18px' }}
                  >
                    View Channel
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--glass-bg)',
              borderRadius: '16px',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👥</div>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '6px' }}>No subscribers yet</h4>
              <p style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
                When viewers subscribe to your channel, they will appear here in real-time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Video Modal */}
      {showUploadModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>
                {isShortUpload ? 'Upload Short' : 'Upload Video'}
              </h3>
              <button style={styles.closeBtn} onClick={() => setShowUploadModal(false)}>
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Title *</label>
                <input 
                  type="text" 
                  name="title" 
                  value={formData.title} 
                  onChange={handleInputChange} 
                  className="input-field" 
                  placeholder="Video title" 
                  required 
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  className="input-field" 
                  placeholder="Tell viewers what your video is about..." 
                  rows="3" 
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Video *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="file" 
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files[0])}
                    className="input-field" 
                    style={{ padding: '8px 0' }}
                  />
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>OR Provide a URL</div>
                  <input 
                    type="url" 
                    name="url" 
                    value={formData.url} 
                    onChange={handleInputChange} 
                    className="input-field" 
                    placeholder="https://www.w3schools.com/html/mov_bbb.mp4" 
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Thumbnail (optional)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files[0])}
                    className="input-field" 
                    style={{ padding: '8px 0' }}
                  />
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>OR Provide a URL</div>
                  <input 
                    type="url" 
                    name="thumbnail" 
                    value={formData.thumbnail} 
                    onChange={handleInputChange} 
                    className="input-field" 
                    placeholder="https://picsum.photos/seed/sample/640/360" 
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Search Tags (comma separated)</label>
                <input 
                  type="text" 
                  name="tags" 
                  value={formData.tags} 
                  onChange={handleInputChange} 
                  className="input-field" 
                  placeholder="e.g. animation, tutorial, gaming, vfx" 
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: '120px' }}>
                  {submitting ? 'Uploading...' : 'Publish Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banner & Profile Customizer Modal */}
      {showCustomizerModal && (
        <ChannelCustomizerModal
          isOpen={showCustomizerModal}
          onClose={() => setShowCustomizerModal(false)}
          onUpdated={() => {
            fetchChannelData();
          }}
        />
      )}
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    width: '100%',
    maxWidth: '540px',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    borderRadius: '16px',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-main)',
    cursor: 'pointer',
    display: 'flex',
    padding: '4px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: 'var(--text-main)'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px'
  }
};

export default YourVideos;
