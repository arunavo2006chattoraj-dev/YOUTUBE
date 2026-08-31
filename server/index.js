require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Filter = require('bad-words');
const filter = new Filter();

// Import MongoDB connection and models
const { connectDB, User, Video, Comment, Report, Playlist, Post } = require('./db');
const mongoose = require('mongoose');

const app = express();

// Connect to MongoDB
connectDB();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

// Setup Email Client (Brevo API)
const BREVO_API_KEY = process.env.BREVO_API_KEY;
if (!BREVO_API_KEY) {
  console.log("No BREVO_API_KEY provided in .env, email sending is disabled.");
}

async function sendBrevoEmail(to, subject, htmlContent, textContent) {
  if (!BREVO_API_KEY) return { error: 'No API key' };
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'My Video Platform', email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent
      })
    });
    const data = await response.json();
    if (!response.ok) return { error: data };
    return { data };
  } catch (err) {
    return { error: err.message };
  }
}
app.use(cors());
app.use(express.json());

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `http://localhost:3001/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const pendingOtps = {};

// --- REST API ROUTES ---
const formatViewsCount = (count) => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M views';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K views';
  }
  return `${count} views`;
};

app.post('/api/login', async (req, res) => {
  const { email, city, state, device, plan } = req.body;
  try {
    if (!email) return res.status(400).json({ error: 'Email is required' });
    let user = await User.findOne({ email });
    
    const deviceString = `${city}-${state}-${device}`.toLowerCase();
    
    if (!user) {
      // Create new user
      let extractedUsername = email.split('@')[0];
      let existingUser = await User.findOne({ username: extractedUsername });
      if (existingUser) {
        extractedUsername = extractedUsername + '_' + Math.floor(1000 + Math.random() * 9000);
      }
      user = new User({
        id: 'u' + Date.now().toString(),
        username: extractedUsername,
        name: extractedUsername,
        email: email,
        plan: plan || 'free',
        theme: 'dark',
        banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${extractedUsername}`,
        bio: 'Welcome to my official channel!',
        subscribers: [],
        subscriptions: [],
        known_devices: deviceString !== '--' ? [deviceString] : [],
        downloads: []
      });
      await user.save();
    }
    
    const knownDevices = user.known_devices || [];
    
    // Check if new device/location and it was provided
    if ((city || state || device) && !knownDevices.includes(deviceString)) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      pendingOtps[user.id] = { otp, deviceString };
      
      if (BREVO_API_KEY) {
         const { data, error } = await sendBrevoEmail(
           user.email,
           'Your Login OTP',
           null, // no HTML content
           `Your OTP for login from new location/device (${city}, ${state}, ${device}) is: ${otp}`
         );
         
         if (error) {
           console.error('Error sending OTP email with Brevo:', error);
         } else {
           console.log('OTP Email sent with Brevo messageId:', data?.messageId);
         }
      } else {
         console.log(`[DEV MODE] OTP for ${user.username} is ${otp}`);
      }
      return res.json({ requiresOtp: true, userId: user.id });
    }

    res.json({ 
      id: user.id, 
      username: user.username,
      name: user.name, 
      plan: user.plan, 
      email: user.email, 
      theme: user.theme,
      banner: user.banner,
      avatar: user.avatar,
      bio: user.bio,
      subscribers: user.subscribers || [],
      subscriptions: user.subscriptions || []
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;
  try {
    const user = await User.findOne({ id: userId });
    
    if (!user || !pendingOtps[userId]) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    if (pendingOtps[userId].otp === otp) {
      user.known_devices.push(pendingOtps[userId].deviceString);
      
      await user.save();
      delete pendingOtps[userId];
      
      res.json({ 
        id: user.id, 
        username: user.username,
        name: user.name, 
        plan: user.plan, 
        email: user.email, 
        theme: user.theme,
        banner: user.banner,
        avatar: user.avatar,
        bio: user.bio,
        subscribers: user.subscribers || [],
        subscriptions: user.subscriptions || []
      });
    } else {
      res.status(401).json({ error: 'Invalid OTP' });
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/update-theme', async (req, res) => {
  const { userId, theme } = req.body;
  try {
    const user = await User.findOneAndUpdate({ id: userId }, { theme }, { new: true });
    if (user) {
      res.json({ success: true, theme: user.theme });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Update theme error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/profile/:id', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id }).select('id username name email plan theme banner avatar bio subscribers subscriptions downloads');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- CHANNEL ENDPOINTS ---
app.get('/api/channel/:channelName', async (req, res) => {
  try {
    const channelName = req.params.channelName;
    const { userId } = req.query;

    let channel = await User.findOne({ 
      $or: [
        { username: new RegExp(`^${channelName}$`, 'i') }, 
        { name: new RegExp(`^${channelName}$`, 'i') }
      ] 
    });

    const videos = await Video.find({ 
      channel: new RegExp(`^${channelName}$`, 'i') 
    }).sort({ createdAt: -1 });

    if (!channel) {
      // If channel not created as User yet, create fallback profile
      channel = {
        name: channelName,
        username: channelName,
        banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
        avatar: videos[0]?.channel_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${channelName}`,
        bio: `Official channel of ${channelName}. Explore videos, tutorials, and showcases.`,
        subscribers: []
      };
    }

    const totalViews = videos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);
    const isSubscribed = userId ? (channel.subscribers || []).some(s => s.userId === userId) : false;

    res.json({
      name: channel.name || channel.username,
      username: channel.username || channel.name,
      banner: channel.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
      avatar: channel.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${channelName}`,
      bio: channel.bio || `Welcome to ${channelName}'s channel!`,
      subscribersCount: (channel.subscribers || []).length,
      subscribers: channel.subscribers || [],
      isSubscribed,
      totalViews,
      videosCount: videos.length,
      videos
    });
  } catch (error) {
    console.error('Fetch channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/posts/all', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error('Fetch all posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/channel/:channelName/posts', async (req, res) => {
  try {
    const channelName = req.params.channelName;
    const posts = await Post.find({
      channelName: new RegExp(`^${channelName}$`, 'i')
    }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error('Fetch posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { id, channelName, channelAvatar, content, image } = req.body;
    if (!channelName || !content) {
      return res.status(400).json({ error: 'Missing channel name or content' });
    }

    const newPost = new Post({
      id: id || require('crypto').randomUUID(),
      channelName,
      channelAvatar,
      content,
      image
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/channel/update', async (req, res) => {
  const { userId, name, bio, banner, avatar } = req.body;
  try {
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (banner) user.banner = banner;
    if (avatar) user.avatar = avatar;

    await user.save();

    // Update avatar and channel name in user's videos if changed
    if (avatar || name) {
      await Video.updateMany(
        { channel: user.username },
        { 
          ...(avatar && { channel_avatar: avatar }),
          ...(name && { channel: name })
        }
      );
    }

    // Broadcast channel profile update
    io.emit('channel-profile-updated', {
      channelName: user.name || user.username,
      banner: user.banner,
      avatar: user.avatar,
      bio: user.bio
    });

    res.json({ 
      success: true, 
      channel: {
        id: user.id,
        name: user.name,
        username: user.username,
        banner: user.banner,
        avatar: user.avatar,
        bio: user.bio,
        subscribersCount: (user.subscribers || []).length,
        subscribers: user.subscribers || [],
        subscriptions: user.subscriptions || []
      }
    });
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/channel/:channelName/subscribe', async (req, res) => {
  const { channelName } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required to subscribe.' });
  }
  const cleanUserId = typeof userId === 'string' ? userId.trim() : userId;
  console.log(`[SUBSCRIBE] channelName: ${channelName}, userId: ${cleanUserId}`);

  try {
    let subscriberUser = await User.findOne({ id: cleanUserId });
    if (!subscriberUser && mongoose.Types.ObjectId.isValid(cleanUserId)) {
      subscriberUser = await User.findById(cleanUserId);
    }
    if (!subscriberUser) {
      console.log(`[SUBSCRIBE ERROR] userId was: '${userId}' but no user found! typeof: ${typeof userId}`);
      return res.status(404).json({ error: 'Subscribing user not found.' });
    }

    let targetChannel = await User.findOne({ 
      $or: [
        { username: new RegExp(`^${channelName}$`, 'i') }, 
        { name: new RegExp(`^${channelName}$`, 'i') }
      ] 
    });

    if (!targetChannel) {
      // Create channel user document if it didn't exist
      targetChannel = new User({
        id: 'ch_' + Date.now().toString(),
        username: channelName,
        name: channelName,
        email: `${channelName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        plan: 'free',
        theme: 'dark',
        banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${channelName}`,
        bio: `Official channel of ${channelName}.`,
        subscribers: [],
        subscriptions: []
      });
      await targetChannel.save();
    }

    // Check if already subscribed
    const existingIndex = (targetChannel.subscribers || []).findIndex(s => s.userId === subscriberUser.id);
    let isSubscribed = false;

    if (existingIndex > -1) {
      // Unsubscribe
      targetChannel.subscribers.splice(existingIndex, 1);
      subscriberUser.subscriptions = (subscriberUser.subscriptions || []).filter(ch => ch.toLowerCase() !== channelName.toLowerCase());
      isSubscribed = false;
    } else {
      // Subscribe
      const newSub = {
        userId: subscriberUser.id,
        username: subscriberUser.name || subscriberUser.username,
        avatar: subscriberUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${subscriberUser.username}`,
        date: new Date()
      };
      if (!targetChannel.subscribers) targetChannel.subscribers = [];
      targetChannel.subscribers.push(newSub);

      if (!subscriberUser.subscriptions) subscriberUser.subscriptions = [];
      if (!subscriberUser.subscriptions.includes(targetChannel.name || targetChannel.username)) {
        subscriberUser.subscriptions.push(targetChannel.name || targetChannel.username);
      }
      isSubscribed = true;
    }

    await targetChannel.save();
    await subscriberUser.save();

    const updatedSubCount = targetChannel.subscribers.length;

    // REAL-TIME BROADCAST VIA SOCKET.IO TO ALL VIEWERS
    io.emit('subscriber-updated', {
      channelName: targetChannel.name || targetChannel.username,
      subscribersCount: updatedSubCount,
      isSubscribed,
      action: isSubscribed ? 'subscribed' : 'unsubscribed',
      subscriber: {
        userId: subscriberUser.id,
        username: subscriberUser.name || subscriberUser.username,
        avatar: subscriberUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${subscriberUser.username}`
      }
    });

    res.json({
      success: true,
      isSubscribed,
      subscribersCount: updatedSubCount,
      subscribers: targetChannel.subscribers,
      subscriptions: subscriberUser.subscriptions
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/channel/:channelName/subscribers', async (req, res) => {
  const { channelName } = req.params;
  try {
    const channel = await User.findOne({ 
      $or: [
        { username: new RegExp(`^${channelName}$`, 'i') }, 
        { name: new RegExp(`^${channelName}$`, 'i') }
      ] 
    });
    if (!channel) {
      return res.json({ subscribers: [] });
    }
    res.json({ 
      subscribers: channel.subscribers || [], 
      subscribersCount: (channel.subscribers || []).length 
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- USER SUBSCRIPTIONS FEED & CHANNELS ENDPOINT ---
app.get('/api/users/:userId/subscriptions', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findOne({ id: userId });
    const subNames = (user?.subscriptions || []).filter(Boolean);

    // Fetch channel details for all subscribed channels
    const channels = await Promise.all(subNames.map(async (chName) => {
      let chUser = await User.findOne({
        $or: [
          { username: new RegExp(`^${chName}$`, 'i') },
          { name: new RegExp(`^${chName}$`, 'i') }
        ]
      });

      const videos = await Video.find({
        channel: new RegExp(`^${chName}$`, 'i')
      }).sort({ createdAt: -1, viewsCount: -1 });

      const totalViews = videos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);

      return {
        name: chName,
        username: chUser?.username || chName,
        avatar: chUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chName}`,
        banner: chUser?.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        bio: chUser?.bio || `Official channel of ${chName}`,
        subscribersCount: chUser ? (chUser.subscribers || []).length : 1,
        videosCount: videos.length,
        totalViewsFormatted: formatViewsCount(totalViews),
        country: chUser?.country || 'Global',
        countryFlag: chUser?.countryFlag || '🌐',
        creatorBadges: chUser?.creatorBadges || [],
        latestVideo: videos[0] || null,
        videos: videos
      };
    }));

    // Fetch all videos from all subscribed channels
    let feedVideos = [];
    if (subNames.length > 0) {
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

      const regexArray = subNames.map(n => new RegExp(`^${n}$`, 'i'));
      feedVideos = await Video.find({
        channel: { $in: regexArray },
        createdAt: { $gte: fourMonthsAgo }
      }).sort({ createdAt: -1 });
    }

    // Also fetch recommended creators that user is not subscribed to
    const recommendedUsers = await User.find({
      $and: [
        { globalCreatorRank: { $gt: 0 } },
        { name: { $nin: subNames } },
        { username: { $nin: subNames } }
      ]
    }).limit(6);

    const recommendedChannels = await Promise.all(recommendedUsers.map(async (rec) => {
      const vCount = await Video.countDocuments({
        channel: new RegExp(`^${rec.name || rec.username}$`, 'i')
      });
      return {
        name: rec.name || rec.username,
        username: rec.username,
        avatar: rec.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.username}`,
        banner: rec.banner,
        bio: rec.bio,
        subscribersCount: (rec.subscribers || []).length,
        videosCount: vCount,
        country: rec.country,
        countryFlag: rec.countryFlag,
        creatorBadges: rec.creatorBadges || []
      };
    }));

    res.json({
      subscriptions: subNames,
      channels,
      feedVideos,
      recommendedChannels
    });
  } catch (error) {
    console.error('Fetch user subscriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- REPORT HISTORY & TRUST & SAFETY ENDPOINTS ---
app.get('/api/users/:userId/reports', async (req, res) => {
  const { userId } = req.params;
  const { type, status } = req.query;
  try {
    let filterQuery = { reporterId: userId };
    if (type && type !== 'all') {
      filterQuery.targetType = type;
    }
    if (status && status !== 'all') {
      filterQuery.status = status;
    }

    const reports = await Report.find(filterQuery).sort({ createdAt: -1 });

    // Calculate stats
    const allUserReports = await Report.find({ reporterId: userId });
    const stats = {
      total: allUserReports.length,
      underReview: allUserReports.filter(r => r.status === 'Under Review').length,
      actionTaken: allUserReports.filter(r => r.status === 'Action Taken').length,
      resolved: allUserReports.filter(r => r.status === 'Resolved').length,
      dismissed: allUserReports.filter(r => r.status === 'Dismissed').length,
    };

    res.json({ reports, stats });
  } catch (error) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/reports', async (req, res) => {
  const { 
    reporterId, 
    reporterName, 
    targetType, 
    targetId, 
    targetTitle, 
    targetThumbnail, 
    targetChannel, 
    reason, 
    details 
  } = req.body;

  if (!reporterId || !targetId || !reason) {
    return res.status(400).json({ error: 'Missing required report fields' });
  }

  try {
    // If target is comment, increment comment report counter
    if (targetType === 'comment') {
      await Comment.findOneAndUpdate(
        { id: targetId },
        { $inc: { reports: 1 }, is_flagged: true }
      );
    }

    const newReport = new Report({
      id: 'rep_' + Date.now().toString(),
      reporterId,
      reporterName: reporterName || 'Anonymous',
      targetType: targetType || 'video',
      targetId,
      targetTitle: targetTitle || 'Untitled Item',
      targetThumbnail: targetThumbnail || '',
      targetChannel: targetChannel || '',
      reason,
      details: details || '',
      status: 'Under Review',
      statusNote: 'Our Trust & Safety team has received your report and is currently reviewing it against our Community Guidelines.',
      reportedAt: new Date()
    });

    const saved = await newReport.save();

    // Broadcast report event via Socket.io
    io.emit('new-report-filed', {
      reportId: saved.id,
      targetType: saved.targetType,
      targetId: saved.targetId
    });

    res.status(201).json({ success: true, report: saved });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/reports/:reportId', async (req, res) => {
  const { reportId } = req.params;
  try {
    const deleted = await Report.findOneAndDelete({ id: reportId });
    if (!deleted) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ success: true, message: 'Report withdrawn successfully', reportId });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/channel/:channelName/analytics', async (req, res) => {
  const { channelName } = req.params;
  try {
    const channel = await User.findOne({ 
      $or: [
        { username: new RegExp(`^${channelName}$`, 'i') }, 
        { name: new RegExp(`^${channelName}$`, 'i') }
      ] 
    });

    const videos = await Video.find({ 
      channel: new RegExp(`^${channelName}$`, 'i') 
    }).sort({ viewsCount: -1, createdAt: -1 });

    const totalViews = videos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);
    const subscribersCount = channel ? (channel.subscribers || []).length : 0;

    res.json({
      channelName,
      subscribersCount,
      totalViews,
      videosCount: videos.length,
      subscribers: channel ? channel.subscribers || [] : [],
      videos
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- SEARCH ENDPOINT ---
app.get('/api/search', async (req, res) => {
  const { q = '', type = 'all', sort = 'relevance' } = req.query;
  const query = q.trim();

  try {
    let videoFilter = {};
    let channelFilter = {};

    if (query) {
      const regex = new RegExp(query, 'i');
      videoFilter = {
        $or: [
          { title: regex },
          { description: regex },
          { channel: regex },
          { tags: regex }
        ]
      };
      channelFilter = {
        $or: [
          { username: regex },
          { name: regex },
          { bio: regex }
        ]
      };
    }

    let videos = [];
    let channels = [];

    if (type === 'all' || type === 'videos') {
      let videoQuery = Video.find(videoFilter);
      if (sort === 'views') {
        videoQuery = videoQuery.sort({ viewsCount: -1 });
      } else if (sort === 'latest') {
        videoQuery = videoQuery.sort({ createdAt: -1 });
      }
      videos = await videoQuery;
    }

    if (type === 'all' || type === 'channels') {
      const foundChannels = await User.find(channelFilter);
      // Map channels with video counts and formatted subscriber counts
      channels = await Promise.all(foundChannels.map(async (ch) => {
        const vCount = await Video.countDocuments({ 
          channel: new RegExp(`^${ch.name || ch.username}$`, 'i') 
        });
        return {
          id: ch.id,
          name: ch.name || ch.username,
          username: ch.username,
          avatar: ch.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ch.username}`,
          banner: ch.banner,
          bio: ch.bio,
          subscribersCount: (ch.subscribers || []).length,
          videosCount: vCount
        };
      }));
    }

    res.json({
      query,
      type,
      sort,
      totalResults: videos.length + channels.length,
      videos,
      channels
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- VIDEOS ENDPOINTS ---
app.get('/api/videos', async (req, res) => {
  try {
    const videos = await Video.find({}).sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    console.error('Fetch videos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PLAYLIST ENDPOINTS ---
app.post('/api/playlists', async (req, res) => {
  const { userId, title, description, isPublic } = req.body;
  if (!userId || !title) return res.status(400).json({ error: 'userId and title are required' });
  
  try {
    const newPlaylist = new Playlist({
      id: 'pl_' + Date.now().toString(),
      userId,
      title,
      description,
      isPublic: isPublic || false,
      videos: []
    });
    const saved = await newPlaylist.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:userId/playlists', async (req, res) => {
  const { userId } = req.params;
  try {
    const playlists = await Playlist.find({ userId }).sort({ createdAt: -1 });
    res.json(playlists);
  } catch (error) {
    console.error('Fetch playlists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/playlists/:playlistId/videos', async (req, res) => {
  const { playlistId } = req.params;
  const { videoId } = req.body;
  if (!videoId) return res.status(400).json({ error: 'videoId is required' });

  try {
    const playlist = await Playlist.findOne({ id: playlistId });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    if (!playlist.videos.includes(videoId)) {
      playlist.videos.push(videoId);
      await playlist.save();
    }
    res.json(playlist);
  } catch (error) {
    console.error('Add video to playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/playlists/:playlistId/videos/:videoId', async (req, res) => {
  const { playlistId, videoId } = req.params;
  try {
    const playlist = await Playlist.findOne({ id: playlistId });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    playlist.videos = playlist.videos.filter(v => v !== videoId);
    await playlist.save();
    res.json(playlist);
  } catch (error) {
    console.error('Remove video from playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/playlists/:playlistId', async (req, res) => {
  const { playlistId } = req.params;
  try {
    const playlist = await Playlist.findOne({ id: playlistId });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    // Fetch the actual video details for the video IDs
    const videos = await Video.find({ id: { $in: playlist.videos } });
    
    // Sort videos to match the order in playlist.videos
    const sortedVideos = playlist.videos.map(id => videos.find(v => v.id === id)).filter(Boolean);

    res.json({
      ...playlist.toObject(),
      videoDetails: sortedVideos
    });
  } catch (error) {
    console.error('Fetch playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GLOBAL FEATURED & TOP CREATORS ENDPOINT ---
app.get('/api/videos/featured-global', async (req, res) => {
  const { region = 'all', category = 'all', sort = 'views', limit = 20 } = req.query;

  try {
    let filter = {};

    if (region && region !== 'all') {
      filter.region = new RegExp(`^${region}$`, 'i');
    }

    if (category && category !== 'all') {
      filter.category = new RegExp(category.replace(/_/g, ' '), 'i');
    }

    let sortObj = { viewsCount: -1 };
    if (sort === 'rating' || sort === 'performance') {
      sortObj = { performanceScore: -1, viewsCount: -1 };
    } else if (sort === 'rank') {
      sortObj = { globalRank: 1 };
    } else if (sort === 'trending') {
      sortObj = { likesCount: -1, viewsCount: -1 };
    } else if (sort === 'latest') {
      sortObj = { createdAt: -1 };
    }

    const allGlobalVideos = await Video.find(filter).sort(sortObj).limit(parseInt(limit) || 20);

    // Fetch all global creators
    const creators = await User.find({
      globalCreatorRank: { $gt: 0 }
    }).sort({ globalCreatorRank: 1 });

    // Calculate aggregated stats
    const allVideos = await Video.find({});
    const totalViews = allVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);
    const uniqueCountries = Array.from(new Set(allVideos.map(v => v.country).filter(Boolean)));

    // Map top creators with their top video and channel stats
    const topCreators = await Promise.all(creators.map(async (creator) => {
      const creatorVideos = await Video.find({
        channel: new RegExp(`^${creator.name || creator.username}$`, 'i')
      }).sort({ viewsCount: -1 });

      const creatorTotalViews = creatorVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);

      return {
        id: creator.id,
        name: creator.name || creator.username,
        username: creator.username,
        avatar: creator.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.username}`,
        banner: creator.banner,
        bio: creator.bio,
        country: creator.country || 'Global',
        countryCode: creator.countryCode || 'GL',
        countryFlag: creator.countryFlag || '🌐',
        creatorBadges: creator.creatorBadges || [],
        globalCreatorRank: creator.globalCreatorRank || 0,
        subscribersCount: (creator.subscribers || []).length,
        totalViews: creatorTotalViews,
        videosCount: creatorVideos.length,
        bestVideo: creatorVideos[0] || null
      };
    }));

    // Identify Hero Spotlight Videos (Top 3 overall)
    const heroSpotlights = allGlobalVideos.slice(0, 3);

    // Group videos by category with ranks for Multi-Section display
    const CATEGORY_META = [
      { key: 'Sports', title: 'Sports & Extreme Action', icon: '⚽', desc: 'World Records, F1 Speeds & Extreme Stunts', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
      { key: 'Food & Culinary', title: 'Food & Culinary Arts', icon: '🍔', desc: 'Michelin Masters, Artisan Pizza & Haute Pâtisserie', gradient: 'linear-gradient(135deg, #f59e0b, #eab308)' },
      { key: 'Entertainment', title: 'Entertainment & CGI Cinema', icon: '🎬', desc: 'Award-Winning 3D Cinema, VFX & Unreal Cinematics', gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
      { key: 'Gaming', title: 'Gaming & Esports', icon: '🎮', desc: 'Next-Gen Graphics Showcases, Esports Finals & 4K Aces', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
      { key: 'Tech & Science', title: 'Tech & Science AI', icon: '💻', desc: 'Humanoid Robotics, Quantum Processors & Future Tech', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
      { key: 'Music & Arts', title: 'Music & Visual Arts', icon: '🎵', desc: 'Cyber Synthwave, Royal Symphonies & Spatial Audio', gradient: 'linear-gradient(135deg, #a855f7, #6366f1)' },
      { key: 'Travel & Nature', title: 'Travel & Nature 8K', icon: '🏔️', desc: 'Arctic Auroras, Swiss Alps FPV & Ocean Wonders', gradient: 'linear-gradient(135deg, #14b8a6, #0ea5e9)' }
    ];

    const categorySections = await Promise.all(CATEGORY_META.map(async (cat) => {
      const catVideos = await Video.find({
        category: new RegExp(cat.key, 'i')
      }).sort({ categoryRank: 1, viewsCount: -1 });

      const catViews = catVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);

      return {
        ...cat,
        totalVideos: catVideos.length,
        totalViewsFormatted: formatViewsCount(catViews),
        videos: catVideos,
        topChampion: catVideos[0] || null
      };
    }));

    res.json({
      featuredHero: heroSpotlights[0] || null,
      heroSpotlights,
      videos: allGlobalVideos,
      categorySections: categorySections.filter(c => c.videos.length > 0),
      topCreators,
      stats: {
        totalGlobalViews: formatViewsCount(totalViews),
        rawTotalViews: totalViews,
        totalCountries: uniqueCountries.length || 12,
        totalFeaturedVideos: allVideos.length,
        totalEliteCreators: creators.length || 16,
        topTrendingGenre: 'Extreme Sports & Michelin Culinary'
      },
      filters: {
        region,
        category,
        sort
      }
    });
  } catch (error) {
    console.error('Fetch featured global error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/creators/top-performing', async (req, res) => {
  try {
    const creators = await User.find({
      globalCreatorRank: { $gt: 0 }
    }).sort({ globalCreatorRank: 1 });

    const results = await Promise.all(creators.map(async (creator) => {
      const creatorVideos = await Video.find({
        channel: new RegExp(`^${creator.name || creator.username}$`, 'i')
      }).sort({ viewsCount: -1 });

      const totalViews = creatorVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);

      return {
        id: creator.id,
        name: creator.name || creator.username,
        username: creator.username,
        avatar: creator.avatar,
        banner: creator.banner,
        bio: creator.bio,
        country: creator.country || 'Global',
        countryCode: creator.countryCode || 'GL',
        countryFlag: creator.countryFlag || '🌐',
        creatorBadges: creator.creatorBadges || [],
        globalCreatorRank: creator.globalCreatorRank,
        subscribersCount: (creator.subscribers || []).length,
        totalViews: formatViewsCount(totalViews),
        rawTotalViews: totalViews,
        bestVideo: creatorVideos[0] || null
      };
    }));

    res.json(results);
  } catch (error) {
    console.error('Fetch top creators error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/videos', async (req, res) => {
  const { title, description, url, thumbnail, channel, channel_avatar, tags, isShort } = req.body;
  if (!title || !url) {
    return res.status(400).json({ error: 'Title and URL are required' });
  }

  try {
    // Get creator's avatar if available from User document
    let finalAvatar = channel_avatar;
    if (!finalAvatar && channel) {
      const user = await User.findOne({ 
        $or: [{ username: channel }, { name: channel }] 
      });
      if (user && user.avatar) finalAvatar = user.avatar;
    }

    const newVideo = new Video({
      id: 'v' + Date.now().toString(),
      title,
      url,
      thumbnail: thumbnail || 'https://picsum.photos/seed/video/640/360',
      channel: channel || 'Unknown Channel',
      channel_avatar: finalAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel || 'User'}`,
      views: '0 views',
      viewsCount: 0,
      timestamp: 'Just now',
      description: description || '',
      tags: tags || [channel, 'video'],
      likesCount: 0,
      isShort: isShort || false
    });

    const savedVideo = await newVideo.save();
    io.emit('new-video', savedVideo);
    res.status(201).json(savedVideo);
  } catch (error) {
    console.error('Create video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/videos/:id/view', async (req, res) => {
  try {
    const video = await Video.findOne({ id: req.params.id });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    video.viewsCount = (video.viewsCount || 0) + 1;
    video.views = formatViewsCount(video.viewsCount);
    await video.save();

    // Broadcast live view count update
    io.emit('video-view-updated', {
      videoId: video.id,
      views: video.views,
      viewsCount: video.viewsCount,
      channel: video.channel
    });

    res.json({
      success: true,
      videoId: video.id,
      views: video.views,
      viewsCount: video.viewsCount
    });
  } catch (error) {
    console.error('Increment view error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/videos/user/:username', async (req, res) => {
  try {
    const videos = await Video.find({ 
      channel: new RegExp(`^${req.params.username}$`, 'i') 
    }).sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    console.error('Fetch user videos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/videos/:id', async (req, res) => {
  try {
    const video = await Video.findOne({ id: req.params.id });
    if (video) {
      // Also attach channel subscriber count to video payload for easy access
      const channel = await User.findOne({ 
        $or: [{ username: video.channel }, { name: video.channel }] 
      });
      const subscribersCount = channel ? (channel.subscribers || []).length : 0;
      const channelBanner = channel ? channel.banner : null;
      const channelBio = channel ? channel.bio : null;

      res.json({
        ...video._doc,
        subscribersCount,
        channelBanner,
        channelBio
      });
    } else {
      res.status(404).json({ error: 'Video not found' });
    }
  } catch (error) {
    console.error('Fetch video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/comments/:videoId', async (req, res) => {
  try {
    const comments = await Comment.find({ video_id: req.params.videoId }).sort({ created_at: -1 });
    // Transform show_location back to boolean just in case
    const formatted = comments.map(c => ({
      ...c._doc, 
      showLocation: c.show_location, 
      isFlagged: c.is_flagged
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Fetch comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/comments/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const { user, text, location, showLocation } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  // Moderation: Check for abusive words
  if (filter.isProfane(text)) {
    return res.status(400).json({ error: 'Your comment contains abusive language and has been blocked.' });
  }

  // Moderation: Check for repeating special characters (spam)
  if (/([!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])\1{4,}/.test(text)) {
    return res.status(400).json({ error: 'Your comment looks like spam (excessive special characters).' });
  }

  try {
    // Moderation: Check for duplicate spam from same user within the last 1 minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentCheck = await Comment.find({
      video_id: videoId,
      username: user || 'Guest User',
      created_at: { $gt: oneMinuteAgo }
    });
    
    if (recentCheck.some(c => c.text === text)) {
      return res.status(400).json({ error: 'Please do not post duplicate comments in a short time.' });
    }

    const newComment = new Comment({
      id: 'c' + Date.now().toString(),
      video_id: videoId,
      username: user || 'Guest User',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user || 'Guest'}`,
      text,
      timestamp: 'Just now',
      created_at: Date.now(),
      likes: 0,
      dislikes: 0,
      reports: 0,
      location: showLocation ? (location || 'Unknown Location') : null,
      show_location: !!showLocation,
      is_flagged: false
    });

    const savedComment = await newComment.save();
    res.json({
      ...savedComment._doc, 
      showLocation: savedComment.show_location, 
      isFlagged: savedComment.is_flagged
    });
  } catch (error) {
    console.error('Post comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/comments/:videoId/:commentId/interact', async (req, res) => {
  const { videoId, commentId } = req.params;
  const { action, userId } = req.body; // 'like', 'dislike', 'report'

  try {
    const comment = await Comment.findOne({ id: commentId, video_id: videoId });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    
    const userIdentifier = userId || 'anonymous-' + req.ip;

    if (action === 'like') {
      if (comment.likedBy && comment.likedBy.includes(userIdentifier)) {
        comment.likedBy = comment.likedBy.filter(id => id !== userIdentifier);
        comment.likes = Math.max(0, comment.likes - 1);
      } else {
        if (!comment.likedBy) comment.likedBy = [];
        comment.likedBy.push(userIdentifier);
        comment.likes += 1;
        if (comment.dislikedBy && comment.dislikedBy.includes(userIdentifier)) {
          comment.dislikedBy = comment.dislikedBy.filter(id => id !== userIdentifier);
          comment.dislikes = Math.max(0, comment.dislikes - 1);
        }
      }
    } else if (action === 'dislike') {
      if (comment.dislikedBy && comment.dislikedBy.includes(userIdentifier)) {
        comment.dislikedBy = comment.dislikedBy.filter(id => id !== userIdentifier);
        comment.dislikes = Math.max(0, comment.dislikes - 1);
      } else {
        if (!comment.dislikedBy) comment.dislikedBy = [];
        comment.dislikedBy.push(userIdentifier);
        comment.dislikes += 1;
        if (comment.likedBy && comment.likedBy.includes(userIdentifier)) {
          comment.likedBy = comment.likedBy.filter(id => id !== userIdentifier);
          comment.likes = Math.max(0, comment.likes - 1);
        }
      }
    } else if (action === 'report') {
      comment.reports += 1;
      comment.is_flagged = true;

      // Also log into Report collection for user report history
      if (userId) {
        try {
          const userObj = await User.findOne({ id: userId });
          const existingRep = await Report.findOne({ reporterId: userId, targetId: comment.id });
          if (!existingRep) {
            const newRep = new Report({
              id: 'rep_' + Date.now().toString(),
              reporterId: userId,
              reporterName: userObj ? (userObj.name || userObj.username) : 'User',
              targetType: 'comment',
              targetId: comment.id,
              targetTitle: comment.text ? comment.text.slice(0, 80) : 'Comment',
              targetThumbnail: comment.avatar || '',
              targetChannel: comment.username || 'Commenter',
              reason: req.body.reason || 'Harmful, Abusive or Inappropriate Comment',
              details: req.body.details || 'Reported from video comment stream.',
              status: 'Under Review',
              statusNote: 'Our Trust & Safety team is reviewing this reported comment against our Community Guidelines.',
              reportedAt: new Date()
            });
            await newRep.save();
          }
        } catch (repErr) {
          console.error('Failed to log comment report:', repErr);
        }
      }
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const updated = await comment.save();
    res.json({
      ...updated._doc, 
      showLocation: updated.show_location, 
      isFlagged: updated.is_flagged
    });
  } catch (error) {
    console.error('Interact comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/translate', async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });
  
  try {
    const { translate } = await import('@vitalets/google-translate-api');
    const result = await translate(text, { to: targetLang || 'en' });
    res.json({ translatedText: result.text });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

app.post('/api/download', async (req, res) => {
  const { userId, videoId } = req.body;
  try {
    const user = await User.findOne({ id: userId });
    const video = await Video.findOne({ id: videoId });
    
    if (!user || !video) {
      return res.status(400).json({ error: 'Invalid user or video' });
    }

    const today = new Date().toDateString();
    const downloads = user.downloads || [];
    const downloadsToday = downloads.filter(d => new Date(d.date).toDateString() === today);

    const limits = {
      'free': 1,
      'bronze': 3,
      'silver': 10,
      'gold': Infinity
    };

    const userLimit = limits[user.plan] || 0;

    if (downloadsToday.length >= userLimit) {
      return res.status(403).json({ 
        error: `${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} plan daily limit reached (${userLimit} downloads). Upgrade your plan to download more.` 
      });
    }

    const downloadRecord = {
      id: Date.now().toString(),
      videoId: video.id,
      title: video.title,
      date: new Date().toISOString()
    };

    user.downloads.unshift(downloadRecord);
    await user.save();
    
    res.json({ success: true, url: video.url, download: downloadRecord });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/update-plan', async (req, res) => {
  const { userId, newPlan } = req.body;
  
  const validPlans = ['free', 'bronze', 'silver', 'gold'];
  if (!validPlans.includes(newPlan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    const user = await User.findOneAndUpdate({ id: userId }, { plan: newPlan }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user: { id: user.id, name: user.name, plan: user.plan, email: user.email } });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/init-upgrade', async (req, res) => {
  const { planId } = req.body;
  
  const planPrices = {
    'bronze': 499, // ₹499
    'silver': 999, // ₹999
    'gold': 1499   // ₹1499
  };

  const amount = planPrices[planId];
  if (!amount) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  try {
    const options = {
      amount: amount * 100, // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Razorpay Error:', error);
    res.status(500).json({ error: error.message || error.error?.description || 'Payment initialization failed' });
  }
});

app.post('/api/confirm-upgrade', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planId } = req.body;
  
  try {
    const user = await User.findOne({ id: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
    
    // Verify signature
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      // Payment is successful
      user.plan = planId;
      await user.save();
      
      // Send Email Invoice
      if (BREVO_API_KEY) {
        const subject = `Payment Successful - Upgrade to ${planId.toUpperCase()}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #4CAF50; text-align: center;">Payment Successful!</h2>
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>Thank you for upgrading your plan. Your account has been successfully upgraded to the <strong>${planId.toUpperCase()}</strong> plan.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #555;">Order ID:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${razorpay_order_id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555;">Payment ID:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${razorpay_payment_id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555;">Plan:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; text-transform: capitalize;">${planId}</td>
              </tr>
            </table>
            <br/>
            <p style="text-align: center; color: #888; font-size: 12px;">Enjoy unlimited streaming and more features!</p>
          </div>
        `;

        const { data, error } = await sendBrevoEmail(user.email, subject, html, null);
        
        if (error) {
          console.error('Error sending invoice email with Brevo:', error);
        } else {
          console.log('Invoice email sent with Brevo messageId:', data?.messageId);
        }
      }

      res.json({ success: true, user: { id: user.id, name: user.name, plan: user.plan, email: user.email } });
    } else {
      res.status(400).json({ error: 'Invalid signature. Payment verification failed.' });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- SIGNALING LOGIC ---
const rooms = new Map();
const roomVideos = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userName, videoId) => {
    socket.join(roomId);
    
    const participant = { id: socket.id, name: userName || 'Anonymous' };
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, []);
      if (videoId) {
        roomVideos.set(roomId, videoId);
      }
    } else if (videoId && !roomVideos.get(roomId)) {
      roomVideos.set(roomId, videoId);
    }
    
    const roomParticipants = rooms.get(roomId);
    roomParticipants.push(participant);

    socket.to(roomId).emit('user-joined', participant);
    socket.emit('room-participants', roomParticipants);
    
    const currentVideoId = roomVideos.get(roomId);
    if (currentVideoId) {
      socket.emit('set-video', currentVideoId);
    }

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      socket.leave(roomId);
      
      const participants = rooms.get(roomId) || [];
      const updatedParticipants = participants.filter(p => p.id !== socket.id);
      
      if (updatedParticipants.length === 0) {
        rooms.delete(roomId);
        roomVideos.delete(roomId);
      } else {
        rooms.set(roomId, updatedParticipants);
      }
      
      socket.to(roomId).emit('user-left', socket.id);
    });
  });

  socket.on('set-room-video', (roomId, videoId) => {
    roomVideos.set(roomId, videoId);
    io.to(roomId).emit('set-video', videoId);
  });

  socket.on('offer', (payload) => {
    io.to(payload.target).emit('offer', { caller: socket.id, sdp: payload.sdp });
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', { caller: socket.id, sdp: payload.sdp });
  });

  socket.on('ice-candidate', (payload) => {
    io.to(payload.target).emit('ice-candidate', { sender: socket.id, candidate: payload.candidate });
  });

  socket.on('send-message', (payload) => {
    io.to(payload.roomId).emit('receive-message', { ...payload, senderId: socket.id });
  });

  socket.on('video-action', (payload) => {
    // payload should contain { roomId, action, currentTime }
    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(payload.roomId).emit('video-action', { ...payload, senderId: socket.id });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
