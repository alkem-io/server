/**
 * `collaboration-info` request payload (frozen contract `InfoData`): who is
 * asking about which document. `actorId`, never `userId` (constitution §III /
 * the unified contract).
 */
export interface InfoInputData {
  actorId: string;
  id: string;
}
