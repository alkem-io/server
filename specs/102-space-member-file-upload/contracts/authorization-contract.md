# Authorization Behavior Contract: Space Member File Upload

This feature changes **behavior of the existing contract**, not its shape. There are
no new or modified GraphQL types, fields, inputs, or mutations. This document records
the observable authorization contract that the implementation must satisfy.

## Affected operation (unchanged shape)

- **Operation**: the existing file-upload-to-storage mutation
  (`uploadFileOnStorageBucket`) and, transitively, callout creation that stages
  embedded files in the Space's shared storage.
- **Enforcement point**: the single, centralized authorization check on the target
  storage's `FILE_UPLOAD` capability. This remains the only enforcement point.

## Behavioral contract

Given the Space's authorization has been (re)computed:

| Precondition (Space setting) | Actor | Upload to that Space's shared storage | Create callout w/ embedded file |
|------------------------------|-------|----------------------------------------|----------------------------------|
| members-may-create-callouts = **ON** | Space member | **Allowed** | **Succeeds** |
| members-may-create-callouts = **ON** | Inherited parent-space member (when membership rights inherited) | **Allowed** | **Succeeds** |
| members-may-create-callouts = **ON** | Space admin / lead | Allowed (unchanged) | Succeeds (unchanged) |
| members-may-create-callouts = **OFF** | Space member | **Denied** | **Denied** |
| members-may-create-callouts = **ON**, but Space **archived** (membership disabled) | Space member | **Denied** | **Denied** |
| any | Non-member, non-admin, no create-callout right | Denied | Denied |
| any | Member of a **different** Space | Denied for this Space's storage | N/A |

## Invariants

1. **Gating**: the member upload capability exists **iff** the setting is ON at the
   time of the last authorization computation.
2. **Scope**: the capability applies only to the owning Space's shared storage;
   enabling it in one Space grants nothing in any other Space, and each subspace is
   governed by its own setting.
3. **No regression**: actors who could already upload (admins/leads and others)
   retain their capability unchanged.
4. **Temporary-agnostic**: the capability does not depend on whether an upload is
   flagged temporary; staged-during-creation and direct uploads are treated alike.
5. **Single enforcement path**: no second/alternate authorization branch is
   introduced for "temporary" uploads.
6. **Relocation preserved**: staged callout content continues to be relocated onto
   the newly created callout; no file is left orphaned or inaccessible.
7. **Archived spaces excluded**: when a Space's state disables membership
   capabilities (e.g. archived), the member upload capability is not granted, even
   if the setting is ON. Uploading is authorized solely on the upload capability
   (no read requirement), so the grant must be suppressed rather than relying on a
   read gate.

## Verification hooks

- Unit: the Space authorization computation includes the member file-upload rule when
  the setting is ON and omits it when OFF (and the rule targets the correct actor
  set, is handed to the Space profile authorization step so it cascades to
  `space.profile.storageBucket`, and is **not** placed on the About profile storage or
  the storage aggregator's directStorage).
- Manual/integration: a plain member in a setting-ON Space creates a callout with an
  image without a permission error; the same member in a setting-OFF Space is denied.
