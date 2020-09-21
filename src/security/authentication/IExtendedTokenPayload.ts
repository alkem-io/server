import { ITokenPayload } from 'passport-azure-ad';

export interface IExtendedTokenPayload extends ITokenPayload {
  /** User email. */
  email?: string;
}