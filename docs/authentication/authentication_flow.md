![Authentication flow diagram](./authentication_flow.svg)

The three private endpoints go through Oathkeeper, which transforms the session cookie or API token to a bearer token.
The request then enters the collaboration service, where it is intercepted. An authentication interceptor is in place which has Passport.js running some predefined strategies. The sole purpose of the strategies is to validate the incoming identity in the form of a token.
The strategy does three main things:

- validates if the incoming token is valid
- checks if the token is associated with a user in `Kratos`
- resolves the User in the form of `AgentInfo`:
  - if it exists the `AgentInfo` is populated with information about the User in Alkemio
  - if it does NOT exist the `AgentInfo` is anonymous with minimal data

As soon as the strategy is executed, a callback is triggered in `Passport` with the resolved `AgentInfo`, errors and some extra information about the flow.
If there was an error, the request is blocked with an error to the requester.
If the validation is successful, the `AgentInfo` is attached to the `execution context`.

Since the `execution context` is available to decorators in runtime, we can use the `CurrentUser` decorator to extract the `AgentInfo` from the request in any resolver.

## Alkemio OIDC provider

Alkemio exposes its OAuth2/OIDC surface through Ory Hydra. The discovery document is available at `/.well-known/openid-configuration` on the server (for example `http://localhost:3000/.well-known/openid-configuration` when running locally). Hydra delegates user identity to Ory Kratos, so account creation, login and recovery continue to flow through the existing Kratos journeys.

The docker-compose quickstart registers two internal clients:

- `alkemio-public` for the platform UI and other public consumers
- `synapse` for the Matrix homeserver bridge

The `synapse` client credentials are sourced from `.env.docker` (`SYNAPSE_OIDC_CLIENT_ID` and `SYNAPSE_OIDC_CLIENT_SECRET`). Other clients can be declared in `build/ory/hydra/clients/hydra-clients.yaml` and will be provisioned automatically by the bootstrap container.

## Synapse OIDC authentication

Matrix Synapse authenticates against the Alkemio Hydra provider by using the `synapse` client described above. The complete homeserver configuration is templated into `build/synapse/homeserver.yaml` during `pnpm run start:services`, and then mounted into the running container volume. Any change to the OIDC section in that file requires a regeneration of the volume (stop the container, remove the `synapse-data` volume, restart the stack).

To confirm Synapse is exchanging tokens with Hydra, inspect the Synapse logs after login:

```bash
docker logs alkemio_dev_synapse | grep oidc-hydra
```

Successful entries show the `/login/sso/redirect` callbacks negotiated with Hydra and are a quick way to validate the end-to-end setup.
