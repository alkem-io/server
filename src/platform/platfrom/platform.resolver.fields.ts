import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILibrary } from '@library/library/library.interface';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { InnovationHxb as InnovationHxbDecorator } from '@src/common/decorators';
import { InnovationHxbArgsQuery } from '@domain/innovation-hub/dto';
import { InnovationHxbService } from '@domain/innovation-hub';
import { IInnovationHxb } from '@domain/innovation-hub/types';
import { IPlatform } from './platform.interface';
import { PlatformService } from './platform.service';
import { InnovationHxb } from '@domain/innovation-hub/innovation.hub.entity';

@Resolver(() => IPlatform)
export class PlatformResolverFields {
  constructor(
    private platformService: PlatformService,
    private innovationHxbService: InnovationHxbService
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

  @ResolveField(() => [IInnovationHxb], {
    description: 'List of Innovation Hxbs on the platform',
  })
  public innovationHxbs(): Promise<IInnovationHxb[]> {
    return this.innovationHxbService.getInnovationHxbs();
  }

  @ResolveField(() => IInnovationHxb, {
    description:
      'Details about an Innovation Hxbs on the platform. If the arguments are omitted, the current Innovation Hxb you are in will be returned.',
    nullable: true,
  })
  public innovationHxb(
    @Args({
      nullable: true,
      description: 'Returns a matching Innovation Hxb.',
    })
    args: InnovationHxbArgsQuery,
    @InnovationHxbDecorator() innovationHxb?: InnovationHxb
  ): Promise<IInnovationHxb | undefined> {
    // if no arguments are provided, return the current IHub
    if (!Object.keys(args).length) {
      return Promise.resolve(innovationHxb as IInnovationHxb);
    }

    return this.innovationHxbService.getInnovationHxbOrFail(args);
  }
}
