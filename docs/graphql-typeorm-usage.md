# TypeORM + GraphQL usage

For the domain model there are two external interfaces:

- GraphQL which is what clients of the server interact with
- TypeORM which is used for storing the data in a MySql backend

In choosing how where to define the two interfaces, the following are taken into account:

- TypeORM:
  - The ActiveRecord pattern is used, which implies _deriving_ from the TypeORM BaseEntity class (or a class that derives from it).
  - Shared field definitions are inherited from an abstract base class, which means that there is still a single table for each entity but with shared column definitions from the abstract class
- Graphql:
  - An abstract class is used to define the fields that are exposed per Object type. These abstract classes can be inherited.
  - These abstract classes have ".interface" in their name, but importantly are abstract classes as opposed to actual interface definitions.
