# Research: HEIC to JPEG Image Conversion

**Feature**: 001-heic-jpeg-conversion
**Date**: 2026-02-11

## R1: Image Conversion Library Selection

**Decision**: `heic-convert` (v2.1.x) — pure JavaScript HEIC→JPEG/PNG converter

**Rationale**:
- Pure JavaScript/WASM-based (uses `libheif-js` internally) — no native compilation, no system-level dependencies
- ISC license — fully compatible with Alkemio's EUPL-1.2 license
- 314k+ weekly downloads; stable, well-maintained by `catdad-experiments`
- TypeScript declarations available via `@types/heic-convert`
- Tiny package footprint (7.92 kB unpacked) with only 3 dependencies
- Simple buffer-in / buffer-out API matching the existing upload pipeline pattern: `convert({ buffer, format: 'JPEG', quality: 1 })`
- Works out of the box on all platforms — no Dockerfile changes, no prebuilt binaries to manage
- Supports configurable JPEG quality output

**Why not `sharp`?** Sharp's prebuilt binaries **do not include HEIC/HEIF support** due to HEVC patent/licensing constraints. The maintainer confirmed (sharp issue #4479) that HEVC codec licensing fees would be ~US$25M/year at sharp's download volume. Getting HEIC working with sharp requires building from source against a globally-installed `libvips + libheif + libde265` combo, which is complex and fragile in Docker environments (67+ GitHub issues from users struggling with this).

**Future image optimization**: When image resizing/optimization is needed, `sharp` can be added as a separate dependency for non-HEIC operations (JPEG/PNG/WebP resizing, quality adjustment). The HEIC→JPEG conversion step would feed into sharp's pipeline. This keeps the current change minimal and avoids the HEVC patent complication entirely.

**Alternatives considered**:
- `sharp` (v0.34.x): The most capable image processing library for Node.js (libvips-based). However, **prebuilt binaries exclude HEIC** due to HEVC patent risk. Using sharp for HEIC requires building from source with globally-installed libvips+libheif+libde265 — complex Docker setup, fragile CI/CD, and patent exposure. Rejected for HEIC conversion; may be added later for general image optimization on non-HEIC formats.
- `jimp`: Pure JavaScript image processor. Rejected: No native HEIC support; would require a separate HEIC decoder. Significantly slower than heic-convert for large images.
- `imagemagick` / `gm`: CLI-based wrappers. Rejected: Requires system-level installation in Docker; not a Node-native dependency; harder to manage in CI/CD pipeline.
- `heic2any` (browser-only): Rejected: Browser-side library, not suitable for server-side processing in NestJS.

**Performance note**: `heic-convert` performs work partially synchronously (WASM execution). For high-concurrency scenarios, a worker thread may be needed. For current Alkemio workloads this is acceptable — conversion is a per-upload operation, not a high-throughput batch process.

## R2: HEIC MIME Type Detection

**Decision**: Detect HEIC/HEIF by both MIME type and file extension.

**Rationale**:
- iPhones set the MIME type to `image/heic` or `image/heif` when uploading
- Some clients may send generic `application/octet-stream` — in this case, fall back to file extension check (`.heic`, `.heif`)
- The `graphql-upload` middleware passes through the client-provided MIME type
- `heic-convert` works on any valid HEIC buffer regardless of declared MIME type

**Alternatives considered**:
- MIME-only detection: Rejected — some upload clients don't set HEIC MIME type correctly.
- Magic-byte detection (file signature): Over-engineered for this use case; sharp handles format detection internally.

## R3: Conversion Pipeline Insertion Point

**Decision**: Insert conversion logic in `VisualService.uploadImageOnVisual()` after stream-to-buffer and before dimension validation. Also handle in `StorageBucketService.uploadFileAsDocument()` for generic file uploads to buckets with image MIME types allowed.

