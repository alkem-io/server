import { ICommunication } from '@domain/communication/communication/communication.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { ILibrary } from '@library/library/library.interface';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IPlatform } from './platform.interface';
import { PlatformService } from './platform.service';
import { IInnovationHub } from '@domain/innovation-space/innovation.space.interface';
import { InnovationHubArgsQuery } from '@domain/innovation-space/dto';

@Resolver(() => IPlatform)
export class PlatformResolverFields {
  constructor(private platformService: PlatformService) {}

  @ResolveField('library', () => ILibrary, {
    nullable: false,
    description: 'The Innovation Library for the platform',
  })
  async library(): Promise<ILibrary> {
    const result = await this.platformService.getLibraryOrFail([
      'library.innovationPacks',
    ]);
    return result;
  }

  @ResolveField('communication', () => ICommunication, {
    nullable: false,
    description: 'The Communications for the platform',
  })
  async communication(): Promise<ICommunication> {
    const result = await this.platformService.getCommunicationOrFail();
    return result;
  }

  @ResolveField('storageBucket', () => IStorageBucket, {
    nullable: true,
    description:
      'The StorageBucket with documents in use by Users + Organizations on the Platform.',
  })
  async storageBucket(@Parent() platform: IPlatform): Promise<IStorageBucket> {
    return await this.platformService.getStorageBucket(platform);
  }

  @ResolveField(() => [IInnovationHub], {
    description: 'List of Innovation Hubs on the platform',
  })
  public async innovationHubs(): Promise<IInnovationHub[]> {
    return [];
  }

  @ResolveField(() => IInnovationHub, {
    description: 'Details about an Innovation Hubs on the platform',
  })
  public async innovationHub(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Args({ nullable: false }) args: InnovationHubArgsQuery
  ): Promise<IInnovationHub> {
    return { id: 'mock' } as IInnovationHub;
  }
}
