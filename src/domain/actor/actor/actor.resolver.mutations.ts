import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ActorService } from './actor.service';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { UUID } from '@domain/common/scalars';
import { CredentialType } from '@common/enums/credential.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CurrentUser } from '@common/decorators';
import { ActorContext } from '@core/actor-context';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';

@Resolver()
export class ActorResolverMutations {
  constructor(
    private readonly actorService: ActorService,
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Mutation(() => ICredential, {
    description: 'Grant a credential to an Actor.',
  })
  async grantCredentialToActor(
    @CurrentUser() actorContext: ActorContext,
    @Args('actorID', { type: () => UUID }) actorID: string,
    @Args('credentialType', { type: () => CredentialType })
    credentialType: CredentialType,
    @Args('resourceID', { type: () => UUID, nullable: true })
    resourceID?: string
  ): Promise<ICredential> {
    // Granting credentials requires platform admin access
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'grantCredentialToActor mutation'
    );

    return await this.actorService.grantCredentialOrFail(actorID, {
      type: credentialType,
      resourceID: resourceID ?? '',
    });
  }

  @Mutation(() => Boolean, {
    description: 'Revoke a credential from an Actor.',
  })
  async revokeCredentialFromActor(
    @CurrentUser() actorContext: ActorContext,
    @Args('actorID', { type: () => UUID }) actorID: string,
    @Args('credentialType', { type: () => CredentialType })
    credentialType: CredentialType,
    @Args('resourceID', { type: () => UUID, nullable: true })
    resourceID?: string
  ): Promise<boolean> {
    // Revoking credentials requires platform admin access
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'revokeCredentialFromActor mutation'
    );

    return await this.actorService.revokeCredential(actorID, {
      type: credentialType,
      resourceID,
    });
  }
}
