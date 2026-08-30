import React, { useState } from 'react';
import { Routes, Route, useLocation, useSearchParams } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
import Watch from './components/Watch';
import Room from './components/Room';
import Library from './components/Library';
import Profile from './components/Profile';
import Pricing from './components/Pricing';
import YourVideos from './components/YourVideos';
import Channel from './components/Channel';
import SearchResults from './components/SearchResults';
import GlobalFeaturedPage from './components/GlobalFeaturedPage';
import Subscriptions from './components/Subscriptions';
import ReportHistory from './components/ReportHistory';
import PlaylistView from './components/PlaylistView';
import Explore from './components/Explore';
import Shorts from './components/Shorts';
import Community from './components/Community';
import './App.css';

const WatchPartyPage = () => {
  const [roomData, setRoomData] = useState(null);
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get('v');

  const handleJoinRoom = (roomId, userName) => {
    setRoomData({ roomId, userName });
  };

  const handleLeaveRoom = () => {
    setRoomData(null);
  };

  return roomData ? (
    <Room 
      roomId={roomData.roomId} 
      userName={roomData.userName} 
      onLeave={handleLeaveRoom} 
      videoId={videoId}
    />
  ) : (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '20px' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
        <div style={{ 
          backgroundColor: 'var(--accent-color)', 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          margin: '0 auto 20px auto',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
        }}>
          <FiUsers size={32} color="#fff" />
        </div>
        <h2 style={{ marginBottom: '10px', fontSize: '1.8rem', color: 'var(--text-main)' }}>Watch Party</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.95rem' }}>
          Create or join a room to watch videos and chat with your friends in real-time.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="text" 
            id="room-input" 
            placeholder="Room ID (e.g. movie-night)" 
            className="input-field" 
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px' }} 
            defaultValue={Math.random().toString(36).substring(2, 8)}
          />
          <input 
            type="text" 
            id="name-input" 
            placeholder="Your Display Name" 
            className="input-field" 
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px' }} 
          />
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', fontSize: '1rem', borderRadius: '8px', marginTop: '8px', fontWeight: 'bold' }}
            onClick={() => {
              const room = document.getElementById('room-input').value;
              const name = document.getElementById('name-input').value;
              if(room && name) handleJoinRoom(room, name);
              else alert('Please enter both a Room ID and your Name');
            }}
          >
            Join Party
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const isWatchPage = location.pathname.toLowerCase().includes('/watch') || location.pathname.toLowerCase().includes('/party');

  return (
    <div className="yt-layout" style={{ flexDirection: 'column' }}>
      <Navbar toggleSidebar={toggleSidebar} isWatchPage={isWatchPage} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!isWatchPage && <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />}
        <div className="yt-main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/featured" element={<GlobalFeaturedPage />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/watch/:id" element={<Watch />} />
            <Route path="/channel/:channelName" element={<Channel />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/party" element={<WatchPartyPage />} />
            <Route path="/library" element={<Library />} />
            <Route path="/playlist/:id" element={<PlaylistView />} />
            <Route path="/report-history" element={<ReportHistory />} />
            <Route path="/your-videos" element={<YourVideos />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/shorts" element={<Shorts />} />
            <Route path="/explore/:category" element={<Explore />} />
            <Route path="/community" element={<Community />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
