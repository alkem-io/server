# Copyright 2026 Alkemio Foundation
# SPDX-License-Identifier: EUPL-1.2

"""
Alkemio file-service media storage provider for Synapse.

Workspace feature: 013-matrix-media-file-service
Contract: specs/013-matrix-media-file-service/contracts/synapse-storage-provider.md

A thin, STATELESS byte bridge between Synapse's media byte I/O and the Alkemio
file-service. Synapse's local media store is kept as an ephemeral CACHE (emptyDir);
file-service is the sole durable store.

  store_file  -> POST /internal/file (multipart) into the reserved `matrix_media`
                 bucket, VERBATIM (skipImageProcessing=true), with
                 externalReference = media_id (= file_info.file_id). A durable
                 store is confirmed ONLY by HTTP 201 Created (the file-service
                 create contract); anything else (transport error, timeout,
                 non-201) RAISES so Synapse's store_synchronous reports the upload
                 failure loudly. The uploaded file is STREAMED from the local
                 cache straight into the multipart body (never fully buffered).
                 Routes ONLY local user uploads; thumbnails / url-cache / remote
                 media stay local-cache-only.

  fetch       -> GET /internal/file/by-reference?ref=<media_id>  (GLOBAL — no
                 bucketId, because the server may have MOVED the doc into a
                 conversation bucket during inbound re-home), then stream
                 GET /internal/file/{id}/content back through a Responder.
                 Cache miss or ANY failure (non-200 / transport / timeout /
                 malformed body) -> return None, which Synapse treats as a cache
                 miss (media-not-found) — the correct degradation during an
                 outage. Timeout model: connection + headers + metadata-read +
                 drain are each bounded by `timeout_s`; the streamed content body
                 is bounded by a TIME-TO-FIRST-BYTE deadline (also `timeout_s`),
                 after which legitimate slow-client backpressure governs. A fixed
                 whole-body deadline is deliberately AVOIDED — it cannot
                 distinguish a file-service stall from client backpressure.

The provider holds NO durable state; the media_id <-> document mapping lives on
the file-service document's opaque `externalReference`. It follows the standard
Synapse storage-provider pattern (per-request timeouts + return-None-on-miss,
like the mainline s3_storage_provider) — it deliberately keeps NO cross-request
state of its own (no circuit breaker): resilience/backpressure is Synapse's and
treq's concern, and a stateful breaker cannot model a `fetch` whose duration is a
minutes-long body stream.

Deployment: copied into /data/modules (alongside alkemio_room_control.py) and
discovered via PYTHONPATH=/data/modules. Configured under
`media_storage_providers` in homeserver.yaml.

SOURCE OF TRUTH: THIS file
(`matrix-adapter/synapse-modules/alkemio_fileservice_provider.py`) is the
canonical copy of the module. It is propagated verbatim to the downstream
deployment repos by `.github/workflows/sync-synapse-module.yml` — the inline
`data:` block embedded in each `01-synapse-setup-confmap.yml` (dev-orchestration,
infrastructure-operations) and the file copy in `server` are GENERATED from this
file by that workflow. Never hand-edit the downstream confmap copies; change this
file and let the sync workflow roll it forward.
"""

import json
import logging
import math
import os
from typing import TYPE_CHECKING, Optional
from urllib.parse import quote

from twisted.internet import defer
from twisted.internet.defer import Deferred
from twisted.internet.error import ConnectionDone
from twisted.internet.interfaces import IConsumer
from twisted.internet.protocol import Protocol
from twisted.web.client import ResponseDone
from twisted.web.http import PotentialDataLoss

import treq

from synapse.logging.context import defer_to_thread, make_deferred_yieldable
from synapse.media._base import Responder
from synapse.media.storage_provider import StorageProvider

if TYPE_CHECKING:
    from synapse.media._base import FileInfo
    from synapse.server import HomeServer

logger = logging.getLogger(__name__)

# Reserved staging bucket name; the configured id is the server-seeded UUID.
MATRIX_MEDIA_BUCKET = "matrix_media"

# Conservative per-request network timeouts (seconds). file-service is on the
# Element media read path (cache miss -> fetch), so reads must fail fast and
# degrade (return None), never hang.
DEFAULT_TIMEOUT_S = 10.0
DEFAULT_STORE_TIMEOUT_S = 30.0

# The file-service create contract: a durable store is confirmed by 201 Created.
_STORE_SUCCESS_CODE = 201

