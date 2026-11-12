# HUANDENG 0.23.1 — Windows Unicode shortcut correction

Date: 2026-11-12.

All acceptance requirements below are complete at clean source `82023a5d68dd7bdd3c52e6e0faf89c2c889f16f0`, annotated `editor-v0.23.1`. Source and Official tag CI both passed. Actual installation, matching native clients and preservation passed, and all four published assets were downloaded back with matching sizes and SHA-256. The linked validation and delivery records retain the exact observations and unsuccessful attempts.

## Audited failure

The [Windows CI at d61f440](https://github.com/JaytonKogeru/huandeng/actions/runs/43178726765/job/131049189708) passed all 16 native contracts and 68 desktop tests, then failed while assigning the installer's `WScript.Shell` shortcut target for a real Chinese directory. The exception was an invalid argument at `Install-Huandeng.ps1`.

A local probe used existing synthetic targets and the unchanged Windows ANSI code page 936. ASCII and Chinese paths saved and read back successfully; Arabic and emoji paths failed at `TargetPath` assignment with HRESULT `0x80070057`. This is a product compatibility defect. Changing the test directory to ASCII or changing the runner's locale would hide it.

The original 0.23.0 runtime and assets have already been published. Preserve that tag and its recorded acceptance; deliver the correction as 0.23.1.

## Required implementation

Use the explicitly Unicode Windows Shell link interface for shortcut creation and ownership readback. Installation, repair and uninstall must share the same path representation. Include the helper in the portable distribution and its content manifest.

Preserve the current-user registration boundary and existing Windows default/UserChoice behavior. Keep separate Start Menu and Desktop locations and the NoDesktopShortcut option. Repair updates the owned link to the selected executable. An old installation must not remove a newer installation's shortcut or registrations.

Uninstall continues to remove only its owned registrations, matching shortcuts and unchanged manifest-listed files. Added Project files and modified application files remain. Manifest path traversal must reject before deletion. Do not replace durable writer, CAS, recovery, page identity or Project lifecycle behavior as part of this correction.

## Acceptance

- Reproduce the old failure against a real target outside the active ANSI code page, without changing system locale.
- Create and read back real shortcuts for ASCII, Chinese, Arabic and emoji paths; verify target, working directory and description.
- Exercise actual install, repair and uninstall, including replacement ownership, user-file preservation and malformed-manifest rejection.
- Test the unchanged default Start Menu/Desktop split and NoDesktopShortcut contract at its write boundary.
- Package from a clean source commit with the exact version and annotated tag; include the Unicode helper and verify all manifest hashes.
- Pass hosted Ubuntu core and the complete hosted Windows workflow, including package smoke, native creation/conflict/proposal review and artifact upload.
- Run the same two native 9-check suites against the clean Official executable; test a complete copied package's bundled install/repair/uninstall.
- Upgrade the existing current-user installation and matching same-name native plugins, preserve recorded research bytes and restored Project tabs, and verify actual installed launchers.
- Publish complete versioned archives only after acceptance; download them back and match sizes and SHA-256. Keep the prior release's identities and evidence.

## Primary API contracts

Microsoft documents [IShellLinkW](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nn-shobjidl_core-ishelllinkw) as the Unicode interface and distinguishes it from IShellLinkA. [SetPath](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ishelllinkw-setpath) accepts the target path as `LPCWSTR`; [IPersistFile](https://learn.microsoft.com/en-us/windows/win32/api/objidl/nn-objidl-ipersistfile) supplies persistence. Actual native readback, not the API choice alone, determines acceptance.

The [release notes](RELEASE-V0231.md), [validation record](VALIDATION-V0231.md) and [delivery record](HANDOFF-V0231.md) identify observed outcomes and artifact identities for this patch.
