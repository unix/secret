# Secret

Client-side encrypted, self-hostable secret sharing for text and files.

Secret is a zero-knowledge sharing tool for short-lived private text and files.
Payloads are encrypted on the client before upload, and the decryption key stays in the URL fragment so it is never sent to the server.
Secrets can expire or be consumed once, reducing the lifetime of sensitive data.

## How to use

- You can visit [the sample site](https://secret.witt.im/) directly.
- Or run `npx secret` in the command-line.

## Self host

Secret's default hosted service is already designed with security in mind. The
server never stores your plaintext, and secrets are encrypted before they leave
your device.

If you need higher usage limits, larger single-file uploads, more generated
links per secret, or tighter control over your own deployment environment, you
can deploy and run your own Secret instance.

See [SELF-HOST.md](./SELF-HOST.md) for the full self-hosting guide.

## LICENSE

[MIT](https://github.com/unix/secret/blob/master/LICENSE)
