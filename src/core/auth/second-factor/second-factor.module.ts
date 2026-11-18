import { Organization } from '@domain/community/organization/organization.entity';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { NotificationExternalAdapterModule } from '@services/adapters/notification-external-adapter/notification.external.adapter.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { SecondFactorAuditService } from './second-factor.audit.service';
import { SecondFactorChangeObserverService } from './second-factor.change.observer.service';
import { SecondFactorPolicyService } from './second-factor.policy.service';
import { SecondFactorWaysService } from './second-factor.ways.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Platform, Organization]),
    UserLookupModule,
    NotificationExternalAdapterModule,
    KratosModule,
  ],
  providers: [
    SecondFactorPolicyService,
    SecondFactorAuditService,
    SecondFactorChangeObserverService,
    SecondFactorWaysService,
  ],
  exports: [
    SecondFactorPolicyService,
    SecondFactorAuditService,
    SecondFactorChangeObserverService,
    SecondFactorWaysService,
  ],
})
export class SecondFactorModule {}
