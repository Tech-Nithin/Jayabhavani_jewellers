import dotenv from 'dotenv';

export interface SendOtpEmailResult {
  success: boolean;
  message: string;
  messageId?: string;
}

/**
 * Dispatches an OTP verification email using the Resend API.
 * @param toEmail The recipient's email address
 * @param otp The 6-digit OTP code
 */
export async function sendOtpEmail(toEmail: string, otp: string): Promise<SendOtpEmailResult> {
  dotenv.config();
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Jaya Bhavani Jewellers <noreply@jayabhavanijewellers.in>';

  if (!apiKey) {
    console.warn('⚠️ RESEND_API_KEY is not configured in backend/.env. OTP for testing:', otp);
    return {
      success: true,
      message: 'RESEND_API_KEY is missing in .env. (OTP logged to server console for testing: ' + otp + ')',
    };
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Admin Verification OTP - Jaya Bhavani Jewellers</title>
      <style>
        body { font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif; background-color: #080503; margin: 0; padding: 24px 12px; color: #f8f4ee; }
        .wrapper { max-width: 520px; margin: 0 auto; background: #120d09; border-radius: 20px; border: 1px solid rgba(212, 175, 55, 0.45); overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.85); }
        .header { background: linear-gradient(135deg, #1c130c 0%, #0d0805 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.3); }
        .brand-title { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1.5px; color: #f8f4ee; text-transform: uppercase; font-family: Georgia, serif; }
        .brand-subtitle { margin: 6px 0 0 0; font-size: 12px; color: #d4af37; letter-spacing: 1px; text-transform: uppercase; font-weight: 600; }
        .content { padding: 36px 28px; text-align: center; }
        .greeting { font-size: 16px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; }
        .info { font-size: 14px; color: #cbbba9; line-height: 1.6; margin-bottom: 24px; }
        .otp-container { background: rgba(212, 175, 55, 0.08); border: 2px solid #d4af37; border-radius: 16px; padding: 20px 10px; margin: 24px 0; box-shadow: 0 0 25px rgba(212, 175, 55, 0.2); }
        .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #d4af37; font-weight: 700; margin-bottom: 8px; }
        .otp-box { font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #fbbf24; font-family: 'Courier New', monospace; }
        .badge { display: inline-block; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; margin-top: 10px; }
        .warning { font-size: 12px; color: #8e8071; margin-top: 28px; line-height: 1.5; }
        .footer { background: #0b0705; border-top: 1px solid rgba(212, 175, 55, 0.2); padding: 18px 24px; text-align: center; font-size: 11px; color: #786d62; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="brand-title">Jaya Bhavani Jewellers</h1>
          <p class="brand-subtitle">Administrator Security Verification</p>
        </div>
        <div class="content">
          <div class="greeting">Password Reset Verification</div>
          <p class="info">We received a request to reset your administrator credentials. Use the following One-Time Password (OTP) to verify your identity and set a new password:</p>
          
          <div class="otp-container">
            <div class="otp-label">Your 6-Digit OTP Code</div>
            <div class="otp-box">${otp}</div>
          </div>
          
          <div class="badge">⏱️ Valid for 10 minutes only</div>
          
          <p class="warning">
            🔒 <strong>Security Warning:</strong> Never share this OTP with anyone. If you did not initiate this request, your account is still secure, but please review your security settings.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Jaya Bhavani Jewellers Management System &bull; All Rights Reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail.trim().toLowerCase()],
        subject: `Your Password Reset OTP: ${otp} - Jaya Bhavani Jewellers`,
        html: emailHtml,
      }),
    });

    const data: any = await res.json();

    if (!res.ok) {
      console.error('❌ Resend API Error:', data);
      return {
        success: false,
        message: data.message || 'Failed to dispatch OTP email via Resend.',
      };
    }

    console.log(`✉️ OTP email successfully sent to ${toEmail} via Resend. Message ID: ${data.id}`);
    return {
      success: true,
      message: 'OTP sent successfully to your email.',
      messageId: data.id,
    };
  } catch (err: any) {
    console.error('❌ Failed to connect to Resend API:', err);
    return {
      success: false,
      message: err?.message || 'Network error connecting to email service.',
    };
  }
}
