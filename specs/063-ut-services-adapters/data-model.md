# Data Model: Unit Tests for src/services/adapters

## No data model changes required
This is a test-only feature. No entity changes, no migrations, no schema changes.

## Key Domain Entities Referenced (for mocking)
- `Space` - with relations: about.profile, parentSpace.collaboration, community, collaboration
- `Collaboration` - with relations: calloutsSet.callouts
- `Community` - with relations: communication.updates
- `Callout` - with relations: contributions, framing.profile
- `Whiteboard` - with relations: profile
- `Memo` - with relations: profile
- `IUser` - with fields: id, firstName, lastName, email, nameID, profile
- `ISpace` - with fields: id, level, about.profile
