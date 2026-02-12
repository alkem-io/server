# Feature Specification: HEIC Conversion & Image Compression

**Feature Branch**: `001-heic-jpeg-conversion`
**Created**: 2026-02-11
**Status**: Draft
**Input**: User description: "Add support for heic (iphone image formats) when uploading images from iphones. As they lack support we need to make sure that we convert the images to jpeg before saving them and making them available through the files-service. We also need compression and potential resizing for large photos — if the resulting file is above 3MB, compress/resize it."

## Clarifications

### Session 2026-02-11

- Q: How should the system handle multi-frame HEIC containers (Live Photos, bursts)? → A: Extract only the primary still image and convert it to JPEG; discard additional frames.
- Q: What is the maximum allowed file size for HEIC uploads? → A: 15MB, covering standard and high-resolution iPhone shots while preventing abuse.

### Session 2026-02-12

- Q: Should the system preserve EXIF metadata (including GPS coordinates) in processed images? → A: Strip ALL EXIF metadata during processing; only preserve orientation for correct display. Minimizes GDPR exposure — less data stored is better.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - iPhone User Uploads Single Image (Priority: P1)

An iPhone user captures a photo using their device's native camera app (which saves in HEIC format by default) and uploads it to the platform. The system automatically converts the HEIC image to JPEG format and, if the resulting file exceeds 3MB, compresses and/or resizes it to bring it under the threshold. This happens without requiring any user intervention or awareness of the conversion and optimization process. The user sees their image displayed correctly in their browser or shared with other users.

**Why this priority**: Core functionality enabling iPhone users to upload images. Without this, iPhone users cannot successfully share images on the platform, creating a critical usability barrier for a significant user segment. Compression ensures storage efficiency and fast page loads.

**Independent Test**: Upload a single HEIC image from an iPhone camera roll, verify it's stored as JPEG, confirm it's under 3MB (or at the compressed target), and confirm it displays correctly in a web browser without HEIC support.

**Acceptance Scenarios**:

1. **Given** a user has a HEIC format image on their iPhone, **When** they upload the image through the platform's upload interface, **Then** the system accepts the upload, converts it to JPEG, compresses if needed, and confirms successful upload.
2. **Given** a HEIC image has been uploaded and converted, **When** the user or another user requests to view the image, **Then** the file service returns the image as JPEG with the correct MIME type (image/jpeg).
3. **Given** a user uploads a HEIC image, **When** the converted JPEG is displayed, **Then** the image quality is preserved with no visible artifacts or significant degradation.
4. **Given** a user uploads a HEIC image that converts to a JPEG larger than 3MB, **When** the compression step runs, **Then** the stored file is reduced to ≤3MB while maintaining acceptable visual quality.

---

### User Story 2 - Large Image Compression (Priority: P2)

A user uploads a large image (any format: JPEG, PNG, or a converted HEIC) that exceeds 3MB in size. The system automatically compresses and/or proportionally resizes the image to bring the stored file size to ≤3MB, preserving visual quality and aspect ratio. The user is unaware of the optimization — the image simply loads faster and consumes less storage.

**Why this priority**: iPhone photos at 12–48MP can be 5–15MB as JPEG. Large uploads consume excessive storage, increase bandwidth costs, and slow page rendering. Automatic compression ensures consistent performance across the platform.

**Independent Test**: Upload a 10MB JPEG photo, verify the stored file is ≤3MB, and confirm acceptable visual quality (no visible blockiness or color banding at 100% zoom).

**Acceptance Scenarios**:

1. **Given** a user uploads a JPEG image that is 8MB, **When** the upload pipeline processes it, **Then** the system compresses and/or resizes the image to ≤3MB and stores the optimized version.
2. **Given** a user uploads a PNG image that is 5MB, **When** the upload pipeline processes it, **Then** the system converts to JPEG, compresses to ≤3MB, and stores it.
3. **Given** a user uploads a JPEG image that is 2MB (under threshold), **When** the upload pipeline processes it, **Then** the image is stored unchanged with no compression or resizing applied.
4. **Given** compression is applied to a large image, **When** the result is viewed, **Then** the image has acceptable quality with no visible artifacts at normal viewing distance.

---

### User Story 3 - Bulk Upload with Mixed Formats (Priority: P3)

A user uploads multiple images simultaneously, including a mix of HEIC, JPEG, and PNG formats. The system correctly identifies HEIC images and converts only those, while compressing any image (regardless of original format) that exceeds 3MB after conversion.

**Why this priority**: Real-world users often upload multiple images at once. Proper format detection, selective conversion, and compression ensures efficiency and consistent storage.

**Independent Test**: Upload a batch of 5-10 images with mixed formats (HEIC, JPEG, PNG, various sizes) and verify that HEIC images are converted, all images over 3MB are compressed, and images under 3MB pass through unchanged.

**Acceptance Scenarios**:

1. **Given** a user selects multiple images including HEIC and JPEG files, **When** they initiate a bulk upload, **Then** all HEIC images are converted to JPEG, images >3MB are compressed, and small images pass through unchanged.
2. **Given** a batch upload is in progress, **When** the upload completes, **Then** the user receives confirmation showing the number of images uploaded and processed successfully.

---

### User Story 4 - Conversion/Compression Failure Handling (Priority: P4)

A user attempts to upload a corrupted or invalid HEIC file, or an image that cannot be compressed. The system detects the failure and provides clear error feedback to the user without blocking other uploads in a batch.

**Why this priority**: While less common, handling edge cases gracefully prevents user frustration and provides clear paths to resolution. This ensures system reliability and good user experience even in error conditions.

**Independent Test**: Upload a corrupted HEIC file and verify the system returns a meaningful error message without crashing or affecting other concurrent uploads.

**Acceptance Scenarios**:

