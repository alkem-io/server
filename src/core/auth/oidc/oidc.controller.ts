import { Controller, Get } from '@nestjs/common';
import { OidcService } from './oidc.service';

@Controller('api/auth/oidc')
export class OidcController {
  constructor(private readonly oidcService: OidcService) {}

  @Get('login')
  login() {
    // T037 — implement authorization-code initiation
    throw new Error('not implemented');
  }

  @Get('callback')
  callback() {
    // T038 — implement callback, token exchange, session regeneration
    throw new Error('not implemented');
  }

  @Get('logout')
  logout() {
    // T039 — implement local cleanup + Hydra end_session redirect
    throw new Error('not implemented');
  }

  @Get('id-token-hint')
  idTokenHint() {
    // T039 — return id_token from current session
    throw new Error('not implemented');
  }
}
