import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { OrgCommunityGateService } from './org.community.gate.service';

/**
 * Standalone so the invitation and platform-invitation modules can use the
 * gate without importing the role-set module (which already imports them).
 */
@Module({
  imports: [AuthorizationModule],
  providers: [OrgCommunityGateService],
  exports: [OrgCommunityGateService],
})
export class OrgCommunityGateModule {}
