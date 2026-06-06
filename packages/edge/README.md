# Edge

This is the edge API project for Secret, designed to run on Cloudflare Workers.

It stores encrypted secret payloads, manages one-time read links, tracks secret status, and cleans up expired records.

Key material is not stored here; decryption happens in the user's browser.
