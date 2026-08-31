import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import io from 'socket.io-client';
import { FiBell, FiUserCheck, FiUserPlus } from 'react-icons/fi';

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const { user, toggleSubscribe } = useUser();

  const [type, setType] = useState('all');
  const [sort, setSort] = useState('relevance');
  const [results, setResults] = useState({ videos: [], channels: [] });
  const [loading, setLoading] = useState(true);
  const [subscribingMap, setSubscribingMap] = useState({});

  const fetchResults = async () => {
    setLoading(true);
    try {
      const url = `http://localhost:3001/api/search?q=${encodeURIComponent(query)}&type=${type}&sort=${sort}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (err) {
      console.error('Error fetching search results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [query, type, sort]);

  // Real-time listener for subscriber changes
  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('subscriber-updated', (data) => {
      setResults(prev => ({
        ...prev,
        channels: prev.channels.map(ch => {
          if (ch.name?.toLowerCase() === data.channelName?.toLowerCase() || ch.username?.toLowerCase() === data.channelName?.toLowerCase()) {
            return { ...ch, subscribersCount: data.subscribersCount };
          }
          return ch;
        })
      }));
    });

    return () => socket.disconnect();
  }, []);

  const handleChannelSubscribe = async (e, channelName) => {
    e.stopPropagation();
    if (!user) {
      alert('Please log in to subscribe to channels.');
      return;
    }

    setSubscribingMap(prev => ({ ...prev, [channelName]: true }));
    const res = await toggleSubscribe(channelName);
    setSubscribingMap(prev => ({ ...prev, [channelName]: false }));

    if (!res.success) {
      alert(res.error || 'Failed to update subscription');
    }
  };

  const isSubscribedTo = (channelName) => {
    return user?.subscriptions?.some(s => s.toLowerCase() === channelName.toLowerCase());
  };

  return (
    <div className="search-page-container">
      {/* Mobile-only Search Bar */}
      <div className="mobile-search-page-input">
        <input 
          type="text" 
          placeholder="Search YouTube..." 
          value={query}
          onChange={(e) => {
            if (e.target.value) {
              setSearchParams({ q: e.target.value });
            } else {
              setSearchParams({});
            }
          }}
          autoFocus
        />
      </div>

      {/* Search Query Header & Filters */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '16px' }}>
          {query ? `Results for "${query}"` : 'Explore All Videos & Channels'}
        </h2>

        {/* Filter and Sort Chips */}
        <div className="search-filters-row">
          <button 
            className={`search-filter-chip ${type === 'all' ? 'active' : ''}`}
            onClick={() => setType('all')}
          >
            All Results
          </button>
          <button 
            className={`search-filter-chip ${type === 'videos' ? 'active' : ''}`}
            onClick={() => setType('videos')}
          >
            📹 Videos Only
          </button>
          <button 
            className={`search-filter-chip ${type === 'channels' ? 'active' : ''}`}
            onClick={() => setType('channels')}
          >
            👥 Channels Only
          </button>

          <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 8px' }} />

          <button 
            className={`search-filter-chip ${sort === 'relevance' ? 'active' : ''}`}
            onClick={() => setSort('relevance')}
          >
            Sort: Relevance
          </button>
          <button 
            className={`search-filter-chip ${sort === 'views' ? 'active' : ''}`}
            onClick={() => setSort('views')}
          >
            🔥 Most Viewed
          </button>
          <button 
            className={`search-filter-chip ${sort === 'latest' ? 'active' : ''}`}
            onClick={() => setSort('latest')}
          >
            ⏰ Latest Uploads
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="live-dot" style={{ width: '14px', height: '14px', margin: '0 auto 12px' }} />
          Searching content across YouTube...
        </div>
      ) : (
        <div>
          {/* Channels Section */}
          {results.channels && results.channels.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Matching Channels ({results.channels.length})
              </div>
              
              {results.channels.map((ch) => {
                const subbed = isSubscribedTo(ch.name || ch.username);
                const isSubbing = subscribingMap[ch.name || ch.username];
                return (
                  <div 
                    key={ch.id || ch.username}
                    className="glass-panel channel-search-result-card"
                    onClick={() => navigate(`/channel/${ch.username || ch.name}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: '260px' }}>
                      <img 
                        src={ch.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ch.username}`} 
                        alt={ch.name} 
                        style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                          {ch.name}
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span>@{ch.username?.toLowerCase().replace(/\s+/g, '')}</span>
                          <span>•</span>
                          <span style={{ color: '#a5b4fc', fontWeight: '500' }}>
                            {ch.subscribersCount || 0} subscribers
                          </span>
                          <span>•</span>
                          <span>{ch.videosCount || 0} videos</span>
                        </div>
                        {ch.bio && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '500px' }}>
                            {ch.bio}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={(e) => handleChannelSubscribe(e, ch.name || ch.username)}
                        disabled={isSubbing}
                        className={subbed ? 'btn-subscribed' : 'btn-subscribe'}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {isSubbing ? '...' : subbed ? <><FiUserCheck size={16}/> Subscribed</> : <><FiUserPlus size={16}/> Subscribe</>}
                      </button>
                      {subbed && (
                        <button 
                          style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-main)',
                            cursor: 'pointer'
                          }}
                          title="Notifications"
                          onClick={(e) => { e.stopPropagation(); alert('Notifications set to All'); }}
                        >
                          <FiBell size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Videos Section */}
          {results.videos && results.videos.length > 0 && (
            <div>
              {results.channels && results.channels.length > 0 && (
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
                  Matching Videos ({results.videos.length})
                </div>
              )}

              {results.videos.map((vid) => (
                <div 
                  key={vid.id}
                  className="video-search-result-card"
                  onClick={() => navigate(`/watch/${vid.id}`)}
                >
                  <div className="video-search-thumb-box">
                    <img src={vid.thumbnail} alt={vid.title} className="video-search-thumb" />
                  </div>

                  <div className="video-search-details">
                    <h3 className="video-search-title">{vid.title}</h3>
                    
                    <div className="video-search-meta">
                      {vid.views} • {vid.timestamp || 'Recently'}
                    </div>

                    <div 
                      className="video-search-channel-row"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/channel/${vid.channel}`);
                      }}
                    >
                      <img 
                        src={vid.channel_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${vid.channel}`} 
                        alt={vid.channel} 
                        className="video-search-channel-avatar" 
                      />
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                        {vid.channel}
                      </span>
                    </div>

                    {vid.description && (
                      <p className="video-search-desc">
                        {vid.description}
                      </p>
                    )}

                    {vid.tags && vid.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {vid.tags.slice(0, 4).map((t, idx) => (
                          <span 
                            key={idx}
                            style={{ 
                              fontSize: '0.75rem', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-muted)' 
                            }}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty Results */}
          {(!results.videos || results.videos.length === 0) && (!results.channels || results.channels.length === 0) && (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🔍</div>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                No results found for "{query}"
              </h3>
              <p style={{ maxWidth: '400px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
                Try different keywords, search by creator channel name, or check out our featured content.
              </p>
              <button onClick={() => navigate('/')} className="btn btn-primary" style={{ borderRadius: '20px' }}>
                Explore Trending Videos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
