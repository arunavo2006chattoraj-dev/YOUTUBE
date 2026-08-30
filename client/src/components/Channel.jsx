import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import io from 'socket.io-client';
import ChannelCustomizerModal from './ChannelCustomizerModal';
import { FiBell, FiUserCheck, FiUserPlus } from 'react-icons/fi';

export default function Channel() {
  console.log("Rendering Channel component with Posts tab");
  const { channelName } = useParams();
  const navigate = useNavigate();
  const { user, toggleSubscribe } = useUser();

  const [channelData, setChannelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('videos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);

  const isOwner = user && (
    user.username?.toLowerCase() === channelName?.toLowerCase() ||
    user.name?.toLowerCase() === channelName?.toLowerCase()
  );

  const fetchChannel = async () => {
    try {
      const url = `http://localhost:3001/api/channel/${encodeURIComponent(channelName)}${user ? `?userId=${user.id}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setChannelData(data);
      }
    } catch (err) {
      console.error('Error fetching channel data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/channel/${encodeURIComponent(channelName)}/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  useEffect(() => {
    fetchChannel();
    fetchPosts();
  }, [channelName, user]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('http://localhost:3001/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName: channelData?.name || channelName,
          channelAvatar: channelData?.avatar || '',
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

  // Connect to Socket.io for Real-Time Live Subscriber & Profile Updates
  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('subscriber-updated', (data) => {
      if (
        data.channelName?.toLowerCase() === channelName?.toLowerCase() ||
        (channelData && channelData.username?.toLowerCase() === data.channelName?.toLowerCase())
      ) {
        setChannelData(prev => {
          if (!prev) return prev;
          let updatedSubs = [...(prev.subscribers || [])];
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

    socket.on('channel-profile-updated', (data) => {
      if (data.channelName?.toLowerCase() === channelName?.toLowerCase()) {
        setChannelData(prev => prev ? ({
          ...prev,
          banner: data.banner || prev.banner,
          avatar: data.avatar || prev.avatar,
          bio: data.bio || prev.bio
        }) : prev);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [channelName, channelData]);

  const handleSubscribe = async () => {
    if (!user) {
      alert('Please log in from the top right to subscribe to this channel.');
      return;
    }
    setSubscribing(true);
    const res = await toggleSubscribe(channelData?.name || channelName);
    setSubscribing(false);
    if (res.success) {
      setChannelData(prev => ({
        ...prev,
        isSubscribed: res.isSubscribed,
        subscribersCount: res.subscribersCount,
        subscribers: res.subscribers
      }));
    } else {
      alert(res.error || 'Failed to update subscription');
    }
  };

  const formatViews = (viewsCount) => {
    if (!viewsCount) return '0 views';
    if (viewsCount >= 1000000) return (viewsCount / 1000000).toFixed(1) + 'M views';
    if (viewsCount >= 1000) return (viewsCount / 1000).toFixed(1) + 'K views';
    return `${viewsCount} views`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="live-dot" style={{ width: '16px', height: '16px' }}></div>
          <div>Loading channel experience...</div>
        </div>
      </div>
    );
  }

  if (!channelData) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Channel not found</h2>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="channel-container">
      {/* 1. Channel Banner */}
      <div className="channel-banner-wrapper">
        <img 
          src={channelData.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80'} 
          alt={`${channelData.name} Banner`} 
          className="channel-banner-img"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80';
          }}
        />
        <div className="channel-banner-overlay" />
        {isOwner && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="channel-banner-edit-btn"
            title="Customize your banner & profile"
          >
            ✏️ Customize Banner
          </button>
        )}
      </div>

      {/* 2. Channel Header / Identity */}
      <div className="channel-header-content">
        <div className="channel-profile-info">
          <img 
            src={channelData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${channelData.name}`} 
            alt={channelData.name} 
            className="channel-avatar-large"
          />
          <div className="channel-meta">
            <h1 className="channel-title">{channelData.name}</h1>
            <div className="channel-handle-row">
              <span>@{channelData.username?.toLowerCase().replace(/\s+/g, '') || 'channel'}</span>
              <span>•</span>
              <div className="live-counter-box" title="Real-time Live Subscribers">
                <span className="live-dot" />
                <span>
                  <strong>{channelData.subscribersCount || 0}</strong> {channelData.subscribersCount === 1 ? 'subscriber' : 'subscribers'}
                </span>
              </div>
              <span>•</span>
              <span><strong>{channelData.videosCount || 0}</strong> videos</span>
              <span>•</span>
              <span><strong>{formatViews(channelData.totalViews)}</strong></span>
            </div>
            {channelData.bio && (
              <p className="channel-bio-preview">
                {channelData.bio}
              </p>
            )}
          </div>
        </div>

        {/* Subscribe / Owner Actions */}
        <div className="channel-header-actions">
          {isOwner ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="btn btn-secondary" 
                style={{ borderRadius: '24px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                ⚙️ Customize Channel
              </button>
              <button 
                onClick={() => navigate('/your-videos')} 
                className="btn btn-primary" 
                style={{ borderRadius: '24px', padding: '10px 20px' }}
              >
                📊 Creator Studio
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={handleSubscribe} 
                disabled={subscribing}
                className={channelData.isSubscribed ? 'btn-subscribed' : 'btn-subscribe'}
              >
                {subscribing ? (
                  'Updating...'
                ) : channelData.isSubscribed ? (
                  <><FiUserCheck style={{marginRight: '6px'}}/> Subscribed</>
                ) : (
                  <><FiUserPlus style={{marginRight: '6px'}}/> Subscribe</>
                )}
              </button>
              {channelData.isSubscribed && (
                <button 
                  className="btn-icon" 
                  title="Notifications"
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
                  onClick={() => alert('Notifications set to All')}
                >
                  <FiBell size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="channel-tabs">
        <button 
          className={`channel-tab ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          Videos ({channelData.videos?.filter(v => !v.isShort).length || 0})
        </button>
        <button 
          className={`channel-tab ${activeTab === 'shorts' ? 'active' : ''}`}
          onClick={() => setActiveTab('shorts')}
        >
          Shorts ({channelData.videos?.filter(v => v.isShort).length || 0})
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
          Subscribers ({channelData.subscribersCount || 0})
        </button>
        <button 
          className={`channel-tab ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
      </div>

      {/* 4. Tab Contents */}
      <div style={{ padding: '24px 32px' }}>
        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div>
            {channelData.videos && channelData.videos.filter(v => !v.isShort).length > 0 ? (
              <div className="yt-video-grid" style={{ padding: 0 }}>
                {channelData.videos.filter(v => !v.isShort).map((vid) => (
                  <div 
                    key={vid.id} 
                    className="yt-card"
                    onClick={() => navigate(`/watch/${vid.id}`)}
                  >
                    <img src={vid.thumbnail} alt={vid.title} className="yt-card-thumbnail" />
                    <div className="yt-card-info">
                      <div className="yt-card-text">
                        <div className="yt-card-title">{vid.title}</div>
                        <div className="yt-card-subtitle">
                          {vid.views || formatViews(vid.viewsCount)} • {vid.timestamp || 'Recently'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎬</div>
                <h3>No videos uploaded yet</h3>
                <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>
                  {isOwner ? 'Click "Upload Video" in the navigation bar to post your first video!' : 'This channel has not posted any videos yet.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Shorts Tab */}
        {activeTab === 'shorts' && (
          <div>
            {channelData.videos && channelData.videos.filter(v => v.isShort).length > 0 ? (
              <div className="yt-video-grid" style={{ padding: 0 }}>
                {channelData.videos.filter(v => v.isShort).map((vid) => (
                  <div 
                    key={vid.id} 
                    className="yt-card"
                    onClick={() => navigate(`/watch/${vid.id}`)}
                  >
                    <img src={vid.thumbnail} alt={vid.title} className="yt-card-thumbnail" style={{ aspectRatio: '9/16', objectFit: 'cover' }} />
                    <div className="yt-card-info">
                      <div className="yt-card-text">
                        <div className="yt-card-title">{vid.title}</div>
                        <div className="yt-card-subtitle">
                          {vid.views || formatViews(vid.viewsCount)} • {vid.timestamp || 'Recently'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📱</div>
                <h3>No shorts uploaded yet</h3>
                <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>
                  {isOwner ? 'Click "Upload Short" in your Creator Studio to post your first short!' : 'This channel has not posted any shorts yet.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {isOwner && (
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
            )}

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
                  {isOwner ? 'Share updates, thoughts, and announcements with your community!' : 'This channel hasn\'t posted any community updates yet.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === 'subscribers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  Community Subscribers <span className="live-dot" />
                </h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  People who subscribed to {channelData.name} ({channelData.subscribersCount} live subscribers)
                </p>
              </div>
            </div>

            {channelData.subscribers && channelData.subscribers.length > 0 ? (
              <div className="subscribers-list-container">
                {channelData.subscribers.map((sub, idx) => (
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
                          Subscribed {sub.date ? new Date(sub.date).toLocaleDateString() : 'Recently'}
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
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>👥</div>
                <h4>No subscribers yet</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                  Share your channel or video links with friends to start growing your community!
                </p>
              </div>
            )}
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '14px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)' }}>Description</h3>
              <p style={{ color: 'var(--text-main)', lineHeight: '1.6', fontSize: '0.95rem', margin: 0, whiteSpace: 'pre-wrap' }}>
                {channelData.bio || 'Welcome to this channel! Check out our latest videos and content.'}
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '24px', borderRadius: '14px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-main)' }}>Stats</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Subscribers</div>
                  <div style={{ color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '700', marginTop: '4px' }}>
                    {channelData.subscribersCount || 0}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Video Views</div>
                  <div style={{ color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '700', marginTop: '4px' }}>
                    {formatViews(channelData.totalViews)}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Videos Uploaded</div>
                  <div style={{ color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '700', marginTop: '4px' }}>
                    {channelData.videosCount || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Banner & Profile Customizer Modal */}
      {isModalOpen && (
        <ChannelCustomizerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdated={(updated) => {
            setChannelData(prev => ({
              ...prev,
              name: updated.name,
              banner: updated.banner,
              avatar: updated.avatar,
              bio: updated.bio
            }));
          }}
        />
      )}
    </div>
  );
}
