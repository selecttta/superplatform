// Deno type shims for VS Code IntelliSense
// Tells the Node TypeScript checker about Deno globals and URL-based imports.
// These files run in Deno — these shims silence false errors without the Deno extension.

declare namespace Deno {
    interface Env {
        get(key: string): string | undefined;
        get(key: string, defaultValue: string): string;
        set(key: string, value: string): void;
        toObject(): Record<string, string>;
    }
    export const env: Env;
    export const version: { deno: string; v8: string; typescript: string };
    export const pid: number;
    export function exit(code?: number): never;
}

// ── Module shims for URL-based Deno imports ─────────────────────────────────

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
    export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}
declare module 'https://deno.land/std@0.177.0/http/server.ts' {
    export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

// Explicit Supabase exports — replaces `export * from '@supabase/supabase-js'`
// which fails when the package isn't installed as a local Node module.
declare module 'https://esm.sh/@supabase/supabase-js@2' {
    export interface SupabaseClientOptions {
        global?: { headers?: Record<string, string> };
        auth?: Record<string, unknown>;
        db?: Record<string, unknown>;
    }
    export interface SupabaseClient {
        from(table: string): any;
        rpc(fn: string, params?: Record<string, unknown>): any;
        auth: {
            getUser(token?: string): Promise<{ data: { user: { id: string } | null }; error: any }>;
        };
    }
    export function createClient(
        supabaseUrl: string,
        supabaseKey: string,
        options?: SupabaseClientOptions
    ): SupabaseClient;
}

declare module 'https://deno.land/x/bcrypt@v0.4.1/mod.ts' {
    export function hash(data: string, salt?: string): Promise<string>;
    export function compare(data: string, hash: string): Promise<boolean>;
    export function genSalt(rounds?: number): Promise<string>;
}
