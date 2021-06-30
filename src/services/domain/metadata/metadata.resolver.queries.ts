import { Query, Resolver } from '@nestjs/graphql';
import { IMetadata } from './metadata.interface';
import { MetadataService } from './metadata.service';

@Resolver(() => IMetadata)
export class MetadataResolverQueries {
  constructor(private metadataService: MetadataService) {}

  @Query(() => IMetadata, {
    nullable: false,
    description: 'Alkemio Services Metadata',
  })
  async metadata(): Promise<IMetadata> {
    return await this.metadataService.getMetadata();
  }
}
