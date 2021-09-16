import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication/agent-info';
import { OrganizationVerificationEventInput } from './organization.verification.dto.event';
import { OrganizationVerificationLifecycleOptionsProvider } from './organization.verification.lifecycle.options.provider';
import { IOrganizationVerification } from './organization.verification.interface';
import { OrganizationVerificationService } from './organization.verification.service';

@Resolver(() => IOrganizationVerification)
export class OrganisationVerificationResolverMutations {
  constructor(
    private organisationVerificationService: OrganizationVerificationService,
    private organizationVerificationLifecycleOptionsProvider: OrganizationVerificationLifecycleOptionsProvider,
    private authorizationEngine: AuthorizationEngineService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganizationVerification, {
    description: 'Trigger an event on the Organization Verification.',
  })
  async eventOnOrganizationVerification(
    @Args('orgizationVerificationEventData')
    orgizationVerificationEventData: OrganizationVerificationEventInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IOrganizationVerification> {
    const organizationVerification =
      await this.organisationVerificationService.getOrganizationVerificationOrFail(
        orgizationVerificationEventData.organizationVerificationID
      );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      organizationVerification.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on organization verification: ${organizationVerification.id}`
    );
    return await this.organizationVerificationLifecycleOptionsProvider.eventOnOrganizationVerfication(
      orgizationVerificationEventData,
      agentInfo
    );
  }
}
