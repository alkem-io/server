import { UUID_LENGTH } from '@common/constants';
import { UUID } from '@domain/common/scalars';
import { ArgsType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@ArgsType()
export class CalloutPostCreatedArgs {
  @Field(() => UUID, {
    description: 'The Callouts to receive the Post from.',
    nullable: false,
  })
  @MaxLength(UUID_LENGTH)
  calloutID!: string;
}
