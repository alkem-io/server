# Contracts: Bootstrap the virtual-assistant MCP API key

This feature adds **no new wire interface** (no GraphQL, REST, or RMQ surface). Its "contract" is the
**three-party agreement** around the shared `ASSISTANT_MCP_API_KEY` secret and the invariant of the
row the server ensures from it.

| Contract | Parties | File |
|---|---|---|
| Shared MCP-key secret ↔ ensured key row | ops/CI · server (bootstrap) · assistant-service | [secret-and-key-contract.md](./secret-and-key-contract.md) |

> The contract matters because three independent parties must agree on **one** value: ops sets it,
> the server registers its hash, and the assistant-service sends it as the delegation bearer. If any
> disagree, delegated MCP fails (`capability_unavailable`). It is documented here so a future
> environment, rotation, or re-cut keeps them aligned.
