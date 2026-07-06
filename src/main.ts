import './config/aliases';
// biome-ignore lint/correctness/noUnusedImports: apmAgent import has side effects that initialize APM
import { apmAgent } from './apm';

/**
 * Process entry point / role dispatcher.
 *
 * The deployment role is chosen from a raw environment variable (read directly
 * from process.env — NOT via ConfigService, which would require booting a Nest
 * module first). Each branch dynamically imports ONLY its own bootstrap, so the
 * two roles build completely isolated DI trees: the auth-reset worker never
 * loads AppModule (GraphQL/REST/OIDC/all other consumers), and the server never
 * loads AuthResetWorkerModule.
 *
 *   AUTH_RESET_WORKER=true  -> dedicated auth-reset queue consumer
 *   (unset / anything else) -> full Alkemio API server
 */
const bootstrap = async () => {
  if (process.env.AUTH_RESET_WORKER === 'true') {
    const { bootstrapAuthResetWorker } = await import('./main.worker');
    await bootstrapAuthResetWorker();
    return;
  }

  const { bootstrapServer } = await import('./main.server');
  await bootstrapServer();
};

bootstrap();
