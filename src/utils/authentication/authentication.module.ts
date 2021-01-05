import { Module } from '@nestjs/common';
import { UserModule } from '../../domain/user/user.module';
import { AadBearerStrategy } from './aad.bearer.strategy';
import { PassportModule } from '@nestjs/passport';
import { AadRopcStrategy } from './aad.ropc.strategy';
import { AadOboStrategy } from './aad.obo.strategy';

@Module({
  imports: [UserModule, PassportModule],
  providers: [AadBearerStrategy, AadRopcStrategy, AadOboStrategy],
  exports: [AadBearerStrategy, AadRopcStrategy, AadOboStrategy],
})
export class AuthenticationModule {}
