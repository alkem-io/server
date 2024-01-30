import { ArgsType, Field, Float } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars';
import { TagsetArgs } from '@common/args/tagset.args';
import { CalloutDisplayLocation } from '@common/enums/callout.display.location';

@ArgsType()
export class CollaborationArgsCallouts {
  @Field(() => [UUID_NAMEID], {
    description: 'The IDs of the callouts to return',
    nullable: true,
  })
  IDs?: string[];

  @Field(() => Float, {
    description:
      'The number of Callouts to return; if omitted return all Callouts.',
    nullable: true,
  })
  limit?: number;

  @Field(() => Boolean, {
    description:
      'If true and limit is specified then return the Callouts based on a random selection. Defaults to false.',
    nullable: true,
  })
  shuffle?: boolean;

  @Field(() => Boolean, {
    description:
      'If true then return the Callouts sorted by most activity. Defaults to false.',
    nullable: true,
  })
  sortByActivity?: boolean;

  @Field(() => [CalloutDisplayLocation], {
    description: 'Return only Callouts with these display location values.',
    nullable: true,
  })
  displayLocations?: CalloutDisplayLocation[];

  @Field(() => [TagsetArgs], {
    description: 'A filter .',
    nullable: true,
  })
  tagsets?: TagsetArgs[];
}
