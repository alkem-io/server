import { Module } from '@nestjs/common';
import { UserGroupModule } from 'src/user-group/user-group.module';
import { UserGroupService } from 'src/user-group/user-group.service';
import { OrganisationService } from './organisation.service';
import { OrganisationResolver } from './organisation.resolver';

@Module({
  providers: [OrganisationService, UserGroupService, OrganisationResolver],
  imports: [UserGroupModule],
  exports: [OrganisationService],
})
export class OrganisationModule {}
