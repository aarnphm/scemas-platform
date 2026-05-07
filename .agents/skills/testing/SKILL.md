---
name: testing
description: Use when writing or modifying tests in any language. Covers the no-mocks policy, Rust test placement, and test execution conventions. Do not use for non-test code.
---

## philosophy

no mocks. mocks are lies that hide real bugs. unit tests or e2e tests against real state.

## rust

- tests at bottom of module in `mod tests {}`
- run only touched crate: `cargo test -p <crate-you-touched>`
- use `#[tokio::test]` for async tests

## typescript

- run specific tests, not the full suite
- test against real drizzle queries where possible

## general

- don't over-test. test behavior, not implementation details
- if a test needs a database, use the real database (docker-compose postgres)
