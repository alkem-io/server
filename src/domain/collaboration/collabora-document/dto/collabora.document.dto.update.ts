import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class UpdateCollaboraDocumentInput {
  @Field(() => UUID, {
    description: 'The ID of the CollaboraDocument to update.',
  })
  @IsUUID('all')
  ID!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Updated display name for the document.',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}
