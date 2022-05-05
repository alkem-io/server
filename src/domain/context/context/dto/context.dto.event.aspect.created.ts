import { IAspect } from '@src/domain';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('ContextAspectCreated')
export class ContextAspectCreated {
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Context on which the aspect was created.',
  })
  contextID!: string;

  @Field(() => IAspect, {
    nullable: false,
    description: 'The aspect that has been created.',
  })
  aspect!: IAspect;
}
