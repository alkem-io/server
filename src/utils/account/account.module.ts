import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { MsGraphModule } from '../ms-graph/ms-graph.module';

@Module({
  imports: [MsGraphModule],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
