# Tasks: Unit Tests for src/domain/timeline

## Task 1: Create timeline.service.authorization.spec.ts
- [ ] Test applyAuthorizationPolicy happy path (inherits, cascades to calendar)
- [ ] Test throws RelationshipNotFoundException when calendar not loaded
- [ ] Test returns updated authorizations array

## Task 2: Create calendar.service.authorization.spec.ts
- [ ] Test applyAuthorizationPolicy happy path (resets, inherits, cascades to events)
- [ ] Test throws RelationshipNotFoundException when events not loaded
- [ ] Test returns updated authorizations array

## Task 3: Create event.service.authorization.spec.ts
- [ ] Test applyAuthorizationPolicy happy path (inherits, extends, cascades to comments and profile)
- [ ] Test throws RelationshipNotFoundException when profile not loaded
- [ ] Test appendCredentialRules adds USER_SELF_MANAGEMENT rule
- [ ] Test throws EntityNotInitializedException when authorization missing
- [ ] Test handles missing comments gracefully

## Task 4: Create timeline.resolver.fields.spec.ts
- [ ] Test calendar field resolver delegates to TimelineService.getCalendarOrFail

## Task 5: Create calendar.resolver.fields.spec.ts
- [ ] Test event field resolver delegates to CalendarService.getCalendarEvent
- [ ] Test events field resolver with subspace event bubbling enabled
- [ ] Test events field resolver with subspace event bubbling disabled

## Task 6: Create event.resolver.fields.spec.ts
- [ ] Test createdBy returns user when found
- [ ] Test createdBy returns null when user not found (EntityNotFoundException)
- [ ] Test createdBy returns null when createdBy is empty
- [ ] Test profile delegates to CalendarEventService.getProfileOrFail
- [ ] Test startDate returns event startDate
- [ ] Test subspace delegates to CalendarEventService.getSubspace
- [ ] Test googleCalendarUrl/outlookCalendarUrl/icsDownloadUrl

## Task 7: Create calendar.resolver.mutations.spec.ts
- [ ] Test createEventOnCalendar happy path
- [ ] Test createEventOnCalendar authorization check

## Task 8: Expand event.resolver.mutations.spec.ts
- [ ] Test deleteCalendarEvent happy path
- [ ] Test deleteCalendarEvent authorization check
- [ ] Test updateCalendarEvent happy path
- [ ] Test updateCalendarEvent authorization check

## Task 9: Verify coverage >= 80%
- [ ] Run coverage report
- [ ] Confirm all sub-modules meet threshold
