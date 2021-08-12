import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGroup } from '@domain/community/user-group';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { User } from '@domain/community/user/user.entity';
import { UserModule } from '@domain/community/user/user.module';
import { SearchResolverQueries } from './search.resolver.queries';
import { SearchService } from './search.service';
import { OrganisationModule } from '@domain/community/organisation/organisation.module';
import { Organisation } from '@domain/community/organisation';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';

@Module({
  imports: [
    AuthorizationEngineModule,
    UserModule,
    UserGroupModule,
    OrganisationModule,
    ChallengeModule,
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([UserGroup]),
    TypeOrmModule.forFeature([Organisation]),
    TypeOrmModule.forFeature([Challenge]),
    TypeOrmModule.forFeature([Opportunity]),
  ],
  providers: [SearchService, SearchResolverQueries],
  exports: [SearchService],
})
export class SearchModule {}