**Rationale**:
- `VisualService.uploadImageOnVisual()` is the single entry point for all visual uploads (avatar, banner, card, gallery image). Injecting conversion here covers all visual types automatically.
- Conversion must happen before `getImageDimensions()` because `image-size` does not support HEIC format — the buffer must be JPEG by the time dimensions are read.
- The converted buffer, updated filename (`.heic` → `.jpg`), and updated MIME type (`image/jpeg`) are passed downstream. The rest of the pipeline (dimension validation, storage bucket upload, document creation) works unchanged.
- For `StorageBucketService`, HEIC files uploaded via `uploadFileOnStorageBucket` also need conversion if the bucket allows image types.

**Alternatives considered**:
- Middleware-level conversion (Express/GraphQL middleware): Rejected — too broad; would process non-image requests. Also violates domain-centric design (Principle 1).
- Conversion at storage adapter layer: Rejected — too late in the pipeline; dimension validation would have already failed.
- Separate async conversion worker (RabbitMQ): Over-engineered; conversion is fast and can happen within the request.

## R4: EXIF Metadata Preservation

**Decision**: Use `heic-convert`'s JPEG output combined with a post-conversion EXIF orientation check. `heic-convert` preserves embedded EXIF metadata in JPEG output. For auto-orientation (rotation), use the `image-size` dimensions read from the converted JPEG buffer — if the image appears rotated, a lightweight EXIF reader can correct orientation, or the client can handle EXIF orientation tags.

**Simplified approach**: Since `heic-convert` outputs JPEG with EXIF data preserved by default, and modern browsers/clients respect EXIF orientation tags, no explicit auto-orientation may be needed at the server level. The converted JPEG will contain the same orientation metadata as the original HEIC.

**Rationale**:
- iPhone HEIC files contain EXIF orientation tags; these are preserved in the converted JPEG output by `heic-convert`.
- Modern browsers and image viewers respect EXIF orientation automatically.
- If server-side auto-orientation becomes needed in the future, `sharp` can be added to post-process the JPEG buffer (which is a standard format sharp supports out of the box).
- This matches FR-005 (preserve EXIF metadata including orientation, date taken, camera information).

**Alternatives considered**:
- Strip all metadata: Rejected — violates FR-005.
- Add sharp just for auto-orientation: Over-engineered for now — adds a large dependency for a single operation that browsers handle natively. Can be added later if needed.

## R5: Multi-Frame HEIC Handling

**Decision**: Use `heic-convert`'s default `convert()` function which extracts the primary/main image from the container.

**Rationale**:
- `heic-convert`'s `convert()` function extracts only the main image from a HEIC container by default.
- For multi-image containers, the `convert.all()` API is available but not needed — per clarification, only the primary still image should be extracted.
- Live Photos store the primary still frame as the main image; additional frames are accessible via `convert.all()` but intentionally skipped.
- No special configuration needed — `heic-convert`'s default behavior matches the clarified requirement.

## R6: `image-size` Compatibility

**Decision**: Keep `image-size` for all formats; for HEIC, obtain dimensions from the converted JPEG buffer.

**Rationale**:
- `image-size` does not support HEIC format and would throw an error on HEIC buffers.
- After HEIC→JPEG conversion via `heic-convert`, the buffer is standard JPEG and `image-size` works correctly.
- Since conversion happens before `getImageDimensions()`, no change to the image-size dependency is needed.
- Future optimization: could replace `image-size` with a more capable library, but this is out of scope.

## R7: Docker / Deployment Impact

**Decision**: No Dockerfile changes required.

**Rationale**:
- `heic-convert` is a pure JavaScript/WASM package with no native dependencies — runs on any platform where Node.js runs.
- No system-level packages (`apt-get install ...`) needed in the Docker image.
- No prebuilt binary platform compatibility concerns (unlike sharp's `@img/sharp-*` packages).
- Docker image size increase: negligible (~8 KB for the package itself; `libheif-js` WASM dependency adds ~3 MB). Significantly less than sharp's ~25 MB.
- CI/CD pipeline unchanged — `pnpm install` handles everything.
