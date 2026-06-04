# Self-Hosting Secret

Self-hosted deployments are configured from the root-level `secret.config.json` file. Treat this file as the source of truth for deployment limits and generated runtime configuration.

## Guide

Follow this sequence to deploy your own instance:

1. Clone the project and install dependencies with pnpm:

   ```sh
   pnpm install
   ```

2. Review `.env` and `secret.config.json`, then fill in the required deployment values:
   - Start with the [required `.env` variables](#required-environment-variables) for your Cloudflare account, R2 credentials, and D1 database.

   - Create or choose the R2 bucket and D1 database, then copy their names, IDs, and access keys into `.env`.
   - Confirm the client and API domains in `secret.config.json`, set any deployment limits, and add your client domain to the R2 bucket's CORS configuration.

3. Run the setup command to check the provided configuration and provision any required deployment resources:

   ```sh
   pnpm deploy:setup
   ```

4. Deploy the server-side Workers:

   ```sh
   pnpm deploy:edge
   ```

5. Deploy the client portal:

   ```sh
   pnpm deploy:portal
   ```

   If the domains configured in `secret.config.json` are already managed by Cloudflare and have no conflicting DNS records, the deployment is complete at this point. The generated `wrangler.jsonc` files include the configured domains as Worker custom domains.

   If a configured domain is not managed by Cloudflare, or if it previously had another DNS record, configure the Worker domains manually in the Cloudflare Dashboard. Advanced setups can also use your own proxy, routing rules, or forwarding rules.

## Limit Naming

The `limits` object uses a small naming convention so each value's owner is clear:

- Use uppercase names with underscores.
- Use `CLIENT_` for values that only affect the client UI.
- Use `API_` for values enforced by the API/server.
- Use `HYBRID_` for values shared by both the client and API/server.
- Use the `_SECONDS` suffix for duration values, and pass those values in seconds.

## Available Limits

| Limit                              |                  Default | Scope  | Purpose                                                                                                                                                              |
| ---------------------------------- | -----------------------: | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HYBRID_MAX_TEXT_BYTES`            |                  `50000` | Hybrid | Maximum plaintext size for a text secret. The client checks this before submission, and the API enforces it.                                                         |
| `HYBRID_MAX_TEXT_CIPHER_BYTES`     |                  `70000` | Hybrid | Maximum encrypted payload size for a text secret. The client can check this after encryption and before submission, and the API enforces it.                         |
| `HYBRID_MAX_FILE_MB`               |                     `10` | Hybrid | Maximum plaintext size for a file secret, in MB. The client checks this before submission, and the API enforces it.                                                  |
| `HYBRID_MAX_FILE_CIPHER_MB`        |                     `15` | Hybrid | Maximum encrypted payload size for a file secret, in MB. The client checks this before submission, and the API enforces it.                                          |
| `HYBRID_MAX_READS`                 |                     `10` | Hybrid | Maximum number of read links that can be generated for one text or file secret. The client uses this for form choices and preflight checks, and the API enforces it. |
| `HYBRID_MAX_SECRET_TTL_SECONDS`    |                   `3600` | Hybrid | Maximum lifetime of a created secret. The default is 1 hour. The client uses this for form choices and preflight checks, and the API enforces it.                    |
| `CLIENT_VALID_EXPIRATIONS_SECONDS` | `[300, 900, 1800, 3600]` | Client | Expiration choices shown by default in the client UI, in seconds.                                                                                                    |
| `CLIENT_VALID_LINK_COUNTS`         |          `[1, 3, 5, 10]` | Client | Read-link count choices shown by default in the client UI.                                                                                                           |
| `API_PENDING_UPLOAD_TTL_SECONDS`   |                    `900` | API    | How long an unfinished pending file upload session may remain before scheduled cleanup removes it. The default is 15 minutes.                                        |
| `API_TRACKING_TTL_SECONDS`         |                  `86400` | API    | How long tracking metadata is kept after a secret expires or is destroyed. The default is 24 hours.                                                                  |
| `API_R2_UPLOAD_URL_TTL_SECONDS`    |                    `900` | API    | Lifetime of the presigned R2 upload URL returned when a file secret is initialized. The default is 15 minutes.                                                       |

## Client UI Choices Are Not Enforcement

`CLIENT_VALID_EXPIRATIONS_SECONDS` and `CLIENT_VALID_LINK_COUNTS` only control which values the client shows by default. They do not override the hybrid limits.

For example, if the largest value in `CLIENT_VALID_EXPIRATIONS_SECONDS` is greater than `HYBRID_MAX_SECRET_TTL_SECONDS`, the request will still be rejected by client preflight validation or by the API. The same applies when `CLIENT_VALID_LINK_COUNTS` contains a value greater than `HYBRID_MAX_READS`.

## Generate Configuration

The self-host package generates the deployment configuration:

```sh
pnpm install
pnpm wrangler login
pnpm --filter @secret-next/self-host dev
```

## Required Environment Variables

| Variable               | Purpose                                                                                            | Where to find it                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `R2_ACCOUNT_ID`        | Cloudflare account ID. Wrangler uses it to select the account, and R2 uses it for the S3 endpoint. | Copy it from the Cloudflare Dashboard account sidebar, or run `pnpm wrangler whoami` after logging in.                |
| `R2_ACCESS_KEY_ID`     | R2 S3 API access key ID used to sign file upload and download requests.                            | Cloudflare Dashboard -> R2 -> Manage R2 API Tokens -> Create API token.                                               |
| `R2_SECRET_ACCESS_KEY` | R2 S3 API secret access key. It is only shown once when the token is created.                      | Created with `R2_ACCESS_KEY_ID`. Save it to `.env` immediately.                                                       |
| `R2_BUCKET_NAME`       | R2 bucket that stores encrypted file payloads.                                                     | Cloudflare Dashboard -> R2 -> Buckets, or `pnpm wrangler r2 bucket list`.                                             |
| `D1_DATABASE_ID`       | D1 database ID for secret metadata, read state, and tracking data.                                 | Cloudflare Dashboard -> D1 -> database details, or `pnpm wrangler d1 info <D1_DATABASE_NAME> --json` and read `uuid`. |
| `D1_DATABASE_NAME`     | D1 database name used by Wrangler and the `wrangler.jsonc` binding.                                | Cloudflare Dashboard -> D1, or `pnpm wrangler d1 list`.                                                               |

## Protocol Boundaries

`chunkCount` and `chunkSize` should be validated by the API, but they should not be exposed as freely tunable self-hosting limits. Treat them as protocol consistency checks instead.

The API should require both values to be positive integers and ensure they fit the practical range implied by `HYBRID_MAX_FILE_MB` and `HYBRID_MAX_FILE_CIPHER_MB`. This keeps malformed metadata from causing resource abuse or inconsistent upload state.

`salt`, `manifestIv`, and `encryptedManifest` are not the main plaintext-leakage risk, but they still need format and length validation. `salt` and `manifestIv` should match the fixed byte lengths required by the encryption protocol. `encryptedManifest` should be capped to a reasonable base64url ciphertext size so a client cannot submit oversized metadata.
