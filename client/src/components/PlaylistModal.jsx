import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { FiX, FiPlus } from 'react-icons/fi';

const PlaylistModal = ({ isOpen, onClose, videoId }) => {
  const { user } = useUser();
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchPlaylists();
    }
  }, [isOpen, user]);

  const fetchPlaylists = async () => {
    try {
      const res = await fetch(`https://youtube-uz4d.onrender.com/api/users/${user.id}/playlists`);
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('https://youtube-uz4d.onrender.com/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, title: newPlaylistName })
      });
      if (res.ok) {
        const newPlaylist = await res.json();
        setPlaylists([newPlaylist, ...playlists]);
        setNewPlaylistName('');
        // Automatically add video if one is passed
        if (videoId) {
          handleAddVideoToPlaylist(newPlaylist.id);
        }
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideoToPlaylist = async (playlistId) => {
    try {
      const res = await fetch(`https://youtube-uz4d.onrender.com/api/playlists/${playlistId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
      if (res.ok) {
        alert('Video saved to playlist!');
        onClose();
      }
    } catch (error) {
      console.error('Failed to add video to playlist:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} className="glass-panel">
        <div style={styles.header}>
          <h3>Save to Playlist</h3>
          <button onClick={onClose} style={styles.closeBtn}><FiX size={24} /></button>
        </div>
        
        {!user ? (
          <p style={{ padding: '20px' }}>Please log in to save to playlists.</p>
        ) : (
          <div style={styles.content}>
            <div style={styles.playlistList}>
              {playlists.map(pl => (
                <div key={pl.id} style={styles.playlistItem} onClick={() => handleAddVideoToPlaylist(pl.id)}>
                  <span>{pl.title}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {pl.videos.includes(videoId) ? 'Added' : ''}
                  </span>
                </div>
              ))}
              {playlists.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No playlists yet.</p>}
            </div>
            
            <div style={styles.createSection}>
              <input 
                type="text" 
                placeholder="New Playlist Name" 
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="input-field"
                style={{ flex: 1 }}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleCreatePlaylist}
                disabled={loading || !newPlaylistName.trim()}
              >
                <FiPlus /> Create
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    width: '400px',
    maxWidth: '90%',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-color)'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer'
  },
  content: {
    padding: '20px 24px'
  },
  playlistList: {
    maxHeight: '200px',
    overflowY: 'auto',
    marginBottom: '20px'
  },
  playlistItem: {
    padding: '12px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  createSection: {
    display: 'flex',
    gap: '10px'
  }
};

export default PlaylistModal;
