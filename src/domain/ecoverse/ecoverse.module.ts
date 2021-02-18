import { ApplicationFactoryModule } from '@domain/application/application.factory.module';
import { ChallengeModule } from '@domain/challenge/challenge.module';
import { ContextModule } from '@domain/context/context.module';
import { OrganisationModule } from '@domain/organisation/organisation.module';
import { TagsetModule } from '@domain/tagset/tagset.module';
import { UserGroupModule } from '@domain/user-group/user-group.module';
import { UserModule } from '@domain/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ecoverse } from './ecoverse.entity';
import { EcoverseResolverMutations } from './ecoverse.resolver.mutations';
import { EcoverseResolverQueries } from './ecoverse.resolver.queries';
import { EcoverseService } from './ecoverse.service';

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
    ApplicationFactoryModule,
  ],
  providers: [
    EcoverseService,
    EcoverseResolverQueries,
    EcoverseResolverMutations,
  ],
  exports: [EcoverseService],
})
export class EcoverseModule {}
