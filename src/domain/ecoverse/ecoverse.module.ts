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

@Module({
  providers: [
    EcoverseService,
    UserGroupService,
    EcoverseResolverQueries,
    EcoverseResolverMutations,
    AzureADStrategy,
  ],
  imports: [
    UserGroupModule,
    AuthenticationModule,
    UserGroupModule,
    UserModule,
    TypeOrmModule.forFeature([Ecoverse]),
  ],
  exports: [EcoverseService],
})
export class EcoverseModule {}
