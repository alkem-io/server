import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { User } from '@domain/community/user/user.entity';
import { UserModule } from '@domain/community/user/user.module';
import { SearchResolverQueries } from './search.resolver.queries';
import { SearchService } from './search.service';
import { OrganisationModule } from '@domain/community/organisation/organisation.module';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';

@Module({
  imports: [
    AuthorizationEngineModule,
    UserModule,
    UserGroupModule,
    OrganisationModule,
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([UserGroup]),
    TypeOrmModule.forFeature([Organisation]),
  ],
  providers: [SearchService, SearchResolverQueries],
  exports: [SearchService],
})
export class SearchModule {}
