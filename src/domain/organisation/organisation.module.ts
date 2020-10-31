import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { OrganisationService } from './organisation.service';
import { OrganisationResolverMutations } from './organisation.resolver.mutations';
import { TagsetModule } from '../tagset/tagset.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organisation } from './organisation.entity';
import { OrganisationResolverFields } from './organisation.resolver.fields';

@Module({
  imports: [
    UserGroupModule,
    TagsetModule,
    TypeOrmModule.forFeature([Organisation]),
  ],
  providers: [
    OrganisationService,
    OrganisationResolverMutations,
    OrganisationResolverFields,
  ],
  exports: [OrganisationService],
})
export class OrganisationModule {}
