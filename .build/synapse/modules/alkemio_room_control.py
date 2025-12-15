# Copyright 2025 Copyright Alkemio BV
# SPDX-License-Identifier: EUPL-1.2

"""
Alkemio Room Control Module for Synapse

This module restricts room creation to the Alkemio Matrix Adapter AppService.
All users are ghost users provisioned by the AppService.

- Community rooms: Only created via Alkemio Server commands (through AppService bot)
- DM rooms: Users can attempt from Element, module notifies Adapter via webhook,
            Adapter notifies Server, Server commands Adapter, bot creates room.

Zero-config usage:
    modules:
      - module: alkemio_room_control.AlkemioRoomControl
        config: {}  # All values auto-detected from AppService 'alkemio-matrix-adapter'

All config values are automatically detected from the AppService with id 'alkemio-matrix-adapter':
- homeserver_domain: Synapse's server_name
- appservice_sender: AppService's sender_localpart
- adapter_url: AppService's registered URL
- hs_token: AppService's hs_token
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from synapse.module_api import ModuleApi
from synapse.module_api.errors import Codes, SynapseError
from synapse.http.client import SimpleHttpClient

logger = logging.getLogger(__name__)


class AlkemioRoomControl:
    """
    Spam checker module that restricts room creation.

    Only the AppService bot user is allowed to create rooms.
    When ghost users attempt to create DM rooms, the module notifies
    the Adapter via webhook for async processing.

    All configuration values are auto-detected from the AppService with
    id 'alkemio-matrix-adapter'.
    """

    # Hardcoded AppService ID - must match registration.yaml
    APPSERVICE_ID = "alkemio-matrix-adapter"

    def __init__(self, config: dict, api: ModuleApi):
        self.api = api
        self._http_client = None  # Lazy initialization

        # Auto-detect homeserver domain from Synapse's server_name
        self.homeserver_domain = api.server_name

        # Find and configure from registered AppService
        detected = self._detect_appservice_config()

        # Use detected values
        self.appservice_sender = detected.get("sender", "matrix-adapter")
        self.adapter_url = detected.get("url", "http://localhost:8080")
        self.hs_token = detected.get("hs_token")

        # Register third-party rules callback for room creation control
        # This allows us to raise SynapseError with custom messages
        self.api.register_third_party_rules_callbacks(
            on_create_room=self.on_create_room,
        )

        logger.info(
            "AlkemioRoomControl initialized - AppService: @%s:%s, Adapter: %s, Token: %s",
            self.appservice_sender,
            self.homeserver_domain,
            self.adapter_url,
            "configured" if self.hs_token else "NOT FOUND",
        )

    def _detect_appservice_config(self) -> dict:
        """
        Auto-detect configuration from the 'alkemio-matrix-adapter' AppService.

        Returns:
            Dict with detected values: {sender, url, hs_token}
        """
        result = {}
        try:
            # Access Synapse's AppService store
            appservices = self.api._hs.get_datastores().main.get_app_services()

            # Find our specific AppService by ID
            appservice = None
            for svc in appservices:
                if svc.id == self.APPSERVICE_ID:
                    appservice = svc
                    break

            if not appservice:
                logger.error(
                    "AppService '%s' not found! Check registration.yaml is loaded.",
                    self.APPSERVICE_ID,
                )
                return result

            # Extract configuration from AppService
            if appservice.sender:
                # sender might be a full Matrix ID, a string localpart, or an object
                sender_value = appservice.sender
                if hasattr(sender_value, 'localpart'):
                    result["sender"] = sender_value.localpart
                elif isinstance(sender_value, str):
                    # If it's a full Matrix ID like @user:domain, extract localpart
                    if sender_value.startswith('@') and ':' in sender_value:
                        result["sender"] = sender_value.split(':')[0][1:]  # Remove @ and domain
                    else:
                        result["sender"] = sender_value
                else:
                    result["sender"] = str(sender_value)

            if appservice.url:
                result["url"] = appservice.url

            if appservice.hs_token:
                result["hs_token"] = appservice.hs_token

            logger.info(
                "Loaded config from AppService '%s': sender=%s, url=%s",
                self.APPSERVICE_ID,
                result.get("sender", "<not found>"),
                result.get("url", "<not found>"),
            )

        except Exception as e:
            logger.error(
                "Failed to load AppService '%s': %s",
                self.APPSERVICE_ID,
                str(e),
            )

        return result

    def _is_appservice_bot(self, user_id: str) -> bool:
        """Check if the user is the AppService bot."""
        try:
            localpart = user_id.split(":")[0][1:]  # Remove @ prefix
            return localpart == self.appservice_sender
        except (IndexError, AttributeError):
            return False

    @property
    def http_client(self) -> SimpleHttpClient:
        """Lazy initialization of HTTP client."""
        if self._http_client is None:
            self._http_client = SimpleHttpClient(self.api._hs)
        return self._http_client

    async def _notify_dm_request(
        self,
        initiator_user_id: str,
        target_user_id: str
    ) -> bool:
        """
        Notify the Adapter about a DM creation request.

        Args:
            initiator_user_id: Matrix ID of user initiating the DM
            target_user_id: Matrix ID of target user

        Returns:
            True if notification was sent successfully
        """
        import json

        webhook_url = f"{self.adapter_url}/_matrix/app/alkemio/dm-request"
        payload = {
            "inviter": initiator_user_id,
            "invitee": target_user_id,
        }
        headers = {
            b"Content-Type": [b"application/json"],
        }
        # Add Authorization header if hs_token is configured
        if self.hs_token:
            headers[b"Authorization"] = [f"Bearer {self.hs_token}".encode()]

        # Retry logic: 3 attempts with exponential backoff
        max_retries = 3
        for attempt in range(max_retries):
            try:
                await self.http_client.post_json_get_json(
                    webhook_url,
                    payload,
                    headers=headers,
                )
                logger.info(
                    "DM request notification sent: %s -> %s",
                    initiator_user_id,
                    target_user_id,
                )
                return True
            except Exception as e:
                if attempt < max_retries - 1:
                    import asyncio
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    continue
                logger.error(
                    "Failed to notify adapter about DM request: %s -> %s, error: %s",
                    initiator_user_id,
                    target_user_id,
                    str(e),
                )
                return False
        return False

    async def on_create_room(
        self,
        requester: "synapse.types.Requester",
        request_content: dict,
        is_requester_admin: bool,
    ) -> None:
        """
        Third-party rules callback for room creation.

        This runs BEFORE the spam checker and can raise SynapseError with
        a custom message that Element may display.

        Args:
            requester: The user requesting room creation
            request_content: The room creation request body
            is_requester_admin: Whether the requester is a server admin
        """
        user_id = requester.user.to_string()

        # Allow server admins and AppService bot
        if is_requester_admin or self._is_appservice_bot(user_id):
            return

        # Check if this is a DM attempt
        is_direct = request_content.get("is_direct", False)
        invite_list = request_content.get("invite", [])

        if is_direct and len(invite_list) == 1:
            target_user_id = invite_list[0]
            logger.info(
                "DM creation blocked via third_party_rules: %s -> %s",
                user_id,
                target_user_id,
            )
            # Notify adapter about DM request (fire and forget - don't block on failure)
            try:
                await self._notify_dm_request(user_id, target_user_id)
            except Exception as e:
                logger.warning(
                    "Failed to notify adapter about DM request: %s",
                    str(e),
                )

            raise SynapseError(
                403,
                "Direct messages must be initiated through Alkemio. "
                "Your request has been forwarded for processing.",
                Codes.FORBIDDEN,
            )

        # Block non-DM room creation
        logger.info(
            "Room creation blocked via third_party_rules: %s",
            user_id,
        )
        raise SynapseError(
            403,
            "Room creation is managed by Alkemio. "
            "Please use the Alkemio platform to create spaces and rooms.",
            Codes.FORBIDDEN,
        )
