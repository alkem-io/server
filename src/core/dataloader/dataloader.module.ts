import { OrganizationModule } from '@domain/community/organization/organization.module';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { DataloaderService } from './dataloader.service';

@Module({
  imports: [UserModule, OrganizationModule, ProfileModule],
  providers: [DataloaderService],
  exports: [DataloaderService],
})
export class DataloaderModule {}
