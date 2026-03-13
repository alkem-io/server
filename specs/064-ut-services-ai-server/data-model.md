# Data Model: Unit Tests for src/services/ai-server

## No Data Model Changes

This is a test-only task. No entities, migrations, or schema changes are involved.

## Key Entities Referenced in Tests (mocked)

- `AiPersona` - AI persona entity with engine, prompt, externalConfig, promptGraph
- `AiServer` - Singleton AI server entity with aiPersonas relation
- `VirtualContributor` - VC entity linked to AI persona
- `AuthorizationPolicy` - Authorization policy attached to entities
