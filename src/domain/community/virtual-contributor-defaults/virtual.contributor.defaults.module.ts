import { Module } from '@nestjs/common';
import { VirtualContributorDefaultsService } from './virtual.contributor.defaults.service';
import { NamingModule } from '@services/infrastructure/naming/naming.module';

@Module({
  imports: [NamingModule],
  providers: [VirtualContributorDefaultsService],
  exports: [VirtualContributorDefaultsService],
})
export class VirtualContributorDefaultsModule {}
