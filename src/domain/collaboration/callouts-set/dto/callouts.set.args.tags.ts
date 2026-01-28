import { TagsetArgs } from '@domain/common/tagset/dto/tagset.args';
import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class CalloutsSetArgsTags {
  @Field(() => [TagsetArgs], {
    description: 'Return only tags of Callouts matching the specified filter.',
    nullable: true,
  })
  classificationTagsets?: TagsetArgs[];
}
