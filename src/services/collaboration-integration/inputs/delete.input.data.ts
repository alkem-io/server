/**
 * `collaboration-delete` request payload (frozen contract `DeleteData`): the
 * document id whose index row should be purged on the owner-delete cascade.
 * Idempotent — deleting an absent row is success.
 */
export interface DeleteInputData {
  id: string;
}
