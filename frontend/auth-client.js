import { createAuthClient } from 'better-auth/client';
import { adminClient } from 'better-auth/client/plugins';

const TOKEN_KEY = 'openform_token';
let token = localStorage.getItem(TOKEN_KEY) || null;

export function setToken(t) {
  token = t;
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* localStorage unavailable (private mode etc.) — session just won't persist across reloads */
  }
}

export function getToken() {
  return token;
}

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || '',
  plugins: [adminClient()],
  fetchOptions: {
    auth: {
      type: 'Bearer',
      token: () => token || '',
    },
  },
});
