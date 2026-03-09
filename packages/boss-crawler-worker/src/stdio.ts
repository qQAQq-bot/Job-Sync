import readline from "node:readline";
import { stdin, stdout } from "node:process";

import { CommandInSchema, type CommandIn, type EventOut } from "./protocol.js";

export function emitEvent(event: EventOut): void {
  stdout.write(`${JSON.stringify(event)}\n`);
}

export function readCommands(onCommand: (cmd: CommandIn) => void): void {
  const rl = readline.createInterface({ input: stdin, crlfDelay: Infinity });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const parsed = CommandInSchema.safeParse(JSON.parse(trimmed));
      if (!parsed.success) {
        emitEvent({
          type: "ERROR",
          payload: {
            message: "Invalid command schema",
            stack: parsed.error.toString(),
          },
        });
        return;
      }
      onCommand(parsed.data);
    } catch (err) {
      emitEvent({
        type: "ERROR",
        payload: {
          message: "Failed to parse command JSON",
          stack: err instanceof Error ? err.stack : String(err),
        },
      });
    }
  });

  rl.on("close", () => {
    emitEvent({ type: "FINISHED" });
  });
}

