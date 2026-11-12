# HUANDENG Editor 0.23.1

Date: 2026-11-12. Builds on [0.23.0](RELEASE-V023.md).

Status: source acceptance is in progress; complete package, installed delivery and hosted CI outcomes will be recorded before publication.

## Windows Unicode installation correction

Hosted Windows CI exposed a real installer defect after native contracts and desktop tests passed. The WScript shortcut interface failed when the installation directory contained characters outside the system ANSI code page. The same failure was reproduced locally with Arabic and emoji paths on a Chinese Windows system.

Installation and uninstall now share an explicitly Unicode Windows Shell link implementation. The helper creates and reads actual shortcut files, preserves their path and metadata, and reads the stored target without asking Windows to search for a moved executable. It is included in the portable package and content manifest.

The original default Start Menu/Desktop behavior and NoDesktopShortcut option remain covered. Repair restores the selected target, working directory, description and icon. An older installation cannot unregister its replacement or change the replacement's shortcut. Uninstall retains unrelated shortcuts, added Project files, modified application files and existing Windows application choices.

See the [audited correction specification](SPEC-WINDOWS-UNICODE-0.23.1.md) and [validation record](VALIDATION-V0231.md).

## Compatibility

Product and native-plugin metadata use 0.23.1; desktop protocol remains 2, Electron remains 45.3.1 and the upstream core npm version remains 2.3.1. The security, writer, performance, creation, conflict and proposal-review implementation delivered in 0.23.0 is retained.

The [0.23 validation record](VALIDATION-V023.md) supplies the complete source, security, performance and scientific-export evidence. Its benchmark values are not new measurements of this installer patch. Existing research and frozen examples remain outside the patch's edit scope.

## Installation

Extract the complete 0.23.1 portable ZIP into a new folder and run its Install-Huandeng.cmd. Running the same entry again repairs owned registrations and shortcuts. Running it from the new version updates them to that installation while retaining an existing Windows default.

The bundled Uninstall-Huandeng.cmd removes this installation's registrations, matching shortcuts and unchanged manifest-listed application files. It retains user Projects, preferences, added files and modified application files.

The package is unsigned. The published 0.23.0 tag and assets remain available with an installer compatibility notice; this patch has its own version and artifact identity.

## Acceptance and artifacts

The [delivery record](HANDOFF-V0231.md) identifies the runtime, plugin sources, installed behavior and completed package checks. Versioned downloads, hashes and the observed hosted CI result are added after those gates pass.
