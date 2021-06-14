import { Query, Resolver } from '@nestjs/graphql';
import { Metadata } from './metadata.entity';
import { IMetadata } from './metadata.interface';
import { MetadataService } from './metadata.service';

@Resolver()
export class MetadataResolverQueries {
  constructor(private metadataService: MetadataService) {}

  @Query(() => Metadata, {
    nullable: false,
    description: 'Cherrytwist Services Metadata',
  })
  async metadata(): Promise<IMetadata> {
    return await this.metadataService.getMetadata();
  }
}
