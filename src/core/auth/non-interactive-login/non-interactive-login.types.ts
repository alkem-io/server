export type NonInteractiveLoginRequest = {
  email: string;
  password: string;
};

export type NonInteractiveLoginResponse = {
  api_token: string;
  expires_at: number; // unix seconds
  token_type: 'Bearer';
};

export type NonInteractiveLoginClaims = {
  iss: 'alkemio-non-interactive-login';
  sub: string; // Kratos identity id
  alkemio_actor_id: string;
  non_interactive_login: true;
  iat: number;
  exp: number;
};

export const NON_INTERACTIVE_LOGIN_ISSUER = 'alkemio-non-interactive-login';
