import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { FiHome, FiVideo, FiMonitor, FiClock, FiThumbsUp, FiFilm, FiPlayCircle, FiUsers, FiStar, FiGlobe, FiFlag, FiTrendingUp, FiMusic, FiRadio, FiCrosshair, FiFileText, FiAward, FiBookOpen, FiCoffee, FiChevronDown, FiChevronUp, FiChevronRight, FiUser, FiDownload, FiList, FiShoppingBag, FiFeather, FiMic, FiGrid } from 'react-icons/fi';

const Sidebar = ({ collapsed }) => {
  const location = useLocation();
  const { user } = useUser();
  const [showAllSubs, setShowAllSubs] = useState(false);

  const navItems = [
    { name: 'Home', icon: <FiHome size={20} />, path: '/' },
    { name: 'Shorts', icon: <FiPlayCircle size={20} />, path: '/shorts' },
    { name: 'Community', icon: <FiFileText size={20} color="#a855f7" />, path: '/community' },
    { name: 'Global Featured', icon: <FiGlobe size={20} color="#38bdf8" />, path: '/featured' },
    { name: 'Subscriptions', icon: <FiUsers size={20} color="#ec4899" />, path: '/subscriptions' },
    { name: 'Explore Search', icon: <FiVideo size={20} />, path: '/search' },
    { divider: true },
    { youHeading: true },
    { name: 'Your channel', icon: <FiUser size={20} />, path: user ? `/channel/${user.username || user.name}` : '/profile' },
    { name: 'History', icon: <FiClock size={20} />, path: '/history' },
    { name: 'Playlists', icon: <FiList size={20} />, path: '/playlists' },
    { name: 'Watch Later', icon: <FiClock size={20} />, path: '/watch-later' },
    { name: 'Liked videos', icon: <FiThumbsUp size={20} />, path: '/liked-videos' },
    { name: 'Your videos', icon: <FiPlayCircle size={20} />, path: '/your-videos' },
    { name: 'Downloads', icon: <FiDownload size={20} />, path: '/downloads' },
    { name: 'Watch Party', icon: <FiUsers size={20} />, path: '/party' },
    { divider: true },
    { heading: 'Explore' },
    { name: 'Shopping', icon: <FiShoppingBag size={20} />, path: '/explore/shopping' },
    { name: 'Music', icon: <FiMusic size={20} />, path: '/explore/music' },
    { name: 'Movies & TV', icon: <FiFilm size={20} />, path: '/explore/movies' },
    { name: 'Live', icon: <FiRadio size={20} />, path: '/explore/live' },
    { name: 'Gaming', icon: <FiCrosshair size={20} />, path: '/explore/gaming' },
    { name: 'News', icon: <FiFileText size={20} />, path: '/explore/news' },
    { name: 'Sport', icon: <FiAward size={20} />, path: '/explore/sport' },
    { name: 'Courses', icon: <FiBookOpen size={20} />, path: '/explore/courses' },
    { name: 'Fashion & beauty', icon: <FiFeather size={20} />, path: '/explore/fashion' },
    { name: 'Podcasts', icon: <FiMic size={20} />, path: '/explore/podcasts' },
    { name: 'Playables', icon: <FiGrid size={20} />, path: '/explore/playables' },
    { name: 'Memberships', icon: <FiStar size={20} />, path: '/explore/memberships' },
    { divider: true },
    { name: 'Report history', icon: <FiFlag size={20} />, path: '/report-history' },
  ];

  const miniNavItems = [
    { name: 'Home', icon: <FiHome size={24} />, path: '/' },
    { name: 'Shorts', icon: <FiPlayCircle size={24} />, path: '/shorts' },
    { name: 'Community', icon: <FiFileText size={24} />, path: '/community' },
    { name: 'Subscriptions', icon: <FiUsers size={24} />, path: '/subscriptions' },
    { name: 'Party', icon: <FiUsers size={24} />, path: '/party' },
    { name: 'You', icon: <FiUser size={24} />, path: user ? `/channel/${user.username || user.name}` : '/profile' },
  ];

  return (
    <aside className={`yt-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div style={styles.menuList}>
        {collapsed ? (
          miniNavItems.map((item, index) => {
            const isActive = location.pathname === item.path || (item.name === 'You' && location.pathname.includes('/channel/'));
            
            return (
              <Link 
                key={index}
                to={item.path}
                style={{
                  ...styles.menuItem,
                  ...(isActive ? styles.menuItemActive : {}),
                  justifyContent: 'center',
                  flexDirection: 'column',
                  padding: '16px 0',
                  gap: '6px',
                  borderRadius: '10px'
                }}
              >
                <div style={styles.iconContainer}>{item.icon}</div>
                <span style={{ 
                  ...styles.menuText, 
                  fontSize: '0.65rem',
                  fontWeight: isActive ? '500' : '400',
                }}>
                  {item.name}
                </span>
              </Link>
            );
          })
        ) : (
          navItems.map((item, index) => {
            if (item.divider) {
              return <div key={index} style={styles.divider} />;
            }

            if (item.heading) {
              return (
                <div key={index} style={{ padding: '8px 12px 6px 12px', fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '8px' }}>
                  {item.heading}
                </div>
              );
            }

            if (item.youHeading) {
              return (
                <Link key={index} to={user ? `/channel/${user.username || user.name}` : '/profile'} style={{ 
                  padding: '8px 12px 6px 12px', 
                  fontSize: '1rem', 
                  fontWeight: 'bold', 
                  color: 'var(--text-main)', 
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none'
                }}>
                  You <FiChevronRight size={18} />
                </Link>
              );
            }

            const isActive = location.pathname === item.path;

            return (
              <Link 
                key={index} 
                to={item.path} 
                style={{
                  ...styles.menuItem,
                  ...(isActive ? styles.menuItemActive : {}),
                  justifyContent: 'flex-start',
                  flexDirection: 'row',
                  padding: '10px 12px',
                  gap: '20px'
                }}
              >
                <div style={styles.iconContainer}>{item.icon}</div>
                <span style={{ 
                  ...styles.menuText, 
                  fontSize: '0.9rem',
                  fontWeight: isActive ? '500' : '400',
                  display: 'block'
                }}>
                  {item.name}
                </span>
              </Link>
            );
          })
        )}

        {/* Subscribed Channels in Sidebar */}
        {!collapsed && user && user.subscriptions && user.subscriptions.length > 0 && (
          <>
            <div style={styles.divider} />
            <Link 
              to="/subscriptions" 
              style={{ 
                padding: '8px 12px 6px 12px', 
                fontSize: '1rem', 
                fontWeight: 'bold', 
                color: 'var(--text-main)', 
                textDecoration: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginTop: '4px',
                marginBottom: '4px'
              }}
            >
              Subscriptions <FiChevronRight size={18} />
            </Link>
            {(showAllSubs ? user.subscriptions : user.subscriptions.slice(0, 7)).map((chName, idx) => (
              <Link 
                key={idx}
                to={`/channel/${chName}`}
                style={{
                  ...styles.menuItem,
                  ...(location.pathname === `/channel/${chName}` ? styles.menuItemActive : {}),
                  gap: '12px'
                }}
              >
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chName}`}
                  alt={chName}
                  style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                />
                <span style={{ ...styles.menuText, fontSize: '0.85rem' }}>
                  {chName}
                </span>
              </Link>
            ))}
            {user.subscriptions.length > 7 && (
              <button 
                onClick={() => setShowAllSubs(!showAllSubs)}
                style={{ 
                  ...styles.menuItem, 
                  border: 'none', 
                  background: 'transparent', 
                  cursor: 'pointer', 
                  width: '100%', 
                  textAlign: 'left', 
                  gap: '12px',
                  padding: '10px 12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '24px' }}>
                  {showAllSubs ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                </div>
                <span style={{ ...styles.menuText, fontSize: '0.85rem', fontWeight: '500' }}>
                  {showAllSubs ? 'Show less' : 'Show more'}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

const styles = {
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0 12px'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: '10px',
    color: 'var(--text-main)',
    textDecoration: 'none',
    transition: 'background-color 0.2s'
  },
  menuItemActive: {
    backgroundColor: 'var(--border-color)',
    fontWeight: '500'
  },
  iconContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  menuText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border-color)',
    margin: '12px 0'
  }
};

export default Sidebar;
