import { Args, Resolver } from '@nestjs/graphql';
import { ResolveField } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CommunityService } from '@domain/community/community/community.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ContextService } from '@domain/context/context/context.service';
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
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { UserService } from '@domain/community/user/user.service';
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
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';

@Resolver(() => LookupMyPrivilegesQueryResults)
export class LookupMyPrivilegesResolverFields {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private accountService: AccountService,
    private communityService: CommunityService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private collaborationService: CollaborationService,
    private contextService: ContextService,
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
    private userService: UserService,
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Space ',
  })
  async space(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const space = await this.spaceService.getSpaceOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, space);
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Account ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified RoleSet ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Document ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'A particular VirtualContributor ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified User',
  })
  async user(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const user = await this.userService.getUserOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, user);
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified StorageAggregator ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified InnovationPack ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified StorageBucket ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified InnovationHub ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Application ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Invitation ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Community ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Collaboration ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified CalendarEvent ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Calendar ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Context ',
  })
  async context(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<AuthorizationPrivilege[]> {
    const context = await this.contextService.getContextOrFail(id, {
      relations: { authorization: true },
    });

    return this.getMyPrivilegesOnAuthorizable(agentInfo, context);
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Whiteboard ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Profile ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Callout ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Post ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Room ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified InnovationFlow ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Template ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified TemplatesSet ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified TemplatesManager ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified Community guidelines ',
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup myPrivileges onthe specified License ',
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
