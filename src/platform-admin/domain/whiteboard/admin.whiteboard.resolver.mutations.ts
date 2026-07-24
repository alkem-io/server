import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AdminWhiteboardFilesResult } from './admin.whiteboard.files.result';
import { AdminWhiteboardService } from './admin.whiteboard.service';

@InstrumentResolver()
@Resolver()
export class AdminWhiteboardResolverMutations {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private logger: LoggerService,
    private adminWhiteboardService: AdminWhiteboardService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private platformOperationsAuditService: PlatformOperationsAuditService
  ) {}

  @Mutation(() => AdminWhiteboardFilesResult, {
    description:
      'Uploads the files from the Whiteboard content into the StorageBucket of that Whiteboard.',
  })
  @Profiling.api
  async adminUploadFilesFromContentToStorageBucket(
    @CurrentActor() actorContext: ActorContext
  ) {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      `upload files from content to storage: ${actorContext.actorID}`
    );

    try {
      const result =
        await this.adminWhiteboardService.uploadFilesFromContentToStorageBucket(
          actorContext
        );
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminUploadFilesFromContentToStorageBucket',
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminUploadFilesFromContentToStorageBucket',
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }
}
