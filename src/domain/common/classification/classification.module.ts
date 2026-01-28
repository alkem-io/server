import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagsetTemplateModule } from '../tagset-template/tagset.template.module';
import { Classification } from './classification.entity';
import { ClassificationResolverFields } from './classification.resolver.fields';
import { ClassificationResolverMutations } from './classification.resolver.mutations';
import { ClassificationService } from './classification.service';
import { ClassificationAuthorizationService } from './classification.service.authorization';

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
