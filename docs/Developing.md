# Developing with the server

The easiest way to get going with custom development of the Alkemio Server is to leverage the Docker Compose script as detailed in the [Running the server](Running.md) document.

In this setup you are then using the docker composed stack for:

- Database container
- Ory Kratos stack for development:
  - ory/kratos
  - ory/oathkeeper
  - ory/mailslurper (not used on production)

Note that the CT Server from the docker composed stack is listening on port 4001 instead of port 4000, so it will not collide with running a second server locally - but do keep in mind those two server instances are sharing the same data / authentication provider.

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

There should now be a [running Alkemio server](http://localhost:4000/graphql)!

## MySQL Database

It is of course also possible to use a separate MySQL database server.

If installing MySQL locally, please refer to [the data management document](DataManagement.md#MySQL-Server-specific-configuration-for-version-8) if using **MySQL 8**.

## Authentication

The authentication is handled by `Ory Kratos` and `Ory Oathkeepr`.

Best way to run the ory stack is to the use provided docker scripts. See [Running the server](Running.md) document.

The configuration for the Ory can be found in `./build/ory`.
The verification and recovery flows templates can be edited in `./build/ory/kratos/courier-templates`. More information how to customize them [here](https://www.ory.sh/kratos/docs/concepts/email-sms/#sender-address-and-template-customization). They are using [golang templates](https://golang.org/pkg/text/template/) format.

The registration and the recovery flows include sending emails to the registered users. For development purposes the fake smtp server `Mailslurper` is used. Can be accessed on http://localhost:4436/ (if the docker compose method has been used to setup the development environment).

## File uploads

In order to upload files, a file stream is created through GraphQL Upload to the server /uploads folder. From there the file is pinned in IPFS and CID is returned.

Install jq (on linux) if you don't have it:

```bash
sudo apt-get install jq
```

Login with demo auth provider and extract the access token:

```bash
actionUrl=$(\
    curl -s -X GET -H "Accept: application/json" \
    "http://localhost:3000/ory/kratos/public/self-service/login/api" \
    | jq -r '.ui.action'\
    )
sessionToken=$(\
curl -s -X POST -H  "Accept: application/json" -H "Content-Type: application/json" \
    -d '{"password_identifier": "admin@alkem.io", "password": "your_password", "method": "password"}' \
    "$actionUrl" | jq -r '.session_token' \
    )
```

You can test (assuming default endpoint configuration) creating a file and then uploading it with the following CURL request:

```bash
touch hello-alkemio.pdf

curl http://localhost:3000/api/private/non-interactive/graphql \
 -H "Authorization: Bearer $sessionToken" \
 -F operations='{"query":"mutation UploadFile($file:Upload!) {uploadFile(file:$file)}", "variables": { "file": null }}' \
 -F map='{ "0": ["variables.file"] }' \
 -F 0=@"hello-alkemio.pdf"
```

You should get a response: {"data":{"uploadFile":"https://ipfs.io/ipfs/QmYt9ypyGsR1BKdaCGPdwdBgAiuXK5AYN2bGSNZov7YXuk"}}.
This file should be accessible (assuming default IPFS installation) on http://localhost:8080/ipfs/QmYt9ypyGsR1BKdaCGPdwdBgAiuXK5AYN2bGSNZov7YXuk or on a public IPFS on https://ipfs.io/ipfs/QmYt9ypyGsR1BKdaCGPdwdBgAiuXK5AYN2bGSNZov7YXuk.
If the upload worked, you should see 'Hello Alkemio!' in the browser :)
