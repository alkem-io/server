import { CREDENTIAL_CONFIG_YML_ADAPTER } from '@common/enums/providers';
import { Module } from '@nestjs/common';
import { CredentialConfigYmlAdapter } from './credential.config.yml.adapter';

@Module({
  providers: [
    {
      provide: CREDENTIAL_CONFIG_YML_ADAPTER,
      useClass: CredentialConfigYmlAdapter,
    },
  ],
  exports: [CREDENTIAL_CONFIG_YML_ADAPTER],
})
export class CredentialConfigAdapterModule {}
