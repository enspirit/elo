/**
 * The server: `createService` behind `node:http`, and the command line that
 * starts it.
 *
 *     contrib/formula-service/bin/elo-formula-service --port 3000
 *     contrib/formula-service/bin/elo-formula-service ./my-formulas --port 3000
 *
 * It reads the catalogue, checks every bundle and runs every case before it
 * listens — so a service that is up is one whose formulas all answer what
 * their documentation says, and a bad bundle is a boot failure rather than a
 * surprise for the first caller.
 */

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { EXAMPLE_CATALOGUE } from './bundle';
import { createService, type Service, type ServiceOptions } from './service';

export interface ServeOptions extends ServiceOptions {
  /** 0 asks the operating system for a free one, which is what tests do. */
  port?: number;
  host?: string;
}

export async function serve(options: ServeOptions): Promise<{ server: Server; url: string; service: Service }> {
  const { port = 8080, host = '127.0.0.1' } = options;
  const service = createService(options);
  const server = createServer(service.handler);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });
  const address = server.address() as AddressInfo;
  return { server, url: `http://${host}:${address.port}`, service };
}

export async function main(args: string[]): Promise<void> {
  const flag = (name: string): string | undefined => {
    const at = args.indexOf(`--${name}`);
    return at === -1 ? undefined : args[at + 1];
  };
  const number = (name: string): number | undefined => {
    const value = flag(name);
    return value === undefined ? undefined : Number(value);
  };
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: elo-formula-service [<catalogue>] [--port N] [--host H] [--timeout MS] [--max-heap MB]

A REST API over a catalogue of formula bundles. The catalogue defaults to the
thirteen formulas this contrib ships with.`);
    return;
  }

  const catalogue = args.find(argument => !argument.startsWith('--') && !isValueOfAFlag(args, argument))
    ?? EXAMPLE_CATALOGUE;
  const { url, service } = await serve({
    catalogue,
    port: number('port') ?? 8080,
    ...(flag('host') ? { host: flag('host') } : {}),
    ...(number('timeout') ? { timeoutMs: number('timeout') } : {}),
    ...(number('max-heap') ? { maxHeapMb: number('max-heap') } : {}),
  });
  console.log(`elo-formula-service: ${service.catalogue.formulas.length} formulas from ${catalogue}, on ${url}`);
}

/** Whether a bare argument is the value of the flag before it. */
function isValueOfAFlag(args: string[], argument: string): boolean {
  const at = args.indexOf(argument);
  return at > 0 && args[at - 1].startsWith('--');
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(error => {
    console.error(`elo-formula-service: ${(error as Error).message}`);
    process.exitCode = 1;
  });
}
