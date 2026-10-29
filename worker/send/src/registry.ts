// The one list of sends: what each is, who may upload to it, when it goes.
// It also keeps the pool: a send only starts if the account still has room for all of it.
// One alarm, always set for the next send due: a finished one after its day,
// an unfinished one after UNFINISHED_SECONDS.

import { DurableObject } from "cloudflare:workers";
import {
  LIFETIME_SECONDS,
  POOL_BYTES,
  UNFINISHED_SECONDS,
  shardCount,
  type SendKind,
} from "../../../src/utils/send";
import { randomId, randomToken } from "./secret";
import type { Shard } from "./shard";

const MS_PER_SECOND = 1000;
const ID_ATTEMPTS = 8;

export interface RegistryEnv {
  SHARDS: DurableObjectNamespace<Shard>;
}

export interface Send {
  id: string;
  kind: SendKind;
  name: string | null;
  type: string | null;
  extension: string | null;
  size: number;
  lock_salt: string | null;
  lock_hash: string | null;
  token: string;
  started: number;
  expires: number;
  done: number;
}

export type Fresh = Pick<
  Send,
  "kind" | "name" | "type" | "extension" | "size" | "lock_salt" | "lock_hash"
>;

export const shardOf = (env: RegistryEnv, id: string, index: number) =>
  env.SHARDS.get(env.SHARDS.idFromName(`${id}/${index}`));

export class Registry extends DurableObject<RegistryEnv> {
  constructor(ctx: DurableObjectState, env: RegistryEnv) {
    super(ctx, env);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS sends (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      name TEXT,
      type TEXT,
      extension TEXT,
      size INTEGER NOT NULL,
      lock_salt TEXT,
      lock_hash TEXT,
      token TEXT NOT NULL,
      started INTEGER NOT NULL,
      expires INTEGER NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    )`);
  }

  free(): number {
    const { taken } = this.ctx.storage.sql
      .exec<{ taken: number }>("SELECT COALESCE(SUM(size), 0) AS taken FROM sends")
      .one();
    return Math.max(0, POOL_BYTES - taken);
  }

  async start(fresh: Fresh): Promise<{ send: Send } | { free: number } | { busy: true }> {
    const free = this.free();
    if (fresh.size > free) return { free };
    const sql = this.ctx.storage.sql;
    for (let attempt = 0; attempt < ID_ATTEMPTS; attempt++) {
      const id = randomId();
      if (sql.exec("SELECT 1 FROM sends WHERE id = ?", id).toArray().length > 0) continue;
      const started = Date.now();
      const send: Send = {
        ...fresh,
        id,
        token: randomToken(),
        started,
        expires: started + LIFETIME_SECONDS * MS_PER_SECOND,
        done: 0,
      };
      sql.exec(
        `INSERT INTO sends (id, kind, name, type, extension, size, lock_salt, lock_hash, token, started, expires)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        send.id,
        send.kind,
        send.name,
        send.type,
        send.extension,
        send.size,
        send.lock_salt,
        send.lock_hash,
        send.token,
        send.started,
        send.expires,
      );
      await this.schedule();
      return { send };
    }
    return { busy: true };
  }

  // a send still being uploaded, for the one who holds its token
  uploading(id: string, token: string): Send | null {
    const [send] = this.ctx.storage.sql
      .exec<Send>("SELECT * FROM sends WHERE id = ? AND token = ? AND done = 0", id, token)
      .toArray();
    return send ?? null;
  }

  // a finished send, still within its day
  opened(id: string): Send | null {
    const [send] = this.ctx.storage.sql
      .exec<Send>("SELECT * FROM sends WHERE id = ? AND done = 1 AND expires > ?", id, Date.now())
      .toArray();
    return send ?? null;
  }

  // the link opens only once every byte announced is in
  async finish(id: string, token: string): Promise<{ send: Send } | { missing: number } | null> {
    const send = this.uploading(id, token);
    if (!send) return null;
    let stored = 0;
    for (let index = 0; index < shardCount(send.size); index++)
      stored += await shardOf(this.env, id, index).stored();
    if (stored !== send.size) return { missing: send.size - stored };
    this.ctx.storage.sql.exec("UPDATE sends SET done = 1 WHERE id = ?", id);
    await this.schedule();
    return { send: { ...send, done: 1 } };
  }

  // stop: the upload and every chunk of it go
  async drop(id: string, token: string): Promise<boolean> {
    const send = this.uploading(id, token);
    if (!send) return false;
    await this.forget(send);
    await this.schedule();
    return true;
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const due = this.ctx.storage.sql
      .exec<Send>(
        "SELECT * FROM sends WHERE expires <= ? OR (done = 0 AND started <= ?)",
        now,
        now - UNFINISHED_SECONDS * MS_PER_SECOND,
      )
      .toArray();
    for (const send of due) await this.forget(send);
    await this.schedule();
  }

  private async forget(send: Send): Promise<void> {
    for (let index = 0; index < shardCount(send.size); index++)
      await shardOf(this.env, send.id, index).purge();
    this.ctx.storage.sql.exec("DELETE FROM sends WHERE id = ?", send.id);
  }

  private async schedule(): Promise<void> {
    const { next } = this.ctx.storage.sql
      .exec<{
        next: number | null;
      }>("SELECT MIN(CASE WHEN done = 1 THEN expires ELSE MIN(expires, started + ?) END) AS next FROM sends", UNFINISHED_SECONDS * MS_PER_SECOND)
      .one();
    if (next === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(next);
  }
}
