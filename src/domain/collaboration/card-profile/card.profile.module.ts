import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { CardProfile } from './card.profile.entity';
import { CardProfileResolverMutations } from './card.profile.resolver.mutations';
import { CardProfileService } from './card.profile.service';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CardProfileAuthorizationService } from './card.profile.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CardProfileResolverFields } from './card.profile.resolver.fields';
import { LocationModule } from '@domain/common/location';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TagsetModule,
    ReferenceModule,
    LocationModule,
    TypeOrmModule.forFeature([CardProfile]),
  ],
  providers: [
    CardProfileResolverMutations,
    CardProfileService,
    CardProfileAuthorizationService,
    CardProfileResolverFields,
  ],
  exports: [
    CardProfileService,
    CardProfileAuthorizationService,
    CardProfileResolverFields,
  ],
})
export class CardProfileModule {}
