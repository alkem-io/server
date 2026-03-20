# Data Model: Innovation Hub Domain

## Entity: InnovationHub

Extends `NameableEntity` (which provides `id`, `nameID`, `profile`, `authorization`).

| Field | Type | Notes |
|-------|------|-------|
| account | Account (ManyToOne) | Non-eager, SET NULL on delete |
| subdomain | string | Unique, max SUBDOMAIN_LENGTH |
| type | InnovationHubType | LIST or VISIBILITY |
| spaceVisibilityFilter | SpaceVisibility? | Used when type=VISIBILITY |
| spaceListFilter | string[]? | simple-array, used when type=LIST |
| listedInStore | boolean | Controls platform store visibility |
| searchVisibility | SearchVisibility | Default ACCOUNT |

## Enums

- `InnovationHubType`: LIST, VISIBILITY
- `SpaceVisibility`: ACTIVE, DEMO, ARCHIVED
- `SearchVisibility`: ACCOUNT, PUBLIC

## Relationships

- InnovationHub -> Account (ManyToOne)
- InnovationHub -> Profile (inherited from NameableEntity)
- InnovationHub -> AuthorizationPolicy (inherited from AuthorizableEntity)
