const fs = require('fs');

const path = 'client/src/context/UserContext.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/'http:\/\/localhost:3001\/api/g, '`${API_URL}/api');
content = content.replace(/\$\{API_URL\}\/api\/login'/g, '${API_URL}/api/login`');
content = content.replace(/\$\{API_URL\}\/api\/verify-otp'/g, '${API_URL}/api/verify-otp`');
content = content.replace(/\$\{API_URL\}\/api\/update-theme'/g, '${API_URL}/api/update-theme`');
content = content.replace(/\$\{API_URL\}\/api\/update-plan'/g, '${API_URL}/api/update-plan`');
content = content.replace(/\$\{API_URL\}\/api\/init-upgrade'/g, '${API_URL}/api/init-upgrade`');
content = content.replace(/\$\{API_URL\}\/api\/confirm-upgrade'/g, '${API_URL}/api/confirm-upgrade`');
content = content.replace(/\$\{API_URL\}\/api\/channel\/update'/g, '${API_URL}/api/channel/update`');

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
