import { Router, Request, Response } from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const router = Router();
const SERVER_SECRET = process.env.JWT_SECRET || 'JBJ_ENTERPRISE_SECRET_KEY_2026';
const TOKEN_EXPIRY_DAYS = 7; // Token valid for 7 days

// Helper: Generate secure server-signed token
function generateSecureToken(email: string): string {
  const payload = {
    email: email.trim().toLowerCase(),
    createdAt: Date.now(),
    expiresAt: Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
  const payloadStr = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', SERVER_SECRET).update(payloadStr).digest('hex');
  
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64');
}

// Helper: Verify server-signed token on backend
function verifySecureToken(token: string): { valid: boolean; email?: string } {
  try {
    const decodedStr = Buffer.from(token, 'base64').toString('utf8');
    const { payload, signature } = JSON.parse(decodedStr);

    if (!payload || !signature || !payload.email || !payload.expiresAt) {
      return { valid: false };
    }

    // Check expiration on server
    if (Date.now() > payload.expiresAt) {
      return { valid: false };
    }

    // Re-calculate signature on server to detect tampering
    const expectedSignature = crypto.createHmac('sha256', SERVER_SECRET).update(JSON.stringify(payload)).digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false }; // Signature mismatch - stolen or forged token!
    }

    return { valid: true, email: payload.email };
  } catch (err) {
    return { valid: false };
  }
}

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  dotenv.config();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  const normalizedInputEmail = String(email).trim().toLowerCase();
  const configuredEmail = (process.env.ADMIN_EMAIL || 'jayabhavani@gmail.com').trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD || 'Jayabhavani@123';

  if (normalizedInputEmail === configuredEmail && password === configuredPassword) {
    const token = generateSecureToken(configuredEmail);
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        email: configuredEmail,
        name: 'Jaya Bhavani Admin',
        role: 'admin',
      },
      token,
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid email or password',
  });
});

// POST /api/auth/verify-session
router.post('/verify-session', (req: Request, res: Response) => {
  dotenv.config();
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No session token provided',
    });
  }

  const verification = verifySecureToken(token);

  if (!verification.valid || !verification.email) {
    return res.status(401).json({
      success: false,
      message: 'Invalid, forged, or expired session token',
    });
  }

  const configuredEmail = (process.env.ADMIN_EMAIL || 'jayabhavani@gmail.com').trim().toLowerCase();

  if (verification.email !== configuredEmail) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized email session',
    });
  }

  return res.status(200).json({
    success: true,
    user: {
      email: configuredEmail,
      name: 'Jaya Bhavani Admin',
      role: 'admin',
    },
  });
});

export default router;
