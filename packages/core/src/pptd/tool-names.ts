/** Canonical tools are advertised; pre-rename clients can still dispatch their old names. */
export function canonicalToolName(name: string): string {
  return name
    .replace(/^huanding_/, 'huandeng_')
    .replace(/^huandeng_frame_record$/, 'huandeng_story_record');
}
