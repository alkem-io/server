import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IUser } from '@domain/community/user/user.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RemoveOrganizationRoleFromUserInput } from './dto/organization.role.dto.remove.role.from.user';
import { AssignOrganizationRoleToUserInput } from './dto/organization.role.dto.assign.role.to.user';
import { OrganizationRole } from '@common/enums/organization.role';
import { OrganizationAuthorizationService } from '../organization/organization.service.authorization';
import { OrganizationRoleService } from './organization.role.service';
import { IOrganization } from '../organization/organization.interface';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';

@Resolver(() => IOrganization)
export class OrganizationRoleResolverMutations {
  constructor(
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private contributorLookupService: ContributorLookupService,
    private organizationRoleService: OrganizationRoleService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns an Organization Role to user.',
  })
  @Profiling.api
  async assignOrganizationRoleToUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignOrganizationRoleToUserInput
  ): Promise<IUser> {
    const organization =
      await this.contributorLookupService.getOrganizationOrFail(
        membershipData.organizationID
      );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.GRANT,
      `assign organization role to user: ${organization.nameID} - ${membershipData.role}`
    );
    return await this.organizationRoleService.assignOrganizationRoleToUser(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes Organization Role from user.',
  })
  @Profiling.api
  async removeOrganizationRoleFromUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveOrganizationRoleFromUserInput
  ): Promise<IUser> {
    const organization =
      await this.contributorLookupService.getOrganizationOrFail(
        membershipData.organizationID
      );
    let authorization = organization.authorization;
    if (membershipData.role === OrganizationRole.ASSOCIATE) {
      // Extend the authorization policy with a credential rule to assign the GRANT privilege
      // to the user specified in the incoming mutation. Then if it is the same user as is logged
      // in then the user will have the GRANT privilege + so can carry out the mutation
      authorization =
        this.organizationAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
          organization,
          membershipData.userID
        );
    }
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.GRANT,
      `remove user organization role from user: ${organization.nameID} - ${membershipData.role}`
    );
    return await this.organizationRoleService.removeOrganizationRoleFromUser(
      membershipData
    );
  }
}
