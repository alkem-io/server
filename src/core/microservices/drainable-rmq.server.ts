import { ServerRMQ } from '@nestjs/microservices';

/**
 * A `Transport.RMQ` server that supports graceful draining.
 *
 * Stock `ServerRMQ` only exposes `close()`, which tears down the channel and
 * connection — ripping any in-flight message off the consumer. `stopConsuming()`
 * instead issues an AMQP `basic.cancel` on the underlying channel: the broker
 * stops delivering NEW messages to this consumer, but the channel stays open so
 * a reset that is mid-flight can still ack the message it is processing.
 *
 * Used by the auth-reset worker's SIGTERM handler to "stop taking new jobs"
 * before waiting for the active reset to drain.
 */
export class DrainableRmqServer extends ServerRMQ {
  /**
   * Cancel this pod's consumer so the broker stops delivering new messages.
   * Safe to call before the channel is up (no-op) and idempotent.
   */
  public async stopConsuming(): Promise<void> {
    // `channel` is a ChannelWrapper (amqp-connection-manager). cancelAll()
    // cancels every consumer on the channel AND removes them from the wrapper's
    // setup list, so an underlying reconnect won't silently re-subscribe. This
    // channel has exactly one consumer (the auth-reset queue).
    if (this.channel) {
      await this.channel.cancelAll();
    }
  }
}
