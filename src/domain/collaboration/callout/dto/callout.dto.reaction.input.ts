import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

@InputType()
export class AddReactionToCalloutInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Callout to react to.',
  })
  @IsUUID()
  calloutID!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'Must be one of the platform allowed emoji slugs; validated server-side (ValidationException on miss).',
  })
  @IsString()
  @IsNotEmpty()
  emoji!: string;
}

@InputType()
export class RemoveReactionFromCalloutInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Callout to remove the reaction from.',
  })
  @IsUUID()
  calloutID!: string;
}
