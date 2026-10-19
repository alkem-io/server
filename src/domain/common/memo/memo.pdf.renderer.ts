import { ActorContext } from '@core/actor-context/actor.context';
import { Injectable } from '@nestjs/common';
import { MemoPdfImageResolver } from './memo.pdf.image.resolver';
import { MemoPdfRenderCore } from './memo.pdf.render.core';

@Injectable()
export class MemoPdfRenderer {
  constructor(private readonly imageResolver: MemoPdfImageResolver) {}

  async render(state: Buffer, bucketId: string, actor: ActorContext) {
    return new MemoPdfRenderCore(
      this.imageResolver.bind(bucketId, actor)
    ).render(state);
  }
}
