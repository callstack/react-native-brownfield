export function hasExpoUpdatesInstalled(
  projectRoot: string | undefined
): boolean {
  if (!projectRoot) return false;
  try {
    require.resolve('expo-updates/package.json', {
      paths: [projectRoot],
    });
    return true;
  } catch {
    return false;
  }
}
