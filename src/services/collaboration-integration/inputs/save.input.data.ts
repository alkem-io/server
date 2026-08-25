import { CollaborationContentType } from '../types';

/**
 * `collaboration-save` request payload — the index row only.
 *
 * Mirrors the frozen contract `SaveData`
 * (`contract.go`): the blob NEVER crosses this bus. `contentPointer` locates the
 * snapshot in file-service — the single storage backend for the Alkemio stack.
 */
export interface SaveInputData {
  id: string;
  contentType: CollaborationContentType;
  version: number;
  /**
   * The file-service snapshot pointer. Sole producer is the checkpoint store's
   * metapointer `Record`; `PreRegister` and `Room.persist` omit it. Blank/omitted
   * means UNCHANGED — the server sets it only when present and preserves the stored
   * pointer otherwise, so a partial or redelivered save never orphans the content.
   */
  contentPointer?: string;
  /** OPEN-1; may be '' in open/standalone mode. */
  authorizationPolicyId?: string;
  /** delete-cascade key (FR-023); optional. */
  ownerRef?: string;
}
