import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class AspectMessageReceivedArgs {
  @Field(() => UUID, {
    description: 'The Aspect to receive messages from.',
    nullable: false,
  })
  aspectID!: string;
}
