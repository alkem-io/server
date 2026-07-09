import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class ReplaceCollaboraDocumentInput {
  @Field(() => UUID, {
    description:
      'The ID of the CollaboraDocument whose backing file is being replaced.',
  })
  @IsUUID('all')
  ID!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Optional title chosen in the replace dialog (defaults to the incoming file title). ACCEPTED FOR FORWARD-COMPATIBILITY BUT NOT APPLIED in this feature: the stored display name is left unchanged. Persisting a rename is owned by feature 016-officedocs-rename-ux (FR-009 / FR-015). Present so reviewers do not read the unused field as a bug.',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}
