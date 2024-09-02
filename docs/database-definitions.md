# Specifying database entity defnitions for usage with the server

Please adhere to the following guidelines when creating TypeORM entity defnitions:

**Defaults**:

- no defaults in entity definitions; set defaults through business logic
- no defaults to the class fields

**Relations**:

- relations that are not eager need to be defined as optional, since they need to be loaded explicitly

**Lengths**:

- always define length with constants
- stick to the existing length constants OR in the rear case - create one if nothing fits

| data                | what to use            |
| ------------------- | ---------------------- |
| Alkemio identifiers | `char(UUID_LENGTH)`    |
| enums               | `varchar(ENUM_LENGTH)` |
| short text          | `varchar(your length)` |
| long text           | `text`                 |
| URI, URL            | `varchar(URI_LENGHT)`  |

## Usage

- generate a domain change migration via `migration:generate`
