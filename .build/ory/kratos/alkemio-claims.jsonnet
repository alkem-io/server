// alkemio-claims.jsonnet
// Kratos webhook payload for post-login and post-registration hooks.
// Sends the identity ID to the OIDC service for Alkemio identity resolution.
//
// Usage in kratos.yml:
//   body: file:///etc/config/kratos/alkemio-claims.jsonnet
//
// Available context fields:
//   ctx.identity.id - Kratos identity UUID
//   ctx.identity.traits - User traits (email, name, etc.)
//   ctx.identity.metadata_public - Existing public metadata
//   ctx.identity.verifiable_addresses - Email verification status

function(ctx) {
  identity_id: ctx.identity.id
}
