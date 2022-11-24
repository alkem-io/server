import { Field, InputType } from '@nestjs/graphql';
import { CID } from '../scalars/scalar.cid';

@InputType()
export class DeleteFileInput {
  @Field(() => CID, {
    nullable: false,
    description:
      'IPFS Content Identifier (CID) of the file, e.g. Qmde6CnXDGGe7Dynz1pnxgNARtdVBme9YBwNbo4HJiRy2W',
  })
  CID!: string;
}
