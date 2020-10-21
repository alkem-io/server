import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { EcoverseService } from './ecoverse.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ecoverse } from './ecoverse.entity';
import { EcoverseResolverQueries } from './ecoverse.resolver.queries';
import { EcoverseResolverMutations } from './ecoverse.resolver.mutations';
import { ContextModule } from '../context/context.module';
import { TagsetModule } from '../tagset/tagset.module';
import { ChallengeModule } from '../challenge/challenge.module';
import { UserModule } from '../user/user.module';
import { OrganisationModule } from '../organisation/organisation.module';
import { AccountModule } from '../../utils/account/account.module';

@Module({
  imports: [
    ChallengeModule,
    ContextModule,
    TagsetModule,
    OrganisationModule,
    UserGroupModule,
    TagsetModule,
    ChallengeModule,
    UserModule,
    TypeOrmModule.forFeature([Ecoverse]),
    UserModule,
    AccountModule,
  ],
  providers: [
    EcoverseService,
    EcoverseResolverQueries,
    EcoverseResolverMutations,
  ],
  exports: [EcoverseService],
})
export class EcoverseModule {}
