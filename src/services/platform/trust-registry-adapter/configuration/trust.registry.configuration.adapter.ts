import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@src/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CredentialMetadata } from './credential.metadata';

@Injectable()
export class TrustRegistryConfigurationAdapter {
  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getCredentials(): CredentialMetadata[] {
    const credentials: CredentialMetadata[] = this.configService.get(
      ConfigurationTypes.SSI
    ).credentials;

    const credentialValues: CredentialMetadata[] = Object.values(credentials);

    return credentialValues;
  }
}
