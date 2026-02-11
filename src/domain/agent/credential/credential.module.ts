import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Credential } from '@domain/agent/credential';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialResolverFields } from './credential.resolver.fields';
import { CredentialService } from './credential.service';

@Module({
  imports: [AuthorizationModule, TypeOrmModule.forFeature([Credential])],
  providers: [CredentialService, CredentialResolverFields],
  exports: [CredentialService],
})
export class CredentialModule {}
