# Security policy

HUANDENG runs a local document service and connects an Editor, command-line tools and agent clients to a project. Report possible vulnerabilities without publishing exploit details, credentials or private presentation content.

## Supported versions

HUANDENG is pre-1.0. Security fixes target the current source and latest Editor release; older releases do not have separately maintained security branches. The current documented Editor line is 0.22.x. Its version is distinct from the inherited `@open-slide/core` npm version.

Include both the Editor and plugin versions in a report, together with the source commit if you run a development checkout. Use the [release policy](docs/RELEASE-POLICY.md) for the project's versioning conventions.

## Private reporting status

GitHub private vulnerability reporting is enabled for `JaytonKogeru/huandeng`; the repository setting was verified on 2026-11-12. Use [Report a vulnerability](https://github.com/JaytonKogeru/huandeng/security/advisories/new) to send a private report to this repository's maintainers.

If the private form is unavailable, open a [question](https://github.com/JaytonKogeru/huandeng/issues/new?template=question.yml) titled “Request a private security contact” containing only that request. Do not include the vulnerability, affected private files or a proof of concept in a public issue.

No fallback email address or response-time commitment is published here. The upstream OpenSlide maintainers are not the security contact for HUANDENG.

## What to include privately

- Editor and plugin versions, or the source commit.
- Operating system, installation method and relevant client/host version.
- The affected component and the access the reporter already had.
- Minimal reproduction steps, expected behavior, actual behavior and the security impact.
- A small synthetic fixture if one is necessary.
- Relevant logs with tokens, private paths and presentation content removed.

Do not send a complete private project or account credentials. The maintainer can request further information through the verified private channel.

## Relevant scope

Useful reports include failures in the local document service's authentication or project boundary; unintended file reads or writes; path traversal; unsafe project/media handling; import/export processing; and plugin or MCP launch behavior implemented by HUANDENG.

For a third-party component, explain whether the issue is reachable through HUANDENG and identify the component. Problems confined to another product should also be reported to that product's maintainer.

Test only systems and data you own or are authorized to assess. Keep reproduction work limited to what is needed to demonstrate the issue.

## Coordinating a fix

The private report should establish the affected versions, reproducible impact and a plan for a fix and disclosure. Response timing and any reporter credit should be agreed in that channel.
