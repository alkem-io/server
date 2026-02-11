# Quickstart: HEIC to JPEG Image Conversion

**Feature**: 001-heic-jpeg-conversion
**Date**: 2026-02-11

## Prerequisites

- Node.js 22.21.1 (Volta-pinned)
- pnpm 10.17.1 (`corepack enable && corepack prepare pnpm@10.17.1 --activate`)
- Running services: PostgreSQL, RabbitMQ, Redis (via `pnpm run start:services`)

## Setup

```bash
# 1. Switch to feature branch
git checkout 001-heic-jpeg-conversion

# 2. Install dependencies (including new heic-convert package)
pnpm install

# 3. Start backing services
pnpm run start:services

# 4. Run migrations (if any migration was added)
pnpm run migration:run

# 5. Start the server
pnpm start:dev
```

## Verification

### Quick Smoke Test

```bash
# Upload a HEIC image via GraphQL mutation (requires authentication)
# Use GraphQL Playground at http://localhost:3000/graphiql

# 1. Find a visual ID to upload to (e.g., a space avatar)
# 2. Use the uploadImageOnVisual mutation with a .heic file
# 3. Verify the response contains a valid URI
# 4. Fetch the URI and confirm Content-Type is image/jpeg
```

### Unit Tests

```bash
# Run conversion service tests
pnpm run test:ci src/domain/common/visual/image.conversion.service.spec.ts
```

### Manual Test with curl

```bash
# Get a sample HEIC file (e.g., from an iPhone or download a test file)
# The server accepts HEIC via the standard uploadImageOnVisual mutation
# After upload, verify via:
curl -s -I "http://localhost:3000/api/private/rest/storage/document/<document-id>" | grep Content-Type
# Expected: Content-Type: image/jpeg
```

## Key Files

| Purpose | Path |
| --- | --- |
| Conversion service | `src/domain/common/visual/image.conversion.service.ts` |
| MIME type enum | `src/common/enums/mime.file.type.visual.ts` |
| Visual constraints | `src/domain/common/visual/visual.constraints.ts` |
| Upload entry point | `src/domain/common/visual/visual.service.ts` |
| Unit tests | `src/domain/common/visual/image.conversion.service.spec.ts` |

## Troubleshooting

| Issue | Solution |
| --- | --- |
| `sharp` install fails | Not applicable — `heic-convert` is pure JavaScript/WASM with no native dependencies. If install fails, check Node.js version (`node -v`) and pnpm cache (`pnpm store prune`). |
| HEIC upload rejected with "not in allowed mime types" | Existing Visual entities in DB may have stale `allowedTypes`. Check if the code-level fix in `validateMimeType` is in place, or run the data migration. |
| Converted image appears rotated | `heic-convert` preserves EXIF orientation metadata. Modern browsers handle EXIF orientation natively. If the serving client does not respect EXIF, consider adding server-side rotation via `sharp` post-processing on the JPEG buffer. |
| Out of memory on large HEIC files | The 25MB upload limit should prevent this. Check if `storage.file.max_file_size` in `alkemio.yml` is set correctly. |
