import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { NamingModule } from '@services/domain/naming/naming.module';
import { CollaborationResolverMutations } from '@domain/collaboration/collaboration/collaboration.resolver.mutations';
import { CollaborationResolverFields } from '@domain/collaboration/collaboration/collaboration.resolver.fields';
import { RelationModule } from '@domain/collaboration/relation/relation.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    CalloutModule,
    NamingModule,
    RelationModule,
    TypeOrmModule.forFeature([Collaboration]),
  ],
  providers: [
    CollaborationService,
    CollaborationResolverMutations,
    CollaborationResolverFields,
  ],
  exports: [CollaborationService],
})
export class CollaborationModule {}
