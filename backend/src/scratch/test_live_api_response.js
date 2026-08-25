const http = require('http');

http.get('http://localhost:5000/api/billing/accounts/day-book?section=all&date=2026-08-25', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('=== LIVE API RESPONSE FOR billingActivitySummary.orderMode ===');
      console.log(JSON.stringify(json.billingActivitySummary?.orderMode, null, 2));
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
    }
  });
}).on('error', (e) => {
  console.error('HTTP request failed:', e.message);
});
