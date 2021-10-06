import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AspectModule } from '@domain/context/aspect/aspect.module';
import { Project } from './project.entity';
import { ProjectResolverMutations } from './project.resolver.mutations';
import { ProjectService } from './project.service';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { ProjectLifecycleOptionsProvider } from './project.lifecycle.options.provider';
import { ProjectResolverFields } from './project.resolver.fields';
import { NamingModule } from '@src/services/domain/naming/naming.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    AspectModule,
    NamingModule,
    LifecycleModule,
    TypeOrmModule.forFeature([Project]),
  ],
  providers: [
    ProjectService,
    ProjectResolverMutations,
    ProjectResolverFields,
    ProjectLifecycleOptionsProvider,
  ],
  exports: [ProjectService],
})
export class ProjectModule {}
