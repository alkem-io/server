import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class DeleteCollaboraDocumentInput {
  @Field(() => UUID, {
    description: 'The ID of the CollaboraDocument to delete.',
  })
  @IsUUID('4')
  ID!: string;
}
