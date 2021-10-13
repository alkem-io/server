# Quality Assurance + Testing

Initial version of integration tests is in place. To run them, look at the prerequisites, below:

- Used frameworks/packages [jest](https://jestjs.io/) and `supertest`
- Running `MySQL sql server`
- Running `Alkemio/Server` service.
- `LOGGING_CONSOLE_ENABLED=false` can be used to disable logging the exceptions (exceptions are quite verbose and will pollute the test results log).
- In order to run the unit, integration and end-to-end, navigate to the `/Server` repository, and execute the following command: `npm run test:[TEST_TYPE]` where TEST_TYPE is `e2e` for end-to-end, `it` for
  integration tests and `ut` for unit tests
  - To run specific suite: `npm run-script test:[TEST_TYPE] jest --config ./test folder>/<test suite file>` (i.e. `./test/user.e2e-spec.ts`)
- The results of the test, will be displayed at the end of the execution.

Automation test structure

```
server/
 src/
  domain/
   challenge/
     challenge.service.ts
     challenge.service.spec.ts
 test/
  config/
    jest.config.ci.ts
    etc...
  functional/
   e2e/
    user-management/
      create-user.e2e-spec.ts
   integration/
    challenge/
      create-challenge.e2e-spec.ts
   non-functional/
    auth/
      anonymous-user.it-spec.ts
   utils/
     graphql.request.ts
```

Test types

    - unit tests: `*.spec.ts` testing functions part of a service
    - functional e2e tests: `*.e2e-spec.ts` testing functionallity and its integration with third part services (i.e. "Ory Kratos")
    - functional integration tests: `*.it-spec.ts` API testing of application services

Run tests:

    - run all tests: `npm run-script test:nightly`
    - run all tests from particular area: `npm run-script test:it ./test/functional/integration/challenge/`
    - run all tests for a test file: `npm run-script test:it ./test/functional/integration/challenge/query-challenge-data.it-spec.ts`
    - run e2e tests with coverage: `npm run test:e2e-cov`

To debug tests in VS Code

- Use `Debug Jest e2e Tests` configuration for API tests
- Use `Debug Jest CI Tests` configuration for CI tests

To run only one test from a test file

- Set the keyword _.only_ after `test` or `describe` (i.e. `test.only('should remove a challenge', async () => {})`)
- Run the command for this particular test file: `npm run-script test:it ./test/functional/integration/challenge/query-challenge-data.it-spec.ts`

## Update user password secret for Travis CI

In order to be able to update the user secret (used in automation tests) for Travi CI configuration, the following steps, should be perforemed:

- Install `ruby`
  ```sh
  sudo apt update
  sudo apt install ruby-full
  ruby --version
  ```
- Install travis gem: `gem install travis`
- Authenticate to travis throught console: `travis login --pro --github-token [token]`
  - the token could be taken/generated from github settings
- From `server` repo, remove the existing `secret` (secure: ) from `.travis.yml`
- Escape the password special characters
  - Note: when useng `"double quotes"` for the variable, escaping is done with double backslash `\\`
  - Example: password: `t3$t@e!st`, escaped: `"t3\\\$t\\@e\\!st"`
  - Special: the `$` should be escaped with 3 backaslashes `\\\`
- In console run: `travis encrypt --pro AUTH_AAD_TEST_HARNESS_PASSWORD="t3\\\$t\\@e\\!st" --add`
  - The command will generate `scure: [encrypted password]` in `.travis.yml` file
- Commit changes :)

## Resources

- [TravisCI documentation](https://docs.travis-ci.com/user/environment-variables/)
