import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

const BANNER_PRESETS = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80'
  },
  {
    id: 'abstract_mesh',
    name: 'Abstract Flow',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&auto=format&fit=crop&q=80'
  },
  {
    id: 'retro_gaming',
    name: 'Synthwave & Tech',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80'
  },
  {
    id: 'nature_waves',
    name: 'Ocean Sunset',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80'
  },
  {
    id: 'code_dark',
    name: 'Dark Matrix Code',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&auto=format&fit=crop&q=80'
  },
  {
    id: 'space_nebula',
    name: 'Deep Cosmos',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80'
  }
];

export default function ChannelCustomizerModal({ isOpen, onClose, onUpdated }) {
  const { user, updateChannel } = useUser();

  const [name, setName] = useState(user?.name || user?.username || '');
  const [bio, setBio] = useState(user?.bio || 'Welcome to my official channel!');
  const [banner, setBanner] = useState(user?.banner || BANNER_PRESETS[0].url);
  const [avatar, setAvatar] = useState(user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'User'}`);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const res = await updateChannel({
      name,
      bio,
      banner,
      avatar
    });

    setSaving(false);
    if (res.success) {
      setMsg({ type: 'success', text: 'Channel profile customized successfully!' });
      if (onUpdated) onUpdated(res.channel);
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to update channel profile' });
    }
  };

  const generateRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '680px', 
          width: '95%', 
          maxHeight: '90vh', 
          overflowY: 'auto',
          padding: '28px' 
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
              Customize Channel Profile & Banner
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Design how your channel appears to subscribers and viewers across YouTube.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', borderRadius: '50%', minWidth: '36px', height: '36px' }}
          >
            ✕
          </button>
        </div>

        {msg && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            background: msg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${msg.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: msg.type === 'success' ? '#34d399' : '#f87171',
            fontSize: '0.9rem'
          }}>
            {msg.text}
          </div>
        )}

        {/* Live Channel Header Preview */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
            LIVE PREVIEW
          </label>
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
            background: 'var(--bg-dark)'
          }}>
            {/* Banner Preview */}
            <div style={{ height: '110px', position: 'relative', overflow: 'hidden' }}>
              <img 
                src={banner} 
                alt="Banner preview" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.src = BANNER_PRESETS[0].url; }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
            </div>

            {/* Profile Info Row Preview */}
            <div style={{ padding: '0 16px 16px 16px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
              <img 
                src={avatar} 
                alt="Avatar preview" 
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '3px solid var(--bg-dark)',
                  marginTop: '-24px',
                  objectFit: 'cover',
                  background: '#222'
                }}
              />
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>
                  {name || 'Your Channel Name'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  @{user?.username || 'handle'} • 0 subscribers
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Banner Preset Selector */}
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              Select Channel Banner
            </label>
            <div className="banner-presets-grid">
              {BANNER_PRESETS.map((preset) => (
                <div 
                  key={preset.id}
                  className={`banner-preset-item ${banner === preset.url ? 'selected' : ''}`}
                  onClick={() => setBanner(preset.url)}
                  title={preset.name}
                >
                  <img src={preset.url} alt={preset.name} />
                  <span style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '6px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    color: 'white',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                  }}>
                    {preset.name}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Or enter custom Banner Image URL:
              </label>
              <input 
                type="url" 
                className="input-field" 
                value={banner}
                onChange={(e) => setBanner(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Avatar Settings */}
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              Channel Avatar
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <img 
                src={avatar} 
                alt="Avatar" 
                style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--border-color)' }}
              />
              <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                <input 
                  type="url" 
                  className="input-field" 
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="Avatar URL"
                  style={{ flex: 1, fontSize: '0.85rem' }}
                />
                <button 
                  type="button" 
                  onClick={generateRandomAvatar}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  🎲 Randomize
                </button>
              </div>
            </div>
          </div>

          {/* Channel Name */}
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              Channel Display Name
            </label>
            <input 
              type="text" 
              className="input-field" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Master Developer"
              required
              style={{ width: '100%' }}
            />
          </div>

          {/* Channel Bio */}
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              Channel Bio / Description
            </label>
            <textarea 
              className="input-field" 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell viewers what your channel is all about..."
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: '130px' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
