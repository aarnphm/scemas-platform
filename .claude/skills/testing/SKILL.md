---
name: testing
description: testing conventions across rust and typescript. no mocks, unit or e2e only
glob: '**/*.test.*'
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
