# How is the license applied

1. The License entity is reset
2. The License is extended by assigning granted entitlements via the Agent credentials on the Account
3. The License is further extended `conditionally` by individual set of entitlements for each Account, called a `baseline`.
   The conditions are as follows:
   - IF the entitlement is related to VC, Innovation Pack or Innovation Hub AND the baseline value is higher than the entitlement from step 2 - it is overwritten by the baseline value
   - All other entitlements are directly overwritten by the baseline value
4. If the Wingback integration is enabled and the Account has a Wingback customer ID assigned, Wingback is queried for the entitlements of the customer and the values are used to overwrite the entitlements from step 3.
   > Note:
   >
   > - Wingback provides only overwrites to the ALREADY EXISTING entitlements, and it does not introduce new entitlements.
   > - This means it can hold a subset of all entitlements, which are called overwrites.
   > - If the license does not have an entitlement, it is NOT overwritten or introduced as new by Wingback, even if it exists in Wingback.
