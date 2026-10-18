# Install ISO Score Viewer on Mac

1. Open the supplied `.dmg` and drag **ISO Score Viewer** into **Applications**.
2. Open it from Applications. For this private build, if macOS blocks it, open **System Settings → Privacy & Security**, select **Open Anyway**, and confirm **Open**.
3. Import the supplied **Schumann-No14.tuna** from **Scores → Import**.
4. Choose your keyboard in settings. Conventional piano is the default; four-row Jankó is available.
5. For practice, connect your piano's USB MIDI interface. In **Keys & pedal**, select its input and connect. Learn an unused pedal if you want pedal control of fingerings. Leave sustain assigned to the piano.
6. In practice settings, select an available audio output and use **Test click** before starting. On an interface with many channels, the metronome uses its first stereo pair; other channels remain silent.

The app stores its library and personal choices on this Mac. Reading, editing and practice work offline. A recipient does not need Node, Rust or a development server. The release's build-evidence file identifies its supported architectures and configured minimum macOS version.

To verify the downloaded files in Terminal, open their folder and run `shasum -a 256 -c SHA256SUMS`.

The one-time approval follows [Apple's instructions for an app from an unidentified developer](https://support.apple.com/102445). Keep this private build and its checksums together when sharing it.
