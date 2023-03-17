import { OrganizationModule } from '@domain/community/organization/organization.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { UserModule } from '@domain/community/user/user.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { Module } from '@nestjs/common';
import { DataloaderService } from './dataloader.service';

@Module({
  imports: [UserModule, OrganizationModule, ProfileModule, CollaborationModule],
  providers: [DataloaderService],
  exports: [DataloaderService],
})
export class DataloaderModule {}
