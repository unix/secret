# Secret CLI

Command-line client for [Secret](https://github.com/unix/secret), a client-side encrypted,
self-hostable secret sharing tool for short-lived private text and files.

The CLI encrypts plaintext before upload. The API receives ciphertext and
lifecycle metadata, while the decryption secret stays in the generated URL
fragment or CLI reveal id.

## Install

```sh
npx secret
```

## Quick Start

Create an encrypted text secret:

```sh
secret
```

Create an encrypted file secret:

```sh
secret --file ./notes.txt
```

Each created secret prints:

- generated read links that can be opened in the web portal;
- equivalent `secret reveal <readId.secret>` commands;
- a track URL and `secret track <trackId>` command.

## Commands

### `secret`

Prompts for text, encrypts it locally, uploads the ciphertext, and prints read
links.

```sh
secret
secret --expiration 900 --links 3
```

Options:

- `--expiration <seconds>`: expiration time. Valid values are `300`, `900`,
  `1800`, and `3600`.
- `--links <count>`: number of read links to create. Valid values are `1`, `3`,
  `5`, and `10`.

### `secret --file <path>`

Encrypts a local file, uploads the encrypted payload, and prints read links.

```sh
secret --file ./report.pdf
secret -f ./report.pdf --expiration 3600 --links 1
```

Files are encrypted in chunks before upload. The generated file manifest is also
encrypted, including the file name and size.

### `secret reveal <url|readId.secret|readId#secret>`

Opens a text or file secret from a full access URL or a CLI reveal id.

```sh
secret reveal read_123.secret-fragment
```

For text secrets, the decrypted text is printed to stdout. For file secrets, the
CLI first shows file metadata, asks for confirmation, then downloads and decrypts
the file into the current directory. If a file with the same name already
exists, the CLI chooses the next available name.

### `secret track <trackId>`

Shows the server-side status for a secret and, when local tracking metadata is
available, the generated read links.

```sh
secret track track_123
```

Tracking output includes the secret type, lifecycle status, read counts,
expiration time, and per-link read status.

### `secret status`

Checks the configured API endpoint.

```sh
secret status
```

### `secret config --api <origin> --portal <origin>`

Points the CLI at a hosted or self-hosted Secret deployment.

```sh
secret config --api https://secret-api.example.com --portal https://secret.example.com
```

Origins may be passed with or without a scheme. Localhost origins default to
`http`; other hosts default to `https`.

### `secret cleanup [--all]`

Removes local CLI tracking files.

```sh
secret cleanup
secret cleanup --all
```

Without `--all`, cleanup removes expired local track files. With `--all`, it
removes every local file except the CLI config file.
