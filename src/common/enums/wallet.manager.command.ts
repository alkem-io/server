export enum WalletManagerCommand {
  COMPLETE_CREDENTIAL_REQUEST_INTERACTION = 'completeCredentialRequestInteraction',
  COMPLETE_CREDENTIAL_OFFER_INTERACTION = 'completeCredentialOfferInteraction',
  CREATE_IDENTITY = 'createIdentity',
  GET_IDENTITY_INFO = 'getIdentityInfo',
  GRANT_STATE_TRANSITION_VC = 'grantStateTransitionVC',
  BEGIN_CREDENTIAL_REQUEST_INTERACTION = 'beginCredentialRequestInteraction',
  BEGIN_CREDENTIAL_OFFER_INTERACTION = 'beginCredentialOfferInteraction',
  ISSUE_VERIFIED_CREDENTIAL = 'issueVerifiedCredential',
}
