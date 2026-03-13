# Spec: Unit Tests for src/domain/timeline

## Objective
Achieve >= 80% test coverage for all testable files in `src/domain/timeline/`.

## Scope
The timeline domain area consists of three sub-modules:
- **calendar**: Calendar aggregate managing calendar events within a space's timeline
- **event**: CalendarEvent entity lifecycle (CRUD, authorization, profile, comments)
- **timeline**: Timeline aggregate wrapping the calendar

### Files Requiring Tests (Excludes entities, interfaces, modules, DTOs, inputs, enums, types, constants, index)

| File | Existing Tests | Coverage Gap |
|------|---------------|--------------|
| calendar/calendar.service.ts | Yes (21 tests) | Adequate |
| calendar/calendar.service.authorization.ts | None | Full coverage needed |
| calendar/calendar.resolver.fields.ts | None | Full coverage needed |
| calendar/calendar.resolver.mutations.ts | None | Full coverage needed |
| event/event.service.ts | Yes (29 tests) | Adequate |
| event/event.service.authorization.ts | None | Full coverage needed |
| event/event.resolver.fields.ts | None | Full coverage needed |
| event/event.resolver.mutations.ts | 1 test (defined-only) | Substantial coverage needed |
| event/calendar.event.calendar-links.ts | Yes (22 tests) | Adequate |
| timeline/timeline.service.ts | Yes (14 tests) | Adequate |
| timeline/timeline.service.authorization.ts | None | Full coverage needed |
| timeline/timeline.resolver.fields.ts | None | Full coverage needed |

## Current Coverage
- calendar: ~49% statements, ~43% functions
- event: ~59% statements, ~48% functions
- timeline: ~60% statements, ~55% functions

## Target Coverage
>= 80% statements and functions across all sub-modules.

## Non-Goals
- Integration or E2E tests
- Testing entities, interfaces, modules, or DTOs
- Modifying production code
