# How is the license applied

1. The License entity is reset
2. The License is initialized with the entitlements' baseline. This is the minimum set of entitlements for this account.
3. The License is extended by assigning granted entitlements via the Agent credentials on the Account. The result is a sum of the baseline and granted entitlements.
4. If the Wingback integration is enabled and the Account has a Wingback customer ID assigned, Wingback is queried for the entitlements of the customer and the values are used to overwrite the entitlements from step 3.
   > Note:
   >
   > - Wingback provides only overwrites to the ALREADY EXISTING entitlements, and it does not introduce new entitlements.
   > - This means it can hold a subset of all entitlements, which are called overwrites.
   > - If the license does not have an entitlement, it is NOT overwritten or introduced as new by Wingback, even if it exists in Wingback.
