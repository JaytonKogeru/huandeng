# v0.5 Windows writer lock verification

Date: 2026-11-07. Scope: the first Windows full-suite failures during v0.5 candidate verification.

## Observed failure

The first Windows unit-suite run ended with 58 passing files and 2 failing files: 768 tests passed, 2 failed, and 1 was skipped. The failures were:

- `store.test.ts`: verifies journal bytes against recorded hashes before recovery writes.
- `store-performance.test.ts`: fingerprints a shared asset once per scan while retaining every page dependency.

Both failed in `acquireWriterLock`, before their journal or asset assertions. They reported `WRITER_LOCKED`. An isolated journal test passing was insufficient evidence to dismiss this failure.

A separate diagnostic created 80 independent temporary project roots and acquired/released the actual production writer lock. It observed 79 successful acquisitions and one failure:

```text
listen EACCES: permission denied 127.0.0.1:56322
```

The diagnostic cleaned up its temporary data. Three subsequent binds to port 56322 at 2026-11-07 12:38:19 UTC all returned `EACCES`. `Get-NetTCPConnection -LocalPort 56322` returned no connection, while `Get-NetTCPSetting` reported the dynamic TCP range as 49152–65535. The excluded-port table was not available to this verification session. These observations establish persistent OS refusal at the sampled port; they do not identify the precise Windows reservation or policy responsible.

The legacy lock maps each canonical project root to one TCP port in 20000–59999. Consequently, an unrelated OS port restriction or application can prevent a writable open. This is a product limitation of that lock protocol, separate from journal integrity or shared-asset scanning.

## Conservative change

The v0.5 candidate retains the same port calculation, canonical root normalization, exclusive kernel lease, and failure behavior. It does not retry on a different port or replace the legacy lock with a named pipe.

The error now includes the OS error code and the attempted port in its message. Structured details distinguish `lock-port-in-use` for `EADDRINUSE` from `lock-port-unavailable` for an OS refusal, and retain the original cause. The message offers read-only access or, for an unavailable port, working with a copy in another folder. The original project is not automatically moved or rewritten.

Windows named pipes can remove the dependency on a finite TCP port range, but v0.4 does not acquire such a pipe. Switching only the new version would allow a later v0.4 process to obtain its old TCP lock and write concurrently. Inspecting `writer.json` or connecting to the port once cannot prevent that later race. A complete lock-protocol migration therefore remains outside this patch; unknown active owners continue to block writable access.

## Test isolation and safety gates

Unrelated document tests now use a shared fixture-directory allocator. It creates a new synthetic directory and attempts the actual production lock before choosing that directory for the test. If the OS rejects the port, it removes that unused fixture and chooses another root, with a bound of 32 attempts. It does not retry transactions, bypass an active writer, change the lock algorithm, or suppress failed assertions. The store under test still independently acquires its real writer lock.

The existing canonical-root/different-state-directory conflict test remains unchanged. New writer-lock tests verify:

- `EACCES` and `EADDRINUSE` preserve a rejected writable open, create no owner record, and do not attempt a different port.
- A separate process implementing the legacy TCP listener blocks a new writer even without a shared owner JSON file.
- After that legacy process is forcibly terminated, the kernel releases the lease and the same project can be opened again.

Local Linux validation: 9 affected test files, 68 tests passed; core TypeScript and focused Biome checks passed. Windows validation of the updated fixtures and new process-level lock tests is recorded separately in the milestone handoff. The original failed Windows run remains part of the evidence and is not reclassified as a successful run.

## Remaining boundary

v0.5 does not eliminate the legacy protocol's sensitivity to unavailable TCP ports. It reports that condition accurately and preserves compatibility with v0.4's single-writer protection. A future migration must explicitly address both already-running and subsequently-started legacy writers before changing the primary lease.
