# Quickstart – URL Resolver Parent Access

1. **Install & bootstrap**
   ```bash
   pnpm install
   pnpm run start:services
   pnpm run migration:run
   ```
2. **Run focused tests while developing**
   ```bash
   pnpm test -- url-resolver
   pnpm run test:ci --filter=url-resolver # if using jest --runInBand filters
   ```
3. **Verify schema updates**
   ```bash
   pnpm run schema:print
   pnpm run schema:sort
   pnpm run schema:diff
   ```
4. **Manual QA checklist**
   - Query `urlResolver` for accessible URL → `state = SUCCESS` and `closestAncestor` is `null`.
   - Query as anonymous for guarded URL → expect `AUTH_REQUIRED` with `closestAncestor` pointing to the public parent space.
   - Query as unauthorized member for private resource → expect `NOT_AUTHORIZED` with `closestAncestor` referencing the nearest permitted ancestor.
   - Query for deleted slug → expect `NOT_FOUND` and `closestAncestor` populated only if a higher-level resource is accessible.
