import { ArgsType, Field } from '@nestjs/graphql';
import { TagsetArgs } from '@domain/common/tagset/dto/tagset.args';

@ArgsType()
export class CalloutsSetArgsTags {
  @Field(() => [TagsetArgs], {
    description: 'Return only Callouts matching the specified filter.',
    nullable: true,
  })
  classificationTagsets?: TagsetArgs[];
}
