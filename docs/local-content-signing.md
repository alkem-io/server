# Local memo signing

This fixture uses synthetic keys and an RFC 3161 TSA. It proves Alkemio wiring and B-T PDF
integrity, not real Cleverbase subject equivalence, certificate trust, revocation or QES status.
The host and the existing development stack are the local trust boundary: the gateway and mock
publish only on loopback, but sibling containers share `alkemio_dev_net`.

## Start the fixture

The Compose file pins trust-gateway v0.1.0 and the Cleverbase reference mock by digest. Start the
normal quickstart with fresh storage, then run the server and client on their usual host ports.
Docker, pnpm and `jq` are prerequisites. `COMPOSE_PROJECT_NAME` names only this task-owned fresh
stack; never run the volume-removal command against a default or developer project.

```bash
export COMPOSE_PROJECT_NAME=aiai-2025-content-signing
docker compose -p "$COMPOSE_PROJECT_NAME" -f quickstart-services.yml \
  --env-file .env.docker down -v --remove-orphans
pnpm start:services
pnpm migration:run
pnpm start:dev
```

In a second terminal, from the client-web feature checkout, start the host client on port 3001:

```bash
pnpm start
```

The host-run server uses `http://localhost:8080`; Traefik routes only exact GET requests for
`/oauth/cleverbase/callback` to the gateway. `/v1/sign/*` has no Traefik route. Check both pinned
containers before using the UI:

```bash
curl -fsS http://127.0.0.1:8080/readyz
curl -fsS http://127.0.0.1:9000/healthz
```

## Link the local admin identity

Import the mock subject through Kratos's normal admin identity API. The update explicitly
re-imports the local password credential, so browser login remains available. Run this only on a
fresh local Kratos database; it is not a production identity bypass.

```bash
export SIGNING_EMAIL=admin@alkem.io SIGNING_PASSWORD=password
export KRATOS_ADMIN=http://localhost:3000/ory/kratos/admin
identity_id=$(curl -fsS --get "$KRATOS_ADMIN/identities" \
  --data-urlencode "credentials_identifier=$SIGNING_EMAIL" | jq -er '.[0].id')
identity=$(curl -fsS "$KRATOS_ADMIN/identities/$identity_id")
body=$(jq --arg password "$SIGNING_PASSWORD" '
  {schema_id,state,traits,metadata_admin,metadata_public,
   credentials:{password:{config:{password:$password}},
                oidc:{config:{providers:[{provider:"cleverbase",subject:"PNONL-123"}]}}}}' \
  <<<"$identity")
curl -fsS -X PUT "$KRATOS_ADMIN/identities/$identity_id" \
  -H 'Content-Type: application/json' --data "$body" >/dev/null
curl -fsS "$KRATOS_ADMIN/identities/$identity_id?include_credential=oidc" |
  jq -e '.credentials.password != null and
    (.credentials.oidc.identifiers | index("cleverbase:PNONL-123") != null)'
```

`PNONL-123` is the provider subject from the
[SDK mock-signer contract](https://github.com/alkem-io/cleverbase-sdk/blob/develop/examples/reference-integration/mock-upstream/README.md),
not the X.509 certificate serial. The complete environment recipe is owned by the
[gateway v0.1.0 local-stack documentation](https://github.com/alkem-io/trust-gateway/blob/v0.1.0/README.md#local-alkemio-stack-mock-and-public-stub).

## Verify the journey

Log in at `http://localhost:3000/login` with the seeded local admin, open a memo and select **Sign**.
Record these checks:

1. Unsaved collaboration changes become durable before prepare; the same-origin preview iframe
   shows the exact PDF with `Content-Disposition: inline`, no `X-Frame-Options: DENY`, and no
   `frame-ancestors 'none'` on the response.
2. Continue traverses both mock authorization redirects and returns through
   `/api/public/rest/content-signing/complete`; the final memo URL contains only
   `signingAttemptId=<uuid>` for the signing outcome.
3. Download the signed PDF and run `pdfsig <file.pdf>`: the signature is valid and the timestamp is
   present. The UI's **Recorded** value is the server `updatedDate` and stays unchanged on reload.
4. Sign the memo again: a second copy is appended and the first is unchanged.
5. For login restoration, log out before following the terminal gateway return, then log in again;
   the original REST return URL completes and redirects to the memo.
6. For decline, copy the first mock authorization URL from the browser before following it, then
   run the commands below. The attempt becomes cancelled without a signed document.
7. For eviction, create and continue another attempt, copy its ID and authorization URL, then restart
   only the task-owned gateway before completing authorization. Following that authorization now
   reaches the gateway callback with `400 unknown_state` and does not return to Alkemio. Read the
   gateway's authoritative `expiresAt` from the persisted attempt as shown below. After that instant,
   the one-minute expiry margin and the next hourly sweep, the actor-bound query reports `EXPIRED`
   without an attached result; this is not an immediate-expiry check.

Read either terminal state through the actor-bound GraphQL query. Copy the session cookie request
header from the browser devtools into the local shell without committing or printing it:

```bash
export SIGNING_ATTEMPT_ID='<attempt UUID from the memo return URL or prepare response>'
export ALKEMIO_SESSION_COOKIE='<browser Cookie request header>'
read_attempt() {
  jq -nc --arg id "$SIGNING_ATTEMPT_ID" \
    '{query:"query($id: UUID!) { signingAttempt(ID: $id) { id status } }",variables:{id:$id}}' |
    curl -fsS http://localhost:3000/graphql -H 'Content-Type: application/json' \
      -H "Cookie: $ALKEMIO_SESSION_COOKIE" --data-binary @- |
    jq -e '.data.signingAttempt | {id,status}'
}

authorize_url='<first mock authorization URL copied from the browser>'
state=$(jq -nr --arg url "$authorize_url" '$url | capture("[?&]state=(?<value>[^&]+)").value')
curl -fsS -o /dev/null -D - \
  "http://localhost:3000/oauth/cleverbase/callback?state=$state&error=access_denied"
read_attempt

docker compose -p "$COMPOSE_PROJECT_NAME" -f quickstart-services.yml \
  --env-file .env.docker restart trust-gateway
# Complete the copied authorization URL and observe HTTP 400 with no Alkemio server return.
expires_at=$(docker compose -p "$COMPOSE_PROJECT_NAME" -f quickstart-services.yml \
  --env-file .env.docker exec -T postgres psql -U synapse -d alkemio -Atc \
  "SELECT \"expiresAt\" FROM signing_attempt WHERE id = '$SIGNING_ATTEMPT_ID'")
printf 'wait until after %s + 1 minute, then allow up to one hour for the sweep\n' "$expires_at"
# After that bounded wait:
read_attempt
```

Live Cleverbase needs the real client/TSA credentials and a confirmed subject mapping supplied out
of band. It uses no mock container and must not place credentials in this repository.
