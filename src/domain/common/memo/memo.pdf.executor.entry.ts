import '../../../config/aliases';
import { MemoPdfExecutorChild } from './memo.pdf.executor.child';

// Entry point of one memo PDF render worker, forked by MemoPdfExecutor from the
// compiled output. The aliases import must stay first so `@common/...` paths
// resolve outside the Nest build tooling.
const child = new MemoPdfExecutorChild(
  (message, sent) => {
    if (!process.connected) return process.exit(1);
    process.send!(message, undefined, undefined, (error: Error | null) => {
      if (error) process.exit(1);
      else sent?.();
    });
  },
  code => process.exit(code)
);
process.on('message', message => child.receive(message));
process.on('disconnect', () => child.disconnect());
