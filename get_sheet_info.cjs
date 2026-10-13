const https = require('https');
const url = 'https://docs.google.com/spreadsheets/d/1PCnmdtlFYmMVbPpgk_TlFUZssxt0BtZ4rRHdKMyTkd0/edit?usp=sharing';

https.get(url, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const gids = data.match(/gid=(\d+)/g);
    console.log('GIDs found:', Array.from(new Set(gids || [])));
    
    // Look for bootstrap data
    const match = data.match(/bootstrapData\s*=\s*({.+?});/s);
    if (match) {
      console.log('Found bootstrapData!');
    }
  });
});
