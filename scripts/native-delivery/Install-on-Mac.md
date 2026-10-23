# Install ISO Score Viewer on Mac

This zip holds the app, **ISO Score Viewer.app**, and the same app in a disk image (the `.dmg` file). You need only one of them. Safari may already have unzipped the download into a folder in **Downloads**; use that folder.

1. Drag **ISO Score Viewer.app** from this folder into **Applications**. (Or open the `.dmg` and drag **ISO Score Viewer** from its window into **Applications**.)
2. Open **ISO Score Viewer** from Applications. This private build is not signed by Apple, so the first time macOS stops it with a message that Apple could not check it. Click **Done** (not **Move to Trash**).
3. Open **System Settings → Privacy & Security** and scroll down to **Security**. Beside the message that ISO Score Viewer was blocked, click **Open Anyway**, then confirm with your password or Touch ID and click **Open Anyway** again. The app opens. You do this only once; afterwards it opens normally. (On macOS 13 and 14 you can instead Control-click the app in Applications, choose **Open**, then click **Open**.)
4. Import the supplied **Schumann-No14.tuna** from **Scores → Import**.
5. Choose your keyboard at the top of **Scores**. Conventional piano is the default; four-row Jankó is available.
6. For practice, connect your piano's USB MIDI interface. In **Options → Input / output**, select its input and connect. Learn an unused pedal in **Keys / pedals** if you want pedal control of fingerings. Leave sustain assigned to the piano.
7. In **Options → Input / output**, select an available audio output and use **Test click** before starting. **Options → Piano** sets the piano volume and the metronome volume. On an interface with many channels, the metronome uses its first stereo pair; other channels remain silent.

The app stores its library and personal choices on this Mac. Reading, editing and practice work offline. A recipient does not need Node, Rust or a development server. The release's build-evidence file identifies its supported architectures and configured minimum macOS version (macOS 13.3).

To verify the downloaded files in Terminal, open this folder and run `shasum -a 256 -c SHA256SUMS`.

The one-time approval follows [Apple's instructions for opening an app from an unknown developer](https://support.apple.com/102445). Keep this private build and its checksums together when sharing it.
