# Requirements Checklist: Unit Tests for `src/services/auth-reset`

## Coverage requirements

- [ ] `AuthResetService.publishResetAll` - happy path (with taskId)
- [ ] `AuthResetService.publishResetAll` - creates task when no taskId
- [ ] `AuthResetService.publishResetAll` - wraps errors in BaseException
- [ ] `AuthResetService.publishAuthorizationResetAllAccounts` - emits events for each account
- [ ] `AuthResetService.publishLicenseResetAllAccounts` - emits events for each account
- [ ] `AuthResetService.publishLicenseResetAllOrganizations` - emits events for each org
- [ ] `AuthResetService.publishAuthorizationResetAllUsers` - emits events for each user
- [ ] `AuthResetService.publishAuthorizationResetAllOrganizations` - emits events for each org
- [ ] `AuthResetService.publishAuthorizationResetPlatform` - emits platform events
- [ ] `AuthResetService.publishAuthorizationResetAiServer` - emits AI server event
- [ ] `AuthResetController.authResetAccount` - success path
- [ ] `AuthResetController.authResetAccount` - retry on failure
- [ ] `AuthResetController.authResetAccount` - reject at max retries
- [ ] `AuthResetController.licenseResetAccount` - success path
- [ ] `AuthResetController.licenseResetAccount` - retry on failure
- [ ] `AuthResetController.licenseResetAccount` - reject at max retries
- [ ] `AuthResetController.licenseResetOrganization` - success + retry + reject
- [ ] `AuthResetController.authResetPlatform` - success + retry + reject
- [ ] `AuthResetController.licenseResetPlatform` - success + retry + reject
- [ ] `AuthResetController.authResetAiServer` - success + retry + reject
- [ ] `AuthResetController.authResetUser` - success + retry + reject
- [ ] `AuthResetController.authResetOrganization` - success + retry + reject

## Quality gates

- [ ] All tests pass
- [ ] >= 80% line coverage for both source files
- [ ] No TypeScript compiler errors (`tsc --noEmit`)
- [ ] No Biome lint violations (`pnpm lint`)
