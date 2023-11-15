import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILibrary } from '@library/library/library.interface';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { InnovationHub as InnovationHubDecorator } from '@src/common/decorators';
import { InnovationHubArgsQuery } from '@domain/innovation-hub/dto';
import { InnovationHubService } from '@domain/innovation-hub';
import { IInnovationHub } from '@domain/innovation-hub/types';
import { IPlatform } from './platform.interface';
import { PlatformService } from './platform.service';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IConfig } from '@platform/configuration/config/config.interface';
import { KonfigService } from '@platform/configuration/config/config.service';
import { IMetadata } from '@platform/metadata/metadata.interface';
import { MetadataService } from '@platform/metadata/metadata.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@Resolver(() => IPlatform)
export class PlatformResolverFields {
  constructor(
    private platformService: PlatformService,
    private configService: KonfigService,
    private metadataService: MetadataService,
    private innovationHubService: InnovationHubService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService
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
      library: { innovationPacks: true },
    });
  }

  @ResolveField('communication', () => ICommunication, {
    nullable: false,
    description: 'The Communications for the platform',
  })
  communication(): Promise<ICommunication> {
    return this.platformService.getCommunicationOrFail();
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

  @ResolveField(() => [IInnovationHub], {
    nullable: false,
    description: 'List of Innovation Hubs on the platform',
  })
  public innovationHubs(): Promise<IInnovationHub[]> {
    return this.innovationHubService.getInnovationHubs();
  }

  @ResolveField(() => IInnovationHub, {
    description:
      'Details about an Innovation Hubs on the platform. If the arguments are omitted, the current Innovation Hub you are in will be returned.',
    nullable: true,
  })
  public innovationHub(
    @Args({
      nullable: true,
      description: 'Returns a matching Innovation Hub.',
    })
    args: InnovationHubArgsQuery,
    @InnovationHubDecorator() innovationHub?: InnovationHub
  ): Promise<IInnovationHub | undefined> {
    // if no arguments are provided, return the current ISpace
    if (!Object.keys(args).length) {
      return Promise.resolve(innovationHub as IInnovationHub);
    }

    return this.innovationHubService.getInnovationHubOrFail({
      subdomain: args.subdomain,
      idOrNameId: args.id,
    });
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
}
