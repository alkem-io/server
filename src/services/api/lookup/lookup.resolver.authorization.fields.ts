import { Args, Resolver } from '@nestjs/graphql';
import { ResolveField } from '@nestjs/graphql';
import { LookupQueryResults } from './dto/lookup.query.results';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { AuthorizationService } from '@core/authorization/authorization.service';
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
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
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

@Resolver(() => LookupQueryResults)
export class LookupAuthorizationResolverFields {
  constructor(
    private accountService: AccountService,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
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

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Space Authorization',
  })
  async spaceAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const space = await this.spaceService.getSpaceOrFail(id, {
      relations: { authorization: true },
    });

    if (!space.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Space with ID ${id} `,
        LogContext.API
      );
    }

    return space.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Account Authorization',
  })
  async accountAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const account = await this.accountService.getAccountOrFail(id, {
      relations: { authorization: true },
    });

    if (!account.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Account with ID ${id} `,
        LogContext.API
      );
    }

    return account.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified RoleSet Authorization',
  })
  async roleSetAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(id, {
      relations: { authorization: true },
    });

    if (!roleSet.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for RoleSet with ID ${id} `,
        LogContext.API
      );
    }

    return roleSet.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Document Authorization',
  })
  async documentAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const document = await this.documentService.getDocumentOrFail(id, {
      relations: { authorization: true },
    });

    if (!document.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Document with ID ${id} `,
        LogContext.API
      );
    }

    return document.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'A particular VirtualContributor Authorization',
  })
  async virtualContributorAuthorization(
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<IAuthorizationPolicy> {
    const virtualContributor =
      await this.virtualContributorService.getVirtualContributorOrFail(id, {
        relations: { authorization: true },
      });

    if (!virtualContributor.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for VirtualContributor with ID ${id} `,
        LogContext.API
      );
    }

    return virtualContributor.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified User',
  })
  async userAuthorization(
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<IAuthorizationPolicy> {
    const user = await this.userService.getUserOrFail(id, {
      relations: { authorization: true },
    });

    if (!user.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for User with ID ${id} `,
        LogContext.API
      );
    }

    return user.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified StorageAggregator Authorization',
  })
  async storageAggregatorAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const storageAggregator =
      await this.storageAggregatorService.getStorageAggregatorOrFail(id, {
        relations: { authorization: true },
      });

    if (!storageAggregator.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for StorageAggregator with ID ${id} `,
        LogContext.API
      );
    }

    return storageAggregator.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified InnovationPack Authorization',
  })
  async innovationPackAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(id, {
        relations: { authorization: true },
      });

    if (!innovationPack.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for InnovationPack with ID ${id} `,
        LogContext.API
      );
    }

    return innovationPack.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified StorageBucket Authorization',
  })
  async storageBucketAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const storageBucket =
      await this.storageBucketService.getStorageBucketOrFail(id, {
        relations: { authorization: true },
      });

    if (!storageBucket.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for StorageBucket with ID ${id} `,
        LogContext.API
      );
    }

    return storageBucket.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified InnovationHub Authorization',
  })
  async innovationHubAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const innovationHub =
      await this.innovationHubService.getInnovationHubOrFail(id, {
        relations: { authorization: true },
      });

    if (!innovationHub.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for InnovationHub with ID ${id} `,
        LogContext.API
      );
    }

    return innovationHub.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Application Authorization',
  })
  async applicationAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const application = await this.applicationService.getApplicationOrFail(id, {
      relations: { authorization: true },
    });

    if (!application.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Application with ID ${id} `,
        LogContext.API
      );
    }

    return application.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Invitation Authorization',
  })
  async invitationAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const invitation = await this.invitationService.getInvitationOrFail(id, {
      relations: { authorization: true },
    });

    if (!invitation.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Invitation with ID ${id} `,
        LogContext.API
      );
    }

    return invitation.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Community Authorization',
  })
  async communityAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const community = await this.communityService.getCommunityOrFail(id, {
      relations: { authorization: true },
    });

    if (!community.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Community with ID ${id} `,
        LogContext.API
      );
    }

    return community.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Collaboration Authorization',
  })
  async collaborationAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(id, {
        relations: { authorization: true },
      });

    if (!collaboration.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Collaboration with ID ${id} `,
        LogContext.API
      );
    }

    return collaboration.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified CalendarEvent Authorization',
  })
  async calendarEventAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const calendarEvent =
      await this.calendarEventService.getCalendarEventOrFail(id, {
        relations: { authorization: true },
      });

    if (!calendarEvent.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for CalendarEvent with ID ${id} `,
        LogContext.API
      );
    }

    return calendarEvent.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Calendar Authorization',
  })
  async calendarAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const calendar = await this.calendarService.getCalendarOrFail(id, {
      relations: { authorization: true },
    });

    if (!calendar.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Calendar with ID ${id} `,
        LogContext.API
      );
    }

    return calendar.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Context Authorization',
  })
  async contextAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const context = await this.contextService.getContextOrFail(id, {
      relations: { authorization: true },
    });

    if (!context.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Context with ID ${id} `,
        LogContext.API
      );
    }

    return context.authorization;
  }
  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Whiteboard Authorization',
  })
  async whiteboardAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(id, {
      relations: { authorization: true },
    });

    if (!whiteboard.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Whiteboard with ID ${id} `,
        LogContext.API
      );
    }

    return whiteboard.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Profile Authorization',
  })
  async profileAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const profile = await this.profileService.getProfileOrFail(id, {
      relations: { authorization: true },
    });

    if (!profile.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Profile with ID ${id} `,
        LogContext.API
      );
    }

    return profile.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Callout Authorization',
  })
  async calloutAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const callout = await this.calloutService.getCalloutOrFail(id, {
      relations: { authorization: true },
    });

    if (!callout.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Callout with ID ${id} `,
        LogContext.API
      );
    }

    return callout.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Post Authorization',
  })
  async postAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const post = await this.postService.getPostOrFail(id, {
      relations: { authorization: true },
    });

    if (!post.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Post with ID ${id} `,
        LogContext.API
      );
    }

    return post.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Room Authorization',
  })
  async roomAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const room = await this.roomService.getRoomOrFail(id, {
      relations: { authorization: true },
    });

    if (!room.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Room with ID ${id} `,
        LogContext.API
      );
    }

    return room.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified InnovationFlow Authorization',
  })
  async innovationFlowAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(id, {
        relations: { authorization: true },
      });

    if (!innovationFlow.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for InnovationFlow with ID ${id} `,
        LogContext.API
      );
    }

    return innovationFlow.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Template Authorization',
  })
  async templateAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const template = await this.templateService.getTemplateOrFail(id, {
      relations: { authorization: true },
    });

    if (!template.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Template with ID ${id} `,
        LogContext.API
      );
    }

    return template.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified TemplatesSet Authorization',
  })
  async templatesSetAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      id,
      { relations: { authorization: true } }
    );

    if (!templatesSet.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for TemplatesSet with ID ${id} `,
        LogContext.API
      );
    }

    return templatesSet.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified TemplatesManager Authorization',
  })
  async templatesManagerAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const templatesManager =
      await this.templatesManagerService.getTemplatesManagerOrFail(id, {
        relations: { authorization: true },
      });

    if (!templatesManager.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for TemplatesManager with ID ${id} `,
        LogContext.API
      );
    }

    return templatesManager.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified Community guidelines Authorization',
  })
  async communityGuidelinesAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const guidelines =
      await this.guidelinesService.getCommunityGuidelinesOrFail(id, {
        relations: { authorization: true },
      });

    if (!guidelines.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for Community with ID ${id} `,
        LogContext.API
      );
    }

    return guidelines.authorization;
  }

  @ResolveField(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'Lookup the specified License Authorization',
  })
  async licenseAuthorization(
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IAuthorizationPolicy> {
    const license = await this.licenseService.getLicenseOrFail(id, {
      relations: { authorization: true },
    });

    if (!license.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Authorization for License with ID ${id} `,
        LogContext.API
      );
    }
    return license.authorization;
  }
}
