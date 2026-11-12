# HUANDENG Editor 0.23.1 — delivery record

Date: 2026-11-12.

Status: source validation in progress. This record will identify the accepted package and actual installed delivery after the required gates complete.

The patch follows the [Unicode installer specification](SPEC-WINDOWS-UNICODE-0.23.1.md), with observed checks in [VALIDATION-V0231](VALIDATION-V0231.md) and user-facing changes in [RELEASE-V0231](RELEASE-V0231.md).

## Scope

The production change is confined to Windows shortcut persistence, installer/uninstaller integration and inclusion of the helper in the portable package. Product and native-plugin metadata advance together to 0.23.1. The 0.23 security, durable writer, rendering, performance and UX implementation remains the baseline.

The WScript shortcut defect was discovered by hosted Windows validation and reproduced with real paths outside the active Windows ANSI code page. The fix uses the Unicode Shell link interface for both save and ownership readback. The first seven-check native installer regression passed, including actual cross-code-page files, repeat repair, replacement ownership and preservation.

## Preserved boundaries

The previously published 0.23.0 tag, release assets and acceptance evidence are retained. Its release page records the newly discovered installer limitation. New package and runtime evidence belongs under .verification/implementation-20261112/patch-0231/.

Current-user shortcuts and registrations, four existing Project tabs, research entry hashes and native-client state will be checked against the actual pre-upgrade state. Synthetic fixtures supply all writable acceptance tests. Existing account, model, permission and default-application settings remain outside the patch's edit scope.

Only a fully accepted clean package and matching same-name native plugins are delivered. Complete archives are downloaded back and hashed after publication. Source identity, actual installed state and hosted CI are separate recorded observations.
