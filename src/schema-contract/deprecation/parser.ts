// Local deprecation utilities isolated from legacy diff implementation to avoid tight coupling.
// parseDeprecationReason is re-exported from the existing implementation for now (single source of parsing format rules).
export { parseDeprecationReason } from '../../tools/schema/deprecation-parser';

// Lightweight directive extractor (mirrors legacy logic).
export function getDeprecationDirective(node: {
  directives?: readonly any[];
}): { reason?: string } | null {
  if (!node.directives) return null;
  const dep = node.directives.find(d => d.name?.value === 'deprecated');
  if (!dep) return null;
  const arg = dep.arguments?.find((a: any) => a.name?.value === 'reason');
  if (!arg || !arg.value) return { reason: undefined };
  if (arg.value.kind === 'StringValue') {
    return { reason: (arg.value as any).value };
  }
  return { reason: undefined };
}
