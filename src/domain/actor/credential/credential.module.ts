import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credential } from './credential.entity';
import { CredentialResolverFields } from './credential.resolver.fields';
import { CredentialService } from './credential.service';

@Module({
  imports: [AuthorizationModule, TypeOrmModule.forFeature([Credential])],
  providers: [CredentialService, CredentialResolverFields],
  exports: [CredentialService],
})
export class CredentialModule {}
