# MCP whiteboard creation, import and editing

Use the existing streamable HTTP endpoint `/rest/mcp` with the normal MCP
authentication and tool grants. Editing also requires `UPDATE_CONTENT` on the
target whiteboard and write admission to its collaboration room. A disabled
whiteboard executor returns `unavailable`; that is different from `forbidden`.

## Create a populated board

1. Call `create_whiteboard` or `create_whiteboard_in_space` to create the board.
   `fromTemplateId` remains available where advertised by the tool schema.
2. Call `import_whiteboard_scene` with the returned `whiteboardId` and a complete
   Excalidraw version-2 export as the `scene` object, not a JSON-encoded string.

The retired `content` argument on creation is rejected explicitly. Discover
current argument schemas through MCP `tools/list` rather than silently dropping
unsupported fields.

Import **appends** live elements with fresh identities. It preserves existing
and concurrent content and the target's settings; it is not a replace operation.
Export `appState` is metadata, never a target-settings update. Unsupported or
malformed elements, references or geometry fail rather than being repaired or
partially imported. The scene must contain at least one live element.

For each referenced image, supply either its normal export `files[id]` entry
with matching `id`, declared image MIME and embedded `dataURL`, or
`sourceFiles[id] = { "fileID": "<logical-document-uuid>" }`. Do not supply both.
Logical source documents must be actor-readable, including in the target
bucket. Authorized sources are materialized into the target bucket; arbitrary
remote URLs are never fetched. Unreferenced source-map keys are rejected.

The existing decoded MCP request limit is **262144 bytes for the whole request**,
including envelope, escaping and embedded media. It is not an element-count
limit. A request larger than this cannot start imports or uploads.

Success returns `outcome: "durable-success"`, the whiteboard ID, added element
IDs and an import summary. Success follows persistence, not merely a socket
send. `busy` means no capacity was reserved for this request. Do not automatically
replay an `indeterminate-after-go` result: publication may already have occurred.
Inspect the board before deciding what to do next.

## Text and inspection

`edit_whiteboard_elements` uses the canonical editor text implementation.
`addText` without dimensions uses natural sizing. Optional `width` requests
fixed-width wrapping at the chosen font size, subject to the editor's minimum
width; height is derived from wrapped text. Supplying `height` to `addText`,
alone or with width, is invalid. Shape dimensions remain supported. `setText`
retains the element's natural-size or fixed-width behavior.

`analyze_whiteboard` in elements mode includes text `fontSize` and the actual
`containerId` (or `null` for standalone text), so callers can associate labels
with shapes. Non-text elements do not receive invented text properties.
