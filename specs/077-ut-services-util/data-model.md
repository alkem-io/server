# Data Model: src/services/util

## Types Used

| Type | Source | Description |
|------|--------|-------------|
| `RmqContext` | `@nestjs/microservices` | NestJS wrapper around RabbitMQ message context |
| `Channel` | `amqplib` | AMQP channel interface for message operations |
| `Message` | `amqplib` | AMQP message interface representing a received message |

## No Persistent Data

This utility does not interact with any database entities or persistent storage. It operates purely on in-memory RabbitMQ message objects.