# Minimum assumed upload throughput (bytes/sec) used to scale the store timeout by
# file size. treq's timeout= bounds the ENTIRE multipart upload, so store_timeout_s
# alone would kill a large-but-valid file that streams longer than the floor. 1 MB/s
# is conservative for an in-cluster link; a genuinely stalled upload still fails once
# it exceeds the size-proportional deadline.
_STORE_MIN_THROUGHPUT_BPS = 1_000_000

# The by-reference lookup returns tiny id-carrying document metadata. Cap the
# body we will buffer so a (fast) oversized/garbage body can't balloon memory.
_MAX_META_BYTES = 1 << 20  # 1 MiB

# Keep-alive drain bounds for non-streamed reply bodies (misses/errors, store
# reply). The body is tiny in the common case; if it exceeds either bound the
# backend is misbehaving, so we abort (tear down) rather than keep reading.
DRAIN_TIMEOUT_S = 2.0
_MAX_DRAIN_BYTES = 1 << 20  # 1 MiB


class _BodyTooLarge(Exception):
    """A response body exceeded its byte cap (`_MAX_META_BYTES`/`_MAX_DRAIN_BYTES`)."""


class _OpenAfterTimeout(Exception):
    """
    Raised by the guarded cache-file open when it completes AFTER the store has
    already timed out. The handle has been closed by the guard; nothing consumes
    this exception (the awaited Deferred was already cancelled by the deadline) —
    it exists only to make the dead path explicit and self-closing.
    """


async def _with_timeout(reactor, timeout_s, d):
    """
    Bound ONE raw (treq) Deferred by a reactor deadline. A stalled read raises
    `defer.TimeoutError`.

    This is a PURE per-call timeout: NO circuit breaker, NO cross-request/shared
    health state, NO success/failure bookkeeping — it just fails one hung read
    fast. It exists because treq's own `timeout=` only covers the request up to
    the response HEADERS; the subsequent BODY read has no such guard and would
    otherwise hang the read path forever.

    Only for RAW treq deferreds (json/content body reads) that are NOT
    logcontext-managed — `make_deferred_yieldable` here is correct. Do NOT use it
    for `defer_to_thread`, which is already logcontext-wrapped (a second wrap would
    resume under the sentinel context); bound that one with `addTimeout` directly.
    """
    # On deadline, addTimeout cancels `d` and converts the resulting
    # CancelledError to a defer.TimeoutError on the errback chain.
    d.addTimeout(timeout_s, reactor)
    return await make_deferred_yieldable(d)


def _stop_producing(transport) -> None:
    """
    Best-effort connection TEARDOWN — the single place the abort primitive lives.

    `stopProducing()` on a response-body transport aborts the underlying HTTP/1.1
    connection. It only actually frees the socket because our responses are
    UNBUFFERED: treq wraps a response in `_BufferedResponse` only when
    `not unbuffered`, and that wrapper's `deliverBody` merely replays an in-memory
    buffer (stopProducing is a no-op on it — the old buffered-drain bug). An
    unbuffered response hands a real body transport (Twisted's
    TransportProxyProducer), whose stopProducing() tears the connection down.
    """
    if transport is None:
        return
    try:
        transport.stopProducing()
    except Exception as exc:  # noqa: BLE001 - best-effort teardown
        logger.debug("file-service connection teardown failed (ignored): %s", exc)


def _abort_connection(resp) -> None:
    """
    Abort an unconsumed response's connection WITHOUT reading its body — used for a
    body we will never read (an abandoned content stream). Best-effort.
    """
    try:
        resp.deliverBody(_DrainAndAbort())
    except Exception as exc:  # noqa: BLE001 - best-effort release
        logger.debug("file-service connection abort failed (ignored): %s", exc)


