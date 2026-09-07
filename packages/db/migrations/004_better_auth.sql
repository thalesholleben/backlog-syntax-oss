\set ON_ERROR_STOP on

SET ROLE backlog_owner;
SET search_path = auth, pg_catalog;

-- Generated from Better Auth 1.7.2 with UUID ids and the MCP OAuth plugin.
CREATE TABLE IF NOT EXISTS "user" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL,
  image text,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "expiresAt" timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId" uuid NOT NULL REFERENCES "user" (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON session ("userId");

CREATE TABLE IF NOT EXISTS account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer text NOT NULL,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" uuid NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON account ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "account_issuer_accountId_uidx"
  ON account (issuer, "accountId");

CREATE TABLE IF NOT EXISTS verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  value text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);

CREATE TABLE IF NOT EXISTS jwks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "publicKey" text NOT NULL,
  "privateKey" text NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "expiresAt" timestamptz,
  alg text,
  crv text
);

CREATE TABLE IF NOT EXISTS "oauthClient" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "clientId" text NOT NULL UNIQUE,
  "clientSecret" text, "clientDiscoveryId" text, disabled boolean, "skipConsent" boolean,
  "enableEndSession" boolean, "subjectType" text, scopes jsonb, "clientCredentialsScopes" jsonb,
  "userId" uuid REFERENCES "user" (id) ON DELETE CASCADE, "createdAt" timestamptz,
  "updatedAt" timestamptz, name text, uri text, icon text, contacts jsonb, tos text,
  policy text, "softwareId" text, "softwareVersion" text, "softwareStatement" text,
  "redirectUris" jsonb NOT NULL, "postLogoutRedirectUris" jsonb,
  "backchannelLogoutUri" text, "backchannelLogoutSessionRequired" boolean,
  "tokenEndpointAuthMethod" text, "applicationType" text, jwks text, "jwksUri" text,
  "grantTypes" jsonb, "responseTypes" jsonb, "requirePKCE" boolean,
  "dpopBoundAccessTokens" boolean, "referenceId" text, metadata jsonb
);
CREATE INDEX IF NOT EXISTS "oauthClient_userId_idx" ON "oauthClient" ("userId");

CREATE TABLE IF NOT EXISTS "oauthResource" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), identifier text NOT NULL UNIQUE, name text NOT NULL,
  "accessTokenTtl" integer, "refreshTokenTtl" integer, "signingAlgorithm" text,
  "signingKeyId" text, "allowedScopes" jsonb, "customClaims" jsonb,
  "dpopBoundAccessTokensRequired" boolean, disabled boolean, "createdAt" timestamptz,
  "updatedAt" timestamptz, "policyVersion" integer, metadata jsonb
);

CREATE TABLE IF NOT EXISTS "oauthClientResource" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clientId" text NOT NULL REFERENCES "oauthClient" ("clientId") ON DELETE CASCADE,
  "resourceId" text NOT NULL REFERENCES "oauthResource" (identifier) ON DELETE CASCADE,
  metadata jsonb, "createdAt" timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS "oauthClientResource_clientId_resourceId_uidx"
  ON "oauthClientResource" ("clientId", "resourceId");

CREATE TABLE IF NOT EXISTS "oauthRefreshToken" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token text NOT NULL UNIQUE,
  "clientId" text NOT NULL REFERENCES "oauthClient" ("clientId") ON DELETE CASCADE,
  "sessionId" uuid REFERENCES session (id) ON DELETE SET NULL,
  "userId" uuid NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  "referenceId" text, "authorizationCodeId" text, resources jsonb,
  "requestedUserInfoClaims" jsonb, "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL, revoked timestamptz, "rotatedAt" timestamptz,
  "rotationReplayResponse" text, "rotationReplayExpiresAt" timestamptz,
  "authTime" timestamptz, confirmation jsonb, scopes jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS "oauthAccessToken" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token text NOT NULL UNIQUE,
  "clientId" text NOT NULL REFERENCES "oauthClient" ("clientId") ON DELETE CASCADE,
  "sessionId" uuid REFERENCES session (id) ON DELETE SET NULL,
  "userId" uuid REFERENCES "user" (id) ON DELETE CASCADE,
  "referenceId" text, "authorizationCodeId" text, resources jsonb,
  "requestedUserInfoClaims" jsonb,
  "refreshId" uuid REFERENCES "oauthRefreshToken" (id) ON DELETE CASCADE,
  "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL,
  revoked timestamptz, confirmation jsonb, scopes jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS "oauthConsent" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clientId" text NOT NULL REFERENCES "oauthClient" ("clientId") ON DELETE CASCADE,
  "userId" uuid REFERENCES "user" (id) ON DELETE CASCADE,
  "referenceId" text, resources jsonb, "requestedUserInfoClaims" jsonb,
  scopes jsonb NOT NULL, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "oauthClientAssertion" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "expiresAt" timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS "oauthRefreshToken_clientId_idx" ON "oauthRefreshToken" ("clientId");
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_sessionId_idx" ON "oauthRefreshToken" ("sessionId");
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_userId_idx" ON "oauthRefreshToken" ("userId");
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_authorizationCodeId_idx" ON "oauthRefreshToken" ("authorizationCodeId");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_clientId_idx" ON "oauthAccessToken" ("clientId");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_sessionId_idx" ON "oauthAccessToken" ("sessionId");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_userId_idx" ON "oauthAccessToken" ("userId");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_authorizationCodeId_idx" ON "oauthAccessToken" ("authorizationCodeId");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_refreshId_idx" ON "oauthAccessToken" ("refreshId");
CREATE INDEX IF NOT EXISTS "oauthConsent_clientId_idx" ON "oauthConsent" ("clientId");
CREATE INDEX IF NOT EXISTS "oauthConsent_userId_idx" ON "oauthConsent" ("userId");

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO backlog_auth;
RESET ROLE;
