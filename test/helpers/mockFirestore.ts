type MockFn = ((...args: any[]) => any) & { calls: any[][] };

function createMockFn(fn?: (...args: any[]) => any): MockFn {
  const mock: MockFn = ((...args: any[]) => {
    mock.calls.push(args);
    return fn ? fn(...args) : undefined;
  }) as MockFn;
  mock.calls = [];
  return mock;
}

export interface MockFirestore {
  collection: MockFn;
  _store: Record<string, any[]>;
  _reset(): void;
}

export function createMockFirestore(data: Record<string, any[]> = {}): MockFirestore {
  const store: Record<string, any[]> = { ...data };

  function makeDocRef(name: string, id: string) {
    return {
      get: createMockFn(async () => ({
        exists: !!store[name]?.find((d: any) => d.id === id),
        data: () => store[name]?.find((d: any) => d.id === id),
        id,
      })),
      set: createMockFn(async (value: any) => {
        if (!store[name]) store[name] = [];
        store[name].push({ id, ...value });
      }),
      update: createMockFn(async (value: any) => {
        const idx = store[name]?.findIndex((d: any) => d.id === id);
        if (idx !== undefined && idx >= 0) Object.assign(store[name][idx], value);
      }),
      delete: createMockFn(async () => {
        if (store[name]) {
          store[name] = store[name].filter((d: any) => d.id !== id);
        }
      }),
    };
  }

  function makeCollectionRef(name: string) {
    const ref: any = {
      doc: createMockFn((id: string) => makeDocRef(name, id)),
      where: createMockFn(() => ref),
      limit: createMockFn(() => ref),
      get: createMockFn(async () => ({
        empty: true,
        docs: [],
      })),
      add: createMockFn(async (value: any) => {
        if (!store[name]) store[name] = [];
        const id = `mock-${Date.now()}`;
        store[name].push({ id, ...value });
        return { id };
      }),
    };
    return ref;
  }

  const collection = createMockFn((name: string) => makeCollectionRef(name));

  return {
    collection,
    _store: store,
    _reset() {
      for (const key of Object.keys(store)) {
        store[key] = [];
      }
    },
  };
}