1. **Given** a user uploads a corrupted HEIC file, **When** the system attempts conversion, **Then** the upload fails with a clear error message indicating the file could not be processed.
2. **Given** a batch upload includes one corrupted HEIC and several valid images, **When** processing completes, **Then** valid images are successfully stored and the corrupted image is reported as failed with details.
3. **Given** conversion or compression fails for any reason, **When** the error occurs, **Then** the system logs sufficient diagnostic information for troubleshooting.

---

### Edge Cases

- What happens when a HEIC file is extremely large (e.g., high-resolution iPhone ProRAW)?
  - Files exceeding 15MB are rejected with a clear error message before conversion is attempted.
- How does the system handle HEIC files with embedded metadata (EXIF, location, etc.)?
  - All EXIF metadata is stripped during processing. Orientation is applied to pixel data (auto-orient) and then discarded. No metadata is persisted in the stored file.
- What happens if storage space is insufficient to store both the temporary HEIC and converted JPEG?
- How does the system behave when conversion takes longer than expected (e.g., timeout scenarios)?
- What happens if a HEIC file uses a newer codec version not supported by the conversion library?
- Multi-frame HEIC containers (Live Photos, bursts): only the primary still image is extracted; additional frames are silently discarded.
- What happens when compression cannot bring an image below 3MB without unacceptable quality loss?
  - The system resizes images with longest side >4096px, then compresses at JPEG quality 80–85; if the result is still >3MB, the best-effort compressed version is stored.
- What about SVG files — are they compressed?
  - No. SVG is a vector format; compression/resizing does not apply. SVG files pass through unchanged.
- What about PNG transparency?
  - PNG files that require compression are converted to JPEG, which does not support transparency. The alpha channel is composited against a white background.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST accept image uploads in HEIC and HEIF formats from client applications.
- **FR-002**: System MUST automatically detect when an uploaded image is in HEIC/HEIF format based on file MIME type or file extension.
- **FR-003**: System MUST convert HEIC/HEIF images to JPEG format during the upload process, before storing the image to disk.
- **FR-004**: System MUST preserve image quality during conversion and compression using JPEG quality 80–85, which is visually indistinguishable from 100 for most images while achieving 3–5x size reduction.
- **FR-005**: System MUST strip all EXIF metadata (GPS, date taken, camera information, etc.) during image processing. Only image orientation data MUST be preserved (applied to pixel data via auto-orient) to ensure correct display. This minimizes GDPR exposure by not retaining personal location or device data.
- **FR-006**: System MUST return image/jpeg as the MIME type for converted images when requested by the file-service.
- **FR-007**: System MUST handle conversion and compression failures gracefully by returning meaningful error messages to the user without crashing.
- **FR-008**: System MUST log conversion and compression events including success, failure, processing time, original and final file sizes for monitoring and debugging purposes.
- **FR-009**: System MUST validate that the converted/compressed JPEG file is not corrupted before storing it and marking the upload as successful.
- **FR-010**: System MUST store only the final optimized version (converted and/or compressed) and discard any intermediate or original files immediately after successful processing. The original file is not retained.
- **FR-011**: System MUST maintain the original filename with the extension changed to .jpg or .jpeg after conversion or compression.
- **FR-012**: System MUST apply compression to non-HEIC image formats (JPEG, PNG, WebP) when their file size exceeds 3MB. Images at or below 3MB pass through unchanged.
- **FR-013**: System MUST extract only the primary still image from multi-frame HEIC containers (e.g., Live Photos, burst sequences) and convert that single frame to JPEG, discarding any additional frames or embedded video data.
- **FR-014**: System MUST reject HEIC uploads exceeding 15MB with a clear error message informing the user of the size limit.
- **FR-015**: System MUST compress images exceeding 3MB using JPEG quality 80–85 with MozJPEG encoding to bring the file size to ≤3MB.
- **FR-016**: System MUST resize images whose longest side exceeds 4096px down to 4096px on the longest side, preserving the original aspect ratio. Resizing is applied before quality compression.
- **FR-017**: System MUST NOT apply compression or resizing to SVG files, which are vector-based and not subject to raster image optimization.
- **FR-018**: System MUST convert PNG images to JPEG when compression is applied, compositing any alpha channel against a white background.

### Key Entities

- **Upload Request**: Represents a user's image upload operation, including the file data, MIME type, original filename, and user identity.
- **Image Processing Job**: Represents the conversion and/or compression process for an uploaded image, including source format, target format, compression applied, original/final file sizes, conversion status, timing metrics, and resulting file reference.
- **Stored Image**: Represents the persisted image file with metadata including storage location, MIME type, file size, dimensions, and whether it was converted or compressed from another format.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: iPhone users can successfully upload HEIC images with 100% of valid files being accepted and converted to JPEG.
- **SC-002**: All converted JPEG images display correctly in major web browsers (Chrome, Firefox, Safari, Edge) without compatibility issues.
- **SC-003**: HEIC to JPEG conversion completes within 5 seconds for images up to 10MB in size under normal system load.
- **SC-004**: Image quality is preserved during conversion and compression with no visible artifacts at standard viewing distances.
- **SC-005**: Conversion and compression failures (corrupted files, unsupported formats) are handled gracefully with clear error messages and 100% of errors logged for debugging.
- **SC-006**: Support ticket volume related to iPhone image upload issues decreases by at least 80% after feature deployment.
- **SC-007**: System successfully processes batch uploads containing mixed image formats with correct selective conversion of HEIC files and compression of oversized images.
- **SC-008**: All stored images are ≤3MB after processing, except where compression at minimum quality threshold still exceeds 3MB (best-effort).
- **SC-009**: Average stored image file size decreases by at least 50% compared to pre-feature baseline for images that were previously uploaded at full resolution.
