import { Module } from '@nestjs/common';
import { UserModule } from '@domain/user/user.module';
import { AuthorisationService } from './authorisation.service';

@Module({
  imports: [UserModule],
  providers: [AuthorisationService],
  exports: [AuthorisationService],
})
export class AuthorisationModule {}
