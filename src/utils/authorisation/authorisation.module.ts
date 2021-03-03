import { forwardRef, Module } from '@nestjs/common';
import { UserModule } from '@domain/user/user.module';
import { AuthorisationService } from './authorisation.service';

@Module({
  imports: [forwardRef(() => UserModule)],
  providers: [AuthorisationService],
  exports: [AuthorisationService],
})
export class AuthorisationModule {}
