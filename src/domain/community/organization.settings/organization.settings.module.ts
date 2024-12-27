import { Module } from '@nestjs/common';
import { OrganizationSettingsService } from './organization.settings.service';

@Module({
  imports: [],
  providers: [OrganizationSettingsService],
  exports: [OrganizationSettingsService],
})
export class OrganizationSettingsModule {}
