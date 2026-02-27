import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LookupByNameQueryResults {
  // exposed through the field resolver
  innovationPack!: IInnovationPack;
}
