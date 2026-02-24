import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { NameID, UUID } from '@domain/common/scalars';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { TemplateService } from '@domain/template/template/template.service';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { CurrentActor } from '@src/common/decorators';
import { LookupByNameQueryResults } from './dto/lookup.by.name.query.results';

@Resolver(() => LookupByNameQueryResults)
export class LookupByNameResolverFields {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private innovationHubService: InnovationHubService,
    private innovationPackService: InnovationPackService,
    private templateService: TemplateService,
    private userLookupService: UserLookupService,
    private spaceLookupService: SpaceLookupService,
    private organizationLookupService: OrganizationLookupService,
    private virtualActorLookupService: VirtualActorLookupService
  ) {}

  @ResolveField(() => String, {
    nullable: true,
    description: 'Lookup the ID of the specified InnovationHub using a NameID',
  })
  async innovationHub(
    @CurrentActor() actorContext: ActorContext,
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<string> {
    const innovationHub =
      await this.innovationHubService.getInnovationHubByNameIdOrFail(nameid);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      innovationHub.authorization,
      AuthorizationPrivilege.READ,
      `lookup InnovationHub by NameID: ${innovationHub.id}`
    );

    return innovationHub.id;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'Lookup the ID of the specified InnovationPack using a NameID',
  })
  async innovationPack(
    @CurrentActor() actorContext: ActorContext,
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<string> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackByNameIdOrFail(nameid);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      innovationPack.authorization,
      AuthorizationPrivilege.READ,
      `lookup InnovationPack by NameID: ${innovationPack.id}`
    );

    return innovationPack.id;
  }

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'Lookup a Space using a NameID',
  })
  async space(
    @CurrentActor() actorContext: ActorContext,
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<ISpace> {
    const space = await this.spaceLookupService.getSpaceByNameIdOrFail(nameid);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      space.authorization,
      AuthorizationPrivilege.READ_ABOUT,
      `lookup L0 Space by NameID: ${nameid}`
    );

    return space;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'Lookup the ID of the specified User using a NameID',
  })
  async user(
    @CurrentActor() actorContext: ActorContext,
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<string> {
    const user = await this.userLookupService.getUserByNameIdOrFail(nameid);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `user lookup by NameID: ${actorContext.actorID}`
    );

    return user.id;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'Lookup the ID of the specified Organization using a NameID',
  })
  async organization(
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<string> {
    const organization =
      await this.organizationLookupService.getOrganizationByNameIdOrFail(
        nameid
      );
    return organization.id;
  }

  @ResolveField(() => String, {
    nullable: true,
    description:
      'Lookup the ID of the specified Virtual Contributor using a NameID',
  })
  async virtualContributor(
    @CurrentActor() actorContext: ActorContext,
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<string> {
    const virtualContributor =
      await this.virtualActorLookupService.getVirtualContributorByNameIdOrFail(
        nameid
      );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      virtualContributor.authorization,
      AuthorizationPrivilege.READ,
      `lookup virtual contributor by NameID: ${virtualContributor.id}`
    );

    return virtualContributor.id;
  }

  @ResolveField(() => String, {
    nullable: true,
    description:
      'Lookup the ID of the specified Template using a templatesSetId and the template NameID',
  })
  async template(
    @CurrentActor() actorContext: ActorContext,
    @Args('templatesSetID', { type: () => UUID }) ID: string,
    @Args('NAMEID', { type: () => NameID }) nameID: string
  ): Promise<string> {
    const template =
      await this.templateService.getTemplateByNameIDInTemplatesSetOrFail(
        ID,
        nameID
      );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      template.authorization,
      AuthorizationPrivilege.READ,
      `lookup template by NameID: ${template.id}`
    );

    return template.id;
  }
}
