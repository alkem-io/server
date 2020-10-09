import { Module } from '@nestjs/common';
import { UserGroupModule } from '../user-group/user-group.module';
import { UserGroupService } from '../user-group/user-group.service';
import { EcoverseService } from './ecoverse.service';
import { AuthenticationModule } from '../../utils/authentication/authentication.module';
import { AzureADStrategy } from '../../utils/authentication/aad.strategy';
import { UserModule } from '../user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ecoverse } from './ecoverse.entity';
import { EcoverseResolverQueries } from './ecoverse.resolver.queries';
import { EcoverseResolverMutations } from './ecoverse.resolver.mutations';
import { ContextService } from '../context/context.service';
import { ContextModule } from '../context/context.module';
import { TagsetModule } from '../tagset/tagset.module';
import { TagsetService } from '../tagset/tagset.service';
import { ReferenceModule } from '../reference/reference.module';
import { ReferenceService } from '../reference/reference.service';

@Module({
  imports: [
    ContextModule,
    AuthenticationModule,
    ReferenceModule,
    TagsetModule,
    UserGroupModule,
    UserModule,
    TagsetModule,
    TypeOrmModule.forFeature([Ecoverse]),
  ],
  providers: [
    ContextService,
    EcoverseService,
    EcoverseResolverQueries,
    EcoverseResolverMutations,
    ReferenceService,
    TagsetService,
    AzureADStrategy,
    UserGroupService,
  ],
  exports: [EcoverseService],
})
export class EcoverseModule {}
