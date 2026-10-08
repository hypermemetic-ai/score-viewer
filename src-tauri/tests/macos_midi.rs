//! Native virtual-only transport check. No user's piano/source is opened.
#![cfg(target_os = "macos")]
#[path = "../src/midi_events.rs"]
mod midi_events;
use midir::{MidiInput, MidiOutput, Ignore, os::unix::VirtualOutput};
use midi_events::{MidiIngress, InputEvent};
use std::{sync::mpsc, time::{Duration, Instant}};

#[test]
fn isolated_coremidi_transport_preserves_note_filter_and_pedal_messages() {
    let name = format!("ISO private test {}", std::process::id());
    // The isolated test sender creates a source; the passive receiver discovers
    // and connects to it in the same direction as the app's real piano adapter.
    let mut sender = MidiOutput::new("ISO private virtual-test sender").unwrap()
        .create_virtual(&name).unwrap();
    let mut input = MidiInput::new("ISO private transport-test receiver").unwrap();
    input.ignore(Ignore::All);
    let deadline = Instant::now() + Duration::from_secs(2);
    let port = loop {
        if let Some(port) = input.ports().into_iter().find(|p|
            input.port_name(p).ok().as_deref().is_some_and(|n|n.contains(&name))) { break port; }
        assert!(Instant::now() < deadline, "virtual CoreMIDI source did not appear");
        std::thread::sleep(Duration::from_millis(10));
    };
    let (tx, rx) = mpsc::channel();
    let mut ingress = MidiIngress::default();
    let connection = input.connect(&port, "ISO isolated passive receiver", move |driver_micros, data, _| {
        if let Some(event) = ingress.receive(data, driver_micros) {
            tx.send(event).unwrap();
        }
    }, ()).unwrap();
    for message in [[0x90,55,64],[0x90,55,64],[0x80,55,0],[0x90,55,1],
        [0xb0,67,127],[0xb0,67,0],[0xb0,64,127],[0x90,55,0]] {
        sender.send(&message).unwrap();
    }
    let events: Vec<_> = (0..8).map(|_|rx.recv_timeout(Duration::from_secs(2)).unwrap()).collect();
    assert!(matches!(events[0], InputEvent::Note { on:true,filtered:false,.. }));
    assert!(matches!(events[1], InputEvent::Note { on:true,filtered:true,.. }));
    assert!(matches!(events[2], InputEvent::Note { on:false,filtered:false,.. }));
    assert!(matches!(events[3], InputEvent::Note { on:true,velocity:1,filtered:false,.. }));
    assert_eq!(events[4],InputEvent::Controller {channel:1,controller:67,value:127});
    assert_eq!(events[5],InputEvent::Controller {channel:1,controller:67,value:0});
    assert_eq!(events[6],InputEvent::Controller {channel:1,controller:64,value:127});
    assert!(matches!(events[7], InputEvent::Note { on:false,.. }));
    drop(sender);
    drop(connection);
    let observer = MidiInput::new("ISO private disappearance observer").unwrap();
    let deadline = Instant::now() + Duration::from_secs(2);
    while observer.ports().iter().any(|p|observer.port_name(p).ok().as_deref().is_some_and(|n|n.contains(&name))) {
        assert!(Instant::now() < deadline, "virtual CoreMIDI source remained after disconnect");
        std::thread::sleep(Duration::from_millis(10));
    }
}
