# HUANDENG Editor 0.23.1 — validation record

Date: 2026-11-12.

Status: focused source validation; clean-package, actual installation, native-client and hosted CI acceptance are not yet recorded as complete.

## Reproduced defect

The [d61f440 Windows job](https://github.com/JaytonKogeru/huandeng/actions/runs/43178726765/job/131049189708) passed 16 native contracts and 68 desktop tests, then failed at the real shortcut TargetPath assignment in Install-Huandeng.ps1. Its Ubuntu core job passed. The earlier discovery-test short-path alias issue had already been corrected and was not the cause of this failure.

A real Windows probe with ANSI code page 936 saved and read ASCII and Chinese targets. The same operation failed for existing Arabic and emoji targets at assignment, with HRESULT 0x80070057. The system locale was not changed. This established a production compatibility problem and ruled out changing the fixture to ASCII as a correction.

Original probe: .verification/implementation-20261112/release/unicode-shortcut-probe.json. Subsequent 0.23.1 evidence is stored separately under .verification/implementation-20261112/patch-0231/.

## Focused implementation acceptance

The first corrected installation contract run exited 0 in 4.77 seconds under Windows PowerShell 5.1, ANSI code page 936. All seven checks passed:

- Separate Start Menu/Desktop destinations and NoDesktopShortcut.
- Actual Chinese, Arabic and emoji target and shortcut directories, with native target, working-directory, description and icon readback.
- Unicode descriptions, arguments and icon metadata surviving save/load.
- Repair of a damaged shortcut, repeated twice.
- Replacement installation ownership: uninstalling the old installation leaves the new shortcut bytes and registration unchanged.
- Removal of owned Unicode links and unchanged owned files while retaining unrelated shortcuts, Project content, modified files and UserChoice.
- Malformed manifest path traversal rejected before deletion.

The default-location check intercepts the shortcut-write boundary. The actual COM operations use explicit isolated destinations. SHA-256 of both real current-user shortcuts was identical before and after the run.

Evidence: patch-0231/release/installer-execution.json and .verification/installer-contract-61e563290bb24ce4bf2edf938116393e/result.json, relative to the verification root and repository root respectively.

The old production installer at d61f440 failed against the same real Unicode fixture; the corrected production installer passed. Existing ASCII and Chinese shortcuts written by WScript were read and saved through the Unicode helper, then read back compatibly through WScript. Evidence: patch-0231/release/unicode-production-red-green.json.

The [first 0.23.1 hosted Windows job](https://github.com/JaytonKogeru/huandeng/actions/runs/43180601949/job/131055338093) passed all seven installation checks on ANSI code page 1252, including Chinese, Arabic and emoji paths. Native contracts passed 16/16, desktop tests passed 68/68 and Ubuntu core passed.

## CI script encoding correction

After those successful gates, that first hosted job stopped before Package-Huandeng.ps1 executed: Windows PowerShell 5.1 decoded the runner-generated UTF-8 inline script using code page 1252. The literal Chinese output directory introduced a smart quote in the misdecoded source and produced a missing-string-terminator parse error.

The workflow now constructs the identical Chinese directory using Unicode code points in ASCII script source. It retains Windows PowerShell 5.1 and the real Unicode output directory. A local parser regression reproduced the old error using UTF-8 bytes decoded as code page 1252, parsed the corrected source without errors, and evaluated the unchanged Unicode output path. It did not run the packager. Evidence: patch-0231/root/ci-encoding-red-green.json.

## Independent review

The helper uses CLSID_ShellLink, IID_IShellLinkW and the complete native interface method order with explicit wide-string marshaling. Persistence uses the framework's IPersistFile interface. Each locally owned COM object is released in finally. Shortcut ownership reads use the stored raw target without Resolve.

Installation and uninstall share that helper. Packaging copies it before generating the content manifest. Registry ownership still requires the full expected quoted command; file deletion still validates the manifest, path containment, reparse-point boundaries and current content hashes.

## Release provenance

The 0.23.0 release tag and asset hashes remain unchanged. The patch will carry its own clean source identity and 0.23.1 tag; the [release notes](RELEASE-V0231.md) and [delivery record](HANDOFF-V0231.md) record completed downstream acceptance and exact artifacts.
