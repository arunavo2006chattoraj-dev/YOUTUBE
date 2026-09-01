const fs = require('fs');

const path = 'server/index.js';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Find the index of "// nodemailer.createTestAccount"
const startIndex = lines.findIndex(line => line.includes('// nodemailer.createTestAccount'));
// Find the index of "app.use(cors());"
const endIndex = lines.findIndex(line => line.includes('app.use(cors());'));

if (startIndex !== -1 && endIndex !== -1) {
  // Remove lines from startIndex up to (but not including) endIndex
  lines.splice(startIndex, endIndex - startIndex);
  fs.writeFileSync(path, lines.join('\n'), 'utf8');
  console.log('Fixed syntax');
} else {
  console.log('Could not find indices');
}
