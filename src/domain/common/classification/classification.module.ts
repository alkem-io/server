import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Classification } from './classification.entity';
import { ClassificationService } from './classification.service';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ClassificationAuthorizationService } from './classification.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ClassificationResolverFields } from './classification.resolver.fields';
import { TagsetTemplateModule } from '../tagset-template/tagset.template.module';
import { ClassificationResolverMutations } from './classification.resolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TagsetModule,
    TagsetTemplateModule,
    TypeOrmModule.forFeature([Classification]),
  ],
  providers: [
    ClassificationService,
    ClassificationAuthorizationService,
    ClassificationResolverFields,
    ClassificationResolverMutations,
  ],
  exports: [
    ClassificationService,
    ClassificationAuthorizationService,
    ClassificationResolverFields,
  ],
})
export class ClassificationModule {}
