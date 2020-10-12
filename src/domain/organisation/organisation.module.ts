import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { OrganisationService } from './organisation.service';
import { OrganisationResolver } from './organisation.resolver';
import { TagsetModule } from '../tagset/tagset.module';

@Module({
  imports: [UserGroupModule, TagsetModule],
  providers: [OrganisationService, OrganisationResolver],
  exports: [OrganisationService],
})
export class OrganisationModule {}
