import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { OrganisationService } from './organisation.service';
import { OrganisationResolver } from './organisation.resolver';
import { TagsetModule } from '../tagset/tagset.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organisation } from './organisation.entity';

@Module({
  imports: [
    UserGroupModule,
    TagsetModule,
    TypeOrmModule.forFeature([Organisation]),
  ],
  providers: [OrganisationService, OrganisationResolver],
  exports: [OrganisationService],
})
export class OrganisationModule {}
