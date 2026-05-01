export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
};

export type RefreshResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type MeResponse = AuthUser & {
  is_active: boolean;
  created_at: string;
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  status_code?: number;
};
