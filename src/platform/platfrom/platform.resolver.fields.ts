import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILibrary } from '@library/library/library.interface';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
import { IPlatform } from './platform.interface';
import { PlatformService } from './platform.service';
import { IConfig } from '@platform/configuration/config/config.interface';
import { KonfigService } from '@platform/configuration/config/config.service';
import { IMetadata } from '@platform/metadata/metadata.interface';
import { MetadataService } from '@platform/metadata/metadata.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { ReleaseDiscussionOutput } from './dto/release.discussion.dto';
import { ILicensing } from '@platform/licensing/licensing.interface';
import { IForum } from '@platform/forum';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ITemplatesManager } from '@domain/template/templates-manager/templates.manager.interface';

@Resolver(() => IPlatform)
export class PlatformResolverFields {
  constructor(
    private platformService: PlatformService,
    private configService: KonfigService,
    private metadataService: MetadataService
  ) {}

  @ResolveField('authorization', () => IAuthorizationPolicy, {
    description: 'The authorization policy for the platform',
    nullable: false,
  })
  authorization(@Parent() platform: IPlatform): IAuthorizationPolicy {
    return this.platformService.getAuthorizationPolicy(platform);
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

  @ResolveField('licensing', () => ILicensing, {
    nullable: false,
    description: 'The Licensing in use by the platform.',
  })
  licensing(@Parent() platform: IPlatform): Promise<ILicensing> {
    return this.platformService.getLicensing(platform);
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

  @UseGuards(GraphqlGuard)
  @ResolveField('latestReleaseDiscussion', () => ReleaseDiscussionOutput, {
    nullable: true,
    description: 'The latest release discussion.',
  })
  async latestReleaseDiscussion(): Promise<
    ReleaseDiscussionOutput | undefined
  > {
    return this.platformService.getLatestReleaseDiscussion();
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('templatesManager', () => ITemplatesManager, {
    nullable: true,
    description: 'The TemplatesManager in use by the Platform',
  })
  @UseGuards(GraphqlGuard)
  async templatesManager(): Promise<ITemplatesManager> {
    return await this.platformService.getTemplatesManagerOrFail();
  }
}
