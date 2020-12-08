import { forwardRef, Module } from '@nestjs/common';
import { UserModule } from '../../domain/user/user.module';
import { AzureADStrategy } from './aad.strategy';
import { PassportModule } from '@nestjs/passport';
import { RopcStrategy } from './ropc.strategy';

@Module({
  imports: [forwardRef(() => UserModule), PassportModule],
  providers: [AzureADStrategy, RopcStrategy],
  exports: [AzureADStrategy, RopcStrategy],
})
export class AuthenticationModule {}
