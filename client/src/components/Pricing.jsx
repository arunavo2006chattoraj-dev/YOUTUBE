import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { FiCheck } from 'react-icons/fi';

const Pricing = () => {
  const { user, upgradePlan } = useUser();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: '/month',
      color: '#9ca3af', // Gray
      features: [
        'Watch unlimited videos',
        'Join Watch Parties',
        '1 video download per day'
      ],
      buttonText: 'Current Plan',
      isCurrent: user?.plan === 'free'
    },
    {
      id: 'bronze',
      name: 'Bronze',
      price: '$4.99',
      period: '/month',
      color: '#cd7f32', // Bronze
      features: [
        'Watch unlimited videos',
        'Create & Join Watch Parties',
        '3 video downloads per day',
        'Basic priority support'
      ],
      buttonText: 'Upgrade to Bronze',
      isCurrent: user?.plan === 'bronze'
    },
    {
      id: 'silver',
      name: 'Silver',
      price: '$9.99',
      period: '/month',
      color: '#c0c0c0', // Silver
      features: [
        'Watch unlimited videos',
        'Create & Join Watch Parties',
        '10 video downloads per day',
        'Ad-free experience',
        'Standard priority support'
      ],
      buttonText: 'Upgrade to Silver',
      isCurrent: user?.plan === 'silver'
    },
    {
      id: 'gold',
      name: 'Gold',
      price: '$14.99',
      period: '/month',
      color: '#ffd700', // Gold
      features: [
        'Watch unlimited videos',
        'Create & Join Watch Parties',
        'Unlimited video downloads',
        'Ad-free experience',
        '4K video streaming',
        '24/7 Premium support'
      ],
      buttonText: 'Upgrade to Gold',
      isCurrent: user?.plan === 'gold'
    }
  ];

  const handleUpgrade = async (planId) => {
    if (!user) {
      alert("Please log in first to upgrade your plan.");
      navigate('/profile');
      return;
    }
    
    setLoadingPlan(planId);
    
    const res = await upgradePlan(planId);
    setLoadingPlan(null);
    
    if (res.success) {
      alert(`Successfully upgraded to ${planId.toUpperCase()}!`);
    } else {
      alert(`Upgrade failed: ${res.error}`);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h1 style={styles.title}>Choose Your Experience</h1>
        <p style={styles.subtitle}>Unlock more downloads, ad-free viewing, and premium features.</p>
      </div>

      <div style={styles.grid}>
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            style={{
              ...styles.card,
              borderColor: plan.isCurrent ? plan.color : 'var(--glass-border)',
              boxShadow: plan.isCurrent ? `0 0 20px rgba(0,0,0,0.5), 0 0 10px ${plan.color}33` : '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
            }}
            className="glass-panel"
          >
            {plan.isCurrent && (
              <div style={{ ...styles.currentBadge, backgroundColor: plan.color }}>
                Current Plan
              </div>
            )}
            
            <h2 style={{ ...styles.planName, color: plan.color }}>{plan.name}</h2>
            <div style={styles.priceContainer}>
              <span style={styles.price}>{plan.price}</span>
              <span style={styles.period}>{plan.period}</span>
            </div>
            
            <div style={styles.divider}></div>
            
            <ul style={styles.featureList}>
              {plan.features.map((feature, i) => (
                <li key={i} style={styles.featureItem}>
                  <FiCheck style={{ color: plan.color, flexShrink: 0, marginTop: '2px' }} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <button 
              style={{
                ...styles.button,
                backgroundColor: plan.isCurrent ? 'rgba(255,255,255,0.1)' : plan.color,
                color: plan.isCurrent ? 'white' : '#000',
                cursor: plan.isCurrent ? 'default' : 'pointer',
                opacity: loadingPlan === plan.id ? 0.7 : 1
              }}
              onClick={() => !plan.isCurrent && handleUpgrade(plan.id)}
              disabled={plan.isCurrent || loadingPlan !== null}
            >
              {loadingPlan === plan.id ? 'Processing...' : (plan.isCurrent ? 'Current Plan' : plan.buttonText)}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '40px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  },
  header: {
    textAlign: 'center',
    marginBottom: '60px'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: 'white',
    marginBottom: '16px'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'var(--text-muted)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '24px',
    alignItems: 'stretch'
  },
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    padding: '32px 24px',
    borderRadius: '16px',
    border: '2px solid transparent',
    transition: 'transform 0.3s ease',
    overflow: 'hidden'
  },
  currentBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '6px',
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  planName: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginTop: '10px',
    marginBottom: '16px'
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: '24px'
  },
  price: {
    fontSize: '3rem',
    fontWeight: '700',
    color: 'white'
  },
  period: {
    fontSize: '1rem',
    color: 'var(--text-muted)',
    marginLeft: '4px'
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--glass-border)',
    margin: '0 0 24px 0'
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 32px 0',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '0.95rem',
    color: 'var(--text-main)',
    lineHeight: '1.4'
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '700',
    fontSize: '1rem',
    transition: 'transform 0.2s, opacity 0.2s',
    marginTop: 'auto'
  }
};

export default Pricing;
