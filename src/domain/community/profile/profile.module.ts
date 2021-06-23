import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Profile } from './profile.entity';
import { ProfileResolverMutations } from './profile.resolver.mutations';
import { ProfileService } from './profile.service';
import { IpfsService } from '@src/services/platform/ipfs/ipfs.service';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { ProfileAuthorizationService } from './profile.service.authorization';
import { AuthorizationDefinitionModule } from '@domain/common/authorization-definition/authorization.definition.module';

@Module({
  imports: [
    AuthorizationEngineModule,
    AuthorizationDefinitionModule,
    TagsetModule,
    ReferenceModule,
    TypeOrmModule.forFeature([Profile]),
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
