# Alkemio Server - System Architecture Design

## 1. Architecture Overview

The Alkemio Server employs a Modular Monolith architecture for its core domain logic, surrounded by a constellation of specialized Microservices.

- **Core Pattern**: The main application (`alkemio-server`) is a monolithic NestJS application organized into strict feature modules (`domain/` and `platform/`). This ensures type safety, code reuse, and simplified transactional integrity for core business operations.
- **Event-Driven Integration**: Communication with external systems (Notifications, File Service, AI Service) and internal decoupling is handled via RabbitMQ.
- **API Gateway Pattern**: The server exposes a unified GraphQL API which acts as the gateway for the Frontend (Web/Mobile), while internal services communicate asynchronously.

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    Client[Web / Mobile Client]
    CDN[CDN]
    LB[Load Balancer / Ingress]

    subgraph "Kubernetes Cluster"
        Auth[Ory Kratos & Hydra]

- GraphQL: for specifying the interactions with the server, using Apollo server
- Node: for runtime execution - **NB: LTS Node version (14.17.3) is currently used for development, and is required for deployment.**
- NestJS as a framework
- TypeScript: for all logic
- TypeORM: for the orbject relational mapping
- PostgreSQL: for data persistence
- docker: for containers
- docker-compose: for container orchestration
- passportjs for authentication
- authentication providers: via one or the support authentication providers (e.g. Ory Kratos)
- Winston and Nest-Winston for logging
- Elastic Cloud + Kibana for centralized log management

        subgraph "Data Layer"
            Redis["Redis (Cache/Queue)"]
            DB[("PostgreSQL/MySQL")]
            ES[Elasticsearch]
        end

        subgraph "Microservices / Workers"
            MsgQueue[RabbitMQ]
            Notifier[Notification Service]
            Matrix[Matrix Adapter]
            FileSvc[File Service]
            AISvc[AI Service]
        end
    end

    Client   --> CDN
    Client   --> LB
    LB       --> Auth
    LB       --> API

    API      --> AuthZ
    API      --> Services
    Services --> DB
    Services --> Redis
    Services --> ES
    Services --> MsgQueue

    MsgQueue --> Notifier
    MsgQueue --> Matrix
    MsgQueue --> FileSvc
    MsgQueue --> AISvc
```

## 3. Component Specifications

### Core Server (NestJS)

- **Modules**: Organized into Domain (Business Logic) and Platform (Infrastructure/Shared).
  - **Domains**: Space, Agent, Task, Innovation Hub, Community.
  - **Platform**: Config, Metadata, Licensing, Authorization.
- **API Layer**: GraphQL (Schema-first) with `class-validator` for input validation.
- **Data Access**: TypeORM for object-relational mapping.

### Authorization System ("The Forest")

- **Model**: A custom hierarchical RBAC/ABAC hybrid.
- **Propagation**: Permissions propagate from "Root" entities (User, Organization, Account) down to "Leaf" resources (e.g., Space -> Timeline -> Post).
- **Components**:
  - `AuthorizationPolicy`: Defines rules.
  - `AuthorizableEntity`: Base class for secure resources.

### Infrastructure Services

- **Authentication**: Ory Kratos (Identity Management) & Ory Hydra (OIDC Provider).
- **Messaging**: RabbitMQ for domain events (e.g., `SpaceCreated`, `UserInvited`).
- **Search**: Elasticsearch for full-text search across Domains.
- **Caching**: Redis for session storage.

## 4. Data Flow

### Read Request (GraphQL Query)

1. **Request**: Client sends GraphQL query (e.g., `getSpace`).
2. **Guard**: `GqlAuthGuard` verifies JWT token with Ory.
3. **Resolver**: `SpaceResolver` receives request.
4. **Service**: `SpaceService` orchestrates logic.
5. **Authorization**: Service calls `grantAccessOrFail` to traverse the "Authorization Forest" and verify permissions.
6. **Cache Check**: Service checks Redis for hot data.
7. **Database**: If missing, TypeORM queries PostgreSQL.
8. **Response**: Data returned to client.

### Write Request (GraphQL Mutation)

1. **Validation**: DTO validation (Pipes).
2. **Transaction**: Service starts DB transaction.
3. **Execution**: Entity updated in DB.
4. **Side Effects**:
   - Notification Service emails followers.
5. **Response**: Updated entity returned.

## 5. Scalability Strategies

- **Stateless Core**: The NestJS server is stateless (sessions stored in Redis), allowing for Horizontal Scaling via Kubernetes HPA (Horizontal Pod Autoscaler) or manually.
- **Database**:
  - DB Read Replicas for offloading high-volume query traffic.
  - Connection Pooling via TypeORM to manage DB load.
- **Async Processing**: Heavy tasks (file processing, notifications) are offloaded to RabbitMQ workers, preventing the main thread from blocking.
- **Caching**: Redis is used extensively for:
  - Authorization policy results (result of complex calculations).
  - API response caching.

## 6. Fault Tolerance & Reliability

- **Retry Policies**: implemented for external service calls (Ory, RabbitMQ).
- **Dead Letter Queues (DLQ)**: RabbitMQ configured with DLQs to capture failed events for manual replay.
- **Health Checks**: Kubernetes Liveness/Readiness probes configured for all pods.
- **Graceful Shutdown**: App handles SIGTERM to finish in-flight requests before stopping.
- **Data Durability**: PostgreSQL WAL (Write-Ahead Logging) and regular snapshots.

## 7. Security Architecture

- **Authentication (AuthN)**: Delegated to Ory Kratos. The server never stores passwords.
- **Authorization (AuthZ)**: Granular, code-defined "Authorization Forest" ensures users only access resources they have permissions for.
- **Input Sanitation**: Global Validation Pipes strip illegal characters; TypeORM prevents SQL injection.
- **Secrets Management**: All secrets loaded via Environment Variables (Kubernetes Secrets).
- **Audit Logging**: Critical mutations are logged for compliance.

## 8. Deployment Strategy

- **CI/CD**: GitHub Actions workflows (`.github/workflows/`).
  - **Build**: Docker images built and pushed to Docker Hub.
  - **Test**: Unit, Integration, and E2E tests run on PRs.
  - **Deploy**: Helm charts deploy to Hetzner or Scaleway Cloud (Kubernetes).
- **Environments**: Dev, Test, Sandbox, Acceptance, Production.
- **Migrations**: Database migrations run automatically on container startup via `pnpm run migration:run`.

## 9. Technology Stack

| Layer     | Technology               |
| :-------- | :----------------------- |
| Language  | TypeScript (Node.js)     |
| Framework | NestJS                   |
| API       | GraphQL (Apollo)         |
| Database  | PostgreSQL / MySQL       |
| ORM       | TypeORM                  |
| Caching   | Redis                    |
| Messaging | RabbitMQ                 |
| Auth      | Ory Kratos & Hydra       |
| Search    | Elasticsearch            |
| Infra     | Docker, Kubernetes, Helm |

## 10. Capacity Planning (Hypothetical)

Based on typical usage patterns for this architecture:

- **Traffic**: Support for ~500 RPS per instance (scalable linearly).
- **Storage**: Relational data grows linearly with users/content; separate Object Storage (S3-compatible) for media is essential to keep DB light.
- **Memory**: ~512MB - 1GB RAM per Pod; Redis memory depends on active session count and cache TTL policies.
