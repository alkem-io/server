import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';

@Module({
  imports: [ConfigModule],
  controllers: [OidcController],
  providers: [OidcService],
  exports: [OidcService],
})
export class OidcModule {}
