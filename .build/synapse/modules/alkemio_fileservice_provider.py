# Copyright 2026 Alkemio Foundation
# SPDX-License-Identifier: EUPL-1.2

"""Stage local Matrix originals in file-service and retrieve them by reference.

Synapse owns media serving. References remain retrievable after bucket placement.
This canonical module supplies generated deployment copies.
"""

import math
import os
import tempfile
from urllib.parse import quote

import treq
from synapse.api.errors import HttpResponseException
from synapse.http.client import read_body_with_max_size
from synapse.logging.context import make_deferred_yieldable
from synapse.media.media_storage import FileResponder
from synapse.media.storage_provider import StorageProvider
from synapse.util.async_helpers import timeout_deferred


class FileServiceStorageProvider(StorageProvider):
    @staticmethod
    def parse_config(config: dict) -> dict:
        url = config.get("file_service_url")
        bucket = config.get("matrix_media_bucket_id")
        if not isinstance(url, str) or not url.strip():
            raise ValueError("file_service_url is required")
        if not isinstance(bucket, str) or not bucket.strip():
            raise ValueError("matrix_media_bucket_id is required")
        timeout = float(config.get("store_timeout_s", 30))
        if not math.isfinite(timeout) or timeout <= 0:
            raise ValueError("store_timeout_s must be positive and finite")
        return {
            "file_service_url": url.rstrip("/"),
            "matrix_media_bucket_id": bucket,
            "store_timeout_s": timeout,
        }

    def __init__(self, hs, config: dict):
        self.hs = hs
        self.reactor = hs.get_reactor()
        self.http = hs.get_simple_http_client()
        self.media_path = hs.config.media.media_store_path
        self.max_size = hs.config.media.max_upload_size
        self.base_url = config["file_service_url"]
        self.bucket_id = config["matrix_media_bucket_id"]
        self.store_timeout = config["store_timeout_s"]

    @staticmethod
    def _is_original(file_info) -> bool:
        return (
            file_info.server_name is None
            and file_info.thumbnail is None
            and not file_info.url_cache
        )

    async def store_file(self, path: str, file_info) -> None:
        if not self._is_original(file_info):
            return
        media_id = file_info.file_id
        fields = {
            "storageBucketId": self.bucket_id,
            "externalReference": media_id,
            "displayName": media_id,
            "skipImageProcessing": "true",
        }
        with open(os.path.join(self.media_path, path), "rb") as source:
            # Stock treq multipart orders fields before streams, so file-service
            # sees the verbatim flag before consuming any image bytes.
            response = await make_deferred_yieldable(treq.post(
                self.base_url + "/internal/file",
                data=fields,
                files={"file": (media_id, "application/octet-stream", source)},
                timeout=self.store_timeout,
                reactor=self.reactor,
            ))
            await make_deferred_yieldable(treq.content(response))
            if response.code != 201:
                raise RuntimeError(
                    f"file-service store returned HTTP {response.code} for {media_id}"
                )

    async def fetch(self, path: str, file_info):
        if not self._is_original(file_info):
            return None
        try:
            document = await self.http.get_json(
                self.base_url + "/internal/file/by-reference",
                args={"ref": file_info.file_id},
            )
        except HttpResponseException as error:
            if error.code == 404:
                return None
            raise

        # Download to disk; the stock responder owns the file after success.
        spool = tempfile.TemporaryFile()
        try:
            document_id = quote(document["id"], safe="")
            # get_file maps every upstream HTTP failure to 502, hiding a
            # deletion between reference lookup and this content request.
            response = await self.http.request(
                "GET", f"{self.base_url}/internal/file/{document_id}/content"
            )
            if response.code == 404:
                spool.close()
                return None
            if response.code > 299:
                raise HttpResponseException(response.code, "Content download failed", b"")
            await make_deferred_yieldable(timeout_deferred(
                read_body_with_max_size(response, spool, self.max_size),
                30, self.reactor,
            ))
            spool.seek(0)
            return FileResponder(self.hs, spool)
        except BaseException:
            spool.close()
            raise
