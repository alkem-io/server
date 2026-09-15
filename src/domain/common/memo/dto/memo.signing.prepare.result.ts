import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MemoSigningPrepareResult {
  @Field(() => UUID)
  attemptId!: string;

  @Field(() => String)
  previewUrl!: string;
}
