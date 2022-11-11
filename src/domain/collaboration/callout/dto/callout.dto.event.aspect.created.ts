import { IAspect } from '@src/domain/collaboration/aspect/aspect.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutAspectCreated')
export class CalloutAspectCreated {
  eventID!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Callout on which the aspect was created.',
  })
  calloutID!: string;

  @Field(() => IAspect, {
    nullable: false,
    description: 'The aspect that has been created.',
  })
  aspect!: IAspect;
}
