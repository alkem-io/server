import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

/**
 * Minimal EventBus provider for the auth-reset worker.
 *
 * The reset graph (via AiServerModule's AiPersonaEngineAdapter) injects the CQRS
 * `EventBus`, but the worker must NOT run the full AI EventBusModule — that one
 * opens RabbitMQ publisher/subscriber connections and asserts the AI event-bus
 * exchange/queues on boot, which is exactly the extra server activity we don't
 * want. CqrsModule provides an in-process EventBus that satisfies DI; the reset
 * path never publishes engine events, so no broker connection is needed.
 *
 * ⚠️ ISOLATION INVARIANT — this swap is load-bearing. EventBusModule is the
 * golevelup `'default'` connection (its forRootAsync sets no `name`). Every
 * `@RabbitSubscribe` handler that rides into the reset graph transitively
 * (CommunicationAdapterEventService → Matrix msg/reaction/edit queues,
 * PushDeliveryService → alkemio-push-notifications, MatrixRoomCheckController)
 * targets that `'default'` connection. Because EventBusModule is absent here,
 * the `'default'` connection — and its handler-discovery service — never exists,
 * so NONE of those handlers bind and the worker consumes only the auth_reset
 * queue. Do NOT import EventBusModule (or any other unnamed golevelup
 * RabbitMQModule.forRoot) into the worker graph, or the worker becomes a
 * competing consumer that steals Matrix/push messages from the API server.
 */
@Global()
@Module({
  imports: [CqrsModule],
  exports: [CqrsModule],
})
export class WorkerEventBusModule {}
