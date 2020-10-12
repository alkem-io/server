import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { UserGroupService } from '../user-group/user-group.service';
import { OrganisationService } from './organisation.service';
import { OrganisationResolver } from './organisation.resolver';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { TagsetModule } from '../tagset/tagset.module';
import { TagsetService } from '../tagset/tagset.service';
import { ProfileModule } from '../profile/profile.module';
import { ProfileService } from '../profile/profile.service';

@Module({
  imports: [UserGroupModule, UserModule, ProfileModule, TagsetModule],
  providers: [
    OrganisationService,
    OrganisationResolver,
    ProfileService,
    TagsetService,
    UserGroupService,
    UserService,
  ],
  exports: [OrganisationService],
})
export class OrganisationModule {}
