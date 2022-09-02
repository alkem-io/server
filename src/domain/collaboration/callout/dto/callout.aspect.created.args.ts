import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class CalloutAspectCreatedArgs {
  @Field(() => UUID, {
    description: 'The Callouts to receive the Aspect from.',
    nullable: false,
  })
  calloutID!: string;
}
