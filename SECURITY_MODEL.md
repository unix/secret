# Secret Security Model

Last updated: 2026-06-04

Secret is a client-side encrypted, self-hostable sharing tool for short-lived
private text and files. This document summarizes the security boundary behind
that claim.

This is a public security model statement. It is not a third-party audit report,
formal certification, or guarantee that every deployment is secure.

## Core Boundary

Secret is designed so the server can store and route encrypted payloads without
receiving the decryption secret.

- Plaintext is encrypted before upload.
- The server stores ciphertext and lifecycle metadata.
- The decryption secret is kept in the URL fragment, which browsers do not send
  in HTTP requests.
- Read links can expire or be consumed, reducing how long encrypted material
  remains useful.

In the normal flow, the API does not need plaintext or the decryption secret to
create, read, track, expire, or destroy a Secret.

## Designed To Reduce

Secret is intended to reduce exposure from:

- Database or object-store compromise.
- Server-side logs that do not include URL fragments.
- Network intermediaries that can observe requests but not browser fragments.
- Accidental long-term retention of short-lived sensitive data.
- Server-side bugs that expose stored records but not client-held secrets.

If those events occur, the expected exposure is encrypted payloads and metadata,
not plaintext.

## Not Covered

Secret does not make an untrusted endpoint trustworthy. It does not protect
against:

- Compromised sender or recipient devices.
- Malicious browser extensions, malware, clipboard theft, or screen recording.
- A recipient copying or forwarding plaintext after opening it.
- Phishing or lookalike domains.
- XSS or malicious scripts running in the Secret client origin.
- Third-party scripts, analytics, crash reports, or logs that capture URL
  fragments.
- Build, dependency, CI/CD, or deployment compromise that ships malicious client
  code.

Because the client handles the decryption secret, frontend integrity matters as
much as backend storage behavior.

## Verification Status

The project currently documents its security design and keeps the implementation
open for review. This document should be treated as the project's own security
claim unless a separate third-party audit report is published.

Useful public assurance artifacts include:

- A vulnerability reporting policy.
- Automated dependency and static analysis checks.
- Strong site security headers, especially Content Security Policy.
- Public security fix notes.
- A third-party audit report with scope, findings, fixes, and residual risk.

## Recommended Audit Focus

A focused external review should prioritize:

- Client-side cryptography and key handling.
- URL fragment handling.
- XSS and client-origin hardening.
- Read-link consumption, expiration, and destruction behavior.
- File upload and download lifecycle.
- Release, dependency, and CI/CD integrity.
