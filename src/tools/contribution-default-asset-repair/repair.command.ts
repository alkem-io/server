export type RepairCommand =
  | { mode: 'discover'; manifestPath: string }
  | { mode: 'apply'; manifestPath: string; sha256: string };

const usage =
  'usage: main.contribution-default-asset-repair (--discover --manifest <path> | --apply <path> --sha256 <digest>)';

export const parseRepairCommand = (argv: string[]): RepairCommand => {
  const discover = argv.includes('--discover');
  const apply = argv.includes('--apply');
  if (discover === apply) throw new Error(usage);
  if (discover) {
    const manifestIndex = argv.indexOf('--manifest');
    const manifestPath = argv[manifestIndex + 1];
    if (manifestIndex < 0 || !manifestPath || argv.length !== 3) {
      throw new Error(usage);
    }
    return { mode: 'discover', manifestPath };
  }
  const applyIndex = argv.indexOf('--apply');
  const digestIndex = argv.indexOf('--sha256');
  const manifestPath = argv[applyIndex + 1];
  const sha256 = argv[digestIndex + 1];
  if (
    applyIndex < 0 ||
    digestIndex < 0 ||
    !manifestPath ||
    !sha256 ||
    argv.length !== 4
  ) {
    throw new Error(usage);
  }
  return { mode: 'apply', manifestPath, sha256 };
};
