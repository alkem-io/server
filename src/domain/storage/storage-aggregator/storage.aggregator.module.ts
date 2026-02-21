import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InheritedCredentialRuleSetModule } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { StorageBucketModule } from '../storage-bucket/storage.bucket.module';
import { StorageAggregator } from './storage.aggregator.entity';
import { StorageAggregatorResolverFields } from './storage.aggregator.resolver.fields';
import { StorageAggregatorService } from './storage.aggregator.service';
import { StorageAggregatorAuthorizationService } from './storage.aggregator.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    InheritedCredentialRuleSetModule,
    UrlGeneratorModule,
    StorageBucketModule,
    StorageAggregatorResolverModule,
    TypeOrmModule.forFeature([StorageAggregator]),
  ],
  providers: [
    StorageAggregatorResolverFields,
    StorageAggregatorService,
    StorageAggregatorAuthorizationService,
  ],
  exports: [StorageAggregatorService, StorageAggregatorAuthorizationService],
})
export class StorageAggregatorModule {}
