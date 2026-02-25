/**
 * Recursively resolves all fragments referenced by a GraphQL operation.
 * Handles transitive fragment dependencies and defends against cycles.
 *
 * @param {import('graphql').DocumentNode} operationDoc - Parsed operation document
 * @param {Map<string, import('graphql').FragmentDefinitionNode>} fragmentMap - All known fragments
 * @returns {Set<import('graphql').FragmentDefinitionNode>} Resolved fragment nodes
 */
export function resolveFragments(operationDoc, fragmentMap) {
  const resolved = new Set();
  const visiting = new Set(); // cycle guard

  function collectSpreads(node) {
    const spreads = [];
    if (!node || typeof node !== 'object') return spreads;

    if (node.kind === 'FragmentSpread') {
      spreads.push(node.name.value);
    }

    if (node.selectionSet?.selections) {
      for (const sel of node.selectionSet.selections) {
        spreads.push(...collectSpreads(sel));
      }
    }

    // Handle inline fragments
    if (node.kind === 'InlineFragment' && node.selectionSet) {
      for (const sel of node.selectionSet.selections) {
        spreads.push(...collectSpreads(sel));
      }
    }

    return spreads;
  }

  function resolve(fragmentName) {
    if (visiting.has(fragmentName)) return; // cycle
    const frag = fragmentMap.get(fragmentName);
    if (!frag) return; // unknown fragment — validator will catch this
    if (resolved.has(frag)) return; // already processed

    visiting.add(fragmentName);
    resolved.add(frag);

    // Find nested fragment spreads within this fragment
    const nestedSpreads = collectSpreads(frag);
    for (const name of nestedSpreads) {
      resolve(name);
    }

    visiting.delete(fragmentName);
  }

  // Start from all definitions in the operation document
  for (const def of operationDoc.definitions) {
    const spreads = collectSpreads(def);
    for (const name of spreads) {
      resolve(name);
    }
  }

  return resolved;
}
