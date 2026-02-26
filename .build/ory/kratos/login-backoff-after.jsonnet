// login-backoff-after.jsonnet
// Kratos webhook payload for post-login (password) hook.
// Resets login backoff counters after successful authentication.
//
// Usage in kratos.yml:
//   body: file:///etc/config/kratos/login-backoff-after.jsonnet
//
// Available context fields:
//   ctx.identity.id - Kratos identity UUID
//   ctx.identity.traits.email - User's email address
//   ctx.request_headers - Filtered request headers (True-Client-Ip allowed)

function(ctx) {
  identity_id: ctx.identity.id,
  email: ctx.identity.traits.email,
  client_ip: if "True-Client-Ip" in ctx.request_headers then ctx.request_headers["True-Client-Ip"][0] else "",
}
