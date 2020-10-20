import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IServiceConfig } from 'src/interfaces/service.config.interface';

@Injectable()
export class AuthenticationService {
  constructor(private configService: ConfigService) {}

  authenticationEnabled(): boolean {
    if (
      this.configService.get<IServiceConfig>('service')
        ?.authenticationEnabled === 'false'
    )
      return false;
    return true;
  }
}
