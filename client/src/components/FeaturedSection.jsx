import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import io from 'socket.io-client';
import { 
  FiPlay, 
  FiZap, 
  FiAward, 
  FiGlobe, 
  FiTrendingUp, 
  FiEye, 
  FiThumbsUp, 
  FiCheckCircle, 
  FiChevronLeft, 
  FiChevronRight, 
  FiCompass, 
  FiUserCheck, 
  FiUserPlus,
  FiActivity,
  FiLayers
} from 'react-icons/fi';

const REGIONS = [
  { id: 'all', name: 'All Worldwide', icon: '🌐' },
  { id: 'europe', name: 'Europe', icon: '🇪🇺' },
  { id: 'asia_pacific', name: 'Asia-Pacific', icon: '🇯🇵' },
  { id: 'north_america', name: 'North America', icon: '🇺🇸' }
];

const CATEGORY_TABS = [
  { id: 'all', label: '🏆 All Categories', icon: '🌟' },
  { id: 'Sports', label: 'Sports', icon: '⚽' },
  { id: 'Food & Culinary', label: 'Food & Culinary', icon: '🍔' },
  { id: 'Entertainment', label: 'Entertainment & CGI', icon: '🎬' },
  { id: 'Gaming', label: 'Gaming & Esports', icon: '🎮' },
  { id: 'Tech & Science', label: 'Tech & Science AI', icon: '💻' },
  { id: 'Music & Arts', label: 'Music & Arts', icon: '🎵' },
  { id: 'Travel & Nature', label: 'Travel & Nature 8K', icon: '🏔️' }
];

