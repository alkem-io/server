import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@src/common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TrustRegistryCredentialMetadata } from './trust.registry.dto.credential.metadata';
import { AlkemioConfig } from '@src/types';

@Injectable()
export class TrustRegistryConfigurationAdapter {
  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getCredentials(): TrustRegistryCredentialMetadata[] {
    const credentials: TrustRegistryCredentialMetadata[] =
      this.configService.get(ConfigurationTypes.SSI).credentials;

    const credentialValues: TrustRegistryCredentialMetadata[] =
      Object.values(credentials);

    return credentialValues;
  }
}
