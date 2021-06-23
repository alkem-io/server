import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { NVPModule } from '@domain/common/nvp/nvp.module';
import { Application } from '@domain/community/application';
import { ApplicationService } from '@domain/community/application/application.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@domain/community/user/user.module';
import { AuthorizationDefinitionModule } from '@domain/common/authorization-definition/authorization.definition.module';
import { ApplicationResolverFields } from './application.resolver.fields';
import { AuthorizationEngineModule } from '@services/platform/authorization-engine/authorization-engine.module';

@Module({
  imports: [
    AuthorizationDefinitionModule,
    AuthorizationEngineModule,
    NVPModule,
    LifecycleModule,
    UserModule,
    TypeOrmModule.forFeature([Application]),
  ],
  providers: [ApplicationService, ApplicationResolverFields],
  exports: [ApplicationService],
})
export class ApplicationModule {}
