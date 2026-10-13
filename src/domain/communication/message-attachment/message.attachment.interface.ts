import { ReceivedAttachment } from '@alkemio/matrix-adapter-lib';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('MessageAttachment')
export class IMessageAttachment {
  @Field(() => String, {
    nullable: true,
    description: 'The local Matrix media reference.',
  })
  externalReference?: string;
  @Field(() => String)
  displayName!: string;
  @Field(() => String, { nullable: true })
  mimeType?: string;
  @Field(() => Int, { nullable: true })
  size?: number;
  @Field(() => Int, { nullable: true })
  width?: number;
  @Field(() => Int, { nullable: true })
  height?: number;
}

export function projectMessageAttachments(
  raw: ReceivedAttachment[] = []
): IMessageAttachment[] {
  return raw.map(item => ({
    externalReference: item.media_id,
    displayName: item.display_name || 'attachment',
    mimeType: item.mime_type || undefined,
    size: item.size,
    width: item.width,
    height: item.height,
  }));
}
