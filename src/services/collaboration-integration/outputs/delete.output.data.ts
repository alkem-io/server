/**
 * `collaboration-delete` reply (frozen contract `DeleteReply`). Deleting an
 * absent row is success (idempotent).
 */
export interface DeleteOutputData {
  success: boolean;
  error?: string;
}

export const deleteSuccess = (): DeleteOutputData => ({ success: true });

export const deleteError = (error: string): DeleteOutputData => ({
  success: false,
  error,
});
