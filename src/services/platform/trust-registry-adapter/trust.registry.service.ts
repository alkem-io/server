import { CREDENTIAL_CONFIG_YML_ADAPTER } from '@common/enums/providers';
import {
  CredentialMetadata,
  ICredentialConfigProvider,
} from '@services/platform/trust-registry-adapter/credentials/credential.provider.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class TrustRegistryService {
  constructor(
    @Inject(CREDENTIAL_CONFIG_YML_ADAPTER)
    private readonly credentialsProvider: ICredentialConfigProvider,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getSupportedCredentialMetadata(): CredentialMetadata[] {
    return this.credentialsProvider.getCredentials().credentials;
  }
}
