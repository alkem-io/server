# Local memo signing

This fixture uses synthetic keys and an RFC 3161 TSA. It proves Alkemio wiring and B-T PDF
integrity, not real Cleverbase subject equivalence, certificate trust, revocation or QES status.
The host and the existing development stack are the local trust boundary: the gateway and mock
publish only on loopback, but sibling containers share `alkemio_dev_net`.

## Start the fixture

The Compose file pins trust-gateway v0.1.0 and the Cleverbase reference mock by digest. Start the
normal quickstart with fresh storage, then run the server and client on their usual host ports:

```bash
pnpm start:services
pnpm migration:run
pnpm start:dev
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

`PNONL-123` is the provider subject and certificate subject `serialNumber` RDN for mock signer Jane
Doe. It is intentionally different from the certificate serial
`07FB0DA8384404C33517B852CFE79F04C5006AC1`.

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
6. For decline, take the `state` from the first mock authorization URL and visit the public callback
   with `error=access_denied`; the attempt becomes cancelled without a signed document.
7. For eviction, restart only `trust-gateway` while an attempt is awaiting authorization and reopen
   its return URL; the attempt expires without attaching a result.

Live Cleverbase needs the real client/TSA credentials and a confirmed subject mapping supplied out
of band. It uses no mock container and must not place credentials in this repository.
