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
//   ctx.request_headers - Original request headers (filtered by Kratos allowlist)
//
// Note: True-Client-Ip is in Kratos v1.3.1's hardcoded header allowlist.
// The webhook-gateway proxy sets True-Client-Ip on proxied requests so
// this header is available here regardless of the upstream proxy (Traefik, Cloudflare, etc).

function(ctx)
  local headers = ctx.request_headers;
  local clientIp =
    if "True-Client-Ip" in headers then headers["True-Client-Ip"][0]
    else "";
  {
    identity_id: ctx.identity.id,
    email: ctx.identity.traits.email,
    client_ip: clientIp,
  }
