/**
 * `collaboration-info` reply (frozen contract `InfoReply`): the
 * collaborator-mode inputs carried forward from both legacy `info` patterns —
 * `read` + `update` + optional `maxCollaborators` (whiteboard's
 * number|undefined) + optional `isMultiUser` (memos only).
 *
 * `maxCollaborators` / `isMultiUser` are omitted when unknown (so the collab
 * side can distinguish "unset" from a real value).
 */
export interface InfoOutputData {
  read: boolean;
  update: boolean;
  maxCollaborators?: number;
  isMultiUser?: boolean;
}
