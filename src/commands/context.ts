import type { Logger } from "../utils/logger.js";

export interface CommandContext {
  readonly host?: string;
  readonly timeoutMs: number;
  readonly json: boolean;
  readonly logger: Logger;
}
