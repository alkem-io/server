import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Profile } from './profile.entity';
import { ProfileResolverMutations } from './profile.resolver.mutations';
import { ProfileService } from './profile.service';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ProfileAuthorizationService } from './profile.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { ProfileResolverFields } from './profile.resolver.fields';
import { LocationModule } from '@domain/common/location';
import { ProfileDataloaderService } from './profile.dataloader.service';
import { ProfileAvatarsLoaderCreator } from '@core/dataloader/creators/loader.creators';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TagsetModule,
    ReferenceModule,
    TypeOrmModule.forFeature([Profile]),
    VisualModule,
    LocationModule,
  ],
  providers: [
    ProfileResolverMutations,
    ProfileService,
    ProfileAvatarsLoaderCreator,
    ProfileDataloaderService,
    ProfileAuthorizationService,
    ProfileResolverFields,
  ],
  exports: [
    ProfileService,
    ProfileDataloaderService,
    ProfileAuthorizationService,
    ProfileResolverFields,
  ],
})
export class ProfileModule {}
