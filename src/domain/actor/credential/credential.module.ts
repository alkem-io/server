import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credential } from './credential.entity';
import { CredentialService } from './credential.service';
import { CredentialResolverFields } from './credential.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [AuthorizationModule, TypeOrmModule.forFeature([Credential])],
  providers: [CredentialService, CredentialResolverFields],
  exports: [CredentialService],
})
export class CredentialModule {}
