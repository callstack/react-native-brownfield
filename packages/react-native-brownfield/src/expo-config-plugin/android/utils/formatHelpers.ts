export function formatMissingDimensionStrategies(
  missingDimensionStrategies: string[]
): string {
  return missingDimensionStrategies
    .map((value) => JSON.stringify(value))
    .join(', ');
}
