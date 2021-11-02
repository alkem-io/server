import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Profile } from './profile.entity';
import { ProfileResolverMutations } from './profile.resolver.mutations';
import { ProfileService } from './profile.service';
import { IpfsService } from '@src/services/platform/ipfs/ipfs.service';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ProfileAuthorizationService } from './profile.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { MicroservicesModule } from '@core/microservices/microservices.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TagsetModule,
    ReferenceModule,
    TypeOrmModule.forFeature([Profile]),
    MicroservicesModule,
  ],
  providers: [
    ProfileResolverMutations,
    ProfileService,
    ProfileAuthorizationService,
    IpfsService,
  ],
  exports: [ProfileService, ProfileAuthorizationService],
})
export class ProfileModule {}
