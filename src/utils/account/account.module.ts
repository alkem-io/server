import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { MsGraphModule } from '@utils/ms-graph/ms-graph.module';
import { UserModule } from '@domain/user/user.module';
import { AccountResolver } from './account.resolver';

@Module({
  imports: [MsGraphModule, UserModule],
  providers: [AccountService, AccountResolver],
  exports: [AccountService],
})
export class AccountModule {}
