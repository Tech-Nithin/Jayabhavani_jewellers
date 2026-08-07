const API_BASE_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

export interface LoginResponse {
  success: boolean;
  message: string;
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
