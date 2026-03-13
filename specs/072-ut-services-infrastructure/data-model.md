# Data Model

No data model changes required. This is a test-only specification.

## Entities Referenced (mocked in tests)
- Space, SpaceAbout, Collaboration, Callout, CalloutContribution, CalloutFraming
- User, Organization, VirtualContributor, KnowledgeBase
- Template, TemplatesManager, TemplatesSet, TemplateContentSpace
- Discussion, InnovationHub, InnovationPack, CalendarEvent
- StorageAggregator, Account, Platform
- Whiteboard, Memo, CommunityGuidelines

All entities are mocked via EntityManager.findOne/find stubs -- no real database interaction.
