# Developing with the server

The easiest way to get going with custom development of the Alkemio Server is to leverage the Docker Compose script as detailed in the [Running the server](Running.md) document.

In this setup you are then using the docker composed stack for:

- Database container
- Identity and SSO services:
  - ory/kratos
  - ory/hydra
  - ory/oathkeeper
  - ory/mailslurper (not used on production)
- Matrix Synapse homeserver (for real-time collaboration features)

Note that the CT Server from the docker composed stack is listening on port 4001 instead of port 4000, so it will not collide with running a second server locally - but do keep in mind those two server instances are sharing the same data / authentication provider.

Assuming you have a suitable database server and authentication provider available then please follow the following steps:

## Steps

- Install dependencies

```bash
pnpm install
```

- Start the server

```bash
pnpm start
```

There should now be a [running Alkemio server](http://localhost:4000/graphql)!

## MySQL Database

It is of course also possible to use a separate MySQL database server.

If installing MySQL locally, please refer to [the data management document](DataManagement.md#MySQL-Server-specific-configuration-for-version-8) if using **MySQL 8**.

## Authentication

Authentication and SSO are handled by the `Ory Kratos` + `Ory Hydra` stack. Hydra issues OAuth2/OIDC challenges that are served by the NestJS controllers, and Synapse consumes the resulting tokens for Matrix access.

The easiest way to run the full identity stack is to use the provided docker scripts. See [Running the server](Running.md) document.

Configuration for the Ory services can be found in `./build/ory`. The Synapse homeserver configuration (including OIDC settings) lives in `./build/synapse/homeserver.yaml`.

The verification and recovery flows templates can be edited in `./build/ory/kratos/courier-templates`. More information how to customize them [here](https://www.ory.sh/kratos/docs/concepts/email-sms/#sender-address-and-template-customization). They are using [golang templates](https://golang.org/pkg/text/template/) format.

The registration and the recovery flows include sending emails to the registered users. For development purposes the fake smtp server `Mailslurper` is used. It can be accessed on http://localhost:4436/ (if the docker compose method has been used to setup the development environment).

## Schema baseline workflow troubleshooting

- The `Schema Baseline` GitHub Action writes a summary with diff counts and links to artifacts after every `develop` push; inspect the job summary first when a baseline pull request is missing.
- If the run fails before publishing a commit, check the appended summary section for the `BASELINE_FAILURE_CONTEXT` note and download the `schema-baseline-<run>` artifact bundle for `schema.graphql`, `tmp/prev.schema.graphql`, and `change-report.json`.
- Signing issues typically surface during the "Commit baseline update" or branch push steps. Confirm the `ALKEMIO_INFRASTRUCTURE_BOT_GPG_*` secrets match the key uploaded to the automation bot and that the key is marked as trusted in GitHub. If the PR fails to open, confirm the `ALKEMIO_INFRASTRUCTURE_BOT_PUSH_TOKEN` secret still has `repo` scope and the bot account retains CLA privileges.
- To regenerate locally, follow `specs/012-generate-schema-baseline/quickstart.md` and push the resulting `schema-baseline.graphql` if automation is blocked.
- Owners automatically receive a commit comment on failure; if the automation remains red after remediation, re-run the job from the Actions UI with `workflow_dispatch` to verify the fix.

## SonarQube Static Analysis

The repository automatically runs SonarQube static analysis on all pull requests and pushes to the `develop` branch. This provides continuous feedback on code quality, bugs, vulnerabilities, and test coverage.

### For Contributors

- The SonarQube analysis runs as part of the CI pipeline for every PR
- Quality gate results appear in the PR checks section
- Failed quality gates are **advisory only** and do not block merges
- Click the SonarQube check details to view specific issues and recommendations

### Configuration

- SonarQube project configuration is in `sonar-project.properties` at the repository root
- The workflow is defined in `.github/workflows/trigger-sonarqube.yml`
- Project dashboard is available at https://sonarqube.alkem.io

### Troubleshooting

For common issues, token rotation, and detailed configuration, see `specs/015-sonarqube-analysis/quickstart.md`.

## File uploads

In order to upload files, a file stream is created through GraphQL Upload to the server /uploads folder. From there the file is pinned in IPFS and CID is returned.

Install jq (on linux) if you don't have it:

```bash
sudo apt-get install jq
```

Login with demo auth provider and extract the access token:

```bash
actionUrl=$(\
    curl -s -X GET -H "Accept: application/json" \
    "http://localhost:3000/ory/kratos/public/self-service/login/api" \
    | jq -r '.ui.action'\
    )
sessionToken=$(\
curl -s -X POST -H  "Accept: application/json" -H "Content-Type: application/json" \
    -d '{"password_identifier": "admin@alkem.io", "password": "your_password", "method": "password"}' \
    "$actionUrl" | jq -r '.session_token' \
    )
```

You can test (assuming default endpoint configuration) creating a file and then uploading it with the following CURL request:

```bash
touch hello-alkemio.pdf

curl http://localhost:3000/api/private/non-interactive/graphql \
  -H "x-apollo-operation-name: UploadFile" \
  -H "Authorization: Bearer $sessionToken" \
  -F 'operations={
    "query":"mutation ($file: Upload!, $uploadData: StorageBucketUploadFileOnReferenceInput!) { uploadFileOnReference(file: $file, uploadData: $uploadData) { id } }",
    "variables": {
      "file": null,
      "uploadData": {
        "referenceID": "YOUR_REFERENCE_ID"
      }
    }
  }' \
  -F 'map={"0":["variables.file"]}' \
  -F 0=@hello-alkemio.pdf

```

You should get a response: {"data":{"uploadFile":"https://ipfs.io/ipfs/QmYt9ypyGsR1BKdaCGPdwdBgAiuXK5AYN2bGSNZov7YXuk"}}.
This file should be accessible (assuming default IPFS installation) on http://localhost:8080/ipfs/QmYt9ypyGsR1BKdaCGPdwdBgAiuXK5AYN2bGSNZov7YXuk or on a public IPFS on https://ipfs.io/ipfs/QmYt9ypyGsR1BKdaCGPdwdBgAiuXK5AYN2bGSNZov7YXuk.
If the upload worked, you should see 'Hello Alkemio!' in the browser :)
