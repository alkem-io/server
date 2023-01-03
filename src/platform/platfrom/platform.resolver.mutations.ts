import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { PlatformService } from './platform.service';
import { IPlatform } from './platform.interface';
import { PlatformAuthorizationService } from './platform.service.authorization';

@Resolver()
export class PlatformResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformService: PlatformService,
    private platformAuthorizationService: PlatformAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPlatform, {
    description: 'Reset the Authorization Policy on the specified Platform.',
  })
  @Profiling.api
  async authorizationPolicyResetOnPlatform(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IPlatform> {
    const platform = await this.platformService.getPlatformOrFail();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      platform.authorization,
      AuthorizationPrivilege.UPDATE, // todo: replace with AUTHORIZATION_RESET once that has been granted
      `reset authorization on platform: ${agentInfo.email}`
    );
    return await this.platformAuthorizationService.applyAuthorizationPolicy(
      platform
    );
  }
}