class _ConsumerSink(Protocol):
    """
    Twisted body protocol that forwards a streamed HTTP response body straight
    into a Synapse media consumer, firing `finished` on completion.

    Backpressure: the response-body transport is an IPushProducer, so it is
    registered with the downstream consumer as a streaming producer. A slow
    consumer (e.g. a slow Element client on the read path) can then pause/resume
    the upstream TCP read instead of forcing this protocol to buffer an unbounded
    amount of data in memory.
    """

    def __init__(
        self,
        consumer: IConsumer,
        finished: "Deferred[int]",
        reactor=None,
        ttfb_timeout=None,
    ):
        self._consumer = consumer
        self._finished = finished
        self._written = 0
        self._producer_registered = False
        self._reactor = reactor
        self._ttfb_timeout = ttfb_timeout
        self._ttfb = None  # pending time-to-first-byte timeout call (IDelayedCall)

    def makeConnection(self, transport) -> None:
        Protocol.makeConnection(self, transport)
        # `transport` is Twisted's TransportProxyProducer for the response body —
        # an IPushProducer. Register it so the consumer applies real backpressure.
        # Degrade gracefully if the consumer cannot accept a producer.
        try:
            self._consumer.registerProducer(transport, True)
            self._producer_registered = True
        except (AttributeError, RuntimeError):
            self._producer_registered = False

        # Time-to-first-byte deadline: file-service returning 200 then going silent
        # BEFORE any body byte must not hang the media request (and hold the
        # unbuffered connection open). This is a TTFB timeout ONLY — before the
        # first byte the consumer hasn't paused anything, so an idle read is a real
        # stall; AFTER the first byte, legitimate slow-client backpressure (a paused
        # producer stops dataReceived) governs, which an idle timer cannot
        # distinguish from a server stall, so we impose no further deadline.
        if self._reactor is not None and self._ttfb_timeout is not None:
            self._ttfb = self._reactor.callLater(
                self._ttfb_timeout, self._on_ttfb_timeout
            )

    def _cancel_ttfb(self) -> None:
        if self._ttfb is not None and self._ttfb.active():
            self._ttfb.cancel()
        self._ttfb = None

    def _on_ttfb_timeout(self) -> None:
        # No body byte arrived within the deadline: abort the (unbuffered)
        # connection and fail so Synapse maps the Responder to a media error.
        self._ttfb = None
        if self._finished.called:
            return
        if self._producer_registered:
            try:
                self._consumer.unregisterProducer()
            except (AttributeError, RuntimeError):
                pass
            self._producer_registered = False
        _stop_producing(getattr(self, "transport", None))
        self._finished.errback(
            defer.TimeoutError(
                "file-service content stall: no body within %ss" % self._ttfb_timeout
            )
        )

    def dataReceived(self, data: bytes) -> None:
        # First byte arrived — cancel the TTFB deadline; from here client
        # backpressure governs and we impose no further timeout.
        self._cancel_ttfb()
        self._consumer.write(data)
        self._written += len(data)

    def connectionLost(self, reason=None) -> None:
        # ResponseDone/ConnectionDone are a clean close. INTENTIONAL divergence
        # from `_body_end_is_clean` (which the small metadata/drain readers use and
        # which accepts PotentialDataLoss): a streamed content body treats
        # PotentialDataLoss (a truncated download, no clean terminator) as a
        # FAILURE — the consumer must NOT be told the media completed when bytes may
        # be missing. Only ResponseDone/ConnectionDone count as success here.
        self._cancel_ttfb()
        if self._producer_registered:
            try:
                self._consumer.unregisterProducer()
            except (AttributeError, RuntimeError):
                pass
            self._producer_registered = False

        if self._finished.called:
            return
        if reason is None or reason.check(ResponseDone, ConnectionDone):
            self._finished.callback(self._written)
        else:
            self._finished.errback(reason)


class _DrainAndAbort(Protocol):
    """
    Body protocol used to RELEASE an unconsumed response body: it aborts the
    transport as soon as the body is delivered, so the (unbuffered) connection is
    torn down / returned to the pool instead of leaking a half-open socket.
    """

    def makeConnection(self, transport) -> None:
        Protocol.makeConnection(self, transport)
        # Abort the underlying connection as soon as the body is delivered.
        _stop_producing(transport)

    def dataReceived(self, data: bytes) -> None:  # pragma: no cover - aborted
        pass


def _body_end_is_clean(reason) -> bool:
    """True if a body protocol's connectionLost `reason` is a normal end."""
    return reason is None or reason.check(
        ResponseDone, PotentialDataLoss, ConnectionDone
    )


class _BoundedBodyProtocol(Protocol):
    """
    Shared skeleton for the body protocols WE own (instead of treq.json_content),
    so a stalled/failed read can `abort()` the connection — treq's collect/content
    Deferred has no canceller, so a timeout there would cancel the wait but leave
    the socket open (pool leak).

    Single-sources: the fire-once `finished` handling, the byte cap (overflow ->
    `_BodyTooLarge` + abort), the clean-close detection, and `abort()` via the one
    teardown primitive. Subclasses override only `_consume(data)` (per-chunk) and
    `_result()` (the value fired on a clean close).
    """

    def __init__(self, finished: "Deferred", max_bytes: int):
        self._finished = finished
        self._max_bytes = max_bytes
        self._size = 0

    def dataReceived(self, data: bytes) -> None:
        self._size += len(data)
        if self._size > self._max_bytes:
            # A fast oversized body must not read unboundedly: fail + abort.
            if not self._finished.called:
                self._finished.errback(_BodyTooLarge(self._size))
            self.abort()
            return
        self._consume(data)

    def connectionLost(self, reason=None) -> None:
        if self._finished.called:
            return
        if _body_end_is_clean(reason):
            self._finished.callback(self._result())
        else:
            self._finished.errback(reason)

    def abort(self) -> None:
        _stop_producing(getattr(self, "transport", None))

    # -- subclass hooks --
    def _consume(self, data: bytes) -> None:
        # Default: discard. `_BodyDrainer` inherits this (its whole job is to
        # drain+discard), so this IS reached in production for a small non-empty
        # miss/error reply body. `_JsonBodyReader` overrides it to buffer.
        pass

    def _result(self):
        return None


