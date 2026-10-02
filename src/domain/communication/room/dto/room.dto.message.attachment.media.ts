import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType, Int } from '@nestjs/graphql';

// The media fields of one Matrix media event, as a Matrix client reads them.
@InputType()
export class MessageAttachmentMediaInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The Synapse media id of the event (the last path segment of its mxc:// URI on this homeserver).',
  })
  mediaID!: string;

  @Field(() => String, {
    nullable: true,
    description: 'The filename carried by the event.',
  })
  displayName?: string;

  @Field(() => UUID, {
    nullable: true,
    description: 'The file-service document id hint carried by the event.',
  })
  documentID?: string;

  @Field(() => Int, {
    nullable: true,
    description: 'The pixel width carried by the event (images only).',
  })
  width?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'The pixel height carried by the event (images only).',
  })
  height?: number;
}
