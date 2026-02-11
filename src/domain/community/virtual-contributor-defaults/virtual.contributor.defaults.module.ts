import { Module } from '@nestjs/common';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { VirtualContributorDefaultsService } from './virtual.contributor.defaults.service';

@Module({
  imports: [NamingModule],
  providers: [VirtualContributorDefaultsService],
  exports: [VirtualContributorDefaultsService],
})
export class VirtualContributorDefaultsModule {}