const CATEGORY_META = [
  { key: 'Sports', title: 'Sports & Extreme Action', icon: '⚽', desc: 'World Records, F1 Speeds & Extreme Stunts', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
  { key: 'Food & Culinary', title: 'Food & Culinary Arts', icon: '🍔', desc: 'Michelin Masters, Artisan Pizza & Haute Pâtisserie', gradient: 'linear-gradient(135deg, #f59e0b, #eab308)' },
  { key: 'Entertainment', title: 'Entertainment & CGI Cinema', icon: '🎬', desc: 'Award-Winning 3D Cinema, VFX & Unreal Cinematics', gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
  { key: 'Gaming', title: 'Gaming & Esports', icon: '🎮', desc: 'Next-Gen Graphics Showcases, Esports Finals & 4K Aces', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
  { key: 'Tech & Science', title: 'Tech & Science AI', icon: '💻', desc: 'Humanoid Robotics, Quantum Processors & Future Tech', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
  { key: 'Music & Arts', title: 'Music & Visual Arts', icon: '🎵', desc: 'Cyber Synthwave, Royal Symphonies & Spatial Audio', gradient: 'linear-gradient(135deg, #a855f7, #6366f1)' },
  { key: 'Travel & Nature', title: 'Travel & Nature 8K', icon: '🏔️', desc: 'Arctic Auroras, Swiss Alps FPV & Ocean Wonders', gradient: 'linear-gradient(135deg, #14b8a6, #0ea5e9)' }
];

const SORT_OPTIONS = [
  { id: 'rank', label: '🏆 Category Rank' },
  { id: 'views', label: '🔥 Top Views' },
  { id: 'rating', label: '⭐ Highest Rating' },
  { id: 'trending', label: '⚡ Trending Velocity' }
];

const FeaturedSection = ({ standalone = false }) => {
  const navigate = useNavigate();
  const { user, toggleSubscribe } = useUser();

  const [loading, setLoading] = useState(true);
  const [featuredHero, setFeaturedHero] = useState(null);
  const [heroSpotlights, setHeroSpotlights] = useState([]);
  const [currentHeroIdx, setCurrentHeroIdx] = useState(0);
  const [videos, setVideos] = useState([]);
  const [categorySections, setCategorySections] = useState([]);
  const [topCreators, setTopCreators] = useState([]);
  const [stats, setStats] = useState(null);

  // Filters
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');
  const [selectedSort, setSelectedSort] = useState('rank');

  // Interactive Hero Preview state
  const [heroVideoPlaying, setHeroVideoPlaying] = useState(false);
  const [subscribingCreator, setSubscribingCreator] = useState(null);

  // Card hover video timeout ref
  const [hoveredVideoId, setHoveredVideoId] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Helper to format views
  const formatViews = (num) => {
    if (!num) return '0 views';
    if (typeof num === 'string' && num.includes('views')) return num;
    const n = Number(num);
    if (isNaN(n)) return `${num} views`;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M views`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K views`;
    return `${n} views`;
  };

  // Group videos into category sections
  const computeCategorySections = (allVideos) => {
    return CATEGORY_META.map(cat => {
      const catVideos = allVideos
        .filter(v => (v.category || '').toLowerCase().includes(cat.key.toLowerCase()))
        .sort((a, b) => (a.categoryRank || 99) - (b.categoryRank || 99));

      const totalViews = catVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);

      return {
        ...cat,
        totalVideos: catVideos.length,
        totalViewsFormatted: formatViews(totalViews),
        videos: catVideos,
        topChampion: catVideos[0] || null
      };
    }).filter(sec => sec.videos.length > 0);
  };

  // Fetch featured global data
  const fetchFeaturedData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedRegion !== 'all') params.append('region', selectedRegion);
      if (activeCategoryTab !== 'all') params.append('category', activeCategoryTab);
      if (selectedSort) params.append('sort', selectedSort);

      const res = await fetch(`${API_URL}/api/videos/featured-global?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const videoList = data.videos || [];
        setVideos(videoList);
        
        // Use server sections if available, or compute dynamically
        if (data.categorySections && data.categorySections.length > 0) {
          setCategorySections(data.categorySections);
        } else {
          setCategorySections(computeCategorySections(videoList));
        }

        setHeroSpotlights(data.heroSpotlights || []);
        if (data.heroSpotlights && data.heroSpotlights.length > 0) {
          setFeaturedHero(data.heroSpotlights[0]);
          setCurrentHeroIdx(0);
        }
        setTopCreators(data.topCreators || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch featured global videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeaturedData();
  }, [selectedRegion, activeCategoryTab, selectedSort]);

  // Real-time synchronization for video views and subscriptions
  useEffect(() => {
    const socket = io(API_URL);

    socket.on('video-view-updated', (data) => {
      setVideos(prev => prev.map(v => v.id === data.videoId ? { ...v, views: data.views, viewsCount: data.viewsCount } : v));
      setCategorySections(prev => prev.map(sec => ({
        ...sec,
        videos: sec.videos.map(v => v.id === data.videoId ? { ...v, views: data.views, viewsCount: data.viewsCount } : v)
      })));
      setHeroSpotlights(prev => prev.map(v => v.id === data.videoId ? { ...v, views: data.views, viewsCount: data.viewsCount } : v));
      setFeaturedHero(prev => prev && prev.id === data.videoId ? { ...prev, views: data.views, viewsCount: data.viewsCount } : prev);
    });

    socket.on('subscriber-updated', (data) => {
      setTopCreators(prev => prev.map(c => {
        if (c.name?.toLowerCase() === data.channelName?.toLowerCase() || c.username?.toLowerCase() === data.channelName?.toLowerCase()) {
          return { ...c, subscribersCount: data.subscribersCount };
        }
        return c;
      }));
    });

    return () => socket.disconnect();
  }, []);

  // Handle Subscribe action
  const handleCreatorSubscribe = async (e, channelName) => {
    e.stopPropagation();
    if (!user) {
      alert('Please log in to subscribe to creators.');
      return;
    }

    setSubscribingCreator(channelName);
    const res = await toggleSubscribe(channelName);
    setSubscribingCreator(null);

    if (!res.success) {
      alert(res.error || 'Failed to update subscription');
    }
  };

  // Card Hover Video Handlers
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

  // Hero carousel navigation
  const nextHero = () => {
    if (heroSpotlights.length === 0) return;
    const nextIdx = (currentHeroIdx + 1) % heroSpotlights.length;
    setCurrentHeroIdx(nextIdx);
    setFeaturedHero(heroSpotlights[nextIdx]);
    setHeroVideoPlaying(false);
  };

  const prevHero = () => {
    if (heroSpotlights.length === 0) return;
    const prevIdx = (currentHeroIdx - 1 + heroSpotlights.length) % heroSpotlights.length;
    setCurrentHeroIdx(prevIdx);
    setFeaturedHero(heroSpotlights[prevIdx]);
    setHeroVideoPlaying(false);
  };

  // Medal styling helper for category rankings
  const getCategoryRankMedal = (rank, category) => {
    const cleanCategory = category ? category.split('&')[0].trim() : 'Section';
    if (rank === 1) {
      return { 
        trophy: '🥇', 
        label: `#1 in ${cleanCategory}`, 
        color: '#fbbf24', 
        bg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.2))',
        border: 'rgba(251, 191, 36, 0.7)',
        glow: '0 0 16px rgba(251, 191, 36, 0.45)'
      };
    }
    if (rank === 2) {
      return { 
        trophy: '🥈', 
        label: `#2 in ${cleanCategory}`, 
        color: '#e2e8f0', 
        bg: 'linear-gradient(135deg, rgba(226, 232, 240, 0.3), rgba(148, 163, 184, 0.2))',
        border: 'rgba(226, 232, 240, 0.6)',
        glow: '0 0 12px rgba(226, 232, 240, 0.35)'
      };
    }
    if (rank === 3) {
      return { 
        trophy: '🥉', 
        label: `#3 in ${cleanCategory}`, 
        color: '#f97316', 
        bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(194, 65, 12, 0.2))',
        border: 'rgba(249, 115, 22, 0.6)',
        glow: '0 0 10px rgba(249, 115, 22, 0.35)'
      };
    }
    return { 
      trophy: '⭐', 
      label: `#${rank} in ${cleanCategory}`, 
      color: '#a5b4fc', 
      bg: 'rgba(99, 102, 241, 0.2)',
      border: 'rgba(99, 102, 241, 0.4)',
      glow: 'none'
    };
  };

  const getRankMedal = (rank) => {
    if (rank === 1) return { trophy: '🥇', label: '#1 Global Champion', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)', border: '#fbbf24' };
    if (rank === 2) return { trophy: '🥈', label: '#2 Global Masterpiece', color: '#e2e8f0', bg: 'rgba(226, 232, 240, 0.2)', border: '#e2e8f0' };
    if (rank === 3) return { trophy: '🥉', label: '#3 Global Spotlight', color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)', border: '#f97316' };
    return { trophy: '⭐', label: `Top #${rank} World Ranked`, color: '#a5b4fc', bg: 'rgba(165, 180, 252, 0.15)', border: '#6366f1' };
  };

  // Helper to render a video card
  const renderVideoCard = (video, categoryName) => {
    const isHovered = hoveredVideoId === video.id;
    const catMedal = getCategoryRankMedal(video.categoryRank || 1, categoryName || video.category || 'Category');

    return (
      <div 
        key={video.id}
        className="global-video-card"
        onClick={() => navigate(`/watch/${video.id}`)}
        onMouseEnter={() => handleCardMouseEnter(video.id)}
        onMouseLeave={handleCardMouseLeave}
      >
        {/* Thumbnail / Video Preview Frame */}
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

          {/* Category Rank Badge */}
          <div 
            className="category-rank-badge" 
            style={{ 
              background: catMedal.bg, 
              color: catMedal.color, 
              borderColor: catMedal.border,
              boxShadow: catMedal.glow
            }}
          >
            <span>{catMedal.trophy}</span>
            <span>{catMedal.label}</span>
          </div>

          {/* Country Flag Tag */}
          <div className="card-country-badge" title={video.country}>
            {video.countryFlag}
          </div>

          {/* Duration Badge */}
          <div className="card-duration-tag">
            {video.duration || '10:00'}
          </div>

          {/* Performance Score Tag */}
          {video.performanceScore && (
            <div className="card-score-tag">
              <FiZap size={11} color="#f59e0b" />
              <span>{video.performanceScore}</span>
            </div>
          )}
        </div>

        {/* Details Bottom Section */}
        <div className="card-details-box">
          <div className="card-avatar-col">
            <img 
              src={video.channel_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.channel}`} 
              alt={video.channel}
              className="card-creator-avatar"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/channel/${video.channel}`);
              }}
              title={`View ${video.channel}'s Channel`}
            />
          </div>

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
              <span className="card-flag-inline">{video.countryFlag}</span>
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
  };

  return (
    <div className="featured-section-container animate-fade-in">
      {/* --- HEADER TITLE & GLOBAL LIVE STATS TICKER --- */}
      <div className="featured-hero-header">
        <div className="featured-title-wrap">
          <div className="featured-badge-pill">
            <FiGlobe className="globe-spin-icon" />
            <span>Official Global Rankings & Best Performing Showcase</span>
          </div>
          <h1 className="featured-main-title">
            World Ranked Sections & Elite Global Creators
          </h1>
          <p className="featured-main-desc">
            Explore #1 ranked videos and record-breaking creations across Sports, Food & Culinary, Entertainment, Gaming, AI Tech, Music, and Nature.
          </p>
        </div>

        {/* Global Live Analytics Strip */}
        {stats && (
          <div className="featured-stats-ticker">
            <div className="stats-ticker-item">
              <span className="stats-icon">🌍</span>
              <div>
                <div className="stats-val">{stats.totalGlobalViews}</div>
                <div className="stats-lbl">Total Global Views</div>
              </div>
            </div>
            <div className="stats-ticker-item">
              <span className="stats-icon">👑</span>
              <div>
                <div className="stats-val">{stats.totalEliteCreators}+</div>
                <div className="stats-lbl">Ranked Creators</div>
              </div>
            </div>
            <div className="stats-ticker-item">
              <span className="stats-icon">🗺️</span>
              <div>
                <div className="stats-val">{stats.totalCountries} Countries</div>
                <div className="stats-lbl">Represented</div>
              </div>
            </div>
            <div className="stats-ticker-item">
              <span className="stats-icon">⚡</span>
              <div>
                <div className="stats-val">99.9%</div>
                <div className="stats-lbl">Top Performance</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- HERO SPOTLIGHT BANNER --- */}
      {featuredHero && (
        <div className="featured-hero-banner">
          <div className="hero-backdrop-glow" />
          
          <div className="hero-content-grid">
            {/* Left Info Column */}
            <div className="hero-info-column">
              <div className="hero-tags-row">
                <span className="hero-rank-badge">
                  {getRankMedal(featuredHero.globalRank || 1).trophy} {featuredHero.featuredBadge || getRankMedal(featuredHero.globalRank || 1).label}
                </span>
                <span className="hero-country-badge">
                  {featuredHero.countryFlag} {featuredHero.country}
                </span>
                <span className="hero-category-badge">
                  {featuredHero.categoryIcon || '🎬'} {featuredHero.category}
                </span>
              </div>

              <h2 className="hero-title">{featuredHero.title}</h2>
              <p className="hero-description">{featuredHero.description}</p>

              {/* Creator Profile Spotlight */}
              <div 
                className="hero-creator-card"
                onClick={() => navigate(`/channel/${featuredHero.channel}`)}
              >
                <img 
                  src={featuredHero.channel_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${featuredHero.channel}`} 
                  alt={featuredHero.channel}
                  className="hero-creator-avatar"
                />
                <div className="hero-creator-meta">
                  <div className="hero-creator-name">
                    <span>{featuredHero.channel}</span>
                    <FiCheckCircle className="verified-icon" />
                  </div>
                  <div className="hero-creator-sub">
                    {featuredHero.countryFlag} {featuredHero.country} • Studio Creator
                  </div>
                </div>

                <button 
                  className={`btn ${user?.subscriptions?.includes(featuredHero.channel) ? 'btn-subscribed' : 'btn-subscribe-hero'}`}
                  onClick={(e) => handleCreatorSubscribe(e, featuredHero.channel)}
                  disabled={subscribingCreator === featuredHero.channel}
                >
                  {user?.subscriptions?.includes(featuredHero.channel) ? (
                    <>
                      <FiUserCheck size={16} /> Subscribed
                    </>
                  ) : (
                    <>
                      <FiUserPlus size={16} /> Subscribe
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons & Metrics */}
              <div className="hero-actions-row">
                <button 
                  className="btn btn-hero-watch"
                  onClick={() => navigate(`/watch/${featuredHero.id}`)}
                >
                  <FiPlay size={20} /> Watch Video
                </button>

                <button 
                  className="btn btn-hero-preview"
                  onClick={() => setHeroVideoPlaying(!heroVideoPlaying)}
                >
                  {heroVideoPlaying ? 'Pause Trailer' : '⚡ Quick Preview'}
                </button>

                <div className="hero-metrics-pill">
                  <span title="Total Views"><FiEye /> {featuredHero.views}</span>
                  <span title="Likes"><FiThumbsUp /> {featuredHero.likesCount ? `${(featuredHero.likesCount / 1000).toFixed(1)}k` : '100k+'}</span>
                  <span title="Duration"><FiActivity /> {featuredHero.duration || '10:00'}</span>
                </div>
              </div>
            </div>

            {/* Right Video / Visual Showcase */}
            <div className="hero-visual-column">
              <div className="hero-video-frame">
                {heroVideoPlaying ? (
                  <video 
                    src={featuredHero.url}
                    autoPlay
                    controls
                    className="hero-media-player"
                  />
                ) : (
                  <div className="hero-thumbnail-wrapper" onClick={() => navigate(`/watch/${featuredHero.id}`)}>
                    <img 
                      src={featuredHero.thumbnail} 
                      alt={featuredHero.title} 
                      className="hero-thumbnail-img"
                    />
                    <div className="hero-play-overlay">
                      <div className="hero-play-btn-circle">
                        <FiPlay size={32} color="#ffffff" style={{ marginLeft: '4px' }} />
                      </div>
                      <span className="hero-play-label">Click to Play in Cinema Mode</span>
                    </div>
                    <div className="hero-duration-badge">{featuredHero.duration || '10:00'}</div>
                  </div>
                )}

                {/* Spotlight Carousel Switcher */}
                {heroSpotlights.length > 1 && (
                  <div className="hero-carousel-controls">
                    <button className="carousel-arrow-btn" onClick={prevHero} title="Previous Spotlight">
                      <FiChevronLeft size={20} />
                    </button>
                    <div className="carousel-dots">
                      {heroSpotlights.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`carousel-dot ${idx === currentHeroIdx ? 'active' : ''}`}
                          onClick={() => {
                            setCurrentHeroIdx(idx);
                            setFeaturedHero(heroSpotlights[idx]);
                            setHeroVideoPlaying(false);
                          }}
                        />
                      ))}
                    </div>
                    <button className="carousel-arrow-btn" onClick={nextHero} title="Next Spotlight">
                      <FiChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TOP GLOBAL CREATORS LEADERBOARD REEL --- */}
      {topCreators && topCreators.length > 0 && (
        <div className="top-creators-section">
          <div className="section-title-row">
            <div className="section-title-left">
              <FiAward className="section-icon-gold" />
              <div>
                <h2 className="section-title">Top Ranked Creators Across All Sections</h2>
                <p className="section-subtitle">Ranked by global category dominance, community engagement, and production quality</p>
              </div>
            </div>
          </div>

          <div className="creators-horizontal-reel">
            {topCreators.map((creator) => {
              const isSubscribed = user?.subscriptions?.includes(creator.name || creator.username);
              const medal = getRankMedal(creator.globalCreatorRank || 99);

              return (
                <div 
                  key={creator.id} 
                  className="creator-spotlight-card"
                  onClick={() => navigate(`/channel/${creator.username || creator.name}`)}
                >
                  <div className="creator-card-banner">
                    <img 
                      src={creator.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'} 
                      alt={creator.name}
                      className="creator-card-banner-img"
                    />
                    <div className="creator-card-rank-tag" style={{ background: medal.bg, color: medal.color, borderColor: medal.border }}>
                      {medal.trophy} #{creator.globalCreatorRank}
                    </div>
                  </div>

                  <div className="creator-card-body">
                    <div className="creator-avatar-wrap">
                      <img 
                        src={creator.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.username}`} 
                        alt={creator.name}
                        className="creator-card-avatar"
                      />
                      <span className="creator-flag-badge" title={creator.country}>{creator.countryFlag}</span>
                    </div>

                    <h3 className="creator-card-name">
                      {creator.name || creator.username}
                      <FiCheckCircle className="verified-icon" />
                    </h3>
                    
                    <div className="creator-country-text">
                      {creator.countryFlag} {creator.country}
                    </div>

                    <p className="creator-bio-text">{creator.bio}</p>

                    {/* Creator Badges */}
                    <div className="creator-badges-wrap">
                      {(creator.creatorBadges || []).slice(0, 2).map((badge, bIdx) => (
                        <span key={bIdx} className="creator-pill-badge">{badge}</span>
                      ))}
                    </div>

                    <div className="creator-metrics-row">
                      <div className="creator-metric">
                        <span className="metric-val">{creator.subscribersCount || 0}</span>
                        <span className="metric-lbl">Subscribers</span>
                      </div>
                      <div className="creator-metric-divider" />
                      <div className="creator-metric">
                        <span className="metric-val">{creator.totalViews || '10M+'}</span>
                        <span className="metric-lbl">Total Views</span>
                      </div>
                    </div>

                    <button 
                      className={`btn ${isSubscribed ? 'btn-creator-subscribed' : 'btn-creator-subscribe'}`}
                      onClick={(e) => handleCreatorSubscribe(e, creator.name || creator.username)}
                      disabled={subscribingCreator === (creator.name || creator.username)}
                    >
                      {isSubscribed ? (
                        <>
                          <FiUserCheck size={14} /> Subscribed
                        </>
                      ) : (
                        <>
                          <FiUserPlus size={14} /> Subscribe
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- INTERACTIVE CATEGORY SECTION TABS & CONTROLS --- */}
      <div className="featured-controls-panel">
        {/* Category Sections Tabs */}
        <div className="category-sections-tabs-bar">
          <div className="filter-group-label">
            <FiLayers /> Category Section:
          </div>
          <div className="category-tabs-scroll">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`category-section-tab-btn ${activeCategoryTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveCategoryTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* World Region & Sort Filter Row */}
        <div className="featured-secondary-filters-row">
          <div className="regions-filter-bar">
            <div className="filter-group-label">
              <FiGlobe /> Region:
            </div>
            <div className="regions-scroll-list">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  className={`region-pill-btn ${selectedRegion === r.id ? 'active' : ''}`}
                  onClick={() => setSelectedRegion(r.id)}
                >
                  <span className="region-icon">{r.icon}</span>
                  <span>{r.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sort-dropdown-wrap">
            <div className="filter-group-label">
              <FiTrendingUp /> Sort:
            </div>
            <div className="sort-buttons-row">
              {SORT_OPTIONS.map((sortOpt) => (
                <button
                  key={sortOpt.id}
                  className={`sort-pill-btn ${selectedSort === sortOpt.id ? 'active' : ''}`}
                  onClick={() => setSelectedSort(sortOpt.id)}
                >
                  {sortOpt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- CATEGORY-SPECIFIC RANKED SECTIONS (MULTI-SECTION SHOWCASE) --- */}
      {loading ? (
        <div className="featured-loading-state">
          <div className="spinner" />
          <p>Loading Category Ranked Showcases...</p>
        </div>
      ) : activeCategoryTab === 'all' ? (
        /* Render All Category Sections */
        <div className="all-category-sections-wrapper">
          {categorySections.map((section) => (
            <div key={section.key} className="category-section-block">
              {/* Section Header */}
              <div className="category-section-header">
                <div className="cat-header-left">
                  <div className="cat-section-icon-badge" style={{ background: section.gradient }}>
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="cat-section-title">
                      {section.title}
                    </h2>
                    <p className="cat-section-desc">{section.desc}</p>
                  </div>
                </div>

                <div className="cat-header-right">
                  <span className="cat-stats-pill">
                    <FiEye size={13} /> {section.totalViewsFormatted} Total Views
                  </span>
                  <button 
                    className="cat-view-all-btn"
                    onClick={() => setActiveCategoryTab(section.key)}
                  >
                    View Top {section.key} Rankings →
                  </button>
                </div>
              </div>

              {/* Section Cards Grid */}
              <div className="featured-cards-grid">
                {section.videos.map((video) => renderVideoCard(video, section.key))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Render Single Selected Category Section Grid */
        <div className="single-category-section-view">
          <div className="grid-header-row">
            <h2 className="grid-title">
              <span>🏆 Ranked in {activeCategoryTab} ({videos.length} Videos)</span>
            </h2>
            <button 
              className="btn btn-outline" 
              style={{ borderRadius: '20px', padding: '6px 16px', fontSize: '0.85rem' }}
              onClick={() => setActiveCategoryTab('all')}
            >
              ← Back to All Sections
            </button>
          </div>

          {videos.length === 0 ? (
            <div className="featured-empty-state">
              <FiCompass size={48} color="var(--accent-color)" />
              <h3>No videos found in {activeCategoryTab} for this region</h3>
              <p>Try switching to "All Worldwide" region to see all ranked videos in this category.</p>
              <button 
                className="btn btn-primary"
                onClick={() => setSelectedRegion('all')}
              >
                Show All Worldwide
              </button>
            </div>
          ) : (
            <div className="featured-cards-grid">
              {videos.map((video) => renderVideoCard(video, activeCategoryTab))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FeaturedSection;
