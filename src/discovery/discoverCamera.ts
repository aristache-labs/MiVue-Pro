import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";
import { performance } from "node:perf_hooks";
import { parseConfigResponse } from "../protocol/parser.js";
import type { CameraEndpoint } from "../protocol/types.js";
import { HttpTransport } from "../transport/httpTransport.js";
import type { Logger } from "../utils/logger.js";

export interface DiscoveryResult {
  readonly endpoint: CameraEndpoint;
  readonly latencyMs: number;
  readonly server?: string;
}

export interface DiscoveryOptions {
  readonly explicitHosts?: readonly string[];
  readonly timeoutMs?: number;
  readonly logger?: Logger;
}

const CONFIRMED_MIVUE_866_HOST = "192.72.1.1";

export async function discoverCamera(options: DiscoveryOptions = {}): Promise<DiscoveryResult | undefined> {
  const candidates = options.explicitHosts?.length
    ? [...new Set(options.explicitHosts)]
    : generateCandidateHosts();

  options.logger?.debug(`Discovery candidates: ${candidates.join(", ")}`);
  const results = await Promise.allSettled(
    candidates.map(async (host): Promise<DiscoveryResult | undefined> => {
      const started = performance.now();
      const transport = new HttpTransport({
        host,
        timeoutMs: options.timeoutMs ?? 1_200,
        attempts: 1,
        maxBodyBytes: 32 * 1024,
        ...(options.logger === undefined ? {} : { logger: options.logger }),
      });

      try {
        const response = await transport.request({
          method: "GET",
          path: "/cgi-bin/Config.cgi?action=get&property=status",
        });
        if (response.statusCode !== 200) {
          return undefined;
        }

        const parsed = parseConfigResponse(new TextDecoder().decode(response.body));
        if (parsed.code !== 0 || parsed.message.toUpperCase() !== "OK" || !("status" in parsed.properties)) {
          return undefined;
        }

        return {
          endpoint: { host, httpPort: 80, rtspPort: 554 },
          latencyMs: performance.now() - started,
          ...(response.headers.server === undefined ? {} : { server: response.headers.server }),
        };
      } catch (error) {
        options.logger?.debug(`Candidate ${host} rejected: ${errorMessage(error)}`);
        return undefined;
      }
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value !== undefined) {
      return result.value;
    }
  }
  return undefined;
}

export function generateCandidateHosts(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces(),
): string[] {
  const candidates = new Set<string>();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.internal || entry.family !== "IPv4" || entry.address.startsWith("169.254.")) {
        continue;
      }
      const address = ipv4ToInt(entry.address);
      const mask = ipv4ToInt(entry.netmask);
      const network = (address & mask) >>> 0;
      const broadcast = (network | (~mask >>> 0)) >>> 0;
      if (broadcast - network >= 2) {
        candidates.add(intToIpv4((network + 1) >>> 0));
        candidates.add(intToIpv4((broadcast - 1) >>> 0));
      }
    }
  }
  candidates.add(CONFIRMED_MIVUE_866_HOST);
  return [...candidates];
}

function ipv4ToInt(value: string): number {
  const octets = value.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    throw new Error(`Invalid IPv4 address: ${value}`);
  }
  return octets.reduce((result, octet) => (result * 256 + octet) >>> 0, 0);
}

function intToIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
