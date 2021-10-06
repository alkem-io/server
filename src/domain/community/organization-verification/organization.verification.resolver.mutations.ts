import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication/agent-info';
import { OrganizationVerificationEventInput } from './dto/organization.verification.dto.event';
import { OrganizationVerificationLifecycleOptionsProvider } from './organization.verification.lifecycle.options.provider';
import { IOrganizationVerification } from './organization.verification.interface';
import { OrganizationVerificationService } from './organization.verification.service';

@Resolver(() => IOrganizationVerification)
export class OrganizationVerificationResolverMutations {
  constructor(
    private organizationVerificationService: OrganizationVerificationService,
    private organizationVerificationLifecycleOptionsProvider: OrganizationVerificationLifecycleOptionsProvider,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganizationVerification, {
    description: 'Trigger an event on the Organization Verification.',
  })
  async eventOnOrganizationVerification(
    @Args('organizationVerificationEventData')
    organizationVerificationEventData: OrganizationVerificationEventInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IOrganizationVerification> {
    const organizationVerification =
      await this.organizationVerificationService.getOrganizationVerificationOrFail(
        organizationVerificationEventData.organizationVerificationID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organizationVerification.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on organization verification: ${organizationVerification.id}`
    );
    return await this.organizationVerificationLifecycleOptionsProvider.eventOnOrganizationVerfication(
      organizationVerificationEventData,
      agentInfo
    );
  }
}
