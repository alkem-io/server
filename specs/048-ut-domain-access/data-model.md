# Data Model: src/domain/access

## Core Entities

### RoleSet
- Central entity managing roles, applications, invitations for a community
- Contains: roles[], applications[], invitations[], platformInvitations[], license, form
- Has parentRoleSetID for hierarchical role management
- Types: SPACE, PLATFORM

### Role
- Defines a named role with credential mapping and policies
- Contains: credential (ICredentialDefinition), parentCredentials[], userPolicy, organizationPolicy, virtualContributorPolicy
- Names: MEMBER, LEAD, ADMIN, etc.

### Application
- Lifecycle-driven entity for membership applications
- Contains: user, lifecycle, questions (NVP[]), authorization
- States: new -> approving -> approved (final), rejected -> archived (final)

### Invitation
- Lifecycle-driven entity for membership invitations
- Contains: invitedActorID, createdBy, lifecycle, authorization, roleSet
- States: invited -> accepting -> accepted (final), rejected -> archived (final)

### PlatformInvitation
- Email-based invitation for platform-level role assignment
- Contains: email, createdBy, roleSet, authorization, profileCreated

## Key Relationships
- RoleSet 1:N Role
- RoleSet 1:N Application
- RoleSet 1:N Invitation
- RoleSet 1:N PlatformInvitation
- RoleSet 1:1 License
- RoleSet 1:1 Form (application form)
- RoleSet N:1 RoleSet (parent-child hierarchy)
