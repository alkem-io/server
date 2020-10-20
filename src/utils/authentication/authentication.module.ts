import { Module } from '@nestjs/common';
import { UserModule } from '../../domain/user/user.module';
import { AzureADStrategy } from './aad.strategy';
import { PassportModule } from '@nestjs/passport';
import { AuthenticationService } from './authentication.service';

@Module({
  imports: [UserModule, PassportModule],
  providers: [AzureADStrategy, AuthenticationService],
  exports: [AzureADStrategy, AuthenticationService],
})
export class AuthenticationModule {}
