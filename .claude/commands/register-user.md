---
description: Register and verify a new user via Kratos self-service API + MailSlurper, then create Alkemio profile
arguments:
  - name: email
    description: Email address for the new user (e.g., user@example.com)
    required: true
  - name: password
    description: Password for the new user (min 8 characters recommended)
    required: true
  - name: firstName
    description: First name for the user (defaults to "Test")
    required: false
  - name: lastName
    description: Last name for the user (defaults to "User")
    required: false
---

Register a new user on the Alkemio platform. This performs three phases:

1. **Kratos registration** — create identity with email/password
2. **Email verification** — read confirmation from MailSlurper and verify via code
3. **Alkemio profile creation** — login to get a session token, then call `createUserNewRegistration` mutation

## Prerequisites

Services must be running (`pnpm run start:services`) and the Alkemio server must be running (`pnpm start:dev`).

## Configuration

| Service              | URL                                                      |
| -------------------- | -------------------------------------------------------- |
| Kratos Public        | `http://localhost:3000/ory/kratos/public`                 |
| MailSlurper API      | `http://localhost:4437`                                   |
| MailSlurper UI       | `http://localhost:4436`                                   |
| Alkemio GraphQL (NI) | `http://localhost:3000/api/private/non-interactive/graphql` |

## Procedure

Parse arguments from `$ARGUMENTS`:
- **1st** = email (required)
- **2nd** = password (required)
- **3rd** = firstName (optional, defaults to `"Test"`)
- **4th** = lastName (optional, defaults to `"User"`)

If email or password is missing, ask the user.

Execute the following steps sequentially using the Bash tool. Use `jq` for JSON parsing. Stop and report any errors.

---

### Step 1 — Health check

Verify Kratos is reachable:

```bash
curl -sf http://localhost:3000/ory/kratos/public/health/alive
```

If this fails, tell the user to start services with `pnpm run start:services`.

---

### Step 2 — Initialize registration flow

Create a new API-mode registration flow:

```bash
curl -s -X GET http://localhost:3000/ory/kratos/public/self-service/registration/api
```

Extract the `id` field from the JSON response — this is the `FLOW_ID`.

---

### Step 3 — Submit registration

Submit the registration form with the password method. Use the parsed email, password, firstName, and lastName:

```bash
curl -s -X POST "http://localhost:3000/ory/kratos/public/self-service/registration?flow=${FLOW_ID}" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "method": "password",
    "password": "PASSWORD_HERE",
    "traits": {
      "email": "EMAIL_HERE",
      "name": { "first": "FIRST_NAME_HERE", "last": "LAST_NAME_HERE" },
      "accepted_terms": true
    }
  }'
```

**Success**: Response contains an `identity` object with the new user's ID and traits. Save `identity.id` as `IDENTITY_ID`. Continue to **Step 4**.

**Identity already exists** (error id `4000007` or message contains "exists already"): The account is already registered. Try logging in directly — skip to **Step 6** (login). If login succeeds, the identity is already verified; continue to **Step 7** (GraphQL). If login fails with a verification error, trigger a new verification email and continue from **Step 4**:

```bash
VFLOW=$(curl -s -X GET 'http://localhost:3000/ory/kratos/public/self-service/verification/api' | jq -r '.id')
curl -s -X POST "http://localhost:3000/ory/kratos/public/self-service/verification?flow=${VFLOW}" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{"method": "code", "email": "EMAIL_HERE"}'
```

**Other errors**: Response contains an `error` or `ui.messages` array — report them to the user and stop.

---

### Step 4 — Retrieve verification email from MailSlurper

Wait 3 seconds for the Kratos courier to send the verification email, then query MailSlurper:

```bash
sleep 3
curl -s http://localhost:4437/mail
```

The response is JSON with a `mailItems` array. Find the most recent item where `toAddresses` contains the registered email. If no email found, retry after 3 more seconds (up to 3 retries).

Extract the `body` field from the matching mail item — this is the HTML email content.

---

### Step 5 — Extract verification code and complete verification

The email body contains a **verification code** and a **flow ID**. Extract them:

- The **code** appears as plain text in `<em>CODE</em>` tags (a 6-digit number)
- The **flow ID** appears in the URL query parameter `flow=FLOW_ID`

Parse from the email body:

```bash
# Extract code (6-digit number from the code= parameter)
echo "$EMAIL_BODY" | grep -oP 'code=\K[0-9]+'

# Extract flow ID
echo "$EMAIL_BODY" | grep -oP 'flow=\K[a-f0-9-]+'
```

Submit the verification code:

```bash
curl -s -X POST "http://localhost:3000/ory/kratos/public/self-service/verification?flow=${VERIFICATION_FLOW}" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{"method": "code", "code": "CODE_HERE"}'
```

**Success**: Response contains `"state": "passed_challenge"`.
**Error**: Report the error and stop.

---

### Step 6 — Login to get session token

Perform a Kratos native login to obtain a session token (Bearer token) for the verified user:

```bash
# Initialize login flow
LOGIN_FLOW=$(curl -s -X GET 'http://localhost:3000/ory/kratos/public/self-service/login/api' | jq -r '.id')

# Submit login with password
curl -s -X POST "http://localhost:3000/ory/kratos/public/self-service/login?flow=${LOGIN_FLOW}" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{
    "method": "password",
    "identifier": "EMAIL_HERE",
    "password": "PASSWORD_HERE"
  }'
```

Extract `session_token` from the response — this is the Bearer token. If login fails (e.g. email not verified yet), report the error and stop.

---

### Step 7 — Create Alkemio user profile

Call the `createUserNewRegistration` GraphQL mutation against the non-interactive endpoint using the session token as Bearer auth:


```bash
curl -s -X POST 'http://localhost:3000/api/private/non-interactive/graphql' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${SESSION_TOKEN}" \
  -d '{"query": "mutation { createUserNewRegistration { id nameID profile { displayName } } }"}'
```

**Success**: Response contains `data.createUserNewRegistration` with the new Alkemio user profile (id, nameID, displayName).

**Already exists**: If the Alkemio user profile already exists (linked user), the mutation may return it or error. Report whatever comes back.

---

### Step 8 — Report results

Print a summary:

```
Registration & Verification Complete
  Email:      <email>
  Name:       <firstName> <lastName>
  Kratos ID:  <identity_id>
  Alkemio User:
    ID:       <alkemio_user_id>
    NameID:   <nameID>
    Display:  <displayName>
```
