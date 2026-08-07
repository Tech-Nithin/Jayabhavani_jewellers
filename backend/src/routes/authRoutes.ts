import { Router, Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  dotenv.config(); // Reload env vars if changed
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

  // Case-insensitive email check & exact password check
  if (normalizedInputEmail === configuredEmail && password === configuredPassword) {
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        email: configuredEmail,
        name: 'Jaya Bhavani Admin',
        role: 'admin',
      },
      token: 'jb_token_' + Date.now(),
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid email or password',
  });
});

export default router;
