# Quickstart: Space Member File Upload for Callout Creation

## What this delivers

In a Space configured to let members create callouts, members can now upload the
files their callouts contain (e.g. a description image) without hitting a permission
error. The capability is gated by that Space setting and scoped to that Space.

## Prerequisites

- Local stack running: `pnpm run start:services`, migrations applied
  (`pnpm run migration:run`), server up (`pnpm start:dev`).
- A Space whose "members may create callouts" setting is **enabled**.
- Two test users: one Space **admin**, one plain Space **member**.

## Make the change effective on existing spaces

The capability is produced by the authorization-reset computation. Existing spaces
pick it up the next time their authorization is recomputed:

- Trigger an authorization reset for the Space (admin authorization-reset path), or
- Any operation that already recomputes the Space's authorization.

Newly created spaces get it automatically.

## Verify (happy path — US1)

1. Sign in as the plain **member**.
2. In the setting-ON Space, start creating a callout and embed an image in the
   description (this uploads the file to the Space's shared storage before the
   callout exists).
3. Submit. **Expected**: callout is created, the image is present, **no permission
   error**.
4. Confirm the uploaded file is associated with the new callout (it was relocated
   from the Space's shared storage onto the callout).

## Verify (gating — US2)

1. In a Space where members-may-create-callouts is **OFF**, sign in as a plain
   member.
2. Attempt to create a callout / upload to the Space's shared storage.
3. **Expected**: denied — no new capability was granted.
4. Turn the setting OFF on a previously-ON Space, trigger an authorization reset, and
   confirm the member can no longer upload to the Space's shared storage.

## Verify (scoping — US3)

1. Enable the setting in Space A, leave it OFF in Space B.
2. Confirm a Space A member can upload to Space A's shared storage but a Space B
   member cannot upload to Space B's.
3. Repeat for a parent/subspace pair whose settings differ — each is governed by its
   own setting.

## Regression check

- Sign in as the **admin** and create a callout with an embedded image — must succeed
  exactly as before.

## Automated tests

Run the affected authorization unit specs:

```bash
pnpm test -- src/domain/space/space/space.service.authorization.spec.ts
pnpm test -- src/domain/storage/storage-aggregator/storage.aggregator.service.authorization.spec.ts
```
