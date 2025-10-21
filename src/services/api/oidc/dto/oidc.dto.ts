export class LoginChallengeQueryDto {
  login_challenge!: string;
}

export class ConsentChallengeQueryDto {
  consent_challenge!: string;
}

export class LogoutChallengeQueryDto {
  logout_challenge!: string;
}

export class LoginChallengeResponseDto {
  challenge!: string;
  skip!: boolean;
  subject!: string;
  requested_scope?: string[];
  client?: {
    client_id: string;
    client_name: string;
  };
}

export class ConsentChallengeResponseDto {
  challenge!: string;
  skip!: boolean;
  subject!: string;
  requested_scope!: string[];
  client!: {
    client_id: string;
    client_name: string;
  };
  context?: Record<string, any>;
}

export class LogoutChallengeResponseDto {
  challenge?: string;
  subject?: string;
  sid?: string;
  request_url?: string;
}

export class AcceptLoginRequestDto {
  subject!: string;
  remember?: boolean;
  remember_for?: number;
  context?: Record<string, any>;
}

export class AcceptConsentRequestDto {
  grant_scope!: string[];
  remember?: boolean;
  remember_for?: number;
  session?: {
    id_token?: Record<string, any>;
    access_token?: Record<string, any>;
  };
}

export class HydraRedirectResponseDto {
  redirect_to!: string;
}
