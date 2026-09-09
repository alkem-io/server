import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class MemoSigningContinueInput {
  @Field(() => UUID, { description: 'The prepared signing attempt to start.' })
  @IsUUID()
  attemptID!: string;
}
