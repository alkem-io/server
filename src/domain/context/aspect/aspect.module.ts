import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Aspect } from './aspect.entity';
import { AspectResolverMutations } from './aspect.resolver.mutations';
import { AspectService } from './aspect.service';
import { AspectResolverFields } from './aspect.resolver.fields';
import { VisualModule } from '@domain/common/visual/visual.module';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { CommentsModule } from '@domain/communication/comments/comments.module';
import { AspectAuthorizationService } from './aspect.service.authorization';
import { TagsetModule } from '@domain/common/tagset/tagset.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    CommentsModule,
    VisualModule,
    TagsetModule,
    ReferenceModule,
    TypeOrmModule.forFeature([Aspect]),
  ],
  providers: [
    AspectResolverMutations,
    AspectService,
    AspectAuthorizationService,
    AspectResolverFields,
  ],
  exports: [AspectService, AspectAuthorizationService],
})
export class AspectModule {}
