import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { CollaborationMigrationResult } from './collaboration-migration.result';
import {
  CollaborationMigrationService,
  MigrationSummary,
} from './collaboration-migration.service';

@InstrumentResolver()
@Resolver()
export class CollaborationMigrationResolverMutations {
  constructor(
    private readonly migrationService: CollaborationMigrationService,
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private readonly platformOperationsAuditService: PlatformOperationsAuditService
  ) {}

  @Mutation(() => CollaborationMigrationResult, {
    description:
      'Migrates all pending legacy memo content. Idempotent: repeated calls process only rows whose migrated marker is false.',
  })
  async migrateLegacyMemoContent(
    @CurrentActor() actorContext: ActorContext
  ): Promise<CollaborationMigrationResult> {
    return this.run(actorContext, 'migrateLegacyMemoContent', () =>
      this.migrationService.migrateMemos()
    );
  }

  @Mutation(() => CollaborationMigrationResult, {
    description:
      'Migrates pending legacy Whiteboard documents and independently normalizes every legacy Whiteboard contribution default, including defaults stored by Callout templates. Idempotent: repeated calls process only unmigrated documents and non-canonical defaults.',
  })
  async migrateLegacyWhiteboardContent(
    @CurrentActor() actorContext: ActorContext
  ): Promise<CollaborationMigrationResult> {
    return this.run(actorContext, 'migrateLegacyWhiteboardContent', () =>
      this.migrationService.migrateWhiteboards()
    );
  }

  private async run(
    actorContext: ActorContext,
    action: string,
    migrate: () => Promise<MigrationSummary>
  ): Promise<CollaborationMigrationResult> {
    try {
      const platformPolicy =
        await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
      this.authorizationService.grantAccessOrFail(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
        action
      );
      const summary = await migrate();
      const completedCleanly = summary.flagged === 0 && summary.failed === 0;
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action,
        outcome: completedCleanly ? 'success' : 'failure',
        target: {
          total: summary.total,
          migrated: summary.migrated,
          flagged: summary.flagged,
          failed: summary.failed,
          flaggedDocuments: summary.flaggedDocuments,
          failedDocuments: summary.failedDocuments,
        },
      });
      return CollaborationMigrationResult.from(summary);
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action,
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }
}
