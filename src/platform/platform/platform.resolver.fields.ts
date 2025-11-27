import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILibrary } from '@library/library/library.interface';
import { IPlatform } from './platform.interface';
import { PlatformService } from './platform.service';
import { IConfig } from '@platform/configuration/config/config.interface';
import { KonfigService } from '@platform/configuration/config/config.service';
import { IMetadata } from '@platform/metadata/metadata.interface';
import { MetadataService } from '@platform/metadata/metadata.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ReleaseDiscussionOutput } from './dto/release.discussion.dto';
import { IForum } from '@platform/forum';
import { ITemplatesManager } from '@domain/template/templates-manager/templates.manager.interface';
import { ILicensingFramework } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { IPlatformWellKnownVirtualContributors } from '@platform/platform.well.known.virtual.contributors';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums';
import { PlatformWellKnownVirtualContributorMapping } from '@platform/platform.well.known.virtual.contributors/dto/platform.well.known.virtual.contributor.dto.mapping';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';

@Resolver(() => IPlatform)
export class PlatformResolverFields {
  constructor(
    private platformService: PlatformService,
    private configService: KonfigService,
    private metadataService: MetadataService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @ResolveField('authorization', () => IAuthorizationPolicy, {
    description: 'The authorization policy for the platform',
    nullable: false,
  })
  authorization(@Parent() platform: IPlatform): IAuthorizationPolicy {
    return this.platformService.getAuthorizationPolicy(platform);
  }

  // TODO: protect with privilege...
  @ResolveField('roleSet', () => IRoleSet, {
    nullable: false,
    description: 'The RoleSet for this Platform.',
  })
  async roleSet(): Promise<IRoleSet> {
    return this.platformService.getRoleSetOrFail();
  }

  @ResolveField('library', () => ILibrary, {
    nullable: false,
    description: 'The Innovation Library for the platform',
  })
  library(): Promise<ILibrary> {
    return this.platformService.getLibraryOrFail({
      library: {},
    });
  }

  @ResolveField('forum', () => IForum, {
    nullable: false,
    description: 'The Forum for the platform',
  })
  async forum(): Promise<IForum> {
    return await this.platformService.getForumOrFail();
  }

  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: false,
    description:
      'The StorageAggregator with documents in use by Users + Organizations on the Platform.',
  })
  storageAggregator(
    @Parent() platform: IPlatform
  ): Promise<IStorageAggregator> {
    return this.platformService.getStorageAggregator(platform);
  }

  @ResolveField('licensingFramework', () => ILicensingFramework, {
    nullable: false,
    description: 'The Licensing in use by the platform.',
  })
  licensingFramework(
    @Parent() platform: IPlatform
  ): Promise<ILicensingFramework> {
    return this.platformService.getLicensingFramework(platform);
  }

  @ResolveField(() => IConfig, {
    description:
      'Alkemio configuration. Provides configuration to external services in the Alkemio ecosystem.',
    nullable: false,
  })
  public async configuration(): Promise<IConfig> {
    return await this.configService.getConfig();
  }

  @ResolveField(() => IMetadata, {
    description: 'Alkemio Services Metadata.',
    nullable: false,
  })
  public async metadata(): Promise<IMetadata> {
    return await this.metadataService.getMetadata();
  }

  @ResolveField('latestReleaseDiscussion', () => ReleaseDiscussionOutput, {
    nullable: true,
    description: 'The latest release discussion.',
  })
  async latestReleaseDiscussion(): Promise<
    ReleaseDiscussionOutput | undefined
  > {
    return this.platformService.getLatestReleaseDiscussion();
  }

  @ResolveField('templatesManager', () => ITemplatesManager, {
    nullable: true,
    description: 'The TemplatesManager in use by the Platform',
  })
  async templatesManager(): Promise<ITemplatesManager> {
    return await this.platformService.getTemplatesManagerOrFail();
  }

  @ResolveField(
    'wellKnownVirtualContributors',
    () => IPlatformWellKnownVirtualContributors,
    {
      nullable: false,
      description: 'The well-known Virtual Contributors on the Platform.',
    }
  )
  async wellKnownVirtualContributors(
    @Parent() platform: IPlatform,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IPlatformWellKnownVirtualContributors> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ,
      `get Platform well-known Virtual Contributors: ${agentInfo.userID}`
    );

    // Convert from JSON storage format to DTO array format
    const mappingsRecord = platform.wellKnownVirtualContributors as any;
    const mappingsArray: PlatformWellKnownVirtualContributorMapping[] =
      Object.entries(mappingsRecord || {}).map(
        ([wellKnown, virtualContributorID]) => ({
          wellKnown: wellKnown as VirtualContributorWellKnown,
          virtualContributorID: virtualContributorID as string,
        })
      );

    return { mappings: mappingsArray };
  }
}
