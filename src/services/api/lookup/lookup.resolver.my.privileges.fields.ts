import { Args, Resolver } from '@nestjs/graphql';
import { ResolveField } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CommunityService } from '@domain/community/community/community.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { PostService } from '@domain/collaboration/post/post.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { RoomService } from '@domain/communication/room/room.service';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { CalendarService } from '@domain/timeline/calendar/calendar.service';
import { ApplicationService } from '@domain/access/application/application.service';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { SpaceService } from '@domain/space/space/space.service';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { AccountService } from '@domain/space/account/account.service';
import { TemplateService } from '@domain/template/template/template.service';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { LicenseService } from '@domain/common/license/license.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';
import { LookupMyPrivilegesQueryResults } from './dto/lookup.query.my.privileges.results';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ActorContext } from '@core/actor-context';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { SpaceAboutService } from '@domain/space/space.about/space.about.service';

@Resolver(() => LookupMyPrivilegesQueryResults)
export class LookupMyPrivilegesResolverFields {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private accountService: AccountService,
    private communityService: CommunityService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private collaborationService: CollaborationService,
    private whiteboardService: WhiteboardService,
    private innovationPackService: InnovationPackService,
    private profileService: ProfileService,
    private postService: PostService,
    private calloutService: CalloutService,
    private roomService: RoomService,
    private innovationFlowService: InnovationFlowService,
    private calendarEventService: CalendarEventService,
    private calendarService: CalendarService,
    private documentService: DocumentService,
    private templateService: TemplateService,
    private templatesSetService: TemplatesSetService,
    private templatesManagerService: TemplatesManagerService,
    private storageAggregatorService: StorageAggregatorService,
    private storageBucketService: StorageBucketService,
    private spaceService: SpaceService,
    private spaceAboutService: SpaceAboutService,
    private userLookupService: UserLookupService,
    private guidelinesService: CommunityGuidelinesService,
    private virtualContributorService: VirtualContributorService,
    private innovationHubService: InnovationHubService,
    private roleSetService: RoleSetService,
    private licenseService: LicenseService
  ) {}

  private getMyPrivilegesOnAuthorizable(
    actorContext: ActorContext,
    authorizable: IAuthorizable
  ): AuthorizationPrivilege[] {
    if (!authorizable.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for ${authorizable.constructor.name} with ID ${authorizable.id}`,
        LogContext.API
      );
    }
    return this.authorizationPolicyService.getActorPrivileges(
      actorContext,
      authorizable.authorization
    );
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Space',
  })
  async space(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const space = await this.spaceService.getSpace(id, {
      relations: { authorization: true },
    });
    if (!space) return [];

    return this.getMyPrivilegesOnAuthorizable(actorContext, space);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Account',
  })
  async account(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const account = await this.accountService.getAccountOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, account);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified RoleSet',
  })
  async roleSet(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, roleSet);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Document',
  })
  async document(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const document = await this.documentService.getDocumentOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, document);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'A particular VirtualContributor',
  })
  async virtualContributor(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const virtualContributor =
      await this.virtualContributorService.getVirtualContributorByIdOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(actorContext, virtualContributor);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified User',
  })
  async user(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const user = await this.userLookupService.getUserByIdOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, user);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified StorageAggregator',
  })
  async storageAggregator(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const storageAggregator =
      await this.storageAggregatorService.getStorageAggregatorOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(actorContext, storageAggregator);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified InnovationPack',
  })
  async innovationPack(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(actorContext, innovationPack);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified StorageBucket',
  })
  async storageBucket(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const storageBucket =
      await this.storageBucketService.getStorageBucketOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(actorContext, storageBucket);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified InnovationHub',
  })
  async innovationHub(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const innovationHub =
      await this.innovationHubService.getInnovationHubOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(actorContext, innovationHub);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Application',
  })
  async application(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const application = await this.applicationService.getApplicationOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, application);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Invitation',
  })
  async invitation(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const invitation = await this.invitationService.getInvitationOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, invitation);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Community',
  })
  async community(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const community = await this.communityService.getCommunityOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, community);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Collaboration',
  })
  async collaboration(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(actorContext, collaboration);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified CalendarEvent',
  })
  async calendarEvent(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const calendarEvent =
      await this.calendarEventService.getCalendarEventOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(actorContext, calendarEvent);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Calendar',
  })
  async calendar(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const calendar = await this.calendarService.getCalendarOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, calendar);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified SpaceAbout',
  })
  async spaceAbout(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const context = await this.spaceAboutService.getSpaceAboutOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, context);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Whiteboard',
  })
  async whiteboard(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, whiteboard);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Profile',
  })
  async profile(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const profile = await this.profileService.getProfileOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, profile);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Callout',
  })
  async callout(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const callout = await this.calloutService.getCalloutOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, callout);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Post',
  })
  async post(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const post = await this.postService.getPostOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, post);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Room',
  })
  async room(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const room = await this.roomService.getRoomOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, room);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified InnovationFlow',
  })
  async innovationFlow(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(actorContext, innovationFlow);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Template',
  })
  async template(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const template = await this.templateService.getTemplateOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, template);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified TemplatesSet',
  })
  async templatesSet(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      id,
      { relations: { authorization: true } }
    );

    return this.getMyPrivilegesOnAuthorizable(actorContext, templatesSet);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified TemplatesManager',
  })
  async templatesManager(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const templatesManager =
      await this.templatesManagerService.getTemplatesManagerOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(actorContext, templatesManager);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Community guidelines',
  })
  async communityGuidelines(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const guidelines =
      await this.guidelinesService.getCommunityGuidelinesOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(actorContext, guidelines);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified License',
  })
  async license(
    @CurrentUser() actorContext: ActorContext,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const license = await this.licenseService.getLicenseOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(actorContext, license);
  }
}
