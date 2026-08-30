import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { FiDownload } from 'react-icons/fi';

const Library = () => {
  const { user } = useUser();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all videos
        const vidRes = await fetch('http://localhost:3001/api/videos');
        if (vidRes.ok) {
          const vidData = await vidRes.json();
          setVideos(vidData);
        }

        // Fetch user playlists if logged in
        if (user) {
          const plRes = await fetch(`http://localhost:3001/api/users/${user.id}/playlists`);
          if (plRes.ok) {
            const plData = await plRes.json();
            setPlaylists(plData);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load library data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleDownload = async (videoId) => {
    if (!user) return alert('Please log in from the Profile page to download videos.');
    
    try {
      const res = await fetch('http://localhost:3001/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, videoId })
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(`Error: ${data.error}`);
        return;
      }
      
      // Simulate successful download
      alert(`Download started for ${data.download.title}! Check your profile for history.`);
      
      // Actual download logic via hidden link
      const a = document.createElement('a');
      a.href = data.url;
      a.target = '_blank';
      a.download = data.download.title + '.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
    } catch (err) {
      alert('An error occurred during download.');
    }
  };

  if (loading) return <div style={styles.container}>Loading library...</div>;

  // Mocking History, Liked Videos, and Watch Later by slicing the videos array
  // In a real application, these would be fetched from the backend for the specific user.
  const historyVideos = videos.slice(0, 4);
  const likedVideos = videos.slice(4, 8);
  const watchLaterVideos = videos.slice(8, 12);

  const renderVideoGrid = (vidList) => (
    <div style={styles.grid}>
      {vidList.map(video => (
        <div key={video.id} style={styles.card} className="glass-panel">
          <img 
            src={video.thumbnail} 
            alt={video.title} 
            style={{...styles.thumbnail, cursor: 'pointer'}} 
            onClick={() => window.location.href = `/watch/${video.id}`}
          />
          <div style={styles.cardContent}>
            <h3 
              style={{...styles.title, cursor: 'pointer'}}
              onClick={() => window.location.href = `/watch/${video.id}`}
            >
              {video.title.length > 50 ? video.title.substring(0, 50) + '...' : video.title}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{video.channel}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={styles.container} className="animate-fade-in">
      <h1 style={{ marginBottom: '32px', marginTop: '16px' }}>Library</h1>

      {error && <div style={{color: 'var(--danger-color)', marginBottom: '20px'}}>{error}</div>}

      {/* History Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>History</h2>
          <span style={styles.seeAll}>See all</span>
        </div>
        {renderVideoGrid(historyVideos)}
      </section>

      <hr style={styles.divider} />

      {/* Watch Later Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>Watch Later</h2>
          <span style={styles.seeAll}>See all</span>
        </div>
        {renderVideoGrid(watchLaterVideos)}
      </section>

      <hr style={styles.divider} />

      {/* Liked Videos Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>Liked videos</h2>
          <span style={styles.seeAll}>See all</span>
        </div>
        {renderVideoGrid(likedVideos)}
      </section>

      <hr style={styles.divider} />

      {/* Playlists Section */}
      {user && (
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2>Your Playlists</h2>
          </div>
          {playlists.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>You haven't created any playlists yet.</p>
          ) : (
            <div style={styles.grid}>
              {playlists.map(pl => (
                <div key={pl.id} style={{...styles.card, cursor: 'pointer'}} className="glass-panel" onClick={() => window.location.href = `/playlist/${pl.id}`}>
                  <div style={styles.playlistThumbnail}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{pl.videos.length}</span>
                    <span style={{ fontSize: '1rem', marginTop: '8px' }}>Videos</span>
                  </div>
                  <div style={styles.cardContent}>
                    <h3 style={styles.title}>{pl.title}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{pl.description || 'No description'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {user && <hr style={styles.divider} />}

      {/* All Videos / Downloads section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2>All Videos</h2>
        </div>
        <div style={styles.grid}>
          {videos.map(video => (
            <div key={video.id} style={styles.card} className="glass-panel">
              <img 
                src={video.thumbnail} 
                alt={video.title} 
                style={{...styles.thumbnail, cursor: 'pointer'}} 
                onClick={() => window.location.href = `/watch/${video.id}`}
              />
              <div style={styles.cardContent}>
                <h3 
                  style={{...styles.title, cursor: 'pointer'}}
                  onClick={() => window.location.href = `/watch/${video.id}`}
                >
                  {video.title.length > 50 ? video.title.substring(0, 50) + '...' : video.title}
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{video.channel}</span>
                <button 
                  className="btn btn-primary" 
                  style={styles.downloadBtn}
                  onClick={() => handleDownload(video.id)}
                >
                  <FiDownload /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const styles = {
  container: {
    padding: '0 24px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  thumbnail: {
    width: '100%',
    aspectRatio: '16/9',
    objectFit: 'cover'
  },
  playlistThumbnail: {
    width: '100%',
    aspectRatio: '16/9',
    backgroundColor: '#3a3a3a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white'
  },
  cardContent: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: 0
  },
  downloadBtn: {
    marginTop: 'auto',
    width: '100%'
  },
  section: {
    marginBottom: '20px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '20px'
  },
  seeAll: {
    color: '#38bdf8',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer'
  },
  divider: {
    borderColor: 'var(--border-color)',
    margin: '32px 0'
  }
};

export default Library;
