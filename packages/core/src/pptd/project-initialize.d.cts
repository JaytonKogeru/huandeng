export function initializeProject(
  directory: string,
  options?: { title?: string },
): Promise<{ root: string; entry: string; title: string }>;
