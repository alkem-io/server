import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILibrary } from '@library/library/library.interface';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { InnovationHub as InnovationHubDecorator } from '@src/common/decorators';
import { InnovationHubArgsQuery } from '@domain/innovation-hub/dto';
import { InnovationHubService } from '@domain/innovation-hub';
import { IInnovationHub } from '@domain/innovation-hub/types';
import { IPlatform } from './platform.interface';
import { PlatformService } from './platform.service';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';

@Resolver(() => IPlatform)
export class PlatformResolverFields {
  constructor(
    private platformService: PlatformService,
    private innovationHubService: InnovationHubService
  ) {}

  @ResolveField('library', () => ILibrary, {
    nullable: false,
    description: 'The Innovation Library for the platform',
  })
  library(): Promise<ILibrary> {
    return this.platformService.getLibraryOrFail(['library.innovationPacks']);
  }

  @ResolveField('communication', () => ICommunication, {
    nullable: false,
    description: 'The Communications for the platform',
  })
  communication(): Promise<ICommunication> {
    return this.platformService.getCommunicationOrFail();
  }

  @ResolveField('storageBucket', () => IStorageBucket, {
    nullable: true,
    description:
      'The StorageBucket with documents in use by Users + Organizations on the Platform.',
  })
  storageBucket(@Parent() platform: IPlatform): Promise<IStorageBucket> {
    return this.platformService.getStorageBucket(platform);
  }

  @ResolveField(() => [IInnovationHub], {
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

    return this.innovationHubService.getInnovationHubOrFail(args);
  }
}
