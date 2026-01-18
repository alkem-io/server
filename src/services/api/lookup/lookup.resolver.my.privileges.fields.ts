import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ApplicationService } from '@domain/access/application/application.service';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { PostService } from '@domain/collaboration/post/post.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { LicenseService } from '@domain/common/license/license.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { WhiteboardService } from '@domain/common/whiteboard';
import { RoomService } from '@domain/communication/room/room.service';
import { CommunityService } from '@domain/community/community/community.service';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { AccountService } from '@domain/space/account/account.service';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceAboutService } from '@domain/space/space.about/space.about.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { TemplateService } from '@domain/template/template/template.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { CalendarService } from '@domain/timeline/calendar/calendar.service';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { LookupMyPrivilegesQueryResults } from './dto/lookup.query.my.privileges.results';

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
    agentInfo: AgentInfo,
    authorizable: IAuthorizable
  ): AuthorizationPrivilege[] {
    if (!authorizable.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for ${authorizable.constructor.name} with ID ${authorizable.id}`,
        LogContext.API
      );
    }
    return this.authorizationPolicyService.getAgentPrivileges(
      agentInfo,
      authorizable.authorization
    );
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Space',
  })
  async space(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const space = await this.spaceService.getSpace(id, {
      relations: { authorization: true },
    });
    if (!space) return [];

    return this.getMyPrivilegesOnAuthorizable(agentInfo, space);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Account',
  })
  async account(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const account = await this.accountService.getAccountOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, account);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified RoleSet',
  })
  async roleSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, roleSet);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Document',
  })
  async document(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const document = await this.documentService.getDocumentOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, document);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'A particular VirtualContributor',
  })
  async virtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const virtualContributor =
      await this.virtualContributorService.getVirtualContributorOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, virtualContributor);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified User',
  })
  async user(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const user = await this.userLookupService.getUserOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, user);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified StorageAggregator',
  })
  async storageAggregator(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const storageAggregator =
      await this.storageAggregatorService.getStorageAggregatorOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, storageAggregator);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified InnovationPack',
  })
  async innovationPack(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, innovationPack);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified StorageBucket',
  })
  async storageBucket(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const storageBucket =
      await this.storageBucketService.getStorageBucketOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, storageBucket);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified InnovationHub',
  })
  async innovationHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const innovationHub =
      await this.innovationHubService.getInnovationHubOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, innovationHub);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Application',
  })
  async application(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const application = await this.applicationService.getApplicationOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, application);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Invitation',
  })
  async invitation(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const invitation = await this.invitationService.getInvitationOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, invitation);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Community',
  })
  async community(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const community = await this.communityService.getCommunityOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, community);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Collaboration',
  })
  async collaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, collaboration);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified CalendarEvent',
  })
  async calendarEvent(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const calendarEvent =
      await this.calendarEventService.getCalendarEventOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, calendarEvent);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Calendar',
  })
  async calendar(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const calendar = await this.calendarService.getCalendarOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, calendar);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified SpaceAbout',
  })
  async spaceAbout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const context = await this.spaceAboutService.getSpaceAboutOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, context);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Whiteboard',
  })
  async whiteboard(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, whiteboard);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Profile',
  })
  async profile(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const profile = await this.profileService.getProfileOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, profile);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Callout',
  })
  async callout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const callout = await this.calloutService.getCalloutOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, callout);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Post',
  })
  async post(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const post = await this.postService.getPostOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, post);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Room',
  })
  async room(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const room = await this.roomService.getRoomOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, room);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified InnovationFlow',
  })
  async innovationFlow(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, innovationFlow);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Template',
  })
  async template(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const template = await this.templateService.getTemplateOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, template);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified TemplatesSet',
  })
  async templatesSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      id,
      { relations: { authorization: true } }
    );

    return this.getMyPrivilegesOnAuthorizable(agentInfo, templatesSet);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified TemplatesManager',
  })
  async templatesManager(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const templatesManager =
      await this.templatesManagerService.getTemplatesManagerOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, templatesManager);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified Community guidelines',
  })
  async communityGuidelines(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const guidelines =
      await this.guidelinesService.getCommunityGuidelinesOrFail(id, {
        relations: { authorization: true },
      });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, guidelines);
  }

  @ResolveField(() => [AuthorizationPrivilege], {
    nullable: true,
    description: 'Lookup myPrivileges on the specified License',
  })
  async license(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const license = await this.licenseService.getLicenseOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, license);
  }
}
