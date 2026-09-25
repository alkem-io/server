/**
 * Whether a send or reply carries attachments. The attachment input does not
 * exist on the integration branch yet, so every call is text today; when the
 * media branch merges, this derivation reads the input's attachments and the
 * ledger starts labelling those calls as the retained media seam.
 */
export const hasAttachments = (messageData: unknown): boolean => {
  const attachments = (messageData as { attachments?: unknown } | undefined)
    ?.attachments;
  return Array.isArray(attachments) && attachments.length > 0;
};
