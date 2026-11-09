# PPTX delivery and shared copies

HUANDENG edits a PPTD Project. Its saved pages, organization, assets and notes remain the source of truth. Native export writes one fixed PPTX into that Project's `Exports` directory, using the PPTD entry basename. For `deck.pptd`, the output is `Exports/deck.pptx` with `deck.pptx.report.json` alongside it.

An explicitly configured shared destination receives an atomically replaced copy of that verified Project output. This gives the shared folder a stable filename without creating a second editable source. The publisher does not generate dated copies or delete existing historical files.

## Format support

| Format | Current HUANDENG support |
| --- | --- |
| PPTD | Open, edit, version, organize and present through the shared document service. |
| PPTX | Export for PowerPoint delivery. Arbitrary PPTX import and round-trip editing are not implemented. |
| Google Slides | No live Google Slides editor or connector in HUANDENG. An exported PPTX can be opened separately through Google Slides, with that application's own conversion behaviour. |
| PDF and PNG | Static output from the same frozen HUANDENG renderer. |

Native PPTX objects include supported text, lines, shapes, tables, formulae, chart families and groups. Original supported image bytes remain picture objects. Advanced content outside the native mapping uses a measured object-level image fallback, recorded with its reason. An `image` report entry can therefore mean an original picture or a rendered fallback; it does not mean the entire page was flattened. Missing or invalid objects without a reliable fallback stop complete export.

Fonts are referenced rather than embedded. PowerPoint can reflow text or lay out native chart labels differently. Interactive HUANDENG builds and transitions remain static in PPTX. See [POWERPOINT-COMPARISON.md](POWERPOINT-COMPARISON.md) for the detailed mapping and historical Office acceptance evidence.

Google documents its own PowerPoint-opening workflow in [Switch from Microsoft PowerPoint to Google Slides](https://support.google.com/docs/answer/9310378?hl=en). This is separate from a direct HUANDENG integration.

## Why shared copies use ordinary files

Microsoft's [OneDrive restrictions](https://support.microsoft.com/en-us/onedrive/restrictions-and-limitations-in-onedrive-and-sharepoint), under **Network or mapped drives**, state that OneDrive does not support synchronization through symbolic links or junction points. The publisher therefore mirrors validated ordinary files. A local shortcut or link would not provide the same reliable cloud-delivery contract.

The local file replacement confirms only the local result. OneDrive owns the later cloud synchronization; a successful publisher result is not proof that the cloud upload has finished.

## Quiet updates

Only Projects listed in the user's private `config.json` are published. That configuration is kept outside the repository and outside plugin packages.

```json
{
  "schemaVersion": 1,
  "quietMs": 3000,
  "projects": [
    {
      "id": "example",
      "entry": "C:/Example/Project/deck.pptd",
      "destination": "C:/Example/Share/Presentation.pptx"
    }
  ]
}
```

An open Editor schedules an update after saved document revisions settle. The sender's fixed Project entry determines which configured output is eligible; switching the active tab does not redirect the job. The packaged publisher runs as a separate hidden process and reuses an existing matching document service. When no service exists, it starts its own temporary service and shuts down only that owned service.

The existing Windows scheduled task provides a ten-minute fallback while the user is signed in. Its entry is the windowless Windows Script Host, which launches the packaged Editor executable in Node mode with a hidden window style. No terminal or Editor window is opened. The task remains visible in Task Scheduler.

The installer can be reviewed without making changes:

```powershell
./scripts/Install-PptxPublisher.ps1 -ApplicationPath '<installed Editor.exe>' -ConfigPath '<private config.json>'
```

Add `-Apply` to install the displayed action. The prior task XML and publisher files are retained in the private configuration directory. The installer refuses to replace a currently running old task.

## Publication rules and status

1. Hash the saved manifest, current pages, metadata and assets. Named-version asset archives and export outputs are excluded.
2. Skip unchanged sources when the verified Project output and shared copy are current.
3. Export through the native HUANDENG runtime into the Project. There is no second document writer.
4. Validate the PPTX ZIP entries and checksums, required presentation parts, slide count and notes count.
5. Re-read the saved source fingerprint. If the source changed during export, retain the previous shared copy and retry on a later update.
6. Stage the verified bytes beside the shared destination and replace the filename atomically. A locked Office file is retained; the publisher does not close Office, delete the destination first or discard the user's edits.

A viewer or sync client can repackage a PPTX without changing its document contents. The byte-equal check remains the fast path. If the source fingerprint and canonical Project export still match the last successful publication, the publisher can also recognize an equivalent shared ZIP: every exact entry name and every uncompressed payload must match, and both packages must pass the complete CRC and structure checks. Only container differences such as ZIP timestamps, compression and ordering are ignored. No document part, metadata part, Notes, asset, relationship or export report is excluded. Duplicate entries, corrupt packages and changed payloads cannot pass this equivalence check. The source and both files are checked again before accepting the result.

An equivalent repackaged shared file is left untouched, including when Office has it open. This avoids repeated replacement attempts for container-only changes. Changed source content follows the normal export path; a genuinely different or invalid shared package follows the normal repair path. The publisher does not adopt the shared copy as an editable source.

`state-v2.json` records the last check, state, canonical package SHA, actual shared-file SHA, and whether the two files are byte-identical. New exports and content-equivalence checks additionally record the document-content SHA. A `current` shared copy can be byte-identical or fully entry-content-equivalent; the status message distinguishes them. `publisher-v2.log` records updates and errors without a terminal. A per-run lock prevents the saved-change trigger and scheduled fallback from publishing concurrently. Failure in one configured Project does not block the other Projects.

The synthetic checks in `scripts/verify-pptx-publisher.mjs` cover valid and corrupt packages, source changes during export, unchanged-source skipping, missing shared copies, locked destinations, partial multi-Project failure, concurrent runs and hidden sender-scoped scheduling. They validate the publication mechanism. They do not replace actual PowerPoint rendering and editing checks.
