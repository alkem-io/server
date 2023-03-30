import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { PostTemplate } from './post.template.entity';
import { PostTemplateResolverMutations } from './post.template.resolver.mutations';
import { PostTemplateService } from './post.template.service';
import { PostTemplateAuthorizationService } from './post.template.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TemplateBaseModule,
    ProfileModule,
    TypeOrmModule.forFeature([PostTemplate]),
  ],
  providers: [
    PostTemplateService,
    PostTemplateAuthorizationService,
    PostTemplateResolverMutations,
  ],
  exports: [PostTemplateService, PostTemplateAuthorizationService],
})
export class PostTemplateModule {}
