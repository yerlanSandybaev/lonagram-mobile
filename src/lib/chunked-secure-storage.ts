export const SECURE_VALUE_BYTE_LIMIT = 1800;

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export function splitUtf8(value: string, limit = SECURE_VALUE_BYTE_LIMIT): string[] {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length <= limit) return [value];
  const chunks: string[] = [];
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset < bytes.length) {
    let end = Math.min(offset + limit, bytes.length);
    while (end > offset && end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end -= 1;
    if (end === offset) end = Math.min(offset + limit, bytes.length);
    chunks.push(decoder.decode(bytes.subarray(offset, end)));
    offset = end;
  }
  return chunks;
}

function countKey(key: string): string {
  return `${key}.chunk.count`;
}

function chunkKey(key: string, index: number): string {
  return `${key}.chunk.${index}`;
}

export function createChunkedSecureStorage(store: KeyValueStore, limit = SECURE_VALUE_BYTE_LIMIT): KeyValueStore {
  return {
    async getItem(key) {
      const countRaw = await store.getItem(countKey(key));
      if (!countRaw) return store.getItem(key);
      const count = Number(countRaw);
      if (!Number.isInteger(count) || count < 1) return null;
      const parts: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const part = await store.getItem(chunkKey(key, index));
        if (part == null) return null;
        parts.push(part);
      }
      return parts.join("");
    },
    async setItem(key, value) {
      await this.removeItem(key);
      const chunks = splitUtf8(value, limit);
      if (chunks.length === 1) {
        await store.setItem(key, chunks[0] ?? "");
        return;
      }
      for (let index = 0; index < chunks.length; index += 1) {
        await store.setItem(chunkKey(key, index), chunks[index] ?? "");
      }
      await store.setItem(countKey(key), String(chunks.length));
    },
    async removeItem(key) {
      const countRaw = await store.getItem(countKey(key));
      const count = Number(countRaw);
      if (Number.isInteger(count) && count > 0) {
        for (let index = 0; index < count; index += 1) {
          await store.removeItem(chunkKey(key, index));
        }
        await store.removeItem(countKey(key));
      }
      await store.removeItem(key);
    },
  };
}

