// webhook-gateway-verification.jsonnet
// Kratos webhook payload for post-verification hook.
// Sends identity details to the webhook-gateway for welcome email processing.
//
// Usage in kratos.yml:
//   body: file:///etc/config/kratos/webhook-gateway-verification.jsonnet
//
// Available context fields (verification flow):
//   ctx.identity.id - Kratos identity UUID
//   ctx.identity.traits - User traits (email, name, etc.)

function(ctx) {
  local name = std.get(ctx.identity.traits, 'name', {}),
  local firstName = std.get(name, 'first', ''),
  local lastName = std.get(name, 'last', ''),
  identity_id: ctx.identity.id,
  email: ctx.identity.traits.email,
  first_name: firstName,
  display_name: if lastName != '' then firstName + ' ' + lastName else firstName,
}
