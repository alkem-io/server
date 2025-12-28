import { Module } from '@nestjs/common';
import { IdentityResolveController } from './identity-resolve.controller';
import { IdentityResolveService } from './identity-resolve.service';
import { UserIdentityModule } from '@domain/community/user-identity';

@Module({
  imports: [UserIdentityModule],
  controllers: [IdentityResolveController],
  providers: [IdentityResolveService],
  exports: [IdentityResolveService],
})
export class IdentityResolveModule {}
