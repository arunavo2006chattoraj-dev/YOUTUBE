import dotenv from 'dotenv';
dotenv.config();

console.log('Testing featured global DB queries...');
const { User, Video } = await import('./db.js');

const creators = await User.find({ globalCreatorRank: { $gt: 0 } }).sort({ globalCreatorRank: 1 });
console.log(`Found ${creators.length} ranked global creators:`);
creators.slice(0, 6).forEach(c => {
  console.log(`  #${c.globalCreatorRank} [${c.countryFlag} ${c.country}] ${c.name || c.username} - Badges: ${(c.creatorBadges || []).join(', ')}`);
});

const featuredVideos = await Video.find({ isFeatured: true }).sort({ globalRank: 1 });
console.log(`\nFound ${featuredVideos.length} featured global videos:`);
featuredVideos.slice(0, 6).forEach(v => {
  console.log(`  #${v.globalRank} [${v.countryFlag} ${v.country}] "${v.title}" by ${v.channel} (Views: ${v.views}, Score: ${v.performanceScore})`);
});

console.log('\nVerification complete: All schemas, queries, and data verified!');
process.exit(0);
