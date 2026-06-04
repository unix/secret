# secret-cipher

Shared encryption helpers for Secret clients.

## API

- Text: `sealText`, `openText`, `encodeTextAccessUrl`, `decodeTextAccessUrl`
- File: `createFileSecret`, `sealFileManifest`, `openFileManifest`, `sealFileChunk`, `openFileChunk`, `encodeFileAccessUrl`, `decodeFileAccessUrl`
- Utilities: `bytesToBase64Url`, `base64UrlToBytes`, `ERRORS`, `CipherError`

Access URLs use this shape:

```text
/s/<readId>#<secret>
```

## Example

```ts
import { encodeTextAccessUrl, openText, sealText } from 'secret-cipher'

const sealed = await sealText('private text')
const url = encodeTextAccessUrl({
  origin: 'https://secret.witt.im',
  readId: 'read_123',
  secret: sealed.secret,
})

const text = await openText(sealed)
```
