---
title: The Mysterious Windows 11 Restart Issue - Can Threatening Teardown Fix a Computer? 😂
publishedAt: 2025-02-11T08:30:00Z
summary: Few things are more frustrating than a computer that randomly restarts for no clear reason, especially when you're in the middle of work (or a good movie). This Windows 11 machine seemed cursed—no error messages, no overheating, nothing super obvious in the event logs, just abrupt, unexplained reboots. I went through the usual suspects. Windows Updates, other software updates, GPU drivers, all other drivers, power supply checks, stress testing, and even a Windows reinstall via the Settings app. But just when I thought I had it solved, another reboot would strike. At some point, I even joked on Twitter that my next step would be tearing the machine apart piece by piece to reseat components and check every cable. And oddly enough, after making that public threat, the computer stayed stable for a while. Coincidence? Or does my PC have a sense of self-preservation? 😂 This post is a deep dive into my troubleshooting process and the unexpected trials and tribulations I had to go through. Did I finally solve this annoying riddle? Read on to find out! :)
---

> [!WARNING]\
> I am not a pro troubleshooter, I have a good track record and I have provided
> tech support and computer services professionally in the past however, my
> process is not perfect and should not be interpreted as guidance nor advice!

## The Problem: Random Restarts with No Clear Cause

A Windows 11 computer I was working with started exhibiting a frustrating issue:
intermittent restarts with no obvious trigger. There was no blue screen, no
error messages—just an unexpected reboot at seemingly random intervals.

At first, I suspected overheating, but temperatures looked fine. Then I checked
event logs, which provided nothing conclusive. Next, I ran memory diagnostics,
stress tests, and even a PSU check. Everything seemed normal, yet the problem
persisted.

## The Suspect: GPU Drivers

Using **Event Viewer** I started logging every shutdown event
(`1074,19,41,1001,7045`) then used **WinDbgX** to open the `.dump` file logged
when the system was rebooting. I traced the issue to the **NVIDIA GPU driver**
(`FAILURE_BUCKET_ID:  0x116_IMAGE_nvlddmkm.sys`).

However, even after using **DDU (Display Driver Uninstaller)** to completely
remove the drivers and then installing only the latest clean drivers directly
from NVIDIA, the problem persisted. In an attempt to rule out software
corruption, I even **reinstalled Windows 11 using the Settings app**.

For reference the issue that appeared in Event Viewer:
`The computer has rebooted from a bugcheck.  The bugcheck was: 0x00000116`

## The Joke Part of This Post

During this whole process I did what any normal person does: I tweeted about it.

Over the course of a few hours, I live-tweeted my troubleshooting process,
including using Event Viewer and WinDbgX to pinpoint the issue, running DDU to
reinstall clean NVIDIA drivers, and even reinstalling Windows 11.

After downgrading the GPU driver I tweeted that my **final next step** if the
issue persisted would be: taking the computer apart to reseat power connectors,
the GPU, and RAM, checking the power supply, and replacing the power cable if
necessary.

Now several hours after that tweet, the system is still running fine.. Did the
driver downgrade fix it or did the threat of being disassembled scare the
machine into behaving? 😆

**Update to this stupid joke: This didn't fix anything lol**

## The Resolution (Mostly Miserable Failed Attempts)

~~So far, the computer has remained stable. Whether it was truly the driver
downgrade or some cosmic response to my public proclamation, I may never know.
But one thing’s certain—sometimes, fixing tech problems involves a mix of
logical troubleshooting and a little bit of superstition.~~

### Update (2026-02-12): The following day...

The computer was left on overnight (using Power Toys Awake), and I woke up to
find that the system was still running fine. I'm looking forward to getting more
work done without the hassle of random reboots. I'll add another update to this
post if this problem comes up again, otherwise assume that regardless of if it
was the driver downgrade or the computer's fear of a screwdriver: ~~the issue is
resolved. 😊~~ **The issue was not resolved at this point.**

### Update (2025-02-15): The following week...

The computer did reboot randomly on February 13th while Glenda and I were
watching Secondhand Lions. I checked in the Event Viewer and it was the same
crash: `The bugcheck was: 0x00000116`.

