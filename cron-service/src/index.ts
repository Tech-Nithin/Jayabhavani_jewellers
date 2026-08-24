import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { executeEodClosingAndTomorrowOpening } from './cronJobLogic';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY || 'jbj_eod_cron_secret_2026';

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get(['/', '/health'], (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'JBJ Standalone EOD Daily Closing & Opening Cron Microservice',
    timestamp: new Date().toISOString(),
    triggerEndpoint: '/api/trigger-eod-cron',
  });
});

// Option 2 Webhook Endpoint: Trigger EOD Cron via HTTP Ping (cron-job.org / Render Cron / Vercel Cron)
const handleEodTrigger = async (req: Request, res: Response) => {
  try {
    // Validate Secret Token
    const authHeader = req.headers.authorization || '';
    const querySecret = String(req.query.secret || req.query.token || '');
    const headerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (CRON_SECRET_KEY && CRON_SECRET_KEY !== 'none') {
      const isValid = headerToken === CRON_SECRET_KEY || querySecret === CRON_SECRET_KEY;
      if (!isValid) {
        console.warn('⛔ [Cron Trigger] Unauthorized trigger attempt.');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized. Invalid CRON_SECRET_KEY token or secret query param.',
        });
      }
    }

    const targetDate = req.query.date ? String(req.query.date).trim() : undefined;
    console.log(`⚡ [Cron Trigger] Received webhook ping. Executing EOD Cron${targetDate ? ` for date ${targetDate}` : ''}...`);

    const result = await executeEodClosingAndTomorrowOpening(targetDate);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (err: any) {
    console.error('❌ [Cron Trigger] Server Error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error during EOD execution.',
    });
  }
};

app.post('/api/trigger-eod-cron', handleEodTrigger);
app.get('/api/trigger-eod-cron', handleEodTrigger);

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 JBJ EOD Cron Service is live on port ${PORT}`);
  console.log(`🔗 Webhook Trigger URL: http://localhost:${PORT}/api/trigger-eod-cron?secret=${CRON_SECRET_KEY}`);
  console.log(`=======================================================`);
});
