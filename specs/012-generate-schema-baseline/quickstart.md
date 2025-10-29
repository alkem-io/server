# Quickstart: Automated Schema Baseline Generation

Follow these steps to validate the automation locally or bootstrap a new environment.

## 1. Install prerequisites

- Node.js 20.x (Volta pin: 20.15.1)
- pnpm 10.17.1 (`corepack prepare pnpm@10.17.1 --activate`)
- GPG 2.4+ with the signing key imported if you plan to mimic the workflow push

## 2. Regenerate the baseline locally

```bash
# From repository root
export SCHEMA_BOOTSTRAP_LIGHT=1
pnpm install --frozen-lockfile
pnpm exec ts-node -r tsconfig-paths/register scripts/schema/generate-schema.snapshot.ts schema.graphql
pnpm exec ts-node scripts/schema/diff-schema.ts --old schema-baseline.graphql --current schema.graphql --out change-report.json --deprecations deprecations.json
```

- Review `change-report.json` and `schema.graphql` to understand what the automation will commit.
- If the diff is expected, copy the snapshot to the baseline:

```bash
cp schema.graphql schema-baseline.graphql
```

## 3. Verify the diff summary helper

```bash
pnpm exec ts-node scripts/schema/publish-baseline.ts --report change-report.json --output tmp/baseline-summary.md
cat tmp/baseline-summary.md
```

The helper mirrors the job summary that maintainers will see after each workflow run.

## 4. Prepare signing credentials for CI

1. Export the ASCII-armored private key and passphrase for the shared automation key.
2. Configure repository secrets:
   - `ALKEMIO_INFRASTRUCTURE_BOT_GPG_PRIVATE_KEY`: armored private key contents
   - `ALKEMIO_INFRASTRUCTURE_BOT_GPG_PASSPHRASE`: passphrase (if set)
   - `ALKEMIO_INFRASTRUCTURE_BOT_GPG_KEY_ID`: key fingerprint (optional but recommended)
3. Ensure the public key is uploaded to GitHub so commits appear as “Verified”.

Locally, you can test signing with:

```bash
gpg --import < private-key.asc
git config user.signingkey <KEY_ID>
git commit -am "test" -S --dry-run
```

## 5. Trigger and monitor the workflow

- Push or merge into `develop`. The workflow (`schema-baseline.yml`) runs automatically.
- Alternatively, dispatch the workflow manually once it supports `workflow_dispatch`:

```bash
gh workflow run schema-baseline.yml --ref develop
```

- Monitor the run summary and downloaded artifacts for diff details.
- On failure, inspect the commit comment (tagging CODEOWNERS) for actionable diagnostics and rerun after fixes.
