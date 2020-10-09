import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { UserGroupService } from '../user-group/user-group.service';
import { OrganisationService } from './organisation.service';
import { OrganisationResolver } from './organisation.resolver';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { TagsetModule } from '../tagset/tagset.module';
import { TagsetService } from '../tagset/tagset.service';

@Module({
  imports: [UserGroupModule, UserModule, TagsetModule],
  providers: [
    OrganisationService,
    OrganisationResolver,
    TagsetService,
    UserGroupService,
    UserService,
  ],
  exports: [OrganisationService],
})
export class OrganisationModule {}
