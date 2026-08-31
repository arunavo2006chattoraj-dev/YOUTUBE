import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import io from 'socket.io-client';
import { FiChevronDown } from 'react-icons/fi';

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

const ReportHistory = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all'); 
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('video');
  const [modalTargetId, setModalTargetId] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalChannel, setModalChannel] = useState('');
  const [modalReason, setModalReason] = useState(REPORT_REASONS[0]);
  const [modalDetails, setModalDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'https://youtube-uz4d.onrender.com';

  const fetchReports = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/users/${user.id}/reports?type=${typeFilter}&status=all`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to load report history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user, typeFilter]);

  useEffect(() => {
    const socket = io(API_URL);
    socket.on('new-report-filed', () => {
      fetchReports();
    });
    return () => socket.disconnect();
  }, []);

  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to submit a report.');
      return;
    }
    if (!modalTargetId.trim()) {
      alert('Please provide the Target ID or Title of the item you wish to report.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: user.id,
          reporterName: user.name || user.username,
          targetType: modalType,
          targetId: modalTargetId,
          targetTitle: modalTitle || modalTargetId,
          targetChannel: modalChannel || 'Unknown Creator',
          reason: modalReason,
          details: modalDetails
        })
      });
      if (res.ok) {
        setShowModal(false);
        setModalTargetId('');
        setModalTitle('');
        setModalChannel('');
        setModalDetails('');
        fetchReports();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit report.');
      }
    } catch (err) {
      console.error('Submit report error:', err);
      alert('An error occurred submitting the report.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="rh-container">
        <h2 style={{color: 'white', padding: '20px'}}>Please log in to view your report history.</h2>
      </div>
    );
  }

  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="rh-container">
      <div className="rh-header-section">
        <div className="rh-header-text">
          <h1 className="rh-title">Thanks for reporting</h1>
          <p className="rh-desc">
            Any member of the YouTube community can flag content to us that they believe violates our Community Guidelines. When something is flagged, it's not automatically taken down. Flagged content is reviewed in line with the following guidelines:
          </p>
          <ul className="rh-list">
            <li>Content that violates our <a href="#" className="rh-link">Community Guidelines</a> is removed from YouTube.</li>
            <li>Content that may not be appropriate for all younger audiences may be age-restricted.</li>
            <li>Reports filed for content that has been deleted by the creator cannot be shown.</li>
          </ul>
          <a href="#" className="rh-link">Learn more about reporting content on YouTube.</a>
        </div>
        <div className="rh-header-image">
          <svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 120 C 30 70, 70 50, 160 50 L 170 120 Z" fill="#2563EB"/>
            <path d="M20 120 C 50 80, 100 80, 160 60 L 170 120 Z" fill="#3B82F6"/>
            <path d="M25 110 L165 110" stroke="#EF4444" strokeWidth="6" strokeLinecap="round"/>
            <circle cx="90" cy="110" r="5" fill="#FFFFFF"/>
            
            <circle cx="150" cy="40" r="35" fill="#9333EA" fillOpacity="0.8" stroke="#A855F7" strokeWidth="4"/>
            <circle cx="150" cy="40" r="25" fill="#4ADE80" />
            <circle cx="140" cy="30" r="6" fill="#FFFFFF"/>
            <circle cx="155" cy="50" r="3" fill="#FFFFFF"/>
            <path d="M175 65 L190 90" stroke="#9333EA" strokeWidth="12" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <div className="rh-divider"></div>

      <div className="rh-controls">
        <div className="rh-dropdown-container">
          <button 
            className="rh-dropdown-btn" 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            {capitalize(typeFilter)} <FiChevronDown size={20} />
          </button>
          {showFilterDropdown && (
            <div className="rh-dropdown-menu">
              <div className="rh-dropdown-item" onClick={() => { setTypeFilter('all'); setShowFilterDropdown(false); }}>All</div>
              <div className="rh-dropdown-item" onClick={() => { setTypeFilter('video'); setShowFilterDropdown(false); }}>Video</div>
              <div className="rh-dropdown-item" onClick={() => { setTypeFilter('comment'); setShowFilterDropdown(false); }}>Comment</div>
              <div className="rh-dropdown-item" onClick={() => { setTypeFilter('channel'); setShowFilterDropdown(false); }}>Channel</div>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => setShowModal(true)} 
          style={{ background: 'transparent', border: '1px solid #3f3f3f', color: '#aaaaaa', padding: '6px 12px', borderRadius: '18px', cursor: 'pointer', fontSize: '14px' }}
        >
          File New Report
        </button>
      </div>

      <div className="rh-table-container">
        <div className="rh-table-header">
          <div className="rh-col-type">Type</div>
          <div className="rh-col-content">Content</div>
          <div className="rh-col-reason">Reporting reason</div>
          <div className="rh-col-status">Status</div>
        </div>

        {loading ? (
          <div style={{ padding: '20px', color: '#aaaaaa' }}>Loading...</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '20px', color: '#aaaaaa' }}>No reports found.</div>
        ) : (
          <div className="rh-table-body">
            {reports.map((report) => (
              <div className="rh-table-row" key={report.id}>
                <div className="rh-col-type">
                  {capitalize(report.targetType)}
                </div>
                <div className="rh-col-content">
                  {report.targetTitle || 'Unknown Content'}
                </div>
                <div className="rh-col-reason">
                  {report.reason}
                </div>
                <div className="rh-col-status">
                  {report.status || 'Under review'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content report-modal-box" onClick={(e) => e.stopPropagation()} style={{ background: '#212121', padding: '24px', borderRadius: '12px', width: '500px', maxWidth: '90%' }}>
            <div className="report-modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ color: 'white', margin: 0 }}>Submit a Community Guideline Report</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <form onSubmit={handleCreateReport} className="report-modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#aaa', fontSize: '14px' }}>What are you reporting?</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setModalType('video')} style={{ flex: 1, padding: '10px', background: modalType === 'video' ? '#3ea6ff' : '#333', color: modalType === 'video' ? '#000' : '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Video</button>
                  <button type="button" onClick={() => setModalType('comment')} style={{ flex: 1, padding: '10px', background: modalType === 'comment' ? '#3ea6ff' : '#333', color: modalType === 'comment' ? '#000' : '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Comment</button>
                  <button type="button" onClick={() => setModalType('channel')} style={{ flex: 1, padding: '10px', background: modalType === 'channel' ? '#3ea6ff' : '#333', color: modalType === 'channel' ? '#000' : '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Channel</button>
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#aaa', fontSize: '14px' }}>Target ID / URL *</label>
                <input type="text" value={modalTargetId} onChange={(e) => setModalTargetId(e.target.value)} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#121212', color: 'white' }} />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#aaa', fontSize: '14px' }}>Violation Reason *</label>
                <select value={modalReason} onChange={(e) => setModalReason(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#121212', color: 'white' }}>
                  {REPORT_REASONS.map((reason, idx) => (
                    <option key={idx} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: '#333', color: 'white', border: 'none', borderRadius: '18px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '10px', background: '#3ea6ff', color: '#0f0f0f', border: 'none', borderRadius: '18px', cursor: 'pointer', fontWeight: 'bold' }}>{submitting ? 'Submitting...' : 'Submit Report'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportHistory;
