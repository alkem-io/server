import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IContributorRolePolicy } from './contributor.role.policy.interface';
import { IRole } from './role.interface';

@Resolver(() => IRole)
export class RoleResolverFields {
  @ResolveField('credential', () => ICredentialDefinition, {
    nullable: false,
    description: 'The Credential associated with this Role.',
  })
  credential(@Parent() role: IRole): ICredentialDefinition {
    return role.credential;
  }

  @ResolveField('parentCredentials', () => [ICredentialDefinition], {
    nullable: false,
    description: 'The Credential associated with this Role.',
  })
  parentCredentials(@Parent() role: IRole): ICredentialDefinition[] {
    return role.parentCredentials;
  }

  @ResolveField('userPolicy', () => IContributorRolePolicy, {
    nullable: false,
    description: 'The role policy that applies for Users in this Role.',
  })
  userPolicy(@Parent() role: IRole): IContributorRolePolicy {
    return role.userPolicy;
  }

  @ResolveField('organizationPolicy', () => IContributorRolePolicy, {
    nullable: false,
    description: 'The role policy that applies for Organizations in this Role.',
  })
  organizationPolicy(@Parent() role: IRole): IContributorRolePolicy {
    return role.organizationPolicy;
  }

  @ResolveField('virtualContributorPolicy', () => IContributorRolePolicy, {
    nullable: false,
    description:
      'The role policy that applies for VirtualContributors in this Role.',
  })
  virtualContributorPolicy(@Parent() role: IRole): IContributorRolePolicy {
    return role.virtualContributorPolicy;
  }
}
