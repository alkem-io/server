import {
  CredentialConfig,
  ICredentialConfigProvider,
} from '@services/platform/trust-registry-adapter/credentials/credential.provider.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@src/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class CredentialConfigYmlAdapter implements ICredentialConfigProvider {
  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getCredentials(): CredentialConfig {
    const credentials = this.configService.get(
      ConfigurationTypes.SSI
    ).credentials;

    return {
      credentials: Object.values(credentials),
    };
  }
}
