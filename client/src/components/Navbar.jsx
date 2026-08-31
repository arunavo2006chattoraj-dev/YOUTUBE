import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { FiMenu, FiSearch, FiMic, FiVideo, FiBell, FiUser, FiLogOut, FiMoon, FiSun, FiTrendingUp, FiSettings, FiHelpCircle, FiGlobe, FiShield, FiDollarSign, FiPlayCircle, FiType, FiChevronRight } from 'react-icons/fi';
import { FaYoutube, FaGoogle } from 'react-icons/fa';

const POPULAR_SUGGESTIONS = [
  'Blender Foundation',
  'Animation',
  'Google Developers',
  'Open Movie CGI',
  'Big Buck Bunny',
  '4K Short Films',
  'Mango Open Movie'
];

const Navbar = ({ toggleSidebar, isWatchPage }) => {
  const { user, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const searchRef = useRef(null);
  const profileRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(suggestion)}`);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav style={styles.nav}>
      <div style={styles.leftSection}>
        {!isWatchPage && (
          <button className="btn-icon" style={styles.menuButton} onClick={toggleSidebar}>
            <FiMenu size={20} />
          </button>
        )}
        <Link to="/" style={styles.logoLink}>
          <FaYoutube size={28} color="#FF0000" />
          <span style={styles.logoText}>YouTube</span>
        </Link>
      </div>

      {/* Search Bar & Auto-Suggestions */}
      <div style={styles.centerSection} ref={searchRef} className="yt-nav-center">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', width: '100%', position: 'relative' }}>
          <div style={styles.searchContainer}>
            <input 
              type="text" 
              placeholder="Search videos, creators, channels..." 
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm('')} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 8px' }}
              >
                ✕
              </button>
            )}
            <button type="submit" style={styles.searchButton} title="Search">
              <FiSearch size={18} color="var(--text-main)" />
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div className="search-dropdown-menu">
              <div style={{ padding: '6px 16px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Popular Searches
              </div>
              {POPULAR_SUGGESTIONS
                .filter(s => !searchTerm || s.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((item, idx) => (
                  <div 
                    key={idx} 
                    className="search-dropdown-item"
                    onMouseDown={() => handleSelectSuggestion(item)}
                  >
                    <FiTrendingUp size={14} color="var(--text-muted)" />
                    <span>{item}</span>
                  </div>
                ))}
            </div>
          )}
        </form>

        <button className="btn-icon" style={styles.micButton} title="Search with voice">
          <FiMic size={18} />
        </button>
      </div>

      <div style={styles.rightSection} className="yt-nav-right">
        <button className="btn-icon mobile-search-btn" onClick={() => navigate('/search')} title="Search">
          <FiSearch size={20} />
        </button>
        <button className="btn-icon" style={styles.actionButton} onClick={toggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
        </button>

        {user ? (
          <>
            <button 
              className="btn-icon desktop-only-btn" 
              style={styles.actionButton} 
              onClick={() => navigate('/your-videos')}
              title="Creator Studio & Upload"
            >
              <FiVideo size={20} />
            </button>
            <button className="btn-icon" style={styles.actionButton} title="Notifications">
              <FiBell size={20} />
            </button>
            
            {/* User Profile Dropdown */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={profileRef}>
              <div 
                style={{...styles.profileLink, cursor: 'pointer', marginLeft: '12px'}} 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <img 
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                  alt={user.name} 
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
              </div>

              {showProfileMenu && (
                <div className="profile-dropdown-menu">
                  <div className="profile-dropdown-header">
                    <img 
                      src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                      alt={user.name} 
                    />
                    <div className="profile-dropdown-info">
                      <span className="profile-dropdown-name">{user.name}</span>
                      <span className="profile-dropdown-handle">@{user.username || user.name.toLowerCase().replace(/\s+/g, '')}</span>
                      <Link to={`/channel/${user.username || user.name}`} className="profile-dropdown-link" onClick={() => setShowProfileMenu(false)}>
                        View your channel
                      </Link>
                    </div>
                  </div>

                  <div className="profile-dropdown-section">
                    <div className="profile-dropdown-item">
                      <FaGoogle size={20} />
                      <span className="profile-dropdown-item-text">Google Account</span>
                    </div>
                    <div className="profile-dropdown-item">
                      <FiUser size={20} />
                      <span className="profile-dropdown-item-text">Switch account</span>
                      <FiChevronRight size={18} className="profile-dropdown-item-chevron" />
                    </div>
                    <div className="profile-dropdown-item" onClick={() => { setShowProfileMenu(false); handleLogout(); }}>
                      <FiLogOut size={20} />
                      <span className="profile-dropdown-item-text">Sign out</span>
                    </div>
                  </div>

                  <div className="profile-dropdown-section">
                    <Link to="/your-videos" className="profile-dropdown-item" onClick={() => setShowProfileMenu(false)}>
                      <FiPlayCircle size={20} />
                      <span className="profile-dropdown-item-text">YouTube Studio</span>
                    </Link>
                    <Link to="/pricing" className="profile-dropdown-item" onClick={() => setShowProfileMenu(false)}>
                      <FiDollarSign size={20} />
                      <span className="profile-dropdown-item-text">Purchases and memberships</span>
                    </Link>
                  </div>

                  <div className="profile-dropdown-section">
                    <div className="profile-dropdown-item">
                      <FiShield size={20} />
                      <span className="profile-dropdown-item-text">Your data in YouTube</span>
                    </div>
                    <div className="profile-dropdown-item" onClick={() => { toggleTheme(); setShowProfileMenu(false); }}>
                      {theme === 'dark' ? <FiMoon size={20} /> : <FiSun size={20} />}
                      <span className="profile-dropdown-item-text">Appearance: {theme === 'dark' ? 'Dark' : 'Light'} theme</span>
                      <FiChevronRight size={18} className="profile-dropdown-item-chevron" />
                    </div>
                    <div className="profile-dropdown-item">
                      <FiType size={20} />
                      <span className="profile-dropdown-item-text">Display language: English</span>
                      <FiChevronRight size={18} className="profile-dropdown-item-chevron" />
                    </div>
                    <div className="profile-dropdown-item">
                      <FiShield size={20} />
                      <span className="profile-dropdown-item-text">Restricted Mode: Off</span>
                      <FiChevronRight size={18} className="profile-dropdown-item-chevron" />
                    </div>
                    <div className="profile-dropdown-item">
                      <FiGlobe size={20} />
                      <span className="profile-dropdown-item-text">Location: India</span>
                      <FiChevronRight size={18} className="profile-dropdown-item-chevron" />
                    </div>
                  </div>

                  <div className="profile-dropdown-section">
                    <div className="profile-dropdown-item">
                      <FiSettings size={20} />
                      <span className="profile-dropdown-item-text">Settings</span>
                    </div>
                  </div>

                  <div className="profile-dropdown-section">
                    <div className="profile-dropdown-item">
                      <FiHelpCircle size={20} />
                      <span className="profile-dropdown-item-text">Help</span>
                    </div>
                    <div className="profile-dropdown-item">
                      <FiHelpCircle size={20} />
                      <span className="profile-dropdown-item-text">Send feedback</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link to="/profile" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '18px' }}>
            <FiUser /> Sign in
          </Link>
        )}
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: 'var(--bg-dark)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: '1px solid var(--border-color)'
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  menuButton: {
    background: 'transparent',
    border: 'none',
    width: '40px',
    height: '40px'
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    textDecoration: 'none'
  },
  logoText: {
    fontWeight: '700',
    fontSize: '1.25rem',
    color: 'var(--text-main)',
    letterSpacing: '-0.5px'
  },
  centerSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    maxWidth: '640px',
    margin: '0 40px',
    position: 'relative'
  },
  searchContainer: {
    display: 'flex',
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'var(--bg-dark)',
    border: '1px solid var(--border-color)',
    borderRadius: '40px',
    overflow: 'hidden',
    transition: 'border-color 0.2s',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
  },
  searchInput: {
    flex: 1,
    padding: '10px 18px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-main)',
    fontSize: '0.95rem',
    outline: 'none'
  },
  searchButton: {
    padding: '10px 20px',
    backgroundColor: 'var(--glass-bg)',
    border: 'none',
    borderLeft: '1px solid var(--border-color)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  micButton: {
    background: 'var(--glass-bg)',
    border: 'none',
    width: '40px',
    height: '40px',
    borderRadius: '50%'
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  actionButton: {
    background: 'transparent',
    border: 'none',
    width: '40px',
    height: '40px'
  },
  profileLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-main)',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.9rem',
    marginLeft: '8px'
  },
  badge: {
    backgroundColor: 'var(--accent-color)',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.7rem',
    textTransform: 'uppercase'
  }
};

export default Navbar;
