import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { FiClock, FiVideo, FiSun, FiMoon, FiUsers, FiExternalLink } from 'react-icons/fi';

const Profile = () => {
  const { user, login, verifyOtp, updateTheme } = useUser();
  const navigate = useNavigate();

  const [emailInput, setEmailInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [stateInput, setStateInput] = useState('');
  const [deviceInput, setDeviceInput] = useState('');
  const [planInput, setPlanInput] = useState('free');
  const [otpInput, setOtpInput] = useState('');
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetch(`http://localhost:3001/api/profile/${user.id}`)
        .then(res => res.json())
        .then(data => {
          setProfileData(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    const res = await login(emailInput, cityInput, stateInput, deviceInput, planInput);
    if (res.requiresOtp) {
      setRequiresOtp(true);
      setPendingUserId(res.userId);
    } else if (!res.success) {
      alert(res.error);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    const res = await verifyOtp(pendingUserId, otpInput);
    if (!res.success) {
      alert(res.error);
    } else {
      setRequiresOtp(false);
      setPendingUserId(null);
    }
  };

  if (!user) {
    if (requiresOtp) {
      return (
        <div style={styles.container} className="animate-fade-in">
          <div className="glass-panel" style={styles.loginCard}>
            <h2>Enter OTP</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
              We've detected a new device or location. Please check server logs/email for the OTP.
            </p>
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="6-digit OTP"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">Verify OTP</button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.container} className="animate-fade-in">
        <div className="glass-panel" style={styles.loginCard}>
          <h2>Sign In / Channel Login</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
            Simulate login by typing your email ID. New user channels will be created automatically.
          </p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="email"
              className="input-field"
              placeholder="Email ID"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />
            <input
              type="text"
              className="input-field"
              placeholder="City (Optional for OTP demo)"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
            />
            <input
              type="text"
              className="input-field"
              placeholder="State (Optional for OTP demo)"
              value={stateInput}
              onChange={(e) => setStateInput(e.target.value)}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Device (Optional for OTP demo)"
              value={deviceInput}
              onChange={(e) => setDeviceInput(e.target.value)}
            />
            <select
              className="input-field"
              value={planInput}
              onChange={(e) => setPlanInput(e.target.value)}
              style={{ backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', outline: 'none' }}
            >
              <option value="free">Free Plan (1 download/day)</option>
              <option value="bronze">Bronze Premium (3 downloads/day)</option>
              <option value="silver">Silver Premium (10 downloads/day)</option>
              <option value="gold">Gold Premium (Unlimited downloads)</option>
            </select>
            <button type="submit" className="btn btn-primary">Login / Register</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Profile Header */}
      <div style={styles.profileHeader} className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img 
            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
            alt={user.name} 
            style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>{user.name || user.username}</h2>
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={styles.badge}>{user.plan?.toUpperCase()} PLAN</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                @{user.username}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => navigate(`/channel/${user.name || user.username}`)}
            className="btn btn-primary"
            style={{ borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Your Channel <FiExternalLink size={14} />
          </button>
        </div>
      </div>
      
      {/* Theme Preference Card */}
      <div style={{ marginTop: '20px', padding: '16px 20px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--text-main)' }}>Theme Preference</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>Toggle between light and dark mode</div>
          </div>
          <button onClick={() => updateTheme(user.theme === 'light' ? 'dark' : 'light')} className="btn-icon">
            {user.theme === 'light' ? <FiMoon size={20} /> : <FiSun size={20} />}
          </button>
        </div>
      </div>

      {/* Subscriptions Section */}
      <h3 style={{ margin: '32px 0 16px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FiUsers size={18} /> Subscriptions ({user.subscriptions?.length || 0})
      </h3>

      {user.subscriptions && user.subscriptions.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '32px' }}>
          {user.subscriptions.map((chName, idx) => (
            <div 
              key={idx}
              className="glass-panel"
              style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px', cursor: 'pointer' }}
              onClick={() => navigate(`/channel/${chName}`)}
            >
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chName}`} 
                alt={chName} 
                style={{ width: '36px', height: '36px', borderRadius: '50%' }}
              />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {chName}
                </div>
                <div style={{ color: '#60a5fa', fontSize: '0.75rem' }}>
                  Subscribed
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px', borderRadius: '12px' }}>
          You haven't subscribed to any channels yet.
        </div>
      )}

      {/* Downloads History */}
      <h3 style={{ margin: '32px 0 16px 0', color: 'var(--text-main)' }}>Downloads History</h3>
      
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading downloads...</p>
      ) : profileData?.downloads?.length > 0 ? (
        <div style={styles.downloadsList}>
          {profileData.downloads.map((dl) => (
            <div key={dl.id} className="glass-panel" style={styles.downloadItem}>
              <div style={styles.dlInfo}>
                <FiVideo size={20} color="var(--accent-color)" />
                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{dl.title}</span>
              </div>
              <div style={styles.dlMeta}>
                <FiClock size={14} />
                <span>{new Date(dl.date).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '12px' }}>
          No downloads yet. Head to the library to get started!
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '0 24px 40px 24px',
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%'
  },
  loginCard: {
    padding: '32px',
    maxWidth: '420px',
    margin: '10vh auto',
    borderRadius: '16px'
  },
  profileHeader: {
    padding: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: '16px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  badge: {
    backgroundColor: 'var(--accent-color)',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600'
  },
  downloadsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  downloadItem: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '12px'
  },
  dlInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '1.05rem'
  },
  dlMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-muted)',
    fontSize: '0.85rem'
  }
};

export default Profile;
