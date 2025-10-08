<p align="center">
  <a href="https://alkemio.org/" target="blank"><img src="https://alkem.io/logo.png" width="400" alt="Alkemio Logo" /></a>
</p>
<p align="center"><i>Empowering society. The platform to succeed in working on challenges, together.</i></p>

# Alkemio Server

Welcome to the Alkemio Server! This server is the heart of the Alkemio Platform, and manages the representation of the Space and all the entities stored wthin it.

[![Build Status](https://api.travis-ci.com/alkem-io/server.svg?branch=develop)](https://travis-ci.com/github/alkem-io/server)
[![Coverage Status](https://coveralls.io/repos/github/alkem-io/server/badge.svg?branch=develop)](https://coveralls.io/github/alkem-io/server?branch=develop)
![Docker Image CI](https://github.com/alkem-io/server/actions/workflows/build-release-docker-hub.yml/badge.svg)

A high level overview of the Design of the Alkemio Server is shown below.

<p >
<img src="docs/images/alkemio-server-design.png" alt="Component Diagram" width="600" />
</p>

The server primarily interacts via a _*GraphQL api*_' that it exposes. This can be found at the following location: <http://localhost:4000/graphql> (assuming default port).

This api is used by the [Alkemio Web Client](http://github.com/alkem-io/client-web), but also by any other clients / integrations that need to interact with the Alkemio server.

The key takeaway is that the Alkemio server is designed to be integrated, so that other tools or user interfaces can make use of the logical domain model maintained by the server.

## **Additional information**:

- [Design - An overview of architectural layers and technologies used](docs/Design.md)
- [Running - How to run the Server using containers (docker-compose and docker)](docs/Running.md)
- [Developing - How to setup the Server for developing](docs/Developing.md)
- [Data Management - How data representing the domain model used by Alkemio Platform is managed, including database migrations](docs/DataManagement.md)
- [Quality Assurance - Details of the test harness around the server and how to execute the test suites](docs/QA.md).
- [Pushing - How new docker images are published to Dockerhub](docs/PublishingImages.md)
- [Database definitions - Guidelines for creating TypeORM entity definitions](docs/database-definitions.md)

For other questions / comments please feel free to reach out via the channels listed in the [Alkemio Repo](http://github.com/alkem-io/alkemio) or via [Alkemio organization](https://alkemio.org).

## GraphQL Schema Contract Governance

The GraphQL schema is treated as a stable contract. Every schema-affecting change is diffed against the committed canonical snapshot (`schema.graphql`) using an automated toolchain (Feature 002: Schema Contract Diffing & Enforcement).

Key points:

- Deterministic snapshot: `npm run schema:print` (+ optional `npm run schema:sort`) produces a canonical `schema.graphql`.
- Change classification: Diffs produce `change-report.json` categorizing entries as ADDITIVE, DEPRECATED, DEPRECATION_GRACE, INVALID_DEPRECATION_FORMAT, BREAKING, PREMATURE_REMOVAL, INFO, or BASELINE.
- Deprecation lifecycle: Deprecations must use the format `REMOVE_AFTER=YYYY-MM-DD | reason`. A 90‑day minimum window applies to removals (fields + enum values). Missing schedule initially yields a 24h `DEPRECATION_GRACE` warning.
- Overrides: Intentional breaking changes require a CODEOWNER GitHub review containing the phrase `BREAKING-APPROVED`. Approved entries show `overrideApplied` and pass the gate.
- CI gate: Unapproved BREAKING, PREMATURE_REMOVAL, or INVALID_DEPRECATION_FORMAT changes fail the `schema-contract` workflow.
- Performance budget: Large schema diff executes in <5s (enforced by perf test).

Developer workflow summary:

1. Update code.
2. Regenerate snapshot (`npm run schema:print && npm run schema:sort`).
3. Fetch prior snapshot (from base branch) and run diff (`npm run schema:diff`).
4. Review classifications; if intentional breaking, secure CODEOWNER approval with phrase.
5. Commit updated `schema.graphql` only.

See `specs/002-schema-contract-diffing/quickstart.md` for full instructions, troubleshooting, and classification glossary.

### CLI Quick Reference (Schema Contract Tooling)

Core scripts (all TypeScript runners use ts-node + path mapping):

| Intent               | Command                   | Notes                                                                                                    |
| -------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| Print current schema | `npm run schema:print`    | Generates `schema.graphql` (lightweight bootstrap under env `SCHEMA_BOOTSTRAP_LIGHT=1`)                  |
| Canonical sort       | `npm run schema:sort`     | Stable lexicographic ordering (idempotent)                                                               |
| Diff vs previous     | `npm run schema:diff`     | Requires `tmp/prev.schema.graphql` (empty => baseline) writes `change-report.json` & `deprecations.json` |
| Validate artifacts   | `npm run schema:validate` | Ajv validation against JSON Schemas                                                                      |

Governance environment variables:

| Variable                          | Purpose                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `SCHEMA_BOOTSTRAP_LIGHT`          | When `1`, uses lightweight module for faster printing (parity enforced by tests) |
| `SCHEMA_OVERRIDE_CODEOWNERS_PATH` | Alternate path to `CODEOWNERS` file                                              |
| `SCHEMA_OVERRIDE_REVIEWS_JSON`    | Inline JSON array of review objects (`[{reviewer, body, state}]`)                |
| `SCHEMA_OVERRIDE_REVIEWS_FILE`    | Path to file containing JSON reviews array                                       |

Override approval phrase: `BREAKING-APPROVED` (must appear in APPROVED review body by a CODEOWNER reviewer). Applies to BREAKING entries only; sets `overrideApplied=true` and per-entry `override=true` so gate treats them as informational.

Exit codes (schema gate):

| Code | Meaning                    | Blocking Condition                                       |
| ---- | -------------------------- | -------------------------------------------------------- |
| 0    | Success                    | No unapproved blocking classifications                   |
| 1    | BREAKING                   | One or more BREAKING entries without override            |
| 2    | PREMATURE_REMOVAL          | Removal attempted before lifecycle conditions met        |
| 3    | INVALID_DEPRECATION_FORMAT | Malformed or missing removal schedule after grace period |

Performance budgets: diff <5s on synthetic 250+ type schema; cold bootstrap <2s (enforced by automated tests).

For deeper glossary, lifecycle rules, simulation of overrides, troubleshooting, see the Quickstart.
