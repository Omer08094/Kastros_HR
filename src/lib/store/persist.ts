import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { HrStore } from "@/lib/store/types";
import { createInitialStore } from "@/lib/store/seed";

const storePath = () => join(process.cwd(), "data", "kastros-hr-demo.json");

let chain: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.then(
    () => {},
    () => {},
  );
  return next;
}

export async function readStore(): Promise<HrStore> {
  const path = storePath();
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as HrStore;
  } catch {
    const initial = createInitialStore();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

export async function writeStore(store: HrStore): Promise<void> {
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(store, null, 2), "utf8");
}

export async function mutateStore<T>(fn: (store: HrStore) => { next: HrStore; result: T }): Promise<T> {
  return enqueue(async () => {
    const current = await readStore();
    const { next, result } = fn(structuredClone(current));
    await writeStore(next);
    return result;
  });
}
