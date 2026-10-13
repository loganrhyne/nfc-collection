# Assembly idle and display standby

The Python server owns one monotonic idle clock for all dashboard clients.
Browser reconnects, rendering, LED data refreshes and heartbeat traffic do not
reset it. Trusted pointer/keyboard/wheel input, physical Pi input, NFC scan
events and explicit LED/registration controls do reset it.

By default, after five idle minutes, an enabled grid changes to Visualization.
After another fifteen idle minutes, the grid clears and the display goes into
standby. If the grid was manually switched off, it stays off through the idle
sequence and on wake. Manual Visualization starts its fifteen-minute timer
immediately. A touch or scan wakes the display and restores Interactive mode
if the grid was automatically switched off. Rescanning the same sample counts
as activity after the reader emits a new arrival event.

Registration in progress inhibits standby. LED selections and filters are
cached by the backend so wake can restore them without requiring a new browser
render. Mode changes and brightness updates are broadcast to all clients.
Interactions in Safari also count as shared activity; simply leaving another
browser open does not keep the assembly awake.

## Pi configuration

The display remains powered and the Pi keeps serving the app and scanning NFC.
For the current Bookworm/labwc installation, put these overrides in the existing
`python-services/.env` (loaded by the systemd service):

```dotenv
DISPLAY_STANDBY_ENABLED=true
DISPLAY_OUTPUT=HDMI-A-2
XDG_RUNTIME_DIR=/run/user/1000
WAYLAND_DISPLAY=wayland-0
DISPLAY_INPUT_GLOB=/dev/input/by-id/usb-WSD101_WSD101_*-event-if00
DISPLAY_IDLE_SECONDS=300
LED_AUTO_OFF_MINUTES=15
```

`DISPLAY_STANDBY_ENABLED` defaults to false off-Pi. The idle/LED sequence still
runs without display control. Timeouts must be positive; fractional values can
be used in an isolated test process. Output control calls `wlopm` with a bounded
timeout and fixed arguments, not a shell. Commands that fail are reported in
`/health` and standby is retried; the server does not claim successful display
standby when the command failed.

The service user needs access to its Wayland session and read access to the USB
touchscreen input device (the existing `input` group on this Pi). The backend
observes input without grabbing the device, storing keystrokes, or logging input
coordinates. This lets a touch wake HDMI even when Chromium cannot receive the
event. Device discovery retries after hotplug. No new Python dependency is
required. Disable the desktop's separate `swayidle` blanking timer when using
this integration so there is only one standby policy.

Restart `nfc-server` after changing configuration and reload the dashboard on
the Pi and other browsers to remove their old frontend idle timers.

On this Waveshare assembly, `wlopm --off` initially changed the output to Off
but it returned to On within half a second, even without an input watcher in
the test. For this immediate-wake behavior, Raspberry Pi documents appending
`vc4.force_hotplug=1` to the single line in `/boot/firmware/cmdline.txt` and
rebooting. The original boot command line was backed up before applying the
workaround. See the [screen blanking documentation](https://www.raspberrypi.com/documentation/computers/configuration.html#configure-screen-blanking).

## Checks

`/health` includes `idle.phase`, remaining time, configured timeouts, display
command errors and the number of physical input devices being observed.
Expected phases are `active`, `visualization`, `standby`.

Test output off/on with a guaranteed restoration and confirm the panel's
backlight actually goes dark. Then verify wake using both a physical touch and
a tag arrival. Automated regressions cover the full idle sequence, manual Off,
repeated scans, registration inhibition, multiple clients, native input events
and failed display commands. NFC registration tests continue to run with mock
hardware; no test writes to a physical tag.
