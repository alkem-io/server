# Data Model: src/library

## Entities
- **InnovationPack** extends NameableEntity: has account (ManyToOne), templatesSet (OneToOne), listedInStore (boolean), searchVisibility (enum), templatesCount (derived)
- **Library** extends AuthorizableEntity: container for InnovationPacks

## Key Interfaces
- **IInnovationPack**: id, nameID, profile?, templatesSet?, listedInStore, searchVisibility, authorization?
- **ILibrary**: id, authorization?

## Relationships
- Library -> InnovationPack (via entityManager queries, not direct FK)
- InnovationPack -> TemplatesSet (OneToOne)
- InnovationPack -> Account -> Provider (for getProvider)
- InnovationPack -> Profile (via NameableEntity)

## No schema or migration changes required (test-only feature)
