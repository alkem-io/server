import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { UUID_LENGTH } from '@common/constants';
import { MaxLength } from 'class-validator';

@ArgsType()
export class CalloutAspectCreatedArgs {
  @Field(() => UUID, {
    description: 'The Callouts to receive the Aspect from.',
    nullable: false,
  })
  @MaxLength(UUID_LENGTH)
  calloutID!: string;
}
