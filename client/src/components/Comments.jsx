import React, { useState, useEffect } from 'react';
import { FiThumbsUp, FiThumbsDown, FiFlag, FiMapPin, FiGlobe } from 'react-icons/fi';
import { useUser } from '../context/UserContext';

const Comments = ({ videoId }) => {
  const { user } = useUser();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [locationText, setLocationText] = useState('');
  const [targetLang, setTargetLang] = useState('en');

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://youtube-uz4d.onrender.com';
        const res = await fetch(`${API_URL}/api/comments/${videoId}`);
        if (res.ok) {
          const data = await res.json();
          setComments(data);
        }
      } catch (error) {
        console.error('Failed to fetch comments:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (videoId) {
      fetchComments();
    }
  }, [videoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://youtube-uz4d.onrender.com';
      const res = await fetch(`${API_URL}/api/comments/${videoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user ? user.name : 'Guest User',
          text: newComment,
          location: locationText,
          showLocation: showLocation
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setComments([data, ...comments]);
        setNewComment('');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to post comment', error);
      alert('Failed to post comment.');
    }
  };

  const handleInteract = async (commentId, action) => {
    try {
      const payload = { action };
      if (user) {
        payload.userId = user.id;
      }
      
      const API_URL = import.meta.env.VITE_API_URL || 'https://youtube-uz4d.onrender.com';
      const res = await fetch(`${API_URL}/api/comments/${videoId}/${commentId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedComment = await res.json();
        setComments(comments.map(c => c.id === commentId ? { ...updatedComment, translatedText: c.translatedText, isTranslated: c.isTranslated } : c));
      }
    } catch (error) {
      console.error(`Failed to ${action} comment`, error);
    }
  };

  const handleTranslate = async (commentId, text) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://youtube-uz4d.onrender.com';
      const res = await fetch(`${API_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang })
      });
      if (res.ok) {
        const data = await res.json();
        setComments(comments.map(c => c.id === commentId ? { ...c, translatedText: data.translatedText, isTranslated: true } : c));
      }
    } catch (error) {
      console.error('Failed to translate comment', error);
    }
  };

  if (loading) return <div>Loading comments...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h3 style={styles.title}>{comments.length} Comments</h3>
        <select 
          style={styles.langSelect}
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
        >
          <option value="en">Translate to English</option>
          <option value="es">Translate to Spanish</option>
          <option value="fr">Translate to French</option>
          <option value="hi">Translate to Hindi</option>
          <option value="zh-cn">Translate to Chinese</option>
        </select>
      </div>
      
      <div style={styles.inputSection}>
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user ? user.name : 'Guest'}`} alt="User" style={styles.avatar} />
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Add a comment..."
            style={styles.input}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <div style={styles.locationContainer}>
            <label style={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={showLocation} 
                onChange={(e) => setShowLocation(e.target.checked)} 
              />
              Share Location
            </label>
            {showLocation && (
              <input
                type="text"
                placeholder="City, Country"
                style={styles.locationInput}
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
              />
            )}
          </div>
          <div style={styles.formActions}>
            <button type="button" style={styles.cancelBtn} onClick={() => setNewComment('')}>Cancel</button>
            <button type="submit" style={newComment.trim() ? styles.submitBtnActive : styles.submitBtn}>Comment</button>
          </div>
        </form>
      </div>

      <div style={styles.list}>
        {comments.map((c) => (
          <div key={c.id} style={styles.commentItem}>
            <img src={c.avatar} alt={c.user} style={styles.avatar} />
            <div style={styles.commentContent}>
              <div style={styles.commentHeader}>
                <span style={styles.username}>@{c.user}</span>
                <span style={styles.timestamp}>
                  {c.createdAt ? new Date(c.createdAt).toLocaleString() : c.timestamp}
                </span>
                {c.showLocation && c.location && (
                  <span style={styles.locationBadge}><FiMapPin size={12}/> {c.location}</span>
                )}
              </div>
              <p style={styles.text}>
                {c.isFlagged ? <em>[This comment has been flagged for review]</em> : (c.isTranslated && c.translatedText ? c.translatedText : c.text)}
              </p>
              {!c.isFlagged && (
                <div style={styles.actions}>
                  <button style={styles.actionBtn} onClick={() => handleInteract(c.id, 'like')}>
                    <FiThumbsUp size={14} /> {c.likes > 0 && c.likes}
                  </button>
                  <button style={styles.actionBtn} onClick={() => handleInteract(c.id, 'dislike')}>
                    <FiThumbsDown size={14} /> {c.dislikes > 0 && c.dislikes}
                  </button>
                  <button style={styles.actionBtnText} onClick={() => {
                    if (c.isTranslated) {
                      setComments(comments.map(comment => comment.id === c.id ? { ...comment, isTranslated: false } : comment));
                    } else {
                      handleTranslate(c.id, c.text);
                    }
                  }}>
                    <FiGlobe size={14} style={{ marginRight: '4px' }}/> {c.isTranslated ? 'Original' : 'Translate'}
                  </button>
                  <button style={styles.actionBtnText} onClick={() => handleInteract(c.id, 'report')}>
                    <FiFlag size={14} style={{ marginRight: '4px' }}/> Report
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginTop: '24px'
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-main)'
  },
  inputSection: {
    display: 'flex',
    gap: '16px',
    marginBottom: '32px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  form: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  input: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-main)',
    padding: '4px 0 8px 0',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px'
  },
  cancelBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-main)',
    cursor: 'pointer',
    fontWeight: '500',
    padding: '8px 16px',
    borderRadius: '18px'
  },
  submitBtn: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.5)',
    padding: '8px 16px',
    borderRadius: '18px',
    fontWeight: '500'
  },
  submitBtnActive: {
    background: '#3ea6ff',
    border: 'none',
    color: '#0f0f0f',
    padding: '8px 16px',
    borderRadius: '18px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  commentItem: {
    display: 'flex',
    gap: '16px'
  },
  commentContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  username: {
    fontWeight: '600',
    fontSize: '0.9rem',
    color: 'var(--text-main)'
  },
  timestamp: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)'
  },
  text: {
    fontSize: '0.95rem',
    lineHeight: '1.4',
    color: 'var(--text-main)',
    marginTop: '2px'
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '8px'
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  actionBtnText: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-main)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  langSelect: {
    padding: '6px 12px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
    outline: 'none',
    cursor: 'pointer'
  },
  locationContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '12px',
    fontSize: '0.85rem',
    color: 'var(--text-muted)'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer'
  },
  locationInput: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-main)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.85rem',
    outline: 'none'
  },
  locationBadge: {
    fontSize: '0.75rem',
    color: '#3ea6ff',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(62, 166, 255, 0.1)',
    padding: '2px 6px',
    borderRadius: '4px'
  }
};

export default Comments;
