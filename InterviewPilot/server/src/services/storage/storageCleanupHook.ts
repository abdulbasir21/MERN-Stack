export type UserStorageCleanupFn = (userId: string) => Promise<void>;

// Phase 2 default is a no-op hook; Phase 4 replaces/extends this to delete ImageKit files.
const defaultStorageCleanup: UserStorageCleanupFn = async (_userId: string) => {
  // No-op until Phase 4 document storage is wired
};

let activeStorageCleanupHook: UserStorageCleanupFn = defaultStorageCleanup;

export async function runUserStorageCleanup(userId: string): Promise<void> {
  await activeStorageCleanupHook(userId);
}

export function setUserStorageCleanupHook(fn: UserStorageCleanupFn): void {
  activeStorageCleanupHook = fn;
}

export function resetUserStorageCleanupHook(): void {
  activeStorageCleanupHook = defaultStorageCleanup;
}
