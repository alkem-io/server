## Image → Excalidraw conversion via RabbitMQ

This guide explains how an external service integrates with the Image→Excalidraw converter when the backend runs in RabbitMQ ingestion mode. It covers how to submit jobs, the exact payload schema and limits, the result messages you’ll receive, and how to fetch the final artifact.

Related references

- Contract: `specs/002-add-rabbitmq-integration/contracts/messaging-contract.md`
- Technical summary: `docs/rabbitmq-integration-technical-summary.md`

### At a glance

- Publish a JobMessage to the job queue (AMQP). The service downloads the image from your URL and converts it.
- You receive a ResultMessage on the result queue when done (success or error).
- On success, fetch the full Excalidraw JSON from the REST artifact endpoint referenced by `output_ref`.

---

## 1) Prerequisites

Deployment/ops

- The converter must be started with `INGESTION_MODE=RABBITMQ` and required RabbitMQ env configured (see below).
- The service declares queues idempotently on startup when connected to the broker.

Broker settings (environment variables)

- RABBITMQ_HOST: broker host (e.g., `rabbitmq`)
- RABBITMQ_PORT: broker port (default `5672`)
- RABBITMQ_USER / RABBITMQ_PASSWORD: optional credentials
- RABBITMQ_VHOST: virtual host (default `/`)
- RABBITMQ_JOB_QUEUE: inbound queue name (recommended: `image2excalidraw.jobs`)
- RABBITMQ_RESULT_QUEUE: outbound queue name (recommended: `image2excalidraw.results`)
- RABBITMQ_PREFETCH_COUNT: consumer prefetch (default: max concurrent requests)
- IMAGE_FETCH_HEADERS_JSON: optional JSON string of headers to use when fetching your image URL (merged with per-job `headers`)

Note: Missing required RabbitMQ settings will cause startup failure in strict mode or a fallback to REST mode in non-strict test contexts. In production, set all required variables.

---

## 2) Submit work: JobMessage (publish to job queue)

Queue: RABBITMQ_JOB_QUEUE

Content type: UTF-8 JSON

