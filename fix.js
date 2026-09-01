const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) { 
      results.push(file);
    }
  });
  return results;
}
const files = walk('./client/src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Only replace strings exactly matching 'http://localhost:3001/...' or "..." or ...
  // that are NOT already in a fallback like || 'http://localhost:3001'
  
  // We can just replace the exact literal 'http://localhost:3001' with the literal Render URL
  // because if they need localhost, they can use .env.
  // Wait, let's replace:
  // 'http://localhost:3001
  // "http://localhost:3001
  // http://localhost:3001
  
  content = content.replace(/http:\/\/localhost:3001/g, 'https://youtube-uz4d.onrender.com');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
