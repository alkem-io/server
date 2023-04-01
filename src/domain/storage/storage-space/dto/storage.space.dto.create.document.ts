import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateDocumentInput } from '@domain/storage/document/dto/document.dto.create';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateDocumentOnStorageSpaceInput extends CreateDocumentInput {
  @Field(() => UUID, { nullable: false })
  storageID!: string;
}
