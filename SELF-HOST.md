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
   - Confirm the client and API domains in `secret.config.json`, and set any deployment limits.

3. Configure an Ethereum RPC provider if you want to use EVM address or ENS-based access checks:

   ```sh
   ETH_INFURA_API_KEY=
   # or
   ETH_ALCHEMY_API_KEY=
   ```

   Secret supports either [Infura](https://www.infura.io/) or [Alchemy](https://www.alchemy.com/) for Ethereum mainnet RPC calls. For most self-hosted deployments, Infura is the recommended default: create an Infura account, generate an Ethereum Mainnet API key, and add it to `ETH_INFURA_API_KEY`. The free quota is normally enough for typical personal or small-team usage. Alchemy is also supported by setting `ETH_ALCHEMY_API_KEY`; if both keys are configured, the API uses Alchemy first.

4. Run the setup command to check the provided configuration and provision any required deployment resources:

   ```sh
   pnpm release:setup
   ```

   The setup command generates the deployment files and applies the R2 bucket
   CORS policy automatically. The policy keeps localhost development origins and
   adds the configured `portal.origin` from `secret.config.json`. If CORS
   configuration fails, the setup command stops so you can fix the Wrangler
   session, Cloudflare account, or R2 bucket configuration before deploying.

5. Deploy the server-side Workers:

   ```sh
   pnpm release:edge
   ```

6. Deploy the client portal:

   ```sh
   pnpm release:portal
   ```

   If the domains configured in `secret.config.json` are already managed by Cloudflare and have no conflicting DNS records, the deployment is complete at this point. The generated `wrangler.jsonc` files include the configured domains as Worker custom domains.

   If a configured domain is not managed by Cloudflare, or if it previously had another DNS record, configure the Worker domains manually in the Cloudflare Dashboard. Advanced setups can also use your own proxy, routing rules, or forwarding rules.

## Cost Estimate

Cloudflare pricing can change, so use the official Cloudflare pricing pages as the source of truth: [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), and [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/). The estimate below is based on the default project limits and a typical "create one secret, then read it once" interaction.

Assumptions:

- A text-secret interaction normally uses 2 API Worker requests and D1 for metadata, read tokens, consumption state, destroy state, and cleanup.
- A file-secret interaction normally uses 4 API Worker requests, plus R2 for the encrypted file object. Browser uploads go directly to R2, so the upload itself is not a Worker request, but it is still an R2 operation.
- D1 usage is estimated as application-level row activity. Cloudflare's billable row metrics may be higher when indexes are updated, so use the Cloudflare dashboard or D1 query metadata for exact production numbers.
- File storage assumes R2 Standard storage and the default maximum retained lifetime of about 25 hours: up to 1 hour from `HYBRID_MAX_SECRET_TTL_SECONDS`, plus 24 hours from `API_TRACKING_TTL_SECONDS`.
- Portal static asset requests are normally free. Requests that invoke Worker code, SSR, or API routes count as Workers requests.

| Monthly interactions | Average interactions per day | Estimated usage                                                                                                                                                                   | Recommended tier                                                                                                                                                                                    |
| -------------------: | ---------------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                1,000 |                     About 34 | Even if every interaction is a file secret, usage is roughly 4,000 Worker requests, 1,000 R2 Class A operations, and 2,000 R2 Class B operations.                                 | Workers Free is usually enough. D1 and R2 should normally remain within included free usage.                                                                                                        |
|               10,000 |                    About 334 | In an all-file scenario, usage is roughly 40,000 Worker requests, 10,000 R2 Class A operations, and 20,000 R2 Class B operations.                                                 | Workers Free is usually enough. R2 operations are well within the free tier, and storage is usually within or near the free tier unless files are large and retained close to the maximum lifetime. |
|              100,000 |                  About 3,334 | Text-heavy usage is roughly 200,000 Worker requests. All-file usage is roughly 400,000 Worker requests, 100,000 R2 Class A operations, and 200,000 R2 Class B operations.         | Workers Free is still usually viable. D1 writes are the main number to watch, but this volume is normally below the Free daily limits when traffic is evenly distributed.                           |
|            1,000,000 |                 About 33,334 | Text-heavy usage is roughly 2,000,000 Worker requests. All-file usage is roughly 4,000,000 Worker requests, 1,000,000 R2 Class A operations, and 2,000,000 R2 Class B operations. | Plan for Workers Paid. The main reason is D1 Free's daily write limit, which can be reached before Workers or R2 become expensive. Paid-plan included D1 usage is usually enough for this scale.    |

Approximate free-tier boundary:

- Workers Free includes 100,000 Worker requests per day. With this project's request pattern, that is roughly up to 50,000 text interactions per day or 25,000 file interactions per day before the Workers request limit becomes the bottleneck.
- D1 Free includes 5,000,000 rows read per day, 100,000 rows written per day, and 5 GB total storage. In practice, the D1 write limit is likely to be the first Free-plan limit reached. A conservative planning range is about 10,000 to 15,000 completed interactions per day, or about 300,000 to 450,000 evenly distributed interactions per month.
- R2 Standard includes 10 GB-month of storage, 1,000,000 Class A operations per month, 10,000,000 Class B operations per month, and free public egress. One file-secret interaction is roughly 1 Class A operation and 2 Class B operations, so even 1,000,000 all-file interactions are close to the included R2 operation allowance. Storage cost depends on average file size: at 1,000,000 files, a 1 MB average encrypted file retained for about 25 hours is roughly 35 GB-month; a 15 MB average encrypted file is roughly 520 GB-month.

There should not be a surprise bill from simply exceeding the Workers or D1 Free limits. When a Workers Free account exceeds 100,000 Worker requests in a day, Cloudflare stops invoking the Worker for those requests and returns a limit error depending on the route mode. When D1 Free exceeds 100,000 rows written per day, 5,000,000 rows read per day, or 5 GB total storage, D1 queries fail until the limits reset or storage is reduced. In other words, severe overuse on the Free tier is more likely to appear as service interruption than silent, unlimited scaling. R2 and Workers Paid are usage-based products, so usage above the included allowance can be billed; before running high-volume public deployments, configure Cloudflare budget alerts and usage notifications so any overage is visible early instead of becoming a surprise invoice.

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

## Required Environment Variables

| Variable               | Purpose                                                                                            | Where to find it                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `R2_ACCOUNT_ID`        | Cloudflare account ID. Wrangler uses it to select the account, and R2 uses it for the S3 endpoint. | Copy it from the Cloudflare Dashboard account sidebar, or run `pnpm wrangler whoami` after logging in.                |
| `R2_ACCESS_KEY_ID`     | R2 S3 API access key ID used to sign file upload and download requests.                            | Cloudflare Dashboard -> R2 -> Manage R2 API Tokens -> Create API token.                                               |
| `R2_SECRET_ACCESS_KEY` | R2 S3 API secret access key. It is only shown once when the token is created.                      | Created with `R2_ACCESS_KEY_ID`. Save it to `.env` immediately.                                                       |
| `R2_BUCKET_NAME`       | R2 bucket that stores encrypted file payloads.                                                     | Cloudflare Dashboard -> R2 -> Buckets, or `pnpm wrangler r2 bucket list`.                                             |
| `D1_DATABASE_ID`       | D1 database ID for secret metadata, read state, and tracking data.                                 | Cloudflare Dashboard -> D1 -> database details, or `pnpm wrangler d1 info <D1_DATABASE_NAME> --json` and read `uuid`. |
| `D1_DATABASE_NAME`     | D1 database name used by Wrangler and the `wrangler.jsonc` binding.                                | Cloudflare Dashboard -> D1, or `pnpm wrangler d1 list`.                                                               |

## Optional Environment Variables

| Variable              | Purpose                                                                               | Where to find it                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ETH_INFURA_API_KEY`  | Infura Ethereum Mainnet RPC API key used for EVM address and ENS-based access checks. | Register or sign in at [Infura](https://www.infura.io/), create an Ethereum Mainnet API key, and copy the key into `.env`. Recommended by default.   |
| `ETH_ALCHEMY_API_KEY` | Alchemy Ethereum Mainnet RPC API key used for the same EVM address and ENS checks.    | Register or sign in at [Alchemy](https://www.alchemy.com/), create an Ethereum Mainnet app, and copy the API key into `.env`. Used first if present. |

## Protocol Boundaries

`chunkCount` and `chunkSize` should be validated by the API, but they should not be exposed as freely tunable self-hosting limits. Treat them as protocol consistency checks instead.

The API should require both values to be positive integers and ensure they fit the practical range implied by `HYBRID_MAX_FILE_MB` and `HYBRID_MAX_FILE_CIPHER_MB`. This keeps malformed metadata from causing resource abuse or inconsistent upload state.

`salt`, `manifestIv`, and `encryptedManifest` are not the main plaintext-leakage risk, but they still need format and length validation. `salt` and `manifestIv` should match the fixed byte lengths required by the encryption protocol. `encryptedManifest` should be capped to a reasonable base64url ciphertext size so a client cannot submit oversized metadata.
