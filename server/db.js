const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Define Schemas
const userSchema = mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String },
  plan: { type: String },
  theme: { type: String },
  banner: { type: String, default: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80' },
  avatar: { type: String },
  bio: { type: String, default: 'Welcome to my official channel!' },
  subscribers: {
    type: [{
      userId: String,
      username: String,
      avatar: String,
      date: { type: Date, default: Date.now }
    }],
    default: []
  },
  subscriptions: { type: [String], default: [] },
  known_devices: { type: Array, default: [] },
  downloads: { type: Array, default: [] },
  country: { type: String, default: 'Global' },
  countryCode: { type: String, default: 'GL' },
  countryFlag: { type: String, default: '🌐' },
  creatorBadges: { type: [String], default: [] },
  globalCreatorRank: { type: Number, default: 0 },
  featuredScore: { type: Number, default: 0 }
}, { timestamps: true });

const videoSchema = mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String },
  url: { type: String },
  thumbnail: { type: String },
  channel: { type: String },
  channel_avatar: { type: String },
  views: { type: String, default: '0 views' },
  viewsCount: { type: Number, default: 0 },
  timestamp: { type: String, default: 'Just now' },
  description: { type: String },
  tags: { type: [String], default: [] },
  likesCount: { type: Number, default: 0 },
  country: { type: String, default: 'Global' },
  countryCode: { type: String, default: 'GL' },
  countryFlag: { type: String, default: '🌐' },
  region: { type: String, default: 'Global' },
  category: { type: String, default: 'General' },
  categoryRank: { type: Number, default: 0 },
  categoryIcon: { type: String, default: '🎬' },
  isFeatured: { type: Boolean, default: false },
  isShort: { type: Boolean, default: false },
  globalRank: { type: Number, default: 0 },
  featuredBadge: { type: String, default: '' },
  performanceScore: { type: Number, default: 0 },
  duration: { type: String, default: '10:00' },
  isShort: { type: Boolean, default: false }
}, { timestamps: true });

const commentSchema = mongoose.Schema({
  id: { type: String, required: true, unique: true },
  video_id: { type: String, required: true },
  username: { type: String },
  avatar: { type: String },
  text: { type: String },
  timestamp: { type: String },
  created_at: { type: Number },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] },
  dislikedBy: { type: [String], default: [] },
  reports: { type: Number, default: 0 },
  location: { type: String },
  show_location: { type: Boolean, default: false },
  is_flagged: { type: Boolean, default: false }
}, { timestamps: true });

const reportSchema = mongoose.Schema({
  id: { type: String, required: true, unique: true },
  reporterId: { type: String, required: true },
  reporterName: { type: String, default: 'Anonymous' },
  targetType: { type: String, enum: ['video', 'comment', 'channel'], default: 'video' },
  targetId: { type: String, required: true },
  targetTitle: { type: String, default: '' },
  targetThumbnail: { type: String, default: '' },
  targetChannel: { type: String, default: '' },
  reason: { type: String, required: true },
  details: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Under Review', 'Action Taken', 'Resolved', 'Dismissed'], 
    default: 'Under Review' 
  },
  statusNote: { type: String, default: 'Our Trust & Safety team is currently investigating this report against our Community Guidelines.' },
  reportedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
}, { timestamps: true });

const playlistSchema = mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  isPublic: { type: Boolean, default: false },
  videos: { type: [String], default: [] } // Array of video IDs
}, { timestamps: true });

const postSchema = mongoose.Schema({
  id: { type: String, required: true, unique: true },
  channelName: { type: String, required: true },
  channelAvatar: { type: String },
  content: { type: String, required: true },
  image: { type: String },
  likesCount: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Video = mongoose.model('Video', videoSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Report = mongoose.model('Report', reportSchema);
const Playlist = mongoose.model('Playlist', playlistSchema);
const Post = mongoose.model('Post', postSchema);

module.exports = { connectDB, User, Video, Comment, Report, Playlist, Post };