class _JsonBodyReader(_BoundedBodyProtocol):
    """
    Buffers a small response body and fires `finished` with the collected bytes on
    a clean close (a fully-read body returns the connection to the keep-alive pool
    for reuse). Used for the by-reference doc metadata (we need its id).
    """

    def __init__(self, finished: "Deferred[bytes]", max_bytes: int):
        super().__init__(finished, max_bytes)
        self._chunks = []

    def _consume(self, data: bytes) -> None:
        self._chunks.append(data)

    def _result(self) -> bytes:
        return b"".join(self._chunks)


class _BodyDrainer(_BoundedBodyProtocol):
    """
    DISCARDS a small non-streamed reply body and fires `finished` (None) on a clean
    close so the (unbuffered) connection is returned to treq's keep-alive pool for
    REUSE — cheaper than tearing a fresh TCP(+TLS) connection down and
    re-handshaking on the next call. `abort()` tears it down if the drain must be
    given up (timeout / over the byte cap). Bytes are discarded (base `_consume`
    is a no-op), so memory stays bounded and the byte cap caps a hostile body.
    """


class _FileServiceResponder(Responder):
    """
    Streams a file-service content response into the media consumer without
    buffering the whole blob in memory.

    Connection lifecycle (resource safety): the content response is fetched
    `unbuffered=True`, so its connection stays open until the body is consumed.
    If Synapse enters the `with` block but never successfully starts streaming
    (client disconnect before `write_to_consumer`, or a synchronous
    `deliverBody` raise), `__exit__` ABORTS the connection so the treq pool is
    not exhausted. `_streamed` is set only AFTER `deliverBody` succeeds, and
    `_abort` is idempotent, so the normal fully-streamed path never double-aborts.
    """

    def __init__(self, response, reactor=None, ttfb_timeout=None):
        self._response = response
        self._streamed = False
        self._aborted = False
        self._reactor = reactor
        self._ttfb_timeout = ttfb_timeout

    def write_to_consumer(self, consumer: IConsumer) -> "Deferred[int]":
        finished = defer.Deferred()  # type: Deferred[int]
        try:
            self._response.deliverBody(
                _ConsumerSink(
                    consumer, finished, self._reactor, self._ttfb_timeout
                )
            )
        except Exception as exc:  # noqa: BLE001 - a synchronous deliverBody raise
            # deliverBody never took ownership of the connection and `_streamed`
            # stays False, so `__exit__` will abort/release it. Surface the error
            # as an errback so the caller does not hang waiting on `finished`.
            if not finished.called:
                finished.errback(exc)
            return make_deferred_yieldable(finished)
        self._streamed = True
        return make_deferred_yieldable(finished)

    def _abort(self) -> None:
        if self._aborted:
            return
        self._aborted = True
        # An abandoned content stream is potentially a full media file — ABORT it
        # (don't drain), and __exit__ is sync so it can't await a drain anyway.
        _abort_connection(self._response)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if not self._streamed:
            # Body never started streaming (client disconnect, or a synchronous
            # deliverBody raise). Release the unbuffered connection so the treq
            # pool is not exhausted.
            self._abort()
        return None


