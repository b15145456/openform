# Authentication

## Current status

OpenForm does not yet contain an authentication implementation.

At the time of this review, the repository contains no application source code, routes, middleware, user model, or authentication configuration. Therefore, there is currently no executable authentication request flow and no repository-defined handling for credentials, sessions, or tokens.

## Components

No authentication components are currently implemented.

When authentication is introduced, document:

- Authentication endpoints and services
- User and identity storage
- Password hashing and verification
- Session or token validation middleware
- Authorization and role checks
- Credential and signing-key configuration

## Request flow

No authentication request flow currently exists in code.

A future implementation should document the flow from credential submission through identity verification, session or token issuance, protected-request validation, refresh, logout, and revocation.

## Credentials and tokens

The repository currently defines no credential or token storage policy.

When authentication is implemented:

- Store passwords only as password hashes.
- Supply secrets and signing keys through a secret manager or environment configuration; never commit them to Git.
- Keep access tokens short-lived.
- Rotate and revoke refresh tokens, and store them securely.
- Never log passwords, raw tokens, session secrets, or authorization headers.

## Review note

This document records the repository state observed during the initial GitHub integration and write-permission test. Update it against the actual code when authentication is implemented.
