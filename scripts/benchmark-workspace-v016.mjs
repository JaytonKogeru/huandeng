// Keep one benchmark implementation; v0.16 comparisons opt out of background timer throttling.
process.argv.push('--active-timing');
await import('./benchmark-workspace-v015.mjs');
