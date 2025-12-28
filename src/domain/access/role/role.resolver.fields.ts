import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IRole } from './role.interface';
import { IActorRolePolicy } from './actor.role.policy.interface';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';

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

  @ResolveField('userPolicy', () => IActorRolePolicy, {
    nullable: false,
    description: 'The role policy that applies for Users in this Role.',
  })
  userPolicy(@Parent() role: IRole): IActorRolePolicy {
    return role.userPolicy;
  }

  @ResolveField('organizationPolicy', () => IActorRolePolicy, {
    nullable: false,
    description: 'The role policy that applies for Organizations in this Role.',
  })
  organizationPolicy(@Parent() role: IRole): IActorRolePolicy {
    return role.organizationPolicy;
  }

  @ResolveField('virtualContributorPolicy', () => IActorRolePolicy, {
    nullable: false,
    description:
      'The role policy that applies for VirtualContributors in this Role.',
  })
  virtualContributorPolicy(@Parent() role: IRole): IActorRolePolicy {
    return role.virtualContributorPolicy;
  }
}
