# Feature Specification: HEIC to JPEG Image Conversion

**Feature Branch**: `001-heic-jpeg-conversion`
**Created**: 2026-02-11
**Status**: Draft
**Input**: User description: "Add support for heic (iphone image formats) when uploading images from iphones. As they lack support we need to make sure that we convert the images to jpeg before saving them and making them available through the files-service."

## Clarifications

### Session 2026-02-11

- Q: How should the system handle multi-frame HEIC containers (Live Photos, bursts)? → A: Extract only the primary still image and convert it to JPEG; discard additional frames.
- Q: What is the maximum allowed file size for HEIC uploads? → A: 25MB, covering standard and high-resolution iPhone shots while preventing abuse.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - iPhone User Uploads Single Image (Priority: P1)

An iPhone user captures a photo using their device's native camera app (which saves in HEIC format by default) and uploads it to the platform. The system automatically converts the HEIC image to JPEG format without requiring any user intervention or awareness of the conversion process. The user sees their image displayed correctly in their browser or shared with other users.

**Why this priority**: Core functionality enabling iPhone users to upload images. Without this, iPhone users cannot successfully share images on the platform, creating a critical usability barrier for a significant user segment.

**Independent Test**: Upload a single HEIC image from an iPhone camera roll, verify it's stored as JPEG, and confirm it displays correctly in a web browser without HEIC support.

**Acceptance Scenarios**:

1. **Given** a user has a HEIC format image on their iPhone, **When** they upload the image through the platform's upload interface, **Then** the system accepts the upload, converts it to JPEG, and confirms successful upload.
2. **Given** a HEIC image has been uploaded and converted, **When** the user or another user requests to view the image, **Then** the file service returns the image as JPEG with the correct MIME type (image/jpeg).
3. **Given** a user uploads a HEIC image, **When** the converted JPEG is displayed, **Then** the image quality is preserved with no visible artifacts or significant degradation.

---

### User Story 2 - Bulk Upload with Mixed Formats (Priority: P2)

A user uploads multiple images simultaneously, including a mix of HEIC, JPEG, and PNG formats. The system correctly identifies HEIC images and converts only those, while passing through already-supported formats unchanged.

**Why this priority**: Real-world users often upload multiple images at once. Proper format detection and selective conversion ensures efficiency and maintains original quality for images that don't need conversion.

**Independent Test**: Upload a batch of 5-10 images with mixed formats (HEIC, JPEG, PNG) and verify that only HEIC images are converted while others remain unchanged.

**Acceptance Scenarios**:

1. **Given** a user selects multiple images including HEIC and JPEG files, **When** they initiate a bulk upload, **Then** all HEIC images are converted to JPEG while JPEG and PNG images are stored with their original format.
2. **Given** a batch upload is in progress, **When** the upload completes, **Then** the user receives confirmation showing the number of images uploaded and processed successfully.

---

### User Story 3 - Conversion Failure Handling (Priority: P3)

A user attempts to upload a corrupted or invalid HEIC file. The system detects the conversion failure and provides clear error feedback to the user without blocking other uploads in a batch.

**Why this priority**: While less common, handling edge cases gracefully prevents user frustration and provides clear paths to resolution. This ensures system reliability and good user experience even in error conditions.

**Independent Test**: Upload a corrupted HEIC file and verify the system returns a meaningful error message without crashing or affecting other concurrent uploads.

**Acceptance Scenarios**:

1. **Given** a user uploads a corrupted HEIC file, **When** the system attempts conversion, **Then** the upload fails with a clear error message indicating the file could not be processed.
2. **Given** a batch upload includes one corrupted HEIC and several valid images, **When** processing completes, **Then** valid images are successfully stored and the corrupted image is reported as failed with details.
3. **Given** conversion fails for any reason, **When** the error occurs, **Then** the system logs sufficient diagnostic information for troubleshooting.

---

### Edge Cases

- What happens when a HEIC file is extremely large (e.g., high-resolution iPhone ProRAW)?
  - Files exceeding 25MB are rejected with a clear error message before conversion is attempted.
- How does the system handle HEIC files with embedded metadata (EXIF, location, etc.)?
- What happens if storage space is insufficient to store both the temporary HEIC and converted JPEG?
- How does the system behave when conversion takes longer than expected (e.g., timeout scenarios)?
- What happens if a HEIC file uses a newer codec version not supported by the conversion library?
- Multi-frame HEIC containers (Live Photos, bursts): only the primary still image is extracted; additional frames are silently discarded.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST accept image uploads in HEIC and HEIF formats from client applications.
- **FR-002**: System MUST automatically detect when an uploaded image is in HEIC/HEIF format based on file MIME type or file extension.
- **FR-003**: System MUST convert HEIC/HEIF images to JPEG format during the upload process, before storing the image to disk.
- **FR-004**: System MUST preserve image quality during conversion using a compression quality setting of at least 85% to maintain visual fidelity.
- **FR-005**: System MUST preserve EXIF metadata (including orientation, date taken, camera information) during the HEIC to JPEG conversion process.
- **FR-006**: System MUST return image/jpeg as the MIME type for converted images when requested by the file-service.
- **FR-007**: System MUST handle conversion failures gracefully by returning meaningful error messages to the user without crashing.
- **FR-008**: System MUST log conversion events including success, failure, conversion time, and file sizes for monitoring and debugging purposes.
- **FR-009**: System MUST validate that the converted JPEG file is not corrupted before storing it and marking the upload as successful.
- **FR-010**: System MUST store only the converted JPEG version and discard the original HEIC file immediately after successful conversion. The original HEIC file is not retained.
- **FR-011**: System MUST maintain the original filename with the extension changed to .jpg or .jpeg after conversion.
- **FR-012**: System MUST process non-HEIC image formats (JPEG, PNG, GIF, WebP) without modification, passing them through unchanged.
- **FR-013**: System MUST extract only the primary still image from multi-frame HEIC containers (e.g., Live Photos, burst sequences) and convert that single frame to JPEG, discarding any additional frames or embedded video data.
- **FR-014**: System MUST reject HEIC uploads exceeding 25MB with a clear error message informing the user of the size limit.

### Key Entities

- **Upload Request**: Represents a user's image upload operation, including the file data, MIME type, original filename, and user identity.
- **Image Conversion Job**: Represents the conversion process for a HEIC image, including source format, target format, conversion status, timing metrics, and resulting file reference.
- **Stored Image**: Represents the persisted image file with metadata including storage location, MIME type, file size, dimensions, and whether it was converted from another format.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: iPhone users can successfully upload HEIC images with 100% of valid files being accepted and converted to JPEG.
- **SC-002**: All converted JPEG images display correctly in major web browsers (Chrome, Firefox, Safari, Edge) without compatibility issues.
- **SC-003**: HEIC to JPEG conversion completes within 5 seconds for images up to 10MB in size under normal system load.
- **SC-004**: Image quality is preserved during conversion with no visible artifacts, as measured by visual inspection and peak signal-to-noise ratio (PSNR) above 40 dB.
- **SC-005**: Conversion failures (corrupted files, unsupported formats) are handled gracefully with clear error messages and 100% of errors logged for debugging.
- **SC-006**: Support ticket volume related to iPhone image upload issues decreases by at least 80% after feature deployment.
- **SC-007**: System successfully processes batch uploads containing mixed image formats with correct selective conversion of HEIC files only.
