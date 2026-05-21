# Copyright 2025 Alkemio Foundation
# SPDX-License-Identifier: EUPL-1.2

"""
Alkemio Room Control Module for Synapse

This module controls room creation for ghost users provisioned by the AppService.

- Spaces and rooms-inside-spaces: BLOCKED for ghost users (managed by Alkemio platform)
- Standalone rooms (DMs, groups): Synchronous check via adapter endpoint.
  Module calls adapter, adapter asks server for consent/dedup, on approval module
  injects room state (power levels, visibility, io.alkemio.pending marker) and
  strips invites. Adapter reconciles the room post-creation.
- AppService bot and server admins: Always allowed (bypass all checks)

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
import uuid
from typing import Optional

from synapse.module_api import ModuleApi
from synapse.module_api.errors import Codes, SynapseError
from synapse.http.client import SimpleHttpClient
from synapse.types import Requester

logger = logging.getLogger(__name__)

# Custom state event type for room visibility control
ALKEMIO_VISIBILITY_EVENT = "io.alkemio.visibility"


class AlkemioRoomControl:
    """
    Room control module: synchronous check for standalone rooms,
    block spaces/rooms-inside-spaces, allow bot/admins.

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

        # Use detected values (fallback to default UUID if not found)
        self.appservice_sender = detected.get("sender", "00000000-0000-0000-0000-000000000000")
        self.adapter_url = detected.get("url", "http://localhost:8280")
        self.hs_token = detected.get("hs_token")

        # Register third-party rules callback for room creation control
        # This allows us to raise SynapseError with custom messages
        self.api.register_third_party_rules_callbacks(
            on_create_room=self.on_create_room,
        )

        # Monkey-patch SyncHandler to filter rooms based on io.alkemio.visibility
        self._patch_sync_handler()

        logger.info(
            "AlkemioRoomControl initialized - AppService: @%s:%s, Adapter: %s, Token: %s, SyncFilter: enabled",
            self.appservice_sender,
            self.homeserver_domain,
            self.adapter_url,
            "configured" if self.hs_token else "NOT FOUND",
        )

    def _patch_sync_handler(self) -> None:
        """
        Monkey-patch SyncHandler.get_sync_result_builder to filter rooms
        based on the io.alkemio.visibility state event.

        Rooms with {"visible": false} are excluded from /sync responses
        for all users except the AppService bot.

        Tested with Synapse v1.132.0.
        """
        try:
            sync_handler = self.api._hs.get_sync_handler()
            original_get_sync_result_builder = sync_handler.get_sync_result_builder
            state_storage = self.api._hs.get_storage_controllers().state
            bot_mxid = f"@{self.appservice_sender}:{self.homeserver_domain}"

            async def patched_get_sync_result_builder(sync_config, since_token=None, full_state=False):
                result_builder = await original_get_sync_result_builder(
                    sync_config, since_token, full_state
                )

                user_id = sync_config.user.to_string()

                # Don't filter for the bot — it needs to see everything
                if user_id == bot_mxid:
                    logger.debug("Sync filter: skipping bot user %s", user_id)
                    return result_builder

                logger.debug(
                    "Sync filter: checking %d rooms for user %s",
                    len(result_builder.joined_room_ids), user_id,
                )

                # Find rooms to hide based on io.alkemio.visibility state
                hidden_room_ids = set()
                for room_id in result_builder.joined_room_ids:
                    try:
                        visibility_event = await state_storage.get_current_state_event(
                            room_id, ALKEMIO_VISIBILITY_EVENT, ""
                        )
                        if visibility_event:
                            visible = visibility_event.content.get("visible")
                            logger.debug(
                                "Sync filter: room %s visibility=%s",
                                room_id, visible,
                            )
                            if visible is False:
                                hidden_room_ids.add(room_id)
                    except Exception as e:
                        logger.warning("Sync filter: error checking room %s, hiding it: %s", room_id, e)
                        hidden_room_ids.add(room_id)

                if hidden_room_ids:
                    # Rebuild with hidden rooms excluded
                    result_builder.joined_room_ids = frozenset(
                        rid for rid in result_builder.joined_room_ids
                        if rid not in hidden_room_ids
                    )
                    result_builder.excluded_room_ids = frozenset(
                        set(result_builder.excluded_room_ids) | hidden_room_ids
                    )
                    logger.debug(
                        "Filtered %d hidden rooms from /sync for %s",
                        len(hidden_room_ids), user_id,
                    )


                return result_builder

            sync_handler.get_sync_result_builder = patched_get_sync_result_builder
            logger.info("SyncHandler patched for io.alkemio.visibility filtering")

        except Exception as e:
            logger.error("Failed to patch SyncHandler: %s", str(e))
            raise RuntimeError(f"AlkemioRoomControl: SyncHandler patch failed: {e}") from e

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

    async def _check_room(
        self,
        creator: str,
        members: list,
        is_direct: bool,
    ) -> dict:
        """
        Synchronous check with the adapter: consent, dedup, entity creation.

        Returns:
            Response dict with {allow, alkemio_room_id, reason}

        Raises:
            SynapseError on timeout, connection failure, or server error.
        """
        check_url = f"{self.adapter_url}/_matrix/app/alkemio/check-room"
        payload = {
            "creator": creator,
            "members": members,
            "is_direct": is_direct,
        }
        headers = {}
        if self.hs_token:
            headers[b"Authorization"] = [f"Bearer {self.hs_token}".encode()]

        try:
            resp = await self.http_client.post_json_get_json(
                check_url,
                payload,
                headers=headers,
            )
            return resp
        except Exception as e:
            logger.error("Room check failed: %s", str(e))
            raise SynapseError(
                503,
                "Service temporarily unavailable",
                Codes.UNKNOWN,
            ) from e

    async def on_create_room(
        self,
        requester: Requester,
        request_content: dict,
        is_requester_admin: bool,
    ) -> None:
        """
        Third-party rules callback for room creation.

        Room creation policy:
        - Server admins and AppService bot: Always allowed (bypass all checks)
        - Space creation (m.space room type): BLOCKED for ghost users
        - Room-inside-space (m.space.parent in initial_state): BLOCKED for ghost users
        - Standalone rooms (DM or group): Synchronous check via adapter endpoint

        On approval the module injects power levels, visibility state, and the
        io.alkemio.pending reconciliation marker into the creation request, then
        strips invites so the adapter can join members directly during reconciliation.
        """
        user_id = requester.user.to_string()

        # Allow server admins and AppService bot
        if is_requester_admin or self._is_appservice_bot(user_id):
            return

        # Block space creation for ghost users
        room_type = request_content.get("creation_content", {}).get("type", "")
        if room_type == "m.space":
            logger.info("Space creation blocked: %s", user_id)
            raise SynapseError(
                403,
                "Space creation is managed by Alkemio.",
                Codes.FORBIDDEN,
            )

        # Block room-inside-space creation for ghost users
        initial_state = request_content.get("initial_state", [])
        for state_evt in initial_state:
            if state_evt.get("type") == "m.space.parent":
                logger.info("Room-inside-space creation blocked: %s", user_id)
                raise SynapseError(
                    403,
                    "Room creation inside spaces is managed by Alkemio.",
                    Codes.FORBIDDEN,
                )

        # Standalone room (DM or group) — synchronous check flow
        invite_list = request_content.get("invite", [])
        is_direct = request_content.get("is_direct", False)

        if not invite_list:
            logger.info("Room creation blocked (no invitees): %s", user_id)
            raise SynapseError(
                403,
                "Room creation requires at least one invitee.",
                Codes.FORBIDDEN,
            )

        logger.info(
            "Room check: %s creating %s with %d members",
            user_id,
            "DM" if is_direct else "group",
            len(invite_list),
        )

        # Call adapter check endpoint
        resp = await self._check_room(user_id, invite_list, is_direct)

        if not resp.get("allow", False):
            reason = resp.get("reason", "Room creation not permitted")
            logger.info("Room check rejected: %s — %s", user_id, reason)
            raise SynapseError(403, reason, Codes.FORBIDDEN)

        alkemio_room_id = resp.get("alkemio_room_id", "")
        try:
            alkemio_room_id = str(uuid.UUID(alkemio_room_id))
        except (TypeError, ValueError, AttributeError) as e:
            logger.error("Room check approved without valid alkemio_room_id: %s", resp)
            raise SynapseError(
                503,
                "Service temporarily unavailable",
                Codes.UNKNOWN,
            ) from e
        logger.info(
            "Room check approved: %s, alkemio_room_id=%s",
            user_id,
            alkemio_room_id,
        )

        # Strip invites — adapter joins members during reconciliation
        request_content["invite"] = []

        # Inject power level override
        request_content["power_level_content_override"] = {
            "users_default": 50,
        }

        # Inject initial state events
        if "initial_state" not in request_content:
            request_content["initial_state"] = []

        request_content["initial_state"].append({
            "type": ALKEMIO_VISIBILITY_EVENT,
            "state_key": "",
            "content": {"visible": True},
        })
        request_content["initial_state"].append({
            "type": "io.alkemio.pending",
            "state_key": "",
            "content": {"alkemio_room_id": alkemio_room_id},
        })
