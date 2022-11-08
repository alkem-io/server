import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { NameID } from '@domain/common/scalars';

@InputType()
export class MoveAspectInput extends UpdateNameableInput {
  @Field(() => NameID, {
    nullable: false,
    description: 'A display identifier of the Aspect to move.',
  })
  aspectID!: string;

  @Field(() => NameID, {
    nullable: false,
    description: 'A display identifier of the Callout to move the Aspect to.',
  })
  calloutID!: string;
}