Should I try to change the driver again, or should I follow up on my promise to
take the computer apart?

The computer hasn't rebooted a second time since then, I had to look up the
Event Viewer text from this blog post because apparently the Events Viewer
history didn't show what I remember.

Anyway I said I would post an update here if the problem came up again, so I'm
doing that.

I'll add another update to this post at some point to let you know how I
continue to diagnose and solve this problem. I have consdered and would like to
avoid contacting NVidia and Microsoft directly. My real wish is that this issue
isn't coming from a hardware based problem.

My decision now is whether to try changing to yet another version of the GPU
driver, or to _actually_ take the computer apart (so it knows it wasn't an empty
threat). 😊

Either way I'll have to leave another update here and once I've taken some
action then I will do that.

### Update (2025-02-21): Trying other drivers:

So... I had tried the older driver for a while and while things were certainly
better I was still getting random reboots with the same crash.

I went to go install another (even older) version of the NVidia driver when I
noticed that there was actually a **newer** driver released that day (yesterday
the 20th). I tried installing that driver and in no time the problem returned in
full force. I even tried installing (again) the latest Studio Driver but the
problem persisted. One thing I did notice is that the Game Ready driver causes a
slightly different version of the issue (after the crash the computer reboots
and the monitor's no longer work until a second manual reboot, where on the
Studio Driver the computer reboots but the monitors still work).

I'm currently installing the oldest version of the Studio Driver (555.99) and
we'll see where that leads. If the problem persists I'll probably try other
versions. In any case I should still open the case and at least do some due
diligence like reseating RAM (even in a different port).

More updates to come no matter what.

### Update (2025-02-27): Discord and Realtek

I finally ran into a situation where the computer was rebooting on its own
quickly; every time I opened a voice call on Discord and turned on my camera
(still after minutes of that).

I reinstalled Discord which fixed the problem, temporarily again.

Today I uninstalled several applications including the Realtek audio driver.

At that point I also uninstalled Discord and removed the local files recommended
by their documentation:
https://support.discord.com/hc/en-us/articles/115004307527--Windows-Corrupt-Installation

After rebooting and running the system without any reboots I installed Discord
using the Microsoft Store instead of from the website.

### Update (2025-03-01): Almost fixed?

I thought I had this fixed, went over 72 hours without a reboot. Then out of
seemingly nowhere we're back to getting random reboots.

What did I do that I hoped had fixed it? Removed the Realtek audio driver and/or
doing a clean install of Discord and reinstalling from the Windows Store
(instead of from the Discord website).

I was so happy to finally be rid of this problem then, here we go again back to
random reboots without any indication as to why.

Right before the first new random reboot I had opened the Logi Tune app, so I
immediate uninstalled it (and rebooted after). The computer has unfortunately
rebooted since then.

The last thing I've done so far is to uninstall VS Code using the Windows
`Add or remove programs` system settings panel then, reinstalling it from the
Microsoft Store app.

