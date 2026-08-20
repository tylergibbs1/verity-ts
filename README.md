# Backwork TypeScript SDK

Official TypeScript and JavaScript client for the [Backwork API](https://backworkhealth.com): Medicare coverage policies, medical code intelligence, prior authorization checks, claim validation, compliance review, and drug formulary evidence.

The SDK is Promise-based, fully typed, and uses native `fetch` with an Effect-backed request layer for response parsing, timeouts, and safe retries.

## Installation

This SDK is being republished under a new npm name. `@backwork/api` is **not on npm yet**, so today you install the existing package:

```bash
npm install @backwork/verity-api@1.0.2
```

Once the rename is published, the install becomes:

```bash
npm install @backwork/api
```

The code examples below use the new `@backwork/api` name. On `@backwork/verity-api@1.0.2`, change the import path back to `@backwork/verity-api` and use `VerityClient` / `VerityError`; everything else is identical.

Requires Node.js 18 or newer, or a modern browser runtime with `fetch`.

## Quick Start

```typescript
import { BackworkClient } from '@backwork/api';

const client = new BackworkClient(process.env.BACKWORK_API_KEY!);

const code = await client.lookupCode({
  code: '76942',
  include: ['rvu', 'policies'],
});

console.log(code.data?.description);

const priorAuth = await client.checkPriorAuth({
  procedureCodes: ['76942'],
  diagnosisCodes: ['M54.5'],
  state: 'TX',
  payer: 'medicare',
});

console.log(priorAuth.data?.pa_required);
```

Get an API key from the [Backwork dashboard](https://backworkhealth.com/dashboard).

### API keys and environment variables

New keys are issued with a `bwk_live_` prefix. Keys issued with the older `vrt_live_` prefix are still valid and are not being revoked, so you do not need to rotate anything.

The SDK takes the key as an argument and never reads the environment itself. If you are moving your own config from `VERITY_API_KEY` to `BACKWORK_API_KEY`, read the new name first and fall back to the old one until every deployment is switched over:

```typescript
const apiKey = process.env.BACKWORK_API_KEY ?? process.env.VERITY_API_KEY;
```

## Core Workflows

### Code Lookup

```typescript
const result = await client.lookupCode({
  code: '76942',
  codeSystem: 'CPT',
  jurisdiction: 'JM',
  include: ['rvu', 'policies', 'rates'],
  fuzzy: true,
});
```

### Policy Search and Retrieval

```typescript
const policies = await client.listPolicies({
  q: 'ultrasound guidance',
  mode: 'keyword',
  policyType: 'LCD',
  status: 'active',
  limit: 25,
});

const policy = await client.getPolicy('L33831', {
  include: ['criteria', 'codes'],
});
```

### Prior Authorization and Claim Validation

```typescript
const priorAuth = await client.checkPriorAuth({
  procedureCodes: ['76942'],
  diagnosisCodes: ['M54.5'],
  state: 'TX',
  payer: 'medicare',
});

const claim = await client.validateClaim({
  procedureCodes: ['99213'],
  diagnosisCodes: ['E11.9'],
  payer: 'Medicare',
  state: 'TX',
  dateOfService: '2026-05-23',
});

console.log(claim.data?.coverage_status, claim.data?.denial_risk);
console.log(claim.data?.issues, claim.data?.matched_policies);
```

### Coverage, Spending, and Compliance

```typescript
const criteria = await client.searchCriteria({
  q: 'diabetes',
  section: 'indications',
  limit: 10,
});
console.log(criteria.data?.[0]?.policy_id, criteria.data?.[0]?.policy_title);

const spending = await client.getSpendingByCode({
  codes: ['T1019', 'T1020'],
  year: 2023,
});

const changes = await client.listUnreviewedChanges({ limit: 10 });
const stats = await client.getComplianceStats();
```

### Drug Formulary Evidence

```typescript
const formulary = await client.searchDrugFormularyEvidence({
  q: 'ozempic',
  payer: 'all',
  limit: 5,
});
```

## Error Handling

```typescript
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  BackworkError,
} from '@backwork/api';

try {
  const result = await client.lookupCode({ code: '76942' });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof ValidationError) {
    console.error('Invalid request:', error.message);
  } else if (error instanceof NotFoundError) {
    console.error('Resource not found');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded:', error.reset);
  } else if (error instanceof BackworkError) {
    console.error('Backwork API error:', error.message);
  }
}
```

## Migrating from `@backwork/verity-api`

The old exported names still work. `VerityClient` and `VerityError` are exported as deprecated aliases of `BackworkClient` and `BackworkError`, and `VerityConfig` aliases `BackworkConfig`, so existing imports keep compiling. They will be removed in the first major release after the rename.

| Old                                    | New                                 |
| -------------------------------------- | ----------------------------------- |
| `@backwork/verity-api`                 | `@backwork/api`                     |
| `VerityClient`                         | `BackworkClient`                    |
| `VerityError`                          | `BackworkError`                     |
| `VerityConfig`                         | `BackworkConfig`                    |
| `https://verity.backworkai.com/api/v1` | `https://backworkhealth.com/api/v1` |
| `VERITY_API_KEY`                       | `BACKWORK_API_KEY`                  |

`error.name` on the base error class changed from `'VerityError'` to `'BackworkError'`. If you branch on that string rather than using `instanceof`, update it.

## Configuration

```typescript
const client = new BackworkClient({
  apiKey: process.env.BACKWORK_API_KEY!,
  baseUrl: 'https://backworkhealth.com/api/v1',
  timeout: 30_000,
});
```

## Browser Usage

```html
<script type="module">
  import { BackworkClient } from 'https://cdn.skypack.dev/@backwork/api';

  const client = new BackworkClient('bwk_live_YOUR_API_KEY');
  const result = await client.lookupCode({ code: '76942' });
  console.log(result.data);
</script>
```

## Development

```bash
npm install
npm run lint
npm run format:check
npm run build
npm test
```

## Release

The package publishes to npm as `@backwork/api`.

1. Configure npm Trusted Publishing for `tylergibbs1/backwork-ts`, workflow `release.yml`, environment `npm`, package `@backwork/api`.
2. Update `package.json` to the new version.
3. Push a matching tag, for example `v1.1.0`.
4. The release workflow installs with `npm ci`, runs lint/format/build/tests, runs `npm pack --dry-run`, and publishes with npm provenance.

`npm test` runs a structure check by default. Set `BACKWORK_API_KEY` to run live API smoke checks.

## Support

- Documentation: https://backworkhealth.com/docs
- Issues: https://github.com/tylergibbs1/backwork-ts/issues
- Email: support@backworkhealth.com

## License

MIT
