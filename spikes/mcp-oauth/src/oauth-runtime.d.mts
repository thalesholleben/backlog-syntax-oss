import type { McpHttpHandler } from "@modelcontextprotocol/server";
import type { BetterAuthOptions } from "better-auth/types";
import type { Hono } from "hono";
import type { Pool } from "pg";

export interface SpikeAuthInput {
  database?: Pool;
  secret?: string;
}

export interface SpikeAuth {
  readonly $context: Promise<unknown>;
  handler(request: Request): Promise<Response>;
}

export declare function createSpikeAuthOptions(
  fetchClientMetadataResource: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
  input?: SpikeAuthInput,
): BetterAuthOptions;

export declare function createSpikeAuth(
  fetchClientMetadataResource: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
  input?: SpikeAuthInput,
): SpikeAuth;

export declare function createProtectedMcpEndpoint(
  auth: SpikeAuth,
  transport?: McpHttpHandler,
): (request: Request) => Promise<Response>;

export declare function createSpikeHonoApp(
  auth: SpikeAuth,
  transport?: McpHttpHandler,
): Hono;