class FileServiceStorageProvider(StorageProvider):
    """
    Synapse media storage provider backed by the Alkemio file-service.

    Configured in homeserver.yaml:

        media_storage_providers:
          - module: alkemio_fileservice_provider.FileServiceStorageProvider
            store_local: true
            store_remote: false
            store_synchronous: true
            config:
              file_service_url: "http://file-service:4003"
              matrix_media_bucket_id: "<reserved uuid>"
    """

    @staticmethod
    def parse_config(config: dict) -> dict:
        """Validate and normalise the provider config block (called once at startup)."""
        if not isinstance(config, dict):
            raise ValueError(
                "FileServiceStorageProvider: config must be a mapping"
            )

        file_service_url = config.get("file_service_url")
        if not file_service_url or not isinstance(file_service_url, str):
            raise ValueError(
                "FileServiceStorageProvider: 'file_service_url' is required"
            )

        bucket_id = config.get("matrix_media_bucket_id")
        if not bucket_id or not isinstance(bucket_id, str):
            raise ValueError(
                "FileServiceStorageProvider: 'matrix_media_bucket_id' is required"
            )

        return {
            "file_service_url": file_service_url.rstrip("/"),
            "matrix_media_bucket_id": bucket_id,
            "timeout_s": _positive_number(
                config, "timeout_s", DEFAULT_TIMEOUT_S, float
            ),
            "store_timeout_s": _positive_number(
                config, "store_timeout_s", DEFAULT_STORE_TIMEOUT_S, float
            ),
        }

    def __init__(self, hs: "HomeServer", config: dict):
        self.hs = hs
        self.reactor = hs.get_reactor()
        # Local media store is now a CACHE only; kept for reference/logging.
        self.cache_path = hs.config.media.media_store_path
        self.file_service_url = config["file_service_url"]
        self.matrix_media_bucket_id = config["matrix_media_bucket_id"]
        self.timeout_s = config["timeout_s"]
        self.store_timeout_s = config["store_timeout_s"]
        logger.info(
            "FileServiceStorageProvider initialized: url=%s bucket=%s cache=%s",
            self.file_service_url,
            self.matrix_media_bucket_id,
            self.cache_path,
        )

    # -- helpers ------------------------------------------------------------

    @staticmethod
    def _is_user_upload(file_info: "FileInfo") -> bool:
        """
        Offload ONLY local user uploads (path `local_content/...`).

        Thumbnails, url-cache previews and remote/federated media stay in the
        local cache and are never written to file-service.
        """
        return (
            getattr(file_info, "server_name", None) is None
            and getattr(file_info, "thumbnail", None) is None
            and not getattr(file_info, "url_cache", None)
        )

    async def _drain_and_release(self, resp) -> None:
        """
        Drain+discard a small NON-streamed reply body so the unbuffered connection
        is returned to treq's keep-alive pool for REUSE. On a stalled/oversized/
        failed drain, ABORT (tear down) instead. Best-effort — NEVER raises: a
        drain/abort failure must not fail a durable 201 nor turn a miss into an
        error. (Aborting every reply instead would lose keep-alive and force a
        fresh TCP+TLS handshake per store/miss under load.)

        The drain is a best-effort keep-alive courtesy, so it is bounded far
        tighter than a real request: `DRAIN_TIMEOUT_S` (small reply drains in ~ms;
        if it isn't done in ~2s the backend is stalling -> abort) and
        `_MAX_DRAIN_BYTES` (a large/hostile body tears down after the cap). This
        caps worst-case store/miss latency at ~DRAIN_TIMEOUT_S — the store already
        succeeded on 201; the drain never blocks the upload.
        """
        finished = defer.Deferred()
        drainer = _BodyDrainer(finished, _MAX_DRAIN_BYTES)
        try:
            resp.deliverBody(drainer)
            await _with_timeout(self.reactor, DRAIN_TIMEOUT_S, finished)
        except Exception as exc:  # noqa: BLE001 - timeout / oversize / transport
            drainer.abort()  # give up the reuse; tear the connection down
            logger.debug(
                "file-service reply drain failed, aborted: %s", exc
            )

    async def _release_and_miss(self, resp, message, *args):
        """Drain+release an unexpected-status reply, log it as an error, and return
        None (a cache miss). Shared by the by-reference and content GET guards."""
        await self._drain_and_release(resp)
        logger.error(message, *args)
        return None

    async def _read_json_body(self, resp):
        """
        Read + JSON-parse the by-reference response body, bounded by `timeout_s`.

        The ONLY response whose body we read (we need the doc id). Everything else
        is `_drain_and_release`d. Reads via a protocol we own (`_JsonBodyReader`)
        rather than `treq.json_content` so that on a stalled/failed/oversized body
        read we can ABORT the connection — treq's content Deferred has no
        canceller, so a bare timeout there would release the wait but LEAK the
        still-open connection. `deliverBody` AND `json.loads` are inside the try,
        so a synchronous deliverBody raise, a stalled read, an oversized body, OR a
        malformed body all ABORT the connection and RE-RAISE — the None cache-miss
        mapping is done by the caller (`fetch`'s outer `except`). A size cap
        (`_MAX_META_BYTES`) bounds a fast oversized body.
        """
        finished = defer.Deferred()  # type: Deferred[bytes]
        reader = _JsonBodyReader(finished, _MAX_META_BYTES)
        try:
            resp.deliverBody(reader)
            raw = await _with_timeout(self.reactor, self.timeout_s, finished)
            # json.loads(bytes): JSON is UTF-8/16/32 per RFC 8259 (Content-Type
            # charset param N/A for JSON); json.loads auto-detects encoding + BOM.
            return json.loads(raw)
        except Exception:
            reader.abort()  # release the stalled/broken/oversized/malformed conn
            raise

    # -- StorageProvider API ------------------------------------------------

    async def store_file(self, path: str, file_info: "FileInfo") -> None:
        """Offload a freshly-uploaded local file to file-service, verbatim.

        Raises on any failure (transport error, timeout, non-201) so Synapse's
        store_synchronous surfaces the upload failure loudly rather than silently
        dropping the only durable copy.
        """
        if not self._is_user_upload(file_info):
            # Thumbnail / url-cache / remote: leave in local cache only.
            return

        media_id = file_info.file_id
        url = "%s/internal/file" % self.file_service_url

        # The freshly-uploaded file lives in the local media cache at
        # media_store_path + `path` (the relative path Synapse hands us, e.g.
        # `local_content/aa/bb/<rest>`). Synapse's FileInfo has NO `upload_path`
        # attribute — derive the absolute path the same way the on-disk store does
        # (matching synapse-s3-storage-provider). Opening it is blocking I/O — do
        # it off the reactor; treq then STREAMS the handle into the multipart body
        # via twisted's cooperative FileBodyProducer (chunked 64 KiB reads on a
        # Cooperator), so the file is never fully copied into memory nor read
        # synchronously on the reactor thread.
        cache_file = os.path.join(self.cache_path, path)

        # Bound the open by `store_timeout_s` so a wedged media-store mount fails
        # the upload fast instead of stalling the request forever. Two caveats
        # handled here:
        #  - `defer_to_thread` already returns a logcontext-wrapped Deferred, so we
        #    add the deadline with `addTimeout` DIRECTLY and await it WITHOUT a
        #    second `make_deferred_yieldable` (that would resume the rest of the
        #    upload under the sentinel logcontext).
        #  - the deadline cancels the awaited REQUEST, but a blocking open() parked
        #    in a threadpool thread cannot be cancelled; when the mount recovers the
        #    syscall returns a handle to an already-cancelled Deferred and the
        #    `finally: stream.close()` below never runs (stream is unbound). The
        #    `_guarded_open` closure below closes that late handle itself. (Tiny
        #    TOCTOU window if open() returns exactly as the flag is set — accepted.)
        timed_out = False

        def _guarded_open():
            fh = _open_stream(cache_file)
            ok = False
            try:
                if timed_out:  # reads the enclosing flag (set by the timeout below)
                    raise _OpenAfterTimeout(cache_file)
                # Stat for the size-proportional timeout HERE — off the reactor, in
                # the threadpool — so a wedged mount cannot stall the whole Synapse
                # worker (a reactor-side stat would reintroduce the exact hazard the
                # threaded open avoids). Stat the OPEN fd (pinned inode), NOT the
                # path: a path re-stat can race a rotate/unlink between open() and
                # the stat and fail a store for which we already hold a valid handle
                # (the only durable copy). fstat also drops a redundant syscall.
                size = os.fstat(fh.fileno()).st_size
                if timed_out:  # the deadline may have fired DURING the stat (wedged mount)
                    raise _OpenAfterTimeout(cache_file)
                ok = True
                return fh, size
            finally:
                # Close the handle on EVERY non-success exit — a timeout (either
                # check) or a getsize raise (file unlinked between open and stat) —
                # so the FD isn't leaked. The getsize window is now covered; the only
                # residual TOCTOU is the tiny gap between the second `timed_out`
                # check and `return` (no syscall in between).
                if not ok:
                    try:
                        fh.close()
                    except Exception:  # noqa: BLE001 - best-effort
                        pass

        open_d = defer_to_thread(self.reactor, _guarded_open)
        open_d.addTimeout(self.store_timeout_s, self.reactor)
        try:
            stream, file_size = await open_d
        except Exception:
            # Timeout (or open error): flag so a LATE open() self-closes its handle.
            timed_out = True
            raise

        try:
            # treq serialises the multipart body as form-fields (`data`) THEN
            # files, preserving dict insertion order — so storageBucketId /
            # externalReference / skipImageProcessing precede the file part, which
            # file-service requires (it reads the metadata fields before consuming
            # the streamed file).
            files = {"file": (media_id, stream)}
            data = {
                "storageBucketId": self.matrix_media_bucket_id,
                "externalReference": media_id,
                "skipImageProcessing": "true",  # VERBATIM — read-back is exact
            }

            # store_timeout_s is the FLOOR; scale it up by file size so a valid
            # large upload isn't killed mid-stream. treq's timeout= bounds the
            # ENTIRE multipart upload (request-body send through response headers),
            # so a big-but-valid file streaming slower than store_timeout_s would
            # otherwise fail under load. A genuinely stalled upload still fails once
            # it exceeds this size-proportional deadline. file_size was stat'd
            # off-reactor in `_guarded_open` (see above).
            effective_timeout = max(
                self.store_timeout_s, file_size / _STORE_MIN_THROUGHPUT_BPS
            )

            # unbuffered=True so we can RELEASE the reply connection without
            # reading it (a buffered reply's stopProducing is a no-op).
            resp = await make_deferred_yieldable(
                treq.post(
                    url,
                    files=files,
                    data=data,
                    timeout=effective_timeout,
                    unbuffered=True,
                    reactor=self.reactor,
                )
            )

            if resp.code != _STORE_SUCCESS_CODE:
                # Only 201 Created confirms a durable store. A 2xx-non-201, a 3xx
                # redirect, or a 4xx/5xx is NOT a confirmed store — fail loudly.
                # We never need the reply body: drain it (keep-alive), then fail.
                await self._drain_and_release(resp)
                raise RuntimeError(
                    "file-service store returned HTTP %d (expected %d) for media_id=%s"
                    % (resp.code, _STORE_SUCCESS_CODE, media_id)
                )

            # 201: the media is durably stored. We don't need the created-doc body
            # (the media_id<->doc mapping lives on externalReference), so drain the
            # reply (best-effort, keep-alive) — a drain error can't stall or fail
            # the already-durable store.
            await self._drain_and_release(resp)
            logger.debug(
                "Stored media_id=%s in file-service bucket=%s",
                media_id,
                self.matrix_media_bucket_id,
            )
        finally:
            # Close the file handle on EVERY exit path (success, non-201 raise,
            # transport error, timeout).
            try:
                stream.close()
            except Exception:  # noqa: BLE001 - best-effort
                pass

    async def fetch(self, path: str, file_info: "FileInfo") -> Optional[Responder]:
        """
        Serve a media byte stream from file-service on local cache miss.

        Looks the document up GLOBALLY by externalReference (= media_id): the
        server may have MOVED it out of the staging bucket into a conversation
        bucket, so a bucket-scoped lookup would miss.

        Returns a Responder on a 200 content hit, or None on ANY miss/failure
        (404, non-200, transport error, per-request timeout, malformed body).
        Synapse treats None as a cache miss (media-not-found), which is the
        correct degradation while file-service is unavailable.
        """
        if not self._is_user_upload(file_info):
            # Symmetric with store_file: only local user-upload ORIGINALS are
            # offloaded to file-service. Thumbnails, url-cache previews and remote
            # media were never stored there — and a thumbnail file_info carries the
            # SAME file_id as the original, so a by-reference lookup would resolve to
            # the ORIGINAL document and stream full-size original bytes as e.g. a
            # thumbnail (user-visible corruption). Return a clean miss so Synapse
            # regenerates the thumbnail from the original / handles remote media its
            # own way.
            return None

        media_id = file_info.file_id
        # Percent-encode media_id as a QUERY value (safe="" so reserved chars like
        # &, #, ?, / are all escaped) — mirrors the Go side's url.PathEscape.
        lookup_url = "%s/internal/file/by-reference?ref=%s" % (
            self.file_service_url,
            quote(media_id, safe=""),
        )

        try:
            # unbuffered=True so misses/errors can be RELEASED without reading
            # (a buffered response's stopProducing is a no-op — the old leak).
            meta_resp = await make_deferred_yieldable(
                treq.get(
                    lookup_url,
                    timeout=self.timeout_s,
                    unbuffered=True,
                    reactor=self.reactor,
                )
            )
            if meta_resp.code == 404:
                # Clean by-reference miss (doc absent): drain (keep-alive).
                await self._drain_and_release(meta_resp)
                return None
            if meta_resp.code != 200:
                # Strict: only 200 carries a parseable doc. A 2xx-non-200 (e.g. 204)
                # or a 3xx redirect (treq does not follow) is NOT a doc — miss,
                # don't parse a non-doc body. (Matches the strict == 201 store check
                # and the Go strict == http.StatusOK.)
                return await self._release_and_miss(
                    meta_resp,
                    "file-service by-reference unexpected HTTP %d for media_id=%s",
                    meta_resp.code,
                    media_id,
                )

            # The ONLY body we read: the by-reference 200 doc metadata (we need the
            # id). Bounded, size-capped, and self-aborting on any error (see
            # `_read_json_body`). treq's `timeout=` above only covered the HEADERS,
            # so this guards the body read. On error the exception is caught by the
            # outer `except` -> return None.
            meta = await self._read_json_body(meta_resp)
            if not isinstance(meta, dict):
                # A null / non-object JSON body is a protocol error, not a doc:
                # treat as a miss rather than swallowing an AttributeError.
                logger.error(
                    "file-service by-reference returned a non-object body for "
                    "media_id=%s: %r",
                    media_id,
                    type(meta).__name__,
                )
                return None
            doc_id = meta.get("id")
            if not doc_id:
                logger.error(
                    "file-service by-reference returned no id for media_id=%s",
                    media_id,
                )
                return None

            # Percent-encode doc_id as a PATH segment (safe="" so reserved chars
            # like /, ?, # are escaped) — mirrors the Go side's url.PathEscape.
            content_url = "%s/internal/file/%s/content" % (
                self.file_service_url,
                quote(doc_id, safe=""),
            )
            content_resp = await make_deferred_yieldable(
                treq.get(
                    content_url,
                    timeout=self.timeout_s,
                    unbuffered=True,
                    reactor=self.reactor,
                )
            )
            if content_resp.code == 404:
                # The doc was deleted between the by-reference lookup and the
                # content GET: a race. Treat as a clean miss: drain (keep-alive).
                await self._drain_and_release(content_resp)
                logger.info(
                    "file-service content 404 (doc removed mid-fetch) for "
                    "doc_id=%s media_id=%s",
                    doc_id,
                    media_id,
                )
                return None
            if content_resp.code != 200:
                # Strict: only a 200 streams the media body. A 2xx-non-200 (e.g.
                # 204) or a 3xx redirect (treq does not follow) must NOT be streamed
                # as media — miss, drain/abort the body instead.
                return await self._release_and_miss(
                    content_resp,
                    "file-service content unexpected HTTP %d for doc_id=%s media_id=%s",
                    content_resp.code,
                    doc_id,
                    media_id,
                )

            logger.debug(
                "Serving media_id=%s from file-service doc_id=%s", media_id, doc_id
            )
            # Thread the reactor + TTFB deadline so a 200-then-silent content stream
            # can't hang the media request (time-to-first-byte only; see _ConsumerSink).
            return _FileServiceResponder(content_resp, self.reactor, self.timeout_s)

        except Exception as exc:  # noqa: BLE001 - transport / timeout / parse error
            # Degrade to a cache miss during any file-service outage.
            logger.warning(
                "file-service fetch failed for media_id=%s: %s", media_id, exc
            )
            return None


