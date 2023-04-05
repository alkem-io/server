import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength, MinLength } from 'class-validator';
import { MimeFileType } from '@common/enums/mime.file.type';
import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';

@InputType()
export class CreateDocumentInput {
  @Field({
    nullable: false,
    description: 'The display name for the Document.',
  })
  @MinLength(3)
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];

  createdBy!: string;

  mimeType!: MimeFileType;

  size!: number;
}
