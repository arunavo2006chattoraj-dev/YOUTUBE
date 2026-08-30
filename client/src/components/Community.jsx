import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllPosts = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/api/posts/all`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch (error) {
        console.error('Failed to fetch global posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllPosts();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ color: 'var(--text-main)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📝 Community Posts
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
        See all updates, announcements, and thoughts from creators across the platform.
      </p>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading posts...</div>
      ) : posts && posts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {posts.map((post) => (
            <div key={post.id} className="glass-panel" style={{ padding: '20px', borderRadius: '14px' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', cursor: 'pointer' }}
                onClick={() => navigate(`/channel/${post.channelName}`)}
              >
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
            There are currently no community posts on the platform.
          </p>
        </div>
      )}
    </div>
  );
}
