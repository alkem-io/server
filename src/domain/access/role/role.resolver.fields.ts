import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IRole } from './role.interface';
import { RoleService } from './role.service';
import { IContributorRolePolicy } from './contributor.role.policy.interface';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { UseGuards } from '@nestjs/common';

@Resolver(() => IRole)
export class RoleResolverFields {
  constructor(private roleService: RoleService) {}

  // @ResolveField('credential', () => ICredentialDefinition, {
  //   nullable: false,
  //   description: 'The Credential associated with this Role.',
  // })
  // credential(@Parent() role: IRole2): ICredentialDefinition {
  //   return this.roleService.getCredentialForRole(role);
  // }

  // @ResolveField('parentCredentials', () => [ICredentialDefinition], {
  //   nullable: false,
  //   description: 'The Credential associated with this Role.',
  // })
  // parentCredentials(@Parent() role: IRole2): ICredentialDefinition[] {
  //   return this.roleService.getParentCredentialsForRole(role);
  // }

  // @ResolveField('userPolicy', () => IContributorRolePolicy, {
  //   nullable: false,
  //   description: 'The role policy that applies for Users in this Role.',
  // })
  // userPolicy(@Parent() role: IRole2): IContributorRolePolicy {
  //   return this.roleService.getUserPolicy(role);
  // }

  // @ResolveField('organizationPolicy', () => IContributorRolePolicy, {
  //   nullable: false,
  //   description: 'The role policy that applies for Organizations in this Role.',
  // })
  // organizationPolicy(@Parent() role: IRole2): IContributorRolePolicy {
  //   return this.roleService.getOrganizationPolicy(role);
  // }

  @UseGuards(GraphqlGuard)
  @ResolveField('virtualContributorPolicy', () => IContributorRolePolicy, {
    nullable: false,
    description:
      'The role policy that applies for VirtualContributors in this Role.',
  })
  virtualContributorPolicy(@Parent() role: IRole): IContributorRolePolicy {
    return this.roleService.getVirtualContributorPolicy(role);
  }
}
