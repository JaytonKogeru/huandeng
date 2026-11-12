# HUANDENG Editor on Windows

Extract the complete ZIP into a folder you want to keep. Run **HUANDENG Editor.exe** to use it portably.

## Install or repair

Run **Install-Huandeng.cmd** in the extracted folder. It registers HUANDENG for your Windows account and creates Start Menu/Desktop shortcuts. Administrator access is not required. Existing Windows default-app choices are retained; choose **Open with → HUANDENG Editor** or change Default Apps yourself when needed.

To upgrade, save and close the Editor, extract the new ZIP into its own folder, and run that folder's installer. Your Projects, media, named page versions, recovery journals and Editor preferences stay in their existing locations. Reopen a Project normally; generated Agent setup always uses the current installation.

PowerShell options: `Install-Huandeng.ps1 -NoDesktopShortcut` skips the Desktop shortcut; `-NoFileAssociation` leaves file registrations alone. Running the installer again repairs the same installation.

## Uninstall

Close the Editor and run **Uninstall-Huandeng.cmd** from the installation to remove. It removes only this installation's registrations, shortcuts and unchanged files listed in its content manifest. It retains Projects, preferences and files you added or changed. An older installation's uninstaller does not remove a newer installation's registrations.

To remove registrations and shortcuts while keeping the portable files, run `Uninstall-Huandeng.ps1` without `-RemoveApplication`.

## Verify a download

Compare the ZIP's SHA-256 with the release's `SHA256SUMS.txt`. The extracted `huandeng-build.json` identifies the source commit, product/Electron versions and release/development channel; `huandeng-content.json` lists individual file hashes. Current unsigned builds are labelled as unsigned. Windows may show an unknown-publisher notice; checksums establish download integrity, not a signing identity.

Use a short source checkout path for development (for example `D:\src\huandeng`). Authored examples and their page histories are preserved; deeper paths can exceed older Windows path limits.
