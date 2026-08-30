import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoCard from './VideoCard';

const PlaylistView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/playlists/${id}`);
        if (res.ok) {
          const data = await res.json();
          setPlaylist(data);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to fetch playlist:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylist();
  }, [id, navigate]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading playlist...</div>;
  }

  if (!playlist) return null;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <h1 style={styles.title}>{playlist.title}</h1>
          <p style={styles.subtitle}>
            {playlist.videoDetails?.length || 0} videos • Created {new Date(playlist.createdAt).toLocaleDateString()}
          </p>
          <p style={styles.description}>{playlist.description}</p>
        </div>
      </div>

      <div className="yt-video-grid">
        {playlist.videoDetails && playlist.videoDetails.length > 0 ? (
          playlist.videoDetails.map(video => (
            <VideoCard key={video.id} video={video} />
          ))
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No videos in this playlist yet.</p>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  },
  header: {
    display: 'flex',
    gap: '24px',
    marginBottom: '32px',
    padding: '24px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)'
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    margin: '0 0 8px 0'
  },
  subtitle: {
    color: 'var(--text-muted)',
    margin: '0 0 16px 0',
    fontSize: '0.9rem'
  },
  description: {
    color: 'var(--text-primary)',
    margin: 0,
    lineHeight: '1.5'
  }
};

export default PlaylistView;
