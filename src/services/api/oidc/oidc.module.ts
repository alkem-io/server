import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { OidcConfig } from './oidc.config';
import { OidcLogoutService } from './oidc-logout.service';
import { SynapseModule } from '@services/infrastructure/synapse/synapse.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    ConfigModule,
    KratosModule,
    SynapseModule,
  ],
  controllers: [OidcController],
  providers: [OidcService, OidcConfig, OidcLogoutService],
  exports: [OidcService, OidcConfig],
})
export class OidcModule {}
