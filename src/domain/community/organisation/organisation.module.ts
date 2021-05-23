import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { OrganisationService } from './organisation.service';
import { OrganisationResolverMutations } from './organisation.resolver.mutations';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organisation } from './organisation.entity';
import { OrganisationResolverFields } from './organisation.resolver.fields';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { OrganisationResolverQueries } from './organisation.resolver.queries';
import { UserModule } from '../user/user.module';
import { NamingModule } from '@src/services/naming/naming.module';

@Module({
  imports: [
    UserModule,
    UserGroupModule,
    TagsetModule,
    NamingModule,
    ProfileModule,
    TypeOrmModule.forFeature([Organisation]),
  ],
  providers: [
    OrganisationService,
    OrganisationResolverQueries,
    OrganisationResolverMutations,
    OrganisationResolverFields,
  ],
  exports: [OrganisationService],
})
export class OrganisationModule {}
