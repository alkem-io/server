import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { UserModule } from '@domain/user/user.module';
import { AccountResolver } from './account.resolver';

@Module({
  imports: [UserModule],
  providers: [AccountService, AccountResolver],
  exports: [AccountService],
})
export class AccountModule {}
