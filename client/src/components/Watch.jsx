import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CustomVideoPlayer from './CustomVideoPlayer';
import PlaylistModal from './PlaylistModal';
import { FiThumbsUp, FiThumbsDown, FiShare2, FiDownload, FiUsers, FiFlag, FiFolderPlus, FiBell, FiUserCheck, FiUserPlus } from 'react-icons/fi';
import { useUser } from '../context/UserContext';
import io from 'socket.io-client';
import Comments from './Comments';

const REPORT_REASONS = [
  'Spam, Scams or Commercial Solicitation',
  'Violent or Dangerous Content',
  'Hate Speech & Harassment',
  'Misleading Metadata or Thumbnail',
  'Copyright Infringement',
  'Sexually Explicit Content',
  'Harmful Dangerous Acts',
  'Child Safety Concerns',
  'Other Policy Violation'
];

const Watch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, toggleSubscribe } = useUser();
  
  const [video, setVideo] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  // Report Modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);

  // Fetch video and increment view
  useEffect(() => {
    const fetchVideoAndRecordView = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        
        // 1. Fetch video
        const res = await fetch(`${API_URL}/api/videos/${id}`);
        if (res.ok) {
          const data = await res.json();
          setVideo(data);
          setSubscribersCount(data.subscribersCount || 0);

          // Check if current user is subscribed
          if (user && user.subscriptions) {
            setIsSubscribed(user.subscriptions.some(s => s.toLowerCase() === data.channel.toLowerCase()));
          }

          // 2. Increment view count
          fetch(`${API_URL}/api/videos/${id}/view`, { method: 'POST' }).then(r => r.json()).then(vData => {
            if (vData.views) {
              setVideo(prev => prev ? ({ ...prev, views: vData.views, viewsCount: vData.viewsCount }) : prev);
            }
          }).catch(console.error);
        } else {
          navigate('/');
        }

        // 3. Fetch related videos
        const allRes = await fetch(`${API_URL}/api/videos`);
        if (allRes.ok) {
          const allData = await allRes.json();
          setRelatedVideos(allData.filter(v => v.id !== id));
        }
      } catch (error) {
        console.error('Failed to fetch video:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideoAndRecordView();
  }, [id, navigate, user]);

  // Real-Time Socket.IO listeners
  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('subscriber-updated', (data) => {
      if (video && (data.channelName?.toLowerCase() === video.channel?.toLowerCase())) {
        setSubscribersCount(data.subscribersCount);
        if (user && data.subscriber?.userId === user.id) {
          setIsSubscribed(data.action === 'subscribed');
        }
      }
    });

    socket.on('video-view-updated', (data) => {
      if (video && data.videoId === video.id) {
        setVideo(prev => prev ? ({ ...prev, views: data.views, viewsCount: data.viewsCount }) : prev);
      }
    });

    return () => socket.disconnect();
  }, [video, user]);

  const handleSubscribe = async () => {
    if (!user) {
      alert('Please log in from the top right to subscribe to this channel.');
      return;
    }
    setSubscribing(true);
    const res = await toggleSubscribe(video.channel);
    setSubscribing(false);
    if (res.success) {
      setIsSubscribed(res.isSubscribed);
      setSubscribersCount(res.subscribersCount);
    } else {
      alert(res.error || 'Failed to update subscription');
    }
  };

  const handleDownload = async () => {
    if (!user) {
      alert('Please log in to download videos.');
      return;
    }
    
    setDownloading(true);
    try {
      const response = await fetch('http://localhost:3001/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          videoId: video.id
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Download started! URL: ' + data.url);
      } else {
        alert(data.error || 'Failed to download');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('An error occurred during download.');
    } finally {
      setDownloading(false);
    }
  };

  const startWatchParty = () => {
    navigate(`/party?v=${video.id}`);
  };

  const handleReportVideo = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to submit a report.');
      return;
    }

    setReporting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: user.id,
          reporterName: user.name || user.username,
          targetType: 'video',
          targetId: video.id,
          targetTitle: video.title,
          targetThumbnail: video.thumbnail,
          targetChannel: video.channel,
          reason: reportReason,
          details: reportDetails
        })
      });

      if (res.ok) {
        setShowReportModal(false);
        setReportDetails('');
        alert('Thank you. Your report has been submitted to Trust & Safety and logged in your Report History.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit report');
      }
    } catch (err) {
      console.error('Report error:', err);
      alert('Failed to submit report.');
    } finally {
      setReporting(false);
    }
  };

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div className="live-dot" style={{ width: '16px', height: '16px', margin: '0 auto 12px' }} />
      Loading video...
    </div>
  );

  if (!video) return null;

  return (
    <div style={styles.container}>
      <div style={styles.mainContent}>
        <div style={styles.playerContainer}>
          <CustomVideoPlayer 
            src={video.url} 
            poster={video.thumbnail}
            onNextVideo={() => console.log('Play next video')}
          />
        </div>
        
        <h1 style={styles.title}>{video.title}</h1>
        
        <div style={styles.metadataRow}>
          <div style={styles.channelInfo}>
            <img 
              src={video.channel_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.channel}`} 
              alt={video.channel} 
              style={styles.avatar} 
              onClick={() => navigate(`/channel/${video.channel}`)}
            />
            <div style={styles.channelText}>
              <span 
                style={styles.channelName}
                onClick={() => navigate(`/channel/${video.channel}`)}
              >
                {video.channel}
              </span>
              <span style={styles.subscribers}>
                <span className="live-dot" style={{ display: 'inline-block', width: '6px', height: '6px', marginRight: '5px' }} />
                {subscribersCount} {subscribersCount === 1 ? 'subscriber' : 'subscribers'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={handleSubscribe} 
                disabled={subscribing}
                className={isSubscribed ? 'btn-subscribed' : 'btn-subscribe'}
                style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {subscribing ? '...' : isSubscribed ? <><FiUserCheck size={16}/> Subscribed</> : <><FiUserPlus size={16}/> Subscribe</>}
              </button>
              {isSubscribed && (
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
                  onClick={() => alert('Notifications set to All')}
                >
                  <FiBell size={18} />
                </button>
              )}
            </div>
          </div>
          
          <div style={styles.actions}>
            <div style={styles.actionGroup}>
              <button style={styles.actionBtnLeft}><FiThumbsUp /> 1.2K</button>
              <div style={styles.actionDivider} />
              <button style={styles.actionBtnRight}><FiThumbsDown /></button>
            </div>
            
            <button style={styles.actionBtn} onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Video link copied to clipboard!');
            }}>
              <FiShare2 /> Share
            </button>
            
            <button style={styles.actionBtn} onClick={handleDownload} disabled={downloading}>
              <FiDownload /> {downloading ? 'Downloading...' : 'Download'}
            </button>

            <button style={styles.actionBtn} onClick={() => setShowPlaylistModal(true)}>
              <FiFolderPlus /> Save
            </button>
            
            <button style={styles.actionBtn} onClick={startWatchParty}>
              <FiUsers /> Watch Party
            </button>

            <button style={styles.actionBtn} onClick={() => setShowReportModal(true)} title="Report this video">
              <FiFlag /> Report
            </button>
          </div>
        </div>
        
        <div style={styles.descriptionBox}>
          <p style={styles.viewsAndDate}>{video.views} • {video.timestamp || 'Uploaded recently'}</p>
          <p style={styles.description}>{video.description}</p>
        </div>
        
        <Comments videoId={video.id} />
      </div>

      <PlaylistModal 
        isOpen={showPlaylistModal} 
        onClose={() => setShowPlaylistModal(false)} 
        videoId={video.id} 
      />

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content report-modal-box animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <div className="report-modal-title-row">
                <div className="modal-flag-icon"><FiFlag size={20} color="#ef4444" /></div>
                <h3>Report "{video.title}"</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowReportModal(false)}>✕</button>
            </div>

            <form onSubmit={handleReportVideo} className="report-modal-form">
              <div className="form-group">
                <label>Why are you reporting this video?</label>
                <select 
                  className="input-field"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  {REPORT_REASONS.map((r, idx) => (
                    <option key={idx} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Provide additional details or timestamps (Optional)</label>
                <textarea 
                  rows={3}
                  placeholder="Explain why this content violates community standards..."
                  className="input-field"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                />
              </div>

              <div className="modal-actions-row">
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-submit-report"
                  disabled={reporting}
                >
                  {reporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Related Videos Sidebar */}
      <div style={styles.sidebar}>
        <h3 style={styles.relatedTitle}>Up Next</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {relatedVideos.map((rVid) => (
            <div 
              key={rVid.id}
              style={{ display: 'flex', gap: '10px', cursor: 'pointer' }}
              onClick={() => navigate(`/watch/${rVid.id}`)}
            >
              <img 
                src={rVid.thumbnail} 
                alt={rVid.title} 
                style={{ width: '140px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {rVid.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {rVid.channel}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {rVid.views}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    padding: '24px',
    gap: '24px',
    maxWidth: '1800px',
    margin: '0 auto'
  },
  mainContent: {
    flex: 1,
    minWidth: 0
  },
  playerContainer: {
    width: '100%',
    aspectRatio: '16/9',
    backgroundColor: 'black',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '16px'
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginBottom: '12px'
  },
  metadataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '20px'
  },
  channelInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    objectFit: 'cover',
    cursor: 'pointer'
  },
  channelText: {
    display: 'flex',
    flexDirection: 'column'
  },
  channelName: {
    fontWeight: '600',
    color: 'var(--text-main)',
    fontSize: '1rem',
    cursor: 'pointer'
  },
  subscribers: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  actionGroup: {
    display: 'flex',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '18px',
    overflow: 'hidden'
  },
  actionBtnLeft: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-main)',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  actionBtnRight: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-main)',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer'
  },
  actionDivider: {
    width: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    margin: '8px 0'
  },
  actionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '18px',
    color: 'var(--text-main)',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  descriptionBox: {
    backgroundColor: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '16px'
  },
  viewsAndDate: {
    fontWeight: '600',
    fontSize: '0.9rem',
    marginBottom: '6px',
    color: 'var(--text-main)'
  },
  description: {
    fontSize: '0.9rem',
    lineHeight: '1.4',
    color: 'var(--text-main)',
    whiteSpace: 'pre-wrap'
  },
  sidebar: {
    width: '380px',
    display: 'flex',
    flexDirection: 'column'
  },
  relatedTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '16px',
    color: 'var(--text-main)'
  }
};

export default Watch;
