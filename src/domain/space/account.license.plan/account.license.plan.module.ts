import { Module } from '@nestjs/common';
import { AccountLicensePlanService } from './account.license.plan.service';

@Module({
  imports: [],
  providers: [AccountLicensePlanService],
  exports: [AccountLicensePlanService],
})
export class AccountLicensePlanModule {}
