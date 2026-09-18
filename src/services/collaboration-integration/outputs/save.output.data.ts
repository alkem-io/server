/**
 * `collaboration-save` reply (frozen contract `SaveReply`): success xor an
 * error string. Flat object — NestJS wraps it in the standard
 * `{ response, isDisposed, id }` envelope on the wire.
 */
export interface SaveOutputData {
  success: boolean;
  error?: string;
}

export const saveSuccess = (): SaveOutputData => ({ success: true });

export const saveError = (error: string): SaveOutputData => ({
  success: false,
  error,
});
