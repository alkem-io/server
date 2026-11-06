# Generic-engine prompt graphs

AI Personas can store a declarative prompt graph and send it to the engine at
invocation. The graph is configuration: no deployment or feature flag is
needed once it is stored on the persona.

The ready-to-store workshop example is
[`prompt-graphs/workshop-design.authoring.json`](./prompt-graphs/workshop-design.authoring.json).
It is the server-authoring conversion of the Virtual Contributor's
[`workshop-design.json`](https://github.com/alkem-io/virtual-contributor/blob/develop/docs/prompt-graphs/workshop-design.json).
For engine semantics and validation errors, see the Virtual Contributor
[prompt-graphs README](https://github.com/alkem-io/virtual-contributor/blob/develop/docs/prompt-graphs/README.md).

## Engines that receive a stored graph

| Engine | Stored graph attached at invocation? | Reason |
| --- | --- | --- |
| `expert` | Yes | The expert plugin executes prompt graphs. If no graph is stored, it receives its existing expert default graph. |
| `generic-openai` | Yes | The generic plugin executes declarative prompt graphs. It receives no fallback graph when none is stored. |
| `guidance` | No | Its plugin has no prompt-graph execution path. |
| `openai-assistant` | No | Its plugin has no prompt-graph execution path. |
| `libra-flow` | No | Its consumer does not execute prompt graphs. |
| `community-manager` | No | It has no active prompt-graph queue consumer. |

Only `expert` and `generic-openai` are an invocation allowlist. Storage is
engine-independent, so a graph may be staged before an engine switch, but it
will not be sent for the excluded engines.

## Activate the workshop graph

1. Ensure the target persona uses `generic-openai` and its Virtual Contributor
   has a body of knowledge. The supplied graph contains `retrieve` nodes.
2. Copy the complete JSON payload from
   [`prompt-graphs/workshop-design.authoring.json`](./prompt-graphs/workshop-design.authoring.json)
   into `promptGraph` in the following admin mutation variables.
3. Run the mutation with an actor that has `UPDATE` on the AI Persona.

```graphql
mutation UpdatePersonaPromptGraph($aiPersonaData: UpdateAiPersonaInput!) {
  aiServerUpdateAiPersona(aiPersonaData: $aiPersonaData) {
    id
    engine
    promptGraph {
      nodes {
        name
        type
      }
      edges {
        from
        to
        on
        map
        default
      }
    }
  }
}
```

```json
{
  "aiPersonaData": {
    "ID": "<ai-persona-id>",
    "engine": "GENERIC_OPENAI",
    "promptGraph": "<the complete JSON object from workshop-design.authoring.json>"
  }
}
```

The `promptGraph` value above is an object, not a JSON-encoded string. It is
shown as a placeholder to keep this guide readable; use the fixture unchanged.

Updates merge only the supplied top-level `promptGraph` keys, so omitted keys
such as `start` and `end` are retained from a previously stored graph. For a
clean replacement, first update the persona with `promptGraph: null`, then
send the complete replacement graph in a subsequent update.

### Retrieval precondition

`retrieve` nodes require the Virtual Contributor invocation to carry a body
of knowledge. Operators must verify that pairing at activation time; a
misconfigured retrieve-bearing graph fails every invocation until it is
corrected. The server deliberately does not validate the pairing when the
persona is updated: `bodyOfKnowledgeID` is supplied per invocation, not stored
on the persona. If it is absent, the engine fails at parse time and the member
receives the standard error response at invocation. This is expected behavior,
not a server-side validation failure.

### External-provider egress check

Before activating a retrieve-bearing graph, verify that the body of knowledge's
data classification and the external model provider's processing basis permit
the egress. Retrieval can send up to 95,000 characters of body-of-knowledge
content to the external model provider in later prompts.

## Authoring another engine payload

The GraphQL input is deliberately a storage shape that matches the engine
payload. Convert a Virtual Contributor payload as follows:

1. Add `"system": false` to every node. `system` is required by the server
   authoring API even though the generic engine does not read it.
2. Keep typed-node fields verbatim: `type`, `source`, `collection_template`,
   `query_template`, `n_results`, `max_context_chars`, and `output_key`.
3. Keep conditional edge fields verbatim: `on`, `map`, and `default`.
   `map` is a JSON object of routing-value to node-name; its keys are matched
   case-insensitively by the engine.
4. Convert JSON-Schema dictionary `state.properties` and node
   `output.properties` to GraphQL's list form. For example,
   `{"role":{"type":["string","null"]}}` becomes
   `[{"name":"role","type":"string","optional":true}]`.
5. Convert dictionary-form `required: ["name"]` to `optional: false` on the
   named list entries, then drop `required`. Convert nested arrays of objects
   recursively using the data point's `items` struct.
6. Omit optional fields instead of passing `null`. Explicit nulls on retrieve
   or conditional fields are stored but fail the engine parser with a named
   error. The engine, not the server, is the validation authority for graph
   semantics.

The read surface returns stored graphs for any engine. A generic persona with
no stored graph reads back `null`. Separately, the existing field resolver
returns the expert default graph for `expert` and `libra-flow` personas without
a stored graph; that pre-existing read-surface asymmetry is out of scope and
does not change the invocation allowlist above.
