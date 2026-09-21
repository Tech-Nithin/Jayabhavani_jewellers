import { API_BASE } from '../config/apiConfig';

const API_BASE_URL = API_BASE;

export interface LoginResponse {
  success: boolean;
  message: string;
  attempts?: number;
  maxAttempts?: number;
  locked?: boolean;
  lockRemainingSeconds?: number;
  unauthorized?: boolean;
  user?: {
    email: string;
    name: string;
    role: string;
  };
  token?: string;
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      message: 'Network error. Could not connect to authentication server.',
    };
  }
}

export async function sendForgotPasswordOtp(email: string): Promise<{ success: boolean; message: string; unauthorized?: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      message: 'Network error. Failed to send OTP.',
    };
  }
}

export async function resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string; unauthorized?: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/verify-and-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp, newPassword }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      message: 'Network error. Failed to reset password.',
    };
  }
}

export async function verifySessionApi(token: string): Promise<{ success: boolean; user?: { email: string; name: string; role: string } }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false };
  }
}

export async function logoutUserApi(token?: string): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: token || '' }),
    });
    return await response.json();
  } catch (error) {
    return { success: false };
  }
}
