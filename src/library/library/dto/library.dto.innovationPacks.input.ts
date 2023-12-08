import { Field, Float, InputType } from '@nestjs/graphql';
import { InnovationPacksOrderBy } from '@common/enums/innovation.packs.orderBy';

@InputType()
export class InnovationPacksInput {
  @Field(() => Float, {
    nullable: true,
    description:
      'The number of Discussion entries to return; if omitted return all InnovationPacks.',
  })
  limit?: number;

  @Field(() => InnovationPacksOrderBy, {
    description:
      'The sort order of the InnovationPacks to return. Defaults to number of templates Descending.',
    nullable: true,
  })
  orderBy?: InnovationPacksOrderBy;
}
