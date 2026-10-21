import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { MemoPdfImageResolver } from './memo.pdf.image.resolver';
import { MemoPdfRenderCore } from './memo.pdf.render.core';

type HtmlConverter = (...args: unknown[]) => unknown;

/**
 * Test-only: composes the render core with the image resolver in the test
 * process, so the renderer suites exercise the exact layout and image logic the
 * render worker runs, without forking. Production code never renders in
 * process; this file is excluded from the build.
 *
 * Each render gets its own core and resolver (the resolver carries a per-render
 * image budget), and every core routes its HTML conversion through `spyTarget`,
 * so a spy on `spyTarget.convertHtml` observes every render.
 */
export const inProcessMemoPdfRenderer = ({
  documentService,
  authorizationService,
  fileServiceAdapter,
}: {
  documentService: unknown;
  authorizationService: unknown;
  fileServiceAdapter: unknown;
}) => {
  const resolver = new MemoPdfImageResolver(
    documentService as DocumentService,
    authorizationService as AuthorizationService,
    fileServiceAdapter as FileServiceAdapter
  );
  const spyTarget = new MemoPdfRenderCore(() => {
    throw new Error('The spy target never renders');
  });
  const coreFor = (bucketId: string | undefined, actor: ActorContext) => {
    const core = new MemoPdfRenderCore(resolver.bind(bucketId, actor));
    (core as unknown as { convertHtml: HtmlConverter }).convertHtml = (
      ...args
    ) =>
      (spyTarget as unknown as { convertHtml: HtmlConverter }).convertHtml(
        ...args
      );
    return core;
  };
  return {
    render: (
      state: Buffer,
      bucketId: string | undefined,
      actor: ActorContext
    ) => coreFor(bucketId, actor).render(state),
    renderHtml: (
      html: string,
      bucketId: string | undefined,
      actor: ActorContext
    ): Promise<Buffer> =>
      (
        coreFor(bucketId, actor) as unknown as {
          renderHtml(html: string): Promise<Buffer>;
        }
      ).renderHtml(html),
    spyTarget,
  };
};
