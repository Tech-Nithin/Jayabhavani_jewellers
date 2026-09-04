const fs = require('fs');
const filePath = 'f:/Projects/JBJ/backend/src/billing-backend/routes/billingRoutes.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove remainder of POST /rates before router.post('/calculate'
const startMarker1 = 'let invoicesList: any[] = [];';
const endMarker1 = '// POST /api/billing/calculate - 100% Server-side multi-item & single-item calculation engine';

const s1 = content.indexOf(startMarker1);
const e1 = content.indexOf(endMarker1);

if (s1 !== -1 && e1 !== -1) {
  content = content.slice(0, s1 + startMarker1.length) + '\n\n' + content.slice(e1);
}

// 2. Remove dead router.post('/invoices/:id/payment'
const startMarker2 = '// POST /api/billing/invoices/:id/payment - Record an installment payment for an invoice';
const endMarker2 = '// GET /api/billing/presets - Fetch presets 100% directly from billing_presets database table';

const s2 = content.indexOf(startMarker2);
const e2 = content.indexOf(endMarker2);

if (s2 !== -1 && e2 !== -1) {
  content = content.slice(0, s2) + content.slice(e2);
}

// Ensure supabase and memoryCache imports are present at top
if (!content.includes("import { supabase } from '../../config/supabase';")) {
  content = "import { supabase } from '../../config/supabase';\nimport { memoryCache } from '../../config/memoryCache';\n" + content;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully cleaned billingRoutes.ts');
