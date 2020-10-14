import { Module } from '@nestjs/common';
import { UserModule } from '../../domain/user/user.module';
import { AzureADStrategy } from './aad.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [UserModule, PassportModule],
  providers: [AzureADStrategy],
  exports: [AzureADStrategy],
})
export class AuthenticationModule {}
