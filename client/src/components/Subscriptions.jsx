import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import io from 'socket.io-client';
import {
  FiUsers,
  FiVideo,
  FiGrid,
  FiList,
  FiCheckCircle,
  FiUserCheck,
  FiUserPlus,
  FiEye,
  FiPlay,
  FiCompass,
  FiTrendingUp,
  FiLayers,
  FiBell,
  FiExternalLink,
  FiFilter
} from 'react-icons/fi';

const Subscriptions = () => {
  const navigate = useNavigate();
  const { user, toggleSubscribe } = useUser();

  const [loading, setLoading] = useState(true);
  const [subscribedChannels, setSubscribedChannels] = useState([]);
  const [feedVideos, setFeedVideos] = useState([]);
  const [recommendedChannels, setRecommendedChannels] = useState([]);
  
  // UI View States
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'channels'
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'views'
  const [subscribingMap, setSubscribingMap] = useState({});

  // Hover video preview
  const [hoveredVideoId, setHoveredVideoId] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'https://youtube-uz4d.onrender.com';

  const fetchSubscriptionsData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/users/${user.id}/subscriptions`);
      if (res.ok) {
        const data = await res.json();
        setSubscribedChannels(data.channels || []);
        setFeedVideos(data.feedVideos || []);
        setRecommendedChannels(data.recommendedChannels || []);
      }
    } catch (err) {
      console.error('Failed to load subscriptions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionsData();
  }, [user]);

  // Real-time socket sync
  useEffect(() => {
    const socket = io(API_URL);

    socket.on('subscriber-updated', (data) => {
      setSubscribedChannels(prev => prev.map(c => {
        if (c.name.toLowerCase() === data.channelName.toLowerCase() || c.username.toLowerCase() === data.channelName.toLowerCase()) {
          return { ...c, subscribersCount: data.subscribersCount };
        }
        return c;
      }));
    });

    socket.on('video-view-updated', (data) => {
      setFeedVideos(prev => prev.map(v => v.id === data.videoId ? { ...v, views: data.views, viewsCount: data.viewsCount } : v));
    });

    return () => socket.disconnect();
  }, []);

  const handleToggleSubscribe = async (e, channelName) => {
    e.stopPropagation();
    if (!user) {
      alert('Please log in to manage your subscriptions.');
      return;
    }

    setSubscribingMap(prev => ({ ...prev, [channelName]: true }));
    const res = await toggleSubscribe(channelName);
    setSubscribingMap(prev => ({ ...prev, [channelName]: false }));

    if (res.success) {
      // Re-fetch subscriptions data to update lists
      fetchSubscriptionsData();
    } else {
      alert(res.error || 'Failed to update subscription');
    }
  };

  const handleCardMouseEnter = (videoId) => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredVideoId(videoId);
    }, 450);
  };

  const handleCardMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredVideoId(null);
  };

  // Filter and sort videos
  const fourMonthsAgo = new Date();
  fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

  const displayedVideos = feedVideos
    .filter(v => {
      // Filter out videos older than 4 months
      const videoDate = new Date(v.createdAt || 0);
      if (videoDate < fourMonthsAgo) return false;

      if (selectedChannelFilter === 'all') return true;
      return (v.channel || '').toLowerCase() === selectedChannelFilter.toLowerCase();
    })
    .sort((a, b) => {
      if (sortBy === 'views') {
        return (b.viewsCount || 0) - (a.viewsCount || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  // Not Logged In View
  if (!user) {
    return (
      <div className="subscriptions-page-container animate-fade-in">
        <div className="subs-empty-state-card">
          <div className="subs-empty-icon-circle">
            <FiUsers size={48} color="#6366f1" />
          </div>
          <h2>Never miss your favorite creators</h2>
          <p>Sign in to see updates and latest videos from channels you subscribe to.</p>
          <button 
            className="btn btn-primary"
            style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '24px' }}
            onClick={() => {
              const loginBtn = document.querySelector('.btn-login') || document.querySelector('button[title*="Sign"]');
              if (loginBtn) loginBtn.click();
              else navigate('/');
            }}
          >
            Sign In to Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="subscriptions-page-container animate-fade-in">
      {/* Top Banner Header */}
      <div className="subscriptions-header-banner">
        <div className="subs-header-left">
          <div className="subs-header-badge">
            <FiUsers size={16} /> Subscriptions Center
          </div>
          <h1 className="subs-header-title">
            Subscribed Channels & Latest Feed
          </h1>
          <p className="subs-header-subtitle">
            Stay up to date with new releases, premier videos, and content from all {subscribedChannels.length} channels you follow.
          </p>
        </div>

        {/* Action / View Switcher */}
        <div className="subs-header-tabs">
          <button 
            className={`subs-nav-tab ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            <FiVideo size={16} /> Latest Videos ({feedVideos.length})
          </button>
          <button 
            className={`subs-nav-tab ${activeTab === 'channels' ? 'active' : ''}`}
            onClick={() => setActiveTab('channels')}
          >
            <FiGrid size={16} /> All Subscribed Channels ({subscribedChannels.length})
          </button>
        </div>
      </div>

      {/* --- HORIZONTAL SUBSCRIBED CHANNELS BAR --- */}
      {subscribedChannels.length > 0 && (
        <div className="subs-channel-avatar-bar">
          <div 
            className={`subs-channel-chip ${selectedChannelFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedChannelFilter('all')}
          >
            <div className="subs-all-circle">
              <FiLayers size={18} />
            </div>
            <span className="subs-chip-name">All Updates</span>
          </div>

          {subscribedChannels.map((channel, idx) => {
            const isSelected = selectedChannelFilter.toLowerCase() === channel.name.toLowerCase();
            return (
              <div 
                key={idx}
                className={`subs-channel-chip ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedChannelFilter(isSelected ? 'all' : channel.name)}
                title={`${channel.name} (${channel.videosCount} videos)`}
              >
                <div className="subs-avatar-wrapper">
                  <img 
                    src={channel.avatar} 
                    alt={channel.name}
                    className="subs-chip-avatar"
                  />
                  {channel.latestVideo && <span className="subs-new-dot" title="New content available" />}
                </div>
                <span className="subs-chip-name">{channel.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* --- CONTENT SECTION --- */}
      {loading ? (
        <div className="featured-loading-state">
          <div className="spinner" />
          <p>Loading your subscriptions and channel updates...</p>
        </div>
      ) : subscribedChannels.length === 0 ? (
        /* Zero Subscriptions State with Recommended Creators */
        <div className="subs-zero-state">
          <div className="subs-empty-icon-circle">
            <FiCompass size={48} color="#ec4899" />
          </div>
          <h2>No subscriptions yet</h2>
          <p>Discover and subscribe to top-performing channels from around the world to fill your feed with high-quality content.</p>

          {recommendedChannels.length > 0 && (
            <div className="subs-recommended-section">
              <h3 className="subs-recommended-title">
                🌟 Recommended Channels to Follow
              </h3>
              <div className="subs-recommended-grid">
                {recommendedChannels.map((recCh, idx) => {
                  const isSubbing = subscribingMap[recCh.name];
                  return (
                    <div 
                      key={idx} 
                      className="subs-rec-card"
                      onClick={() => navigate(`/channel/${recCh.username || recCh.name}`)}
                    >
                      <div className="subs-rec-banner">
                        <img 
                          src={recCh.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'} 
                          alt={recCh.name} 
                        />
                      </div>
                      <div className="subs-rec-body">
                        <img 
                          src={recCh.avatar} 
                          alt={recCh.name} 
                          className="subs-rec-avatar"
                        />
                        <h4 className="subs-rec-name">
                          {recCh.name} <FiCheckCircle className="verified-icon-sm" />
                        </h4>
                        <div className="subs-rec-meta">
                          {recCh.countryFlag} {recCh.country} • {recCh.subscribersCount} subscribers
                        </div>
                        <p className="subs-rec-bio">{recCh.bio}</p>
                        <button 
                          className="btn btn-primary btn-rec-sub"
                          onClick={(e) => handleToggleSubscribe(e, recCh.name)}
                          disabled={isSubbing}
                        >
                          <FiUserPlus size={14} /> Subscribe
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'feed' ? (
        /* --- LATEST VIDEOS FEED VIEW --- */
        <div className="subs-feed-view">
          <div className="subs-feed-filter-bar">
            <div className="subs-feed-count">
              <span>Showing <strong>{displayedVideos.length}</strong> videos</span>
              {selectedChannelFilter !== 'all' && (
                <span className="subs-active-channel-tag">
                  from <strong>{selectedChannelFilter}</strong>
                  <button onClick={() => setSelectedChannelFilter('all')}>✕</button>
                </span>
              )}
            </div>

            <div className="subs-feed-sort-row">
              <span className="subs-sort-lbl"><FiTrendingUp size={14} /> Sort by:</span>
              <button 
                className={`subs-sort-pill ${sortBy === 'newest' ? 'active' : ''}`}
                onClick={() => setSortBy('newest')}
              >
                ⚡ Newest Uploads
              </button>
              <button 
                className={`subs-sort-pill ${sortBy === 'views' ? 'active' : ''}`}
                onClick={() => setSortBy('views')}
              >
                🔥 Most Viewed
              </button>
            </div>
          </div>

          {displayedVideos.length === 0 ? (
            <div className="featured-empty-state">
              <FiVideo size={40} color="var(--text-muted)" />
              <h3>No videos uploaded by this channel yet</h3>
              <p>Check back later or view other subscribed channels.</p>
              <button 
                className="btn btn-outline" 
                onClick={() => setSelectedChannelFilter('all')}
              >
                Show All Subscribed Channels
              </button>
            </div>
          ) : (
            <div className="featured-cards-grid">
              {displayedVideos.map((video) => {
                const isHovered = hoveredVideoId === video.id;
                return (
                  <div 
                    key={video.id}
                    className="global-video-card"
                    onClick={() => navigate(`/watch/${video.id}`)}
                    onMouseEnter={() => handleCardMouseEnter(video.id)}
                    onMouseLeave={handleCardMouseLeave}
                  >
                    <div className="card-thumb-container">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title} 
                        className={`card-thumb-img ${isHovered ? 'hide-thumb' : ''}`}
                      />
                      {isHovered && (
                        <video 
                          src={video.url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="card-preview-video"
                        />
                      )}
                      <div className="card-duration-tag">
                        {video.duration || '10:00'}
                      </div>
                      {video.countryFlag && (
                        <div className="card-country-badge">
                          {video.countryFlag}
                        </div>
                      )}
                    </div>

                    <div className="card-details-box">
                      <img 
                        src={video.channel_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.channel}`} 
                        alt={video.channel}
                        className="card-creator-avatar"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/channel/${video.channel}`);
                        }}
                      />
                      <div className="card-info-col">
                        <h3 className="card-video-title" title={video.title}>
                          {video.title}
                        </h3>
                        <div 
                          className="card-channel-row"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/channel/${video.channel}`);
                          }}
                        >
                          <span className="card-channel-name">{video.channel}</span>
                          <FiCheckCircle className="verified-icon-small" />
                        </div>
                        <div className="card-meta-row">
                          <span className="card-views-count"><FiEye size={12} /> {video.views}</span>
                          <span className="meta-dot">•</span>
                          <span className="card-timestamp">{video.timestamp || 'Recently'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* --- ALL SUBSCRIBED CHANNELS DIRECTORY VIEW --- */
        <div className="subs-channels-directory">
          <div className="subs-directory-header">
            <h2>Your Subscribed Channels ({subscribedChannels.length})</h2>
            <p>Manage subscriptions and visit channel profiles directly.</p>
          </div>

          <div className="subs-channels-grid">
            {subscribedChannels.map((channel, idx) => {
              const isSubbing = subscribingMap[channel.name];
              return (
                <div 
                  key={idx} 
                  className="subscribed-channel-card"
                  onClick={() => navigate(`/channel/${channel.username || channel.name}`)}
                >
                  <div className="sub-card-banner">
                    <img 
                      src={channel.banner} 
                      alt={channel.name} 
                      className="sub-card-banner-img"
                    />
                    <div className="sub-card-count-badge">
                      {channel.videosCount} Videos
                    </div>
                  </div>

                  <div className="sub-card-body">
                    <div className="sub-card-avatar-wrap">
                      <img 
                        src={channel.avatar} 
                        alt={channel.name} 
                        className="sub-card-avatar"
                      />
                      <span className="sub-card-flag" title={channel.country}>{channel.countryFlag}</span>
                    </div>

                    <h3 className="sub-card-name">
                      {channel.name} <FiCheckCircle className="verified-icon" />
                    </h3>
                    <div className="sub-card-stats">
                      <span>{channel.subscribersCount} subscribers</span> • <span>{channel.totalViewsFormatted} views</span>
                    </div>
                    <p className="sub-card-bio">{channel.bio}</p>

                    {channel.latestVideo && (
                      <div 
                        className="sub-card-latest-preview"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/watch/${channel.latestVideo.id}`);
                        }}
                      >
                        <div className="latest-preview-thumb">
                          <img src={channel.latestVideo.thumbnail} alt={channel.latestVideo.title} />
                          <div className="latest-play-icon"><FiPlay size={12} color="#fff" /></div>
                        </div>
                        <div className="latest-preview-info">
                          <span className="latest-tag">Latest Upload</span>
                          <span className="latest-title">{channel.latestVideo.title}</span>
                        </div>
                      </div>
                    )}

                    <div className="sub-card-actions">
                      <button 
                        className="btn btn-channel-visit"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/channel/${channel.username || channel.name}`);
                        }}
                      >
                        <FiExternalLink size={14} /> Visit Channel
                      </button>
                      <button 
                        className="btn btn-unsubscribe-action"
                        onClick={(e) => handleToggleSubscribe(e, channel.name)}
                        disabled={isSubbing}
                      >
                        <FiUserCheck size={14} /> Subscribed
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