I think at this point I'm left with two choices: Reinstall Windows from scratch
or continue tracing down a likely software issue. It could be that this is
actually a hardware issue but given the changes in behavior after changing the
software in the many ways I have so far: My theory is that there is some kind of
corruption on on the hard drive, in the Windows installation (or something deep
enough that it's causing issues with newly installed apps). I could try the
**reinstall Windows 11 using the Settings app** again I suppose.

### Recap of attempted troubleshooting steps to this point:

- Reinstalling Windows from Settings App (without deleting apps)
- Downgrading and upgrading NVIDIA GPU drivers (multiple versions)
- Using DDU (Display Driver Uninstaller) for clean GPU driver installs
- Removing Realtek audio drivers
- Reinstalling Discord (both from the website and Microsoft Store)
- Checking Event Viewer and analyzing crash dumps with WinDbgX
- Uninstalling VS Code and reinstalling from the Microsoft Store
- Uninstalling Logi Tune
- Run Memtest (from bootable image)

### Facts of the case:

- Apps I installed (and their configs etc.):
  - Visual Studio Code installed
    - Using Continue
      - Ollama
  - Microsoft PowerToys installed
    - PowerToys Awake used entire time
  - Docker
  - Asana
  - Ollama
  - Krita
  - Logi Tune
  - Logi Options+
- Apps likely already installed:
  - Discord
  - Spotify
  - Chrome
- Apps definitely already installed:
  - Steam
- Apps/drivers reinstalled by me:
  - NVIDIA 3060 driver
    - Newest, oldest, and a few others
      - Game Ready and Studio Driver
        - with and without optional software and drivers
  - Discord
  - Chrome
  - Visual Studio Code
- Apps installed by me then uninstalled without reinstall:
  - Logi Tune

### Options Being Considered

- Full Windows reinstall

### Update (2025-03-01): Turning off AUTO in BIOS PCIe Settings

Well, I reinstalled Windows 11 (using the Reset PC option in the Settings app).
It didn't take long before another random reboot happened again, and again I saw
the same Error message in the Event Viewer.

This time I looked a little more into the Event Viewer logs and saw a bunch of
other event messages, a bunch of which said something about the PCI Express Root
Port.

```
A corrected hardware error has occurred.

Component: PCI Express Root Port
Error Source: Advanced Error Reporting (PCI Express)

Primary Bus:Device:Function: 0x0:0x1:0x0
Secondary Bus:Device:Function: 0x0:0x0:0x0
Primary Device Name:PCI\VEN_8086&DEV_4C01&SUBSYS_373317AA&REV_01
Secondary Device Name:
```

I found some posts about people experiencing and fixing problems related to
these kinds of log messages and the fix that worked for many was to switch from
the `Auto` PCIe version setting to manually selecting PCIe 3...

I tried the same on this machine and haven't had any reboots since, although I
did just notice that I'm still seeing that message over and over in the Event
Viewer. I'll be digging into that more later but for now I'm just hoping that
the PC doesn't randomly crash again.

Here's the related post that I saw:

- https://www.reddit.com/r/buildapc/comments/tpicq0/whea_logger_id_event_17/

### Update (2025-03-19): Setting NVIDIA Power Management Mode to Prefer Maximum Performance

![Chat GPT Screenshot](/fix-busreset-gpt-screenshot.png)

I found another more specific Event Viewer entry
`BusReset TDR occurred on GPUID:100` and put it into ChatGPT (something I've
been doing a lot recently lol) and I was reminded to try the following:

```
4. Adjust Power Settings
NVIDIA drivers sometimes have issues with power management settings, especially on desktop systems.

Right-click on the desktop and choose NVIDIA Control Panel.
Under Manage 3D Settings, look for the Power Management Mode setting.
Change it from Optimal Power to Prefer Maximum Performance.
```

This was back on the 13th (6 days ago) and the computer has not rebooted
unexpectedly since then.

## Solution?: Setting NVIDIA Power Management Mode to Prefer Maximum Performance

I can finally say the computer has not rebooted unexpectedly for more than a
couple of weeks!

Here is a reminder of the last setting I changed:

- `NVIDIA Control Panel`:
  - `Manage 3D Settings`:
    - `Power Management Mode` = `Prefer Maximum Performance`

I would like to spend some time to switch back to the original bios setting and
see if the problem persists. When I do then I'll post a final update here.

## Conclusion

I'm happy to say the computer has not rebooted unexpectedly for more than a
couple of weeks but until I know exactly why this was happening I'm not sure if
this is a permanent solution or just a temporary one. Even if it is a permanent
solution the nerd in me must know WHY this happened in the first place.

Future steps:

- [ ] Switch back to the original bios setting (`PCIe`: `Auto`).
- [x] Update the NVIDIA video driver to latest version (studio and game ready).
- [x] Update all other software and drivers (including OS).

## Screenshots

<div class="flex flex-col space-y-2 space-x-2=">
  <img src="/win11-pc-screenshot-event-viewer-restarts.jpg" alt="Win11 PC Screenshot: Event Viewer Restarts" width="600" height="450" class="img-responsive mx-auto" />
  <img src="/win11-pc-screenshot-hwinfo-taskmanager.jpg" alt="Win11 PC Screenshot: HWInfo Task Manager" width="600" height="450" class="img-responsive mx-auto" />
</div>
