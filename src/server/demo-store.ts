import { randomBytes, createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import {
  initialState,
  applyCommand,
  type State,
} from "../opportunities/state.ts";
import { CommandSchema, type Command } from "../opportunities/contracts.ts";
import { OpportunityError } from "../opportunities/engine.ts";

type Saved = {
  expiresAt: number;
  state: State;
  operations: { key: string; digest: string; version: number; state: State }[];
};
const ttl = 30 * 24 * 60 * 60 * 1000;
export class DemoStore {
  directory: string;
  constructor(directory: string) {
    this.directory = directory;
  }
  private file(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new OpportunityError(
        "SESSION_REQUIRED",
        "Start a demo session first.",
        401,
      );
    return join(this.directory, `${token}.json`);
  }
  private write(token: string, saved: Saved) {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const target = this.file(token);
    const temp = `${target}.${randomBytes(6).toString("hex")}.tmp`;
    writeFileSync(temp, JSON.stringify(saved), { mode: 0o600 });
    renameSync(temp, target);
  }
  read(token: string, now = Date.now()): Saved | null {
    const file = this.file(token);
    try {
      const value = JSON.parse(readFileSync(file, "utf8")) as Saved;
      if (value.expiresAt <= now) {
        unlinkSync(file);
        return null;
      }
      return value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  create(now = Date.now()) {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    for (const file of readdirSync(this.directory).filter((f) =>
      /^[a-f0-9]{64}\.json$/.test(f),
    ))
      this.read(file.slice(0, -5), now);
    if (
      readdirSync(this.directory).filter((f) => f.endsWith(".json")).length >=
      100
    )
      throw new OpportunityError(
        "DEMO_CAPACITY",
        "Demo session limit reached. Try again later.",
        429,
      );
    const token = randomBytes(32).toString("hex");
    const saved = {
      expiresAt: now + ttl,
      state: initialState(),
      operations: [],
    };
    this.write(token, saved);
    return { token, ...saved };
  }
  update(token: string, command: Command, key: string, now = Date.now()) {
    if (!/^[a-zA-Z0-9-]{8,100}$/.test(key))
      throw new OpportunityError(
        "IDEMPOTENCY_KEY_REQUIRED",
        "Supply a valid Idempotency-Key.",
        400,
      );
    const saved = this.read(token, now);
    if (!saved)
      throw new OpportunityError(
        "SESSION_EXPIRED",
        "Demo session expired. Reload to start again.",
        401,
      );
    const parsed = CommandSchema.parse(command);
    const digest = createHash("sha256")
      .update(JSON.stringify(parsed))
      .digest("hex");
    const prior = saved.operations.find((op) => op.key === key);
    if (prior) {
      if (prior.digest !== digest)
        throw new OpportunityError(
          "IDEMPOTENCY_CONFLICT",
          "Key was already used for another input.",
          409,
        );
      return {
        ...saved,
        state: structuredClone(prior.state),
        replayed: true,
        operationVersion: prior.version,
      };
    }
    const state = applyCommand(saved.state, parsed, new Date(now));
    const next = {
      ...saved,
      state,
      operations: [
        ...saved.operations,
        { key, digest, version: state.version, state: structuredClone(state) },
      ].slice(-100),
    };
    this.write(token, next);
    return { ...next, replayed: false, operationVersion: state.version };
  }
  delete(token: string) {
    try {
      unlinkSync(this.file(token));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
export const demoStore = new DemoStore(
  join(process.cwd(), ".local", "opportunities"),
);
