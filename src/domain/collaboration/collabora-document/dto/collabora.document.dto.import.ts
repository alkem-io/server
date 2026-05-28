import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, Float, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class ImportCollaboraDocumentInput {
  @Field(() => UUID, {
    description:
      'The ID of the Callout to attach the imported document to as a new contribution.',
  })
  @IsUUID('all')
  calloutID!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Optional title override. If absent, derived from the uploaded filename (extension stripped).',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @Field(() => Float, {
    nullable: true,
    description:
      'Optional sortOrder for the new contribution. Defaults to one less than the current minimum (new contribution appears first).',
  })
  @IsOptional()
  sortOrder?: number;
}
