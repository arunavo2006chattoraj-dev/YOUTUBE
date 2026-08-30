import React, { createContext, useState, useContext, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyThemeToDom = (theme) => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  // Restore session from localStorage if exists
  useEffect(() => {
    const savedUser = localStorage.getItem('watchPartyUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (parsedUser.theme) {
        applyThemeToDom(parsedUser.theme);
      }
    }
    setLoading(false);
  }, []);

  const getAutoTheme = () => {
    const istString = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
    const istDate = new Date(istString);
    const hours = istDate.getHours();
    if (hours >= 10 && hours < 12) {
      return 'light';
    }
    return 'dark';
  };

  const handleUserLoginSuccess = async (userData) => {
    let appliedTheme = userData.theme;
    if (!appliedTheme) {
      appliedTheme = getAutoTheme();
      userData.theme = appliedTheme;
      // Fire and forget update-theme to backend
      fetch('http://localhost:3001/api/update-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.id, theme: appliedTheme })
      }).catch(console.error);
    }
    applyThemeToDom(userData.theme);
    setUser(userData);
    localStorage.setItem('watchPartyUser', JSON.stringify(userData));
  };

  const login = async (email, city, state, device, plan) => {
    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, city, state, device, plan })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      
      if (data.requiresOtp) {
        return { success: true, requiresOtp: true, userId: data.userId };
      }

      await handleUserLoginSuccess(data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const verifyOtp = async (userId, otp) => {
    try {
      const response = await fetch('http://localhost:3001/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      
      await handleUserLoginSuccess(data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateTheme = async (theme) => {
    if (!user) return;
    try {
      const response = await fetch('http://localhost:3001/api/update-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, theme })
      });
      if (response.ok) {
        const updatedUser = { ...user, theme };
        applyThemeToDom(theme);
        setUser(updatedUser);
        localStorage.setItem('watchPartyUser', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Failed to update theme', err);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('watchPartyUser');
  };

  const upgradePlan = async (newPlan) => {
    if (!user) return { success: false, error: 'Not logged in' };
    try {
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE';
      
      // Bypass Razorpay for 'free' tier or if using dummy local testing keys
      if (newPlan === 'free' || razorpayKey.includes('YOUR_KEY_HERE') || razorpayKey === 'rzp_test_dummy') {
        const response = await fetch('http://localhost:3001/api/update-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, newPlan })
        });
        
        const data = await response.json();
        if (!response.ok) {
          if (data.error === 'User not found') {
            logout();
            throw new Error('Your session expired because the database was reset. You have been logged out. Please log in again.');
          }
          throw new Error(data.error || 'Failed to update plan');
        }

        setUser(data.user);
        localStorage.setItem('watchPartyUser', JSON.stringify(data.user));
        return { success: true };
      }

      // 1. Create order
      const orderRes = await fetch('http://localhost:3001/api/init-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: newPlan })
      });
      
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // 2. Open Razorpay Checkout
      return new Promise((resolve) => {
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE',
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'My Video Platform',
          description: `Upgrade to ${newPlan.toUpperCase()}`,
          order_id: orderData.id,
          handler: async (response) => {
            try {
              // 3. Verify Payment
              const verifyRes = await fetch('http://localhost:3001/api/confirm-upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  userId: user.id,
                  planId: newPlan
                })
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                throw new Error(verifyData.error || 'Payment verification failed');
              }
              
              setUser(verifyData.user);
              localStorage.setItem('watchPartyUser', JSON.stringify(verifyData.user));
              resolve({ success: true });
            } catch (err) {
              resolve({ success: false, error: err.message });
            }
          },
          prefill: {
            name: user.name,
            email: user.email
          },
          theme: {
            color: '#3399cc'
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response){
          resolve({ success: false, error: response.error.description });
        });
        rzp.open();
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateChannel = async (channelData) => {
    if (!user) return { success: false, error: 'Not logged in' };
    try {
      const response = await fetch('http://localhost:3001/api/channel/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...channelData })
      });
      const data = await response.json();
      if (response.ok) {
        const updatedUser = { ...user, ...data.channel };
        setUser(updatedUser);
        localStorage.setItem('watchPartyUser', JSON.stringify(updatedUser));
        return { success: true, channel: data.channel };
      }

      if (data.error === 'User not found') {
        logout();
        return { success: false, error: 'Your session expired because the database was reset. You have been logged out. Please log in again.' };
      }

      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const toggleSubscribe = async (channelName) => {
    if (!user) return { success: false, error: 'Please log in to subscribe.' };
    try {
      const response = await fetch(`http://localhost:3001/api/channel/${encodeURIComponent(channelName)}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await response.json();
      if (response.ok) {
        const updatedUser = { ...user, subscriptions: data.subscriptions };
        setUser(updatedUser);
        localStorage.setItem('watchPartyUser', JSON.stringify(updatedUser));
        return { success: true, ...data };
      }
      
      if (data.error === 'Subscribing user not found.') {
        logout();
        return { success: false, error: 'Your session expired because the database was reset. You have been logged out. Please log in again.' };
      }

      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:3001/api/profile/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        const updated = { ...user, ...data };
        setUser(updated);
        localStorage.setItem('watchPartyUser', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      login, 
      logout, 
      upgradePlan, 
      loading, 
      verifyOtp, 
      updateTheme,
      updateChannel,
      toggleSubscribe,
      refreshUser
    }}>
      {!loading && children}
    </UserContext.Provider>
  );
};
