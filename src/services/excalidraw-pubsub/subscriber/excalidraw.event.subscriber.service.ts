import { Inject, Injectable } from '@nestjs/common';
import { PubSubEngine } from 'graphql-subscriptions';
import { EXCALIDRAW_PUBSUB_PROVIDER } from '@common/constants';

@Injectable()
export class ExcalidrawEventSubscriberService {
  constructor(
    @Inject(EXCALIDRAW_PUBSUB_PROVIDER) private excalidrawPubSub: PubSubEngine
  ) {}
}
