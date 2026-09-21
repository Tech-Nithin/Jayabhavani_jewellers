import { Router, Request, Response } from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase';
import { sendOtpEmail } from '../services/emailService';

dotenv.config();

const router = Router();
const SERVER_SECRET = process.env.JWT_SECRET || 'JBJ_ENTERPRISE_SECRET_KEY_2026';
const TOKEN_EXPIRY_DAYS = 7; // Token valid for 7 days
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout

// Local fallback path for storing bcrypt credentials safely
const CREDENTIALS_FILE = path.join(__dirname, '..', '..', '.admin_credentials.json');

// Memory stores
interface AttemptTracker {
  attempts: number;
  lockExpiresAt: number;
}
const loginAttempts = new Map<string, AttemptTracker>();
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Helper: Get configured admin emails
function isAuthorizedAdminEmail(inputEmail: string): boolean {
  const normalized = inputEmail.trim().toLowerCase();
  
  // 1. Check current env variable
  const envEmail = (process.env.ADMIN_EMAIL || 'jayabhavanijewellers2021@gmail.com').trim().toLowerCase();
  if (normalized === envEmail || normalized === 'jayabhavani@gmail.com' || normalized === 'jayabhavanijewellers2021@gmail.com') {
    return true;
  }

  // 2. Check local credentials file
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
      if (parsed.email && parsed.email.trim().toLowerCase() === normalized) {
        return true;
      }
    }
  } catch (err) {
    // Ignore read error
  }

  return false;
}

function getConfiguredAdminEmail(): string {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
      if (parsed.email) return parsed.email.trim().toLowerCase();
    }
  } catch (e) {}
  return (process.env.ADMIN_EMAIL || 'jayabhavanijewellers2021@gmail.com').trim().toLowerCase();
}

// Helper: Load stored password hash
async function getStoredPasswordHash(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Try Supabase admin_auth table
  try {
    const { data, error } = await supabase
      .from('admin_auth')
      .select('password_hash')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!error && data?.password_hash) {
      return data.password_hash;
    }
  } catch (err) {
    // Supabase table might not exist yet; proceed to local file
  }

  // 2. Try local credentials file
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.email === normalizedEmail && parsed.password_hash) {
        return parsed.password_hash;
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not read local credentials file:', err);
  }

  // 3. Fallback: Hash the env password and store it
  const defaultPlainPassword = process.env.ADMIN_PASSWORD || 'Jayabhavani@123';
  const defaultHash = await bcrypt.hash(defaultPlainPassword, 10);
  await saveStoredPasswordHash(normalizedEmail, defaultHash);
  return defaultHash;
}

