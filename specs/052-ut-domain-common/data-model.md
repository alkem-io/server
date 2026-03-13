# Data Model: Unit Tests for src/domain/common

## No data model changes

This is a test-only task. No entity changes, no migrations, no schema changes.

## Entity Relationships Relevant to Tests

### Authorization Policy
- All authorizable entities have an `authorization: IAuthorizationPolicy` relation
- Authorization policies contain `credentialRules` and `privilegeRules` arrays
- Parent-child inheritance: child authorization inherits from parent

### Key Entity Hierarchies
- Profile -> references, tagsets, visuals, storageBucket
- Classification -> tagsets
- KnowledgeBase -> profile, calloutsSet
- Memo -> profile (has createdBy, contentUpdatePolicy)
- Whiteboard -> profile (has createdBy, contentUpdatePolicy)
- MediaGallery -> visuals, storageBucket (has createdBy)
