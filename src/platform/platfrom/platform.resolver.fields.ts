import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILibrary } from '@library/library/library.interface';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { InnovationHubArgsQuery } from '@domain/innovation-hub/dto';
import { IInnovationHub, InnovationHubService } from '@domain/innovation-hub';
import { IPlatform } from './platform.interface';
import { PlatformService } from './platform.service';

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
    description: 'Details about an Innovation Hubs on the platform',
  })
  public innovationHub(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Args({ nullable: false }) args: InnovationHubArgsQuery
  ): Promise<IInnovationHub> {
    return this.innovationHubService.getInnovationHubOrFail(args);
  }
}
