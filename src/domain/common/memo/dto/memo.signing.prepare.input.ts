import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class MemoSigningPrepareInput {
  @Field(() => UUID, { description: 'The Memo to prepare for signing.' })
  @IsUUID()
  memoID!: string;
}
