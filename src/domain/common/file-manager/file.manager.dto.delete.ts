import { Field, InputType } from '@nestjs/graphql';
import { CID } from '../scalars/scalar.cid';

@InputType()
export class DeleteFileInput {
  @Field(() => CID, { nullable: false })
  CID!: string;
}
