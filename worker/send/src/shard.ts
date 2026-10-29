// One shard of one send: up to SHARD_BYTES of its bytes, in rows of ROW_BYTES.
// Rows are numbered across the whole send, so byte n always sits in row n / ROW_BYTES.
// The alarm set by the first chunk empties the shard when the send's day is over.

import { DurableObject } from "cloudflare:workers";
import { CHUNK_BYTES, ROW_BYTES, ROWS_PER_CHUNK } from "../../../src/utils/send";

export class Shard extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS rows (seq INTEGER PRIMARY KEY, data BLOB NOT NULL)",
    );
  }

  // a chunk sent again (a retry) replaces what came before
  async write(chunk: number, body: ReadableStream<Uint8Array>, expires: number): Promise<number> {
    const sql = this.ctx.storage.sql;
    const first = chunk * ROWS_PER_CHUNK;
    sql.exec("DELETE FROM rows WHERE seq >= ? AND seq < ?", first, first + ROWS_PER_CHUNK);

    const row = new Uint8Array(ROW_BYTES);
    let filled = 0;
    let seq = first;
    let total = 0;
    const put = () => {
      sql.exec("INSERT INTO rows (seq, data) VALUES (?, ?)", seq++, row.slice(0, filled).buffer);
      filled = 0;
    };
    const reader = body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > CHUNK_BYTES) {
        await reader.cancel();
        throw new RangeError("chunk too big");
      }
      for (let at = 0; at < value.length; ) {
        const take = Math.min(ROW_BYTES - filled, value.length - at);
        row.set(value.subarray(at, at + take), filled);
        filled += take;
        at += take;
        if (filled === ROW_BYTES) put();
      }
    }
    if (filled > 0) put();
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(expires);
    return total;
  }

  stored(): number {
    return this.ctx.storage.sql
      .exec<{ total: number }>("SELECT COALESCE(SUM(length(data)), 0) AS total FROM rows")
      .one().total;
  }

  // bytes [start, end) of the send, as long as they fall in this shard
  read(start: number, end: number): ReadableStream<Uint8Array> {
    const sql = this.ctx.storage.sql;
    let seq = Math.floor(start / ROW_BYTES);
    let skip = start - seq * ROW_BYTES;
    let left = end - start;
    return new ReadableStream({
      type: "bytes",
      pull(controller) {
        if (left <= 0) return controller.close();
        const [found] = sql
          .exec<{ data: ArrayBuffer }>("SELECT data FROM rows WHERE seq = ?", seq++)
          .toArray();
        if (!found) return controller.error(new Error("a row is missing"));
        const piece = new Uint8Array(found.data).subarray(skip, skip + left);
        skip = 0;
        left -= piece.length;
        controller.enqueue(piece);
      },
    });
  }

  async purge(): Promise<void> {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
