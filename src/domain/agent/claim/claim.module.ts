import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { ClaimService } from './claim.service';

@Module({
  imports: [AuthorizationModule],
  providers: [ClaimService],
  exports: [ClaimService],
})
export class ClaimModule {}
