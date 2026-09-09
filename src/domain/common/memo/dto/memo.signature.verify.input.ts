import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class MemoSignatureVerifyInput {
  @Field(() => UUID, { description: 'The signed Memo attempt to verify.' })
  @IsUUID()
  attemptID!: string;
}
