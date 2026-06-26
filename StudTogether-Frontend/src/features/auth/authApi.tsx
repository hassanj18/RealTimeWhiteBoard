
export interface AuthUser {
  id?: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

type BackendAuthResponse = {
  success: boolean;
  data: {
    accessToken: string;
    user: AuthUser;
  };
};

function getApiBaseUrl() {
  return (import.meta as any).env?.VITE_API_URL ?? "http://192.168.100.23:80";
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log('[Auth Error] Raw response:', text);
    
    // Try to parse structured error response
    try {
      const errorData = JSON.parse(text);
      console.log('[Auth Error] Parsed error data:', errorData);
      
      if (errorData.error?.message) {
        console.log('[Auth Error] Using error.message:', errorData.error.message);
        throw new Error(errorData.error.message);
      }
      
      // If we reach here, JSON parsed but no error.message found
      console.log('[Auth Error] No error.message found in parsed data');
    } catch (parseError) {
      console.log('[Auth Error] Parse failed:', parseError);
      
      // If parsing fails, check if it's a common error
      if (text.includes('INVALID_CREDENTIALS')) {
        throw new Error('Email or password is incorrect');
      }
      
      // For other cases, use a generic message
      if (text.includes('success') && text.includes('false')) {
        throw new Error('Authentication failed');
      }
    }
    
    // Last resort - don't show raw JSON to user
    throw new Error('Login failed. Please check your credentials.');
  }

  return (await res.json()) as T;
}

export function login(params: { email: string; password: string }) {
  return postJson<BackendAuthResponse>("/auth/login", params).then((r) => ({
    token: r.data.accessToken,
    user: r.data.user,
  }));
}

export function signup(params: { name?: string; email: string; password: string }) {
  return postJson<BackendAuthResponse>("/auth/signup", params).then((r) => ({
    token: r.data.accessToken,
    user: r.data.user,
  }));
}
