# Commit Message Template

## Commit Subject (50 chars max)

```
feat: calendar event comment notifications [013]
```

## Commit Body (wrap at 72 chars)

```
Implement notification system for calendar event comments with email
and in-app delivery to space community members.

Core Changes:
- Add SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT notification event
- Implement spaceCommunityCalendarEventComment adapter method
- Integrate notification call in room message flow
- Create GraphQL payload type with field resolver
- Update recipient service with authorization checks
- Resolve CalendarEventModule ↔ RoomModule circular dependency

Technical Details:
- Pattern: Matches SPACE_COMMUNITY_CALENDAR_EVENT_CREATED approach
- Authorization: SPACE_MEMBER credential + READ privilege on Space
- Preference: Reuses communityCalendarEvents setting
- Exclusion: Comment author filtered from both channels
- Comment preview: Truncated to 200 characters for email

Circular Dependency Resolution:
- Applied forwardRef() in CalendarEventModule and RoomModule
- Moved space lookup to resolver layer (RoomResolverMutations)
- Event handler accepts spaceID parameter (no service dependency)

Files Changed:
- New: 4 files (DTOs, GraphQL types, field resolver)
- Modified: 11 files (enums, adapters, modules, event processing, docs)

Schema Impact:
- Non-breaking additions only (new enum values, new ObjectType)
- No field removals or type changes

Testing:
- Build: SUCCESS (no TypeScript errors)
- Tests: 94 suites, 307 tests PASSED
- Manual validation: Required for end-to-end flow

Spec: specs/015-timeline-comment-notification/
Implementation: 23/36 tasks complete (core + docs)
Remaining: 13 manual validation tasks

Closes: [Issue Number]
```

## Alternative Short Commit Message

```
feat: calendar event comment notifications [013]

Add notification system for calendar event comments with email and
in-app delivery to space community members.

- Pattern matches SPACE_COMMUNITY_CALENDAR_EVENT_CREATED
- Author excluded from recipient list
- Resolves CalendarEventModule ↔ RoomModule circular dependency
- Authorization: SPACE_MEMBER + READ privilege
- Comment preview truncated to 200 chars

Spec: specs/015-timeline-comment-notification/
Files: 4 new, 11 modified | Tests: 307 passed
```
