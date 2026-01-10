import { Inject, LoggerService } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Mutation } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { AdminWhiteboardService } from './admin.whiteboard.service';
import { AdminWhiteboardFilesResult } from './admin.whiteboard.files.result';
import { AuthorizationPrivilege } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class AdminWhiteboardResolverMutations {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private logger: LoggerService,
    private adminWhiteboardService: AdminWhiteboardService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService
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
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `upload files from content to storage: ${actorContext.actorId}`
    );

    return this.adminWhiteboardService.uploadFilesFromContentToStorageBucket(
      actorContext
    );
  }
}
