// password-changed.jsonnet
// Kratos webhook payload for the settings-flow `after.password` hook (spec 005).
// Emitted to the Go kratos-webhooks service, which republishes it as the
// USER_PASSWORD_CHANGED broker event the server consumes.
//
// Usage in kratos.yml:
//   body: file:///etc/config/kratos/password-changed.jsonnet
//
// Available context fields (settings flow):
//   ctx.identity.id      - Kratos identity UUID
//   ctx.flow.id          - Kratos settings-flow id (idempotency key half)
//   ctx.request_headers  - Original request headers (filtered by Kratos allowlist)
//
// Note: True-Client-Ip is in Kratos's hardcoded header allowlist; the
// kratos-hooks proxy sets it on proxied requests so it is available here
// regardless of the upstream proxy (Traefik, Cloudflare, etc). User-Agent is
// likewise allowlisted. Both are optional — the audit row records what is
// present.

function(ctx)
  local headers = ctx.request_headers;
  local clientIp =
    if "True-Client-Ip" in headers then headers["True-Client-Ip"][0]
    else "";
  local userAgent =
    if "User-Agent" in headers then headers["User-Agent"][0]
    else "";
  local flow = std.get(ctx, 'flow', {});
  {
    identity_id: ctx.identity.id,
    flow_id: std.get(flow, 'id', ''),
    client_ip: clientIp,
    user_agent: userAgent,
  }
