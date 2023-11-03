import { Module } from '@nestjs/common';
import { EntityResolverModule } from '../entity-resolver/entity.resolver.module';
import { LicenseResolverService } from './license.resolver.service';

@Module({
  imports: [EntityResolverModule],
  providers: [LicenseResolverService],
  exports: [LicenseResolverService],
})
export class LicenseResolverModule {}
