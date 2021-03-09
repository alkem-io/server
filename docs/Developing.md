# Developing with the server

The easiest way to get going with custom development of the Cherrytwist Server is to leverage the Docker Compose script as detailed in the [Running the server](Running.md) document, and then disable the Server container! Please consult your docker runtime adminstration panel for disabling the Cherrytwist Server container.

This then leaves the database container and simple auth provider available and properly configured (nice!).

Assuming you have a suitable database server and authentication provider available then please follow the following steps:

## Steps

- Install dependencies

```bash
npm install
```

- Start the server

```bash
npm start
```

There should now be a [running Cherrytwist server](http://localhost:4000/graphql)!

## MySQL Database

It is of course also possible to use a separate MySQL database server.

If installing MySQL locally, please refer to [the data management document](DataManagement.md#MySQL-Server-specific-configuration-for-version-8) if using **MySQL 8**.

## Authentication Provider

Similarly the server is designed to allow it to work with multiple Authentication Providers.

The default Authentication Provider for development / demonstration purposes is Simple Auth Provider - which is what is created by the Docker Composition.

Please refer to the [configuration](docs/Configuation.md) for updating the Server to use an alternative instance of Simple Auth Provider or a an alternative Authentication Provider
