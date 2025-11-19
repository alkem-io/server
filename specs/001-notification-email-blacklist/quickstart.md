# Quickstart: Notification Email Blacklist

1. **Bootstrap services**
   ```bash
   pnpm install
   pnpm run start:services
   pnpm start:dev
   ```
2. **Seed platform admin session**
   - Authenticate as a platform administrator via existing auth flow.
   - Obtain GraphQL token/cookies for `/graphiql` access.
3. **Add a blacklisted email**
   ```graphql
   mutation AddBlacklist($email: String!) {
     addNotificationEmailToBlacklist(input: { email: $email })
   }
   ```

   - Expect lowercase storage, duplicate attempts return validation error.
4. **Remove a blacklisted email**
   ```graphql
   mutation RemoveBlacklist($email: String!) {
     removeNotificationEmailFromBlacklist(input: { email: $email })
   }
   ```
5. **Verify via query**
   ```graphql
   {
     platform {
       settings {
         integration {
           notificationEmailBlacklist
         }
       }
     }
   }
   ```
6. **Cleanup**
   - Remove test entries.
   - Stop services: `docker compose -f quickstart-services.yml down`.
