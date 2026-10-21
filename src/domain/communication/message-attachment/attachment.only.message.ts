import { ReceivedAttachment } from '@alkemio/matrix-adapter-lib';

/** Language-neutral stand-in for a media message's text wherever notifications show message text. */
export const ATTACHMENT_ONLY_MESSAGE_TEXT = '🖼️';

/**
 * A media event without a caption carries its filename as the body, so the body
 * says nothing a reader wants. Same rule the web client uses to hide that echo:
 * no text at all, or exactly one attachment whose display name is the whole body.
 */
export function isAttachmentOnlyMessage(
  body: string | undefined,
  attachments: ReceivedAttachment[] | undefined
): boolean {
  if (!attachments?.length) return false;
  const trimmed = (body ?? '').trim();
  if (trimmed.length === 0) return true;
  return attachments.length === 1 && trimmed === attachments[0].display_name;
}