def _positive_number(config: dict, key: str, default, cast):
    """
    Coerce a numeric config value, falling back to `default` when the key is
    absent OR present-but-null (YAML `key:` with no value yields None, which
    would otherwise blow up `float(None)`/`int(None)`). Rejects values that are
    not a finite positive number:
      - bool is an int subclass, so a YAML `true`/`false` would otherwise pass as
        1/0 — reject it explicitly;
      - NaN slips past `<= 0` (all NaN comparisons are False) and +inf passes
        `> 0`, so require `math.isfinite` — which itself raises OverflowError on
        an astronomically large int, caught here so it surfaces as a clean
        ValueError at boot rather than a raw traceback;
      - a 0/negative timeout is nonsensical — require strictly positive.
    """
    raw = config.get(key)
    if raw is None:
        raw = default
    try:
        if isinstance(raw, bool):
            # bool is an int subclass; a YAML `true`/`false` must not pass as 1/0.
            raise TypeError("bool is not a valid number")
        value = cast(raw)
        if not math.isfinite(value):
            raise ValueError("value is not finite")
    except (TypeError, ValueError, OverflowError):
        raise ValueError(
            "FileServiceStorageProvider: '%s' must be a finite number, got %r"
            % (key, raw)
        )
    if value <= 0:
        raise ValueError(
            "FileServiceStorageProvider: '%s' must be > 0, got %r" % (key, value)
        )
    return value


def _open_stream(file_path: str):
    """Open the local cache file for streaming into the multipart body.

    Called via defer_to_thread so the open() syscall never runs on the reactor;
    treq's cooperative FileBodyProducer then reads the handle in chunks, so the
    file is streamed rather than buffered whole in memory.
    """
    return open(file_path, "rb")
