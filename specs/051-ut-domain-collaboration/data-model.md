# Data Model: Unit Tests for `src/domain/collaboration`

## No data model changes required

This is a test-only feature. No entities, migrations, or schema changes are needed.

## Entity Relationships Referenced in Tests

```
Collaboration
  ├── CalloutsSet
  │     └── Callout[]
  │           ├── CalloutFraming (profile, whiteboard, memo, mediaGallery)
  │           ├── CalloutContribution[] (post, whiteboard, link, memo)
  │           ├── comments (Room)
  │           ├── contributionDefaults
  │           └── classification
  ├── InnovationFlow
  │     ├── Profile
  │     └── InnovationFlowState[]
  ├── Timeline
  ├── License (entitlements)
  └── Authorization
```

Each entity has an `authorization` relation that gets updated during auth policy propagation.
