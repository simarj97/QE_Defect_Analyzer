import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

export class Store {
  constructor(file) {
    this.file = file;
    this.tail = Promise.resolve();
  }

  async init(seed = []) {
    await mkdir(dirname(this.file), { recursive: true });
    try {
      const s = JSON.parse(await readFile(this.file, 'utf8'));
      if (!Array.isArray(s.defects)) {
        throw Error('Invalid data file');
      }
      this.state = s;
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
      this.state = {
        defects: seed,
        sync: { lastSuccess: null, lastError: null }
      };
      await this.persist(this.state);
    }
  }

  async persist(state) {
    const tmp = this.file + '.' + Date.now() + '.tmp';
    await writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
    try {
      await rename(tmp, this.file);
    } catch {
      await writeFile(this.file, JSON.stringify(state, null, 2), { mode: 0o600 });
    }
  }

  read() {
    return structuredClone(this.state);
  }

  update(fn) {
    const task = this.tail.then(async () => {
      const next = this.read();
      const result = await fn(next);
      await this.persist(next);
      this.state = next;
      return result;
    });
    this.tail = task.catch(() => {});
    return task;
  }
}
