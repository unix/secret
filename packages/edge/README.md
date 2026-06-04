# @secret-next/edge

Hono app for Cloudflare Workers.

```txt
pnpm dev
pnpm release
pnpm db:apply
pnpm typegen
```

## D1 schema

Apply the D1 schema before running the edge app against a new or reset remote
database:

```txt
pnpm db:apply
```

The command runs `schema.sql` against the configured remote D1 database. The SQL
uses `CREATE TABLE IF NOT EXISTS`, so it can be rerun safely for the current
schema.

## Environment variables

The D1 and R2 bindings are configured in `wrangler.jsonc` and currently use
remote Cloudflare resources during local development:

- `DB`: D1 database binding for `secret-next`.
- `FILES`: R2 bucket binding for `secret-next`.

Secrets are required for generating R2 S3-compatible presigned upload URLs:

- `R2_ACCOUNT_ID`: Cloudflare account ID for the R2 endpoint.
- `R2_ACCESS_KEY_ID`: R2 S3 API access key ID.
- `R2_SECRET_ACCESS_KEY`: R2 S3 API secret access key.
- `R2_BUCKET_NAME`: R2 bucket name used in presigned URLs.

For local development, put these secrets in `packages/edge/.dev.vars`:

```txt
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=secret-next
```

For deployed Workers, configure the same secrets from `packages/edge` with
Wrangler:

```txt
pnpm wrangler secret put R2_ACCOUNT_ID
pnpm wrangler secret put R2_ACCESS_KEY_ID
pnpm wrangler secret put R2_SECRET_ACCESS_KEY
pnpm wrangler secret put R2_BUCKET_NAME
```

`packages/edge/.dev.vars` is ignored by git and should not be committed.

## R2 CORS

File uploads use browser requests to R2 presigned URLs, so the R2 bucket must
allow the portal origin. Apply the bucket CORS policy before testing file uploads
from the browser:

```txt
pnpm wrangler r2 bucket cors set secret-next --file r2-cors.json
pnpm wrangler r2 bucket cors list secret-next
```

The checked-in `r2-cors.json` allows `http://localhost:4321`,
`http://localhost:3000`, and `https://secret.witt.im`. Origin values must match
exactly, including scheme and port, and must not include a path.
