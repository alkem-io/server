import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * A media attachment resolved for a chat message (feature 013). The `url` is the
 * Alkemio document URL, authorized via the conversation bucket policy — non-
 * members are denied on the file-service serving path (FR-007).
 */
@ObjectType('MessageAttachment')
export class IMessageAttachment {
  @Field(() => UUID, {
    nullable: false,
    description: 'The file-service document id of the attachment.',
  })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The Alkemio document URL (authorized via conversation policy).',
  })
  url!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The filename / display name of the attachment.',
  })
  displayName!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The MIME type of the attachment.',
  })
  mimeType!: string;

  @Field(() => Int, {
    nullable: false,
    description: 'The size of the attachment in bytes.',
  })
  size!: number;

  @Field(() => Int, {
    nullable: true,
    description: 'The pixel width of the attachment (images only).',
  })
  width?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'The pixel height of the attachment (images only).',
  })
  height?: number;
}
