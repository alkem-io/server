import { Module } from '@nestjs/common';
import { UserModule } from '../../domain/user/user.module';
import { UserService } from '../../domain/user/user.service';
import { AzureADStrategy } from './aad.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  providers: [UserService, AzureADStrategy],
  imports: [UserModule, PassportModule],
  exports: [AzureADStrategy],
})
export class AuthenticationModule {}