Schema
{
"job*id": "UUID", // required, producer-generated unique ID
"image_url": "https://…", // required, http(s) URL; https recommended
"headers": { "Header-Name": "value" }, // optional, string:string map (merged with server-side IMAGE_FETCH_HEADERS_JSON)
"options": { /* reserved for future \_/ }, // optional, arbitrary JSON object; currently not required
"submitted_ts": "2025-10-03T10:15:30Z" // optional; server will set if absent
}

Validation and limits

- job_id: valid UUID; used for correlation and idempotency.
- headers: max 50 entries; each key and value must be non-empty and ≤ 256 chars; combined serialized size ≤ 4096 bytes. These headers are sent when the service performs HTTP GET on `image_url`.
- image_url: must be http/https; service will log a warning for plain http.
- Image size: fetched image must be ≤ 5 MB (hard limit). Larger images produce an `IMAGE_TOO_LARGE` error.
- Duplicate handling: if a JobMessage repeats an already-accepted `job_id` within the duplicate cache window, the service rejects it and emits an error ResultMessage with `DUPLICATE_JOB_ID` (no reprocessing).

Example (minimal)
{
"job_id": "018f3c2e-52d4-7b6b-b8a5-9afc7d4e2d11",
"image_url": "https://example.com/diagram.jpg"
}

Example (with headers)
{
"job_id": "018f3c2e-52d4-7b6b-b8a5-9afc7d4e2d11",
"image_url": "https://api.example.com/files/diagram.jpg",
"headers": {"Authorization": "Bearer token123"}
}

Notes

- The service performs a single HTTP GET to `image_url` with `headers` merged over `IMAGE_FETCH_HEADERS_JSON`. Non-200 responses or network failures produce `FETCH_FAILED`.
- Do not embed image bytes/base64 in the message; only references via URL are supported.

---

## 3) Receive outcome: ResultMessage (consume from result queue)

Queue: RABBITMQ_RESULT_QUEUE

Content type: UTF-8 JSON

Success
{
"job_id": "018f3c2e-52d4-7b6b-b8a5-9afc7d4e2d11",
"status": "success",
"output_ref": "http://<host>:<port>/api/v1/artifacts/018f3c2e-52d4-7b6b-b8a5-9afc7d4e2d11",
"completed_ts": "2025-10-03T10:15:45Z"
}

Error
{
"job_id": "018f3c2e-52d4-7b6b-b8a5-9afc7d4e2d11",
"status": "error",
"error_code": "DUPLICATE_JOB_ID",
"error_message": "Job already accepted",
"completed_ts": "2025-10-03T10:15:31Z"
}

Error codes

- VALIDATION_ERROR: invalid schema or headers exceeded limits
- IMAGE_TOO_LARGE: fetched image exceeds 5 MB limit
- FETCH_FAILED: HTTP error or network failure fetching `image_url`
- DUPLICATE_JOB_ID: job_id already accepted/processed
- CONVERSION_ERROR: internal conversion failure
- PUBLISH_FAILED: the service could not publish a result after retry (see below)

Publish and reliability semantics

- The service publishes each result once. If the first publish attempt fails, it retries exactly once after a fixed 1.0s delay. A second failure logs `publish.failed` and increments metrics; in that rare case, no ResultMessage is delivered to the queue.

Correlation

- Use the `job_id` you supplied to match results to submitted jobs.

---

## 4) Fetch the final artifact (REST)

The ResultMessage includes `output_ref`, a stable retrieval endpoint of the form:
http://<host>:<port>/api/v1/artifacts/{job_id}

To download the complete Excalidraw JSON, append `?include=content`:
http://<host>:<port>/api/v1/artifacts/{job_id}?include=content

Responses

- 200 OK (metadata only):
  {"metadata": {"job_id": "…", "retrieval_url": "/api/v1/artifacts/{job_id}", "size_bytes": 12345, "created_ts": 1712345678}}
- 200 OK (with content):
  {"metadata": {…}, "content": { /_ full Excalidraw JSON _/ }}
- 404 Not Found: artifact has not been created or was purged by retention.

Notes

- `retrieval_url` in the metadata is the same stable path; clients can bookmark this.
- By default, content is not inlined to keep messages and common metadata calls small; request it explicitly with `include=content`.

---

## 5) End-to-end flow (sequence)

1. Producer publishes JobMessage to `RABBITMQ_JOB_QUEUE` using your UUID `job_id`.
2. Service fetches `image_url` with merged headers and validates size (≤ 5 MB).
3. Service converts the image; on success, it writes an artifact file `{job_id}.excalidraw` server-side.
4. Service publishes ResultMessage to `RABBITMQ_RESULT_QUEUE` with `status=success` and an `output_ref` to `/api/v1/artifacts/{job_id}`.
5. Consumer receives ResultMessage, correlates by `job_id`, and performs a GET to `output_ref?include=content` to retrieve and store the Excalidraw JSON.

Idempotency

- If a duplicate JobMessage with the same `job_id` is submitted, the service emits an error ResultMessage with `DUPLICATE_JOB_ID` and does not reprocess.

---

## 6) Example snippets

Publishing a job (pseudocode)
// channel.default_exchange.publish(Message(body=JSON), routing_key=RABBITMQ_JOB_QUEUE)

Consuming results (filter by job_id)
// on message: if json(job).job_id == my_job_id → process; ack

Fetching artifact
// GET {output_ref}?include=content → { metadata, content }

---

## 7) Operational notes and troubleshooting

Metrics (aggregated under `/api/v1/metrics` when enabled)

- rabbitmq_job_received_total
- rabbitmq_duplicate_rejected_total
- rabbitmq_publish_retry_total
- rabbitmq_publish_fail_total
- rabbitmq_result_sent_total

Common issues

- Missing credentials/host/queues: service fails on startup when `INGESTION_MODE=RABBITMQ` (strict mode). Verify env.
- HTTP 4xx/5xx from `image_url`: expect `FETCH_FAILED` error results; check your URL and auth headers.
- Oversize images: reduce source size to ≤ 5 MB to avoid `IMAGE_TOO_LARGE`.
- No result message received: rare publish double-failure; check logs for `publish.failed`.

Security

- Trust is established at the broker level (trusted publishers/consumers). The service does not implement per-message authentication.
- Prefer https image URLs; http is accepted but logged as a warning.

Retention

- Artifacts are stored on disk and may be purged by retention policy; fetch soon after success if you need to persist elsewhere.

---

## 8) Contract summary (quick reference)

JobMessage

- job_id: UUID (required)
- image_url: http(s) URL (required)
- headers: map<string,string> (optional; ≤50 entries; total ≤4096 bytes)
- options: object (optional)
- submitted_ts: ISO 8601 (optional)

ResultMessage

- job_id: UUID (required)
- status: "success" | "error" (required)
- output_ref: string URL (success only; recommended)
- error_code: one of VALIDATION_ERROR | IMAGE_TOO_LARGE | FETCH_FAILED | DUPLICATE_JOB_ID | CONVERSION_ERROR | PUBLISH_FAILED (error only)
- error_message: string (error only)
- completed_ts: ISO 8601 (required)
