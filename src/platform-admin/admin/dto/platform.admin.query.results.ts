import { ObjectType } from '@nestjs/graphql';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';

@ObjectType()
export class PlatformAdminQueryResults {
  // exposed through the field resolver
  innovationPack!: IInnovationPack;
}
