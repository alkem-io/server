import { SsiSovrhdRegisterCallback } from './ssi.sovrhd.dto.register.callback';
import { SsiSovrhdRegisterCallbackCredentialContent } from './ssi.sovrhd.dto.register.callback.credential.content';

export class SsiSovrhdRegisterCallbackCredential extends SsiSovrhdRegisterCallback {
  content!: SsiSovrhdRegisterCallbackCredentialContent;
}