// Helper: Save password hash
async function saveStoredPasswordHash(email: string, passwordHash: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Save to local fallback file
  try {
    const payload = {
      email: normalizedEmail,
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    };
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️ Could not write local credentials file:', err);
  }

  // 2. Save to Supabase admin_auth table if available
  try {
    const { error } = await supabase
      .from('admin_auth')
      .upsert({
        email: normalizedEmail,
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

    if (error) {
      console.warn('⚠️ Supabase admin_auth upsert notice:', error.message);
    }
  } catch (err) {
    // Supabase table might not exist yet
  }
}

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

// Helper: Verify server-signed token
function verifySecureToken(token: string): { valid: boolean; email?: string } {
  try {
    const decodedStr = Buffer.from(token, 'base64').toString('utf8');
    const { payload, signature } = JSON.parse(decodedStr);

    if (!payload || !signature || !payload.email || !payload.expiresAt) {
      return { valid: false };
    }

    if (Date.now() > payload.expiresAt) {
      return { valid: false };
    }

    const expectedSignature = crypto.createHmac('sha256', SERVER_SECRET).update(JSON.stringify(payload)).digest('hex');
    if (signature !== expectedSignature) {
      return { valid: false };
    }

    return { valid: true, email: payload.email };
  } catch (err) {
    return { valid: false };
  }
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  dotenv.config();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  const normalizedInputEmail = String(email).trim().toLowerCase();
  const configuredEmail = getConfiguredAdminEmail();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-ip';
  const trackerKey = `${clientIp}_${normalizedInputEmail}`;

  const now = Date.now();
  let tracker = loginAttempts.get(trackerKey) || { attempts: 0, lockExpiresAt: 0 };

  // 1. Check if currently locked out
  if (tracker.lockExpiresAt > now) {
    const remainingSeconds = Math.ceil((tracker.lockExpiresAt - now) / 1000);
    return res.status(429).json({
      success: false,
      locked: true,
      lockRemainingSeconds: remainingSeconds,
      message: `Login attempts reached. Please wait ${remainingSeconds} seconds to try again.`,
    });
  }

  // 2. Check Unauthorized Email
  if (!isAuthorizedAdminEmail(normalizedInputEmail)) {
    return res.status(401).json({
      success: false,
      unauthorized: true,
      message: 'Unauthorised access',
    });
  }

  // 3. Verify Password using Bcrypt
  const storedHash = await getStoredPasswordHash(normalizedInputEmail);
  const isMatch = await bcrypt.compare(String(password), storedHash);

  if (isMatch) {
    // Reset tracker on success
    loginAttempts.delete(trackerKey);

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

  // 4. Invalid Password Handling (Increment attempt count)
  tracker.attempts += 1;

  if (tracker.attempts >= MAX_ATTEMPTS) {
    tracker.lockExpiresAt = now + LOCKOUT_DURATION_MS;
    tracker.attempts = 0; // Reset attempts for when lock expires
    loginAttempts.set(trackerKey, tracker);

    return res.status(429).json({
      success: false,
      locked: true,
      lockRemainingSeconds: 60,
      message: 'Login attempts reached. Please wait 60 seconds to try again.',
    });
  }

  loginAttempts.set(trackerKey, tracker);

  return res.status(401).json({
    success: false,
    attempts: tracker.attempts,
    maxAttempts: MAX_ATTEMPTS,
    message: `Invalid email or password. (Attempt ${tracker.attempts} of ${MAX_ATTEMPTS})`,
  });
});

// POST /api/auth/forgot-password/send-otp
router.post('/forgot-password/send-otp', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required.',
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (!isAuthorizedAdminEmail(normalizedEmail)) {
    return res.status(401).json({
      success: false,
      unauthorized: true,
      message: 'Unauthorised access. This email is not registered as an administrator.',
    });
  }

  // Generate 6-digit random OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(normalizedEmail, { otp, expiresAt });

  // Send email via Resend
  const emailResult = await sendOtpEmail(normalizedEmail, otp);

  if (!emailResult.success) {
    return res.status(500).json({
      success: false,
      message: emailResult.message || 'Failed to dispatch OTP email. Please try again.',
    });
  }

  return res.status(200).json({
    success: true,
    message: emailResult.message || 'OTP has been dispatched to your email address.',
  });
});

// POST /api/auth/forgot-password/verify-and-reset
router.post('/forgot-password/verify-and-reset', async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email, OTP code, and new password are required.',
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (!isAuthorizedAdminEmail(normalizedEmail)) {
    return res.status(401).json({
      success: false,
      unauthorized: true,
      message: 'Unauthorised access',
    });
  }

  const storedOtpData = otpStore.get(normalizedEmail);

  if (!storedOtpData) {
    return res.status(400).json({
      success: false,
      message: 'No active OTP request found for this email. Please request a new OTP.',
    });
  }

  if (Date.now() > storedOtpData.expiresAt) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({
      success: false,
      message: 'The OTP has expired. Please request a new one.',
    });
  }

  if (String(otp).trim() !== storedOtpData.otp) {
    return res.status(400).json({
      success: false,
      message: 'Invalid OTP code. Please check your email and try again.',
    });
  }

  // Password length validation
  if (String(newPassword).length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long.',
    });
  }

  // Hash new password using bcrypt
  const newHash = await bcrypt.hash(String(newPassword), 10);
  await saveStoredPasswordHash(normalizedEmail, newHash);

  // Clear OTP
  otpStore.delete(normalizedEmail);

  // Clear any lockout trackers
  for (const key of loginAttempts.keys()) {
    if (key.includes(normalizedEmail)) {
      loginAttempts.delete(key);
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Password reset successfully! You can now log in with your new password.',
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

  const configuredEmail = getConfiguredAdminEmail();

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

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const { token } = req.body || {};
  console.log(`🔒 User logout request processed successfully.`);
  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

export default router;
