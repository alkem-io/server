# Data Model: src/domain/template

## Entity Hierarchy
```
TemplatesManager
  -> TemplatesSet (1:1)
      -> Template[] (1:N)
          -> Profile (1:1)
          -> AuthorizationPolicy (1:1)
          -> Whiteboard? (1:1, type=WHITEBOARD)
          -> CommunityGuidelines? (1:1, type=COMMUNITY_GUIDELINES)
          -> Callout? (1:1, type=CALLOUT)
          -> TemplateContentSpace? (1:1, type=SPACE)
              -> Collaboration (1:1)
              -> SpaceAbout (1:1)
              -> subspaces: TemplateContentSpace[] (1:N, recursive)
  -> TemplateDefault[] (1:N)
      -> Template? (M:1)
      -> allowedTemplateType: TemplateType
```

## Template Types (enum)
- POST - has `postDefaultDescription`
- WHITEBOARD - has `whiteboard` relation
- COMMUNITY_GUIDELINES - has `communityGuidelines` relation
- CALLOUT - has `callout` relation
- SPACE - has `contentSpace` relation (TemplateContentSpace)

## Authorization Cascade
TemplatesManager.authorization
  -> TemplatesSet.authorization
      -> Template[].authorization
          -> (type-specific child authorization)
  -> TemplateDefault[].authorization
