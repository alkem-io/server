# SANDBOX memo-signing acceptance

Run this after the trust-gateway overlay, the server feature and the client feature are deployed to
SANDBOX. Use an enrolled Cleverbase acceptance signer. This is an acceptance-only B-T journey using
the public, non-qualified `https://thameur.org/tsa`; it is not evidence of qualified status, chain
trust or revocation.

## Prepare private evidence

Docker, `jq`, `kubectl`, `pdfsig` and a browser with developer tools are prerequisites. Keep the
session cookie, authorize URL, client state, OIDC subject and certificate details out of Git, PRs,
screenshots and terminal history.

```bash
export SANDBOX_CONTEXT="$(kubectl config current-context)"
test "$SANDBOX_CONTEXT" = k8s-hetzner-sandbox
export EVIDENCE_DIR='/absolute/operator-owned/path/sandbox-signing-acceptance'
install -d -m 0700 "$EVIDENCE_DIR"
read -rsp 'Paste the authenticated browser Cookie request header: ' ALKEMIO_SESSION_COOKIE
printf '\n'

graphql() {
  curl -fsS https://sandbox-alkem.io/api/public/graphql \
    -H 'Content-Type: application/json' \
    -H "Cookie: $ALKEMIO_SESSION_COOKIE" --data-binary @-
}

read_attempt() {
  jq -nc --arg id "$SIGNING_ATTEMPT_ID" \
    '{query:"query($id: UUID!) { signingAttempt(ID: $id) { id status } }",variables:{id:$id}}' |
    graphql | tee "$EVIDENCE_DIR/attempt-$1.json"
}

read_attempt_row() {
  printf "SELECT id,status,\"snapshotDocumentId\",\"correlationId\",\"expiresAt\",\"signedDocumentId\",\"updatedDate\" FROM signing_attempt WHERE id = '%s';\n" \
    "$SIGNING_ATTEMPT_ID" |
    kubectl --context "$SANDBOX_CONTEXT" -n default exec -i deploy/postgres -c postgres -- \
      sh -lc 'psql -X --csv -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$DATABASE_NAME"' |
    tee "$EVIDENCE_DIR/attempt-$1.csv"
}
```

## Link the real identity

1. In a private browser window, open `https://sandbox-alkem.io/login`, select **Cleverbase**, and
   finish the real OIDC flow. Do not use the local Kratos seed or the Wallet Connection Suite.
2. After Alkemio opens, confirm that Kratos linked the provider through the server's normal mapping:

   ```bash
   jq -nc '{query:"{ me { user { id authentication { methods } } } }"}' |
     graphql | tee "$EVIDENCE_DIR/authentication-methods.json" |
     jq -e '.data.me.user.authentication.methods | index("CLEVERBASE") != null'
   ```

3. Capture a screenshot of the logged-in Alkemio profile without the browser address bar. The
   evidence is the `CLEVERBASE` method, not the provider subject.

## Complete one signature

1. Create a memo in a test Space where this user has `CONTRIBUTE`, enter unique acceptance text,
   save it, select **Sign**, and confirm the exact text in the inline PDF preview. Save a screenshot.
2. From the `prepareMemoSigning` response in browser developer tools, copy only `attemptId`:

   ```bash
   export SIGNING_ATTEMPT_ID='<prepare attemptId>'
   read_attempt prepared
   read_attempt_row prepared
   ```

   Expect `PENDING`, a snapshot document, and null correlation, expiry and signed-document fields.
3. Select **Continue** once. Record the `continueMemoSigning` response as a screenshot with the
   authorize URL redacted, then complete the Cleverbase Wallet consent. While consent is open, run:

   ```bash
   read_attempt continued
   read_attempt_row continued
   ```

   Expect `PENDING`, the same snapshot, and non-null `correlationId` and `expiresAt`. The CSV is the
   gateway correlation evidence; Cleverbase does not return a separate request-id header.
4. Complete consent. The browser must return through
   `/api/public/rest/content-signing/complete` to the memo URL with
   `signingAttemptId=<attempt UUID>`. Save the success screenshot, then run:

   ```bash
   read_attempt signed
   read_attempt_row signed
   ```

   Expect `SIGNED`, a null snapshot and a non-null signed document. Reload and confirm the UI's
   **Recorded** value is unchanged.
5. Download the signed PDF as `$EVIDENCE_DIR/signed.pdf`, then capture its digest and PDF signature:

   ```bash
   shasum -a 256 "$EVIDENCE_DIR/signed.pdf" | tee "$EVIDENCE_DIR/signed.sha256"
   pdfsig "$EVIDENCE_DIR/signed.pdf" | tee "$EVIDENCE_DIR/pdfsig.txt"
   ```

6. Select **Verify** once in Alkemio. Save the integrity-only verdict screenshot and the matching
   GraphQL result:

   ```bash
   jq -nc --arg id "$SIGNING_ATTEMPT_ID" \
     '{query:"query($input: MemoSignatureVerifyInput!) { verifyMemoSignature(verificationData: $input) }",variables:{input:{attemptID:$id}}}' |
     graphql | tee "$EVIDENCE_DIR/alkemio-verify.json" |
     jq -e '.data.verifyMemoSignature == "VERIFIED"'
   ```

7. Capture the gateway's private `/v1/verify` result in a second terminal. Keep this raw file private
   because it contains certificate attribution that Alkemio intentionally does not expose:

   ```bash
   kubectl --context "$SANDBOX_CONTEXT" -n default port-forward service/trust-gateway 18080:8080
   ```

   ```bash
   base64 < "$EVIDENCE_DIR/signed.pdf" | tr -d '\n' |
     jq -Rs '{document:.}' > "$EVIDENCE_DIR/verify-request.json"
   curl -fsS http://127.0.0.1:18080/v1/verify \
     -H 'Content-Type: application/json' \
     --data-binary "@$EVIDENCE_DIR/verify-request.json" |
     tee "$EVIDENCE_DIR/gateway-verify.json" |
     jq -e '.integrity == true and .profile == "B-T" and .reasons == []'
   rm "$EVIDENCE_DIR/verify-request.json"
   ```

## Exercise terminal aborts

- **Decline:** prepare and continue a new attempt, set `SIGNING_ATTEMPT_ID` to its ID, then decline
  in the Wallet. After the browser returns, run `read_attempt declined` and
  `read_attempt_row declined`. Expect `CANCELLED`, a null snapshot and no signed document; save the
  returned memo screenshot.
- **Expiry sweep:** prepare and continue another new attempt, record its row as `expiry-started`,
  then abandon the Wallet without changing the database or gateway. Wait until its recorded
  `expiresAt`, the one-minute margin, and the next hourly sweep. Run `read_attempt expired` and
  `read_attempt_row expired`; expect `EXPIRED`, a null snapshot and no signed document.

Finally unset `ALKEMIO_SESSION_COOKIE`, stop the port-forward, and retain the private directory. In
the PR or acceptance report publish only the attempt-status sequence, correlation ID, PDF SHA-256,
the three-state Alkemio Verify result and redacted screenshots. Never publish the cookie, authorize
URL, OIDC subject, client state, raw gateway response or certificate details.
