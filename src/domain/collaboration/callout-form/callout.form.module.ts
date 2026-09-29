import { AuthorizationModule } from '@core/authorization/authorization.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { CalloutFormResponseModule } from '../callout-form-response/callout.form.response.module';
import { CalloutForm } from './callout.form.entity';
import { CalloutFormResolverFields } from './callout.form.resolver.fields';
import { CalloutFormResolverMutations } from './callout.form.resolver.mutations';
import { FormResponseAccessService } from './callout.form.response.access.service';
import { CalloutFormResponsesResolverFields } from './callout.form.responses.resolver.fields';
import { CalloutFormService } from './callout.form.service';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    RoleSetModule,
    NotificationAdapterModule,
    CalloutFormResponseModule,
    TypeOrmModule.forFeature([CalloutForm]),
  ],
  providers: [
    CalloutFormService,
    FormResponseAccessService,
    CalloutFormResolverFields,
    CalloutFormResponsesResolverFields,
    CalloutFormResolverMutations,
  ],
  exports: [
    CalloutFormService,
    FormResponseAccessService,
    CalloutFormResponseModule,
  ],
})
export class CalloutFormModule {}
