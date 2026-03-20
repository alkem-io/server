# Data Model: src/domain/timeline

## Entity Hierarchy
```
Timeline (1:1 with Collaboration)
  └── Calendar (1:1)
       └── CalendarEvent (1:N)
            ├── Profile (1:1)
            ├── Room/Comments (1:1)
            └── AuthorizationPolicy (1:1)
```

## Key Interfaces
- `ITimeline`: id, authorization, calendar
- `ICalendar`: id, authorization, events[]
- `ICalendarEvent`: id, authorization, profile, comments, nameID, startDate, durationMinutes, durationDays, wholeDay, multipleDays, type, visibleOnParentCalendar, createdBy, calendar

## Authorization Flow
```
Timeline.authorization
  └── inherits from parent (Collaboration)
Calendar.authorization
  └── inherits from Timeline
CalendarEvent.authorization
  └── inherits from Calendar
  └── extends with CREDENTIAL_RULE_CALENDAR_EVENT_CREATED_BY (USER_SELF_MANAGEMENT)
```

## No schema or migration changes -- test-only feature.
