# Quickstart: Upgrade Matrix Adapter to 0.7.0 & Use ActorID

**Feature**: `019-matrix-adapter-upgrade`

## Overview
This feature upgrades the `matrix-adapter-library` to version 0.7.0 and refactors the system to use `AgentID` (ActorID) for all communication interactions, removing the obsolete `communicationID`.

## Prerequisites
- Node.js 20+
- Docker (for running services)

## Running the Feature
1.  **Install Dependencies**:
    ```bash
    pnpm install
    ```
2.  **Run Migrations**:
    ```bash
    pnpm run migration:run
    ```
3.  **Start Server**:
    ```bash
    pnpm start:dev
    ```

## Verification
1.  **Check Logs**: Ensure no errors related to `communicationID` or `matrix-adapter` on startup.
2.  **Test Communication**:
    -   Send a message to a user.
    -   Verify delivery.
    -   Check logs to confirm `AgentID` is used in `CommunicationAdapter`.

## Troubleshooting
-   **Migration Fails**: Ensure database is reachable and you have permissions to drop columns.
-   **Communication Fails**: Check `matrix-adapter` logs. Ensure `AgentID` is correctly populated for the user/VC/Org.
