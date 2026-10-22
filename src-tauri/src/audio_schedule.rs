//! Scheduled notes, pedal and count-in clicks from the web layer, timed on the
//! monotonic MIDI clock as presentation instants. Commands validate and push
//! into a fixed queue; the render callback applies events at sample offsets
//! within each sampler quantum, without allocation, locks or waiting.
//!
//! A stream is replaced by a new epoch from a cut: events of earlier epochs
//! before the cut still sound and later ones are discarded, so notes already
//! sounding keep sounding while the rest follows a new tempo. A release
//! replacement (cut 0) silences the scheduled stream at once. Live MIDI keeps
//! its own contacts; neither stream's replacement releases the other.
use super::queue::Queue;
use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};

pub const CAPACITY: usize = 2048;
pub const MAX_SUBMIT: usize = 512;
/// Callback pops per sampler quantum, including discarded stale events.
const BUDGET: usize = 512;
/// Unobserved replacements the producer may publish ahead of the callback.
const WINDOW: u64 = 4;
const CUTS: usize = 8;
// The callback reads the cuts of up to WINDOW observed epochs while the
// producer writes up to WINDOW more; neither may wrap onto the other.
const _: () = assert!(2 * WINDOW as usize <= CUTS);
const MAX_AHEAD_MICROS: u64 = 60_000_000;
/// An attack this late is skipped, so a stalled output does not burst.
pub const LATE_MICROS: u64 = 50_000;
const CUT_MARGIN_MICROS: u64 = 5_000;
const STALLED_MICROS: u64 = 500_000;
/// The scheduled stream's contact channel, beside live MIDI channels 1–16.
pub const CHANNEL: u8 = 17;

pub const NOTE_ON: u8 = 1;
pub const NOTE_OFF: u8 = 2;
pub const CONTROL: u8 = 3;
pub const CLICK: u8 = 4;

pub const OFF: &str = "Piano sound is off.";
pub const BUSY: &str = "Piano schedule is busy";
pub const STALE: &str = "Piano schedule was replaced";
/// The producer retries this once with a fresh lead.
pub const TOO_SOON: &str = "Piano schedule starts too soon";

#[derive(Copy, Clone, Default, Debug, PartialEq, Eq)]
pub struct Event {
    pub at: u64,
    pub kind: u8,
    pub key: u8,
    pub value: u8,
}
#[derive(Copy, Clone, Default, Debug, PartialEq, Eq)]
struct Scheduled {
    event: Event,
    epoch: u64,
}

#[derive(Default)]
pub struct ScheduleBus {
    queue: Queue<Scheduled, CAPACITY>,
    epoch: AtomicU64,
    /// Cut of the replacement INTO each recent epoch; 0 releases.
    cuts: [AtomicU64; CUTS],
    observed: AtomicU64,
    /// Presentation instant after the last rendered frame; 0 when not rendering.
    rendered: AtomicU64,
    transfer: AtomicU64,
    pub late: AtomicU64,
}
/// Producer-side stream state; the command layer serializes it with a mutex.
#[derive(Default)]
pub struct Submitter {
    epoch: u64,
    last: u64,
}
#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Receipt {
    pub epoch: u64,
    pub accepted: u32,
    pub clock: u64,
    pub lead_micros: u64,
    pub late: u64,
}

fn validate(events: &[Event], floor: u64, now: u64) -> Result<(), String> {
    if events.len() > MAX_SUBMIT {
        return Err("Too many piano events in one submission".into());
    }
    let mut last = floor;
    for e in events {
        let valid = e.key <= 127
            && e.value <= 127
            && match e.kind {
                NOTE_ON => e.value > 0,
                NOTE_OFF | CONTROL => true,
                CLICK => e.value <= 1,
                _ => false,
            };
        if !valid {
            return Err("Invalid piano event".into());
        }
        if e.at < last || e.at > now.saturating_add(MAX_AHEAD_MICROS) {
            return Err("Piano events must be in time order and ahead of the output".into());
        }
        last = e.at;
    }
    Ok(())
}

impl Submitter {
    pub fn epoch(&self) -> u64 {
        self.epoch
    }
}
impl ScheduleBus {
    /// A new output starts a fresh epoch with nothing pending. Worker only,
    /// before the new render callback exists.
    pub fn restart(&self) -> u64 {
        let next = self.epoch.load(Ordering::Acquire).wrapping_add(1);
        self.cuts[next as usize % CUTS].store(0, Ordering::Release);
        self.rendered.store(0, Ordering::Release);
        self.transfer.store(0, Ordering::Release);
        self.epoch.store(next, Ordering::Release);
        self.observed.store(next, Ordering::Release);
        next
    }
    /// The earliest cut a replacement may name: beyond everything rendered or
    /// in flight, so the callback observes it before the cut is presented.
    pub fn lead(&self, now: u64) -> Result<u64, String> {
        let rendered = self.rendered.load(Ordering::Acquire);
        if rendered == 0 || now > rendered.saturating_add(STALLED_MICROS) {
            return Err("The piano output is not running.".into());
        }
        let transfer = self.transfer.load(Ordering::Acquire);
        Ok(rendered.saturating_sub(now) + 2 * transfer + CUT_MARGIN_MICROS)
    }
    pub fn receipt(&self, epoch: u64, accepted: u32, now: u64) -> Receipt {
        Receipt {
            epoch,
            accepted,
            clock: now,
            lead_micros: self.lead(now).unwrap_or(0),
            late: self.late.load(Ordering::Relaxed),
        }
    }
    /// Replace the stream. `keep_until` keeps earlier events before that cut;
    /// None releases the scheduled stream at once. Events start the new epoch.
    pub fn replace(
        &self,
        sub: &mut Submitter,
        now: u64,
        keep_until: Option<u64>,
        events: &[Event],
    ) -> Result<Receipt, String> {
        let current = self.epoch.load(Ordering::Acquire);
        if current.wrapping_sub(self.observed.load(Ordering::Acquire)) >= WINDOW {
            return Err(BUSY.into());
        }
        let floor = if keep_until.is_some() || !events.is_empty() {
            let earliest = now.saturating_add(self.lead(now)?);
            let floor = keep_until.unwrap_or(earliest);
            // A fresh stream whose first event the output has already passed
            // is as early as a cut that has: the producer takes a new lead.
            if floor < earliest || (keep_until.is_none() && events[0].at < earliest) {
                return Err(TOO_SOON.into());
            }
            floor
        } else {
            0
        };
        validate(events, floor, now)?;
        let next = current.wrapping_add(1);
        self.cuts[next as usize % CUTS].store(keep_until.unwrap_or(0), Ordering::Release);
        self.epoch.store(next, Ordering::Release);
        sub.epoch = next;
        sub.last = floor;
        let accepted = self.push(sub, events);
        Ok(self.receipt(next, accepted, now))
    }
    /// Continue the current epoch. Returns how many leading events fit.
    pub fn submit(
        &self,
        sub: &mut Submitter,
        now: u64,
        epoch: u64,
        events: &[Event],
    ) -> Result<Receipt, String> {
        if epoch != sub.epoch || epoch != self.epoch.load(Ordering::Acquire) {
            return Err(STALE.into());
        }
        validate(events, sub.last, now)?;
        let accepted = self.push(sub, events);
        Ok(self.receipt(epoch, accepted, now))
    }
    fn push(&self, sub: &mut Submitter, events: &[Event]) -> u32 {
        let mut accepted = 0;
        for &event in events {
            if !self.queue.push(Scheduled {
                event,
                epoch: sub.epoch,
            }) {
                break;
            }
            sub.last = event.at;
            accepted += 1;
        }
        accepted
    }
}

#[derive(Copy, Clone, Default)]
struct Click {
    start: u64,
    accent: bool,
    active: bool,
}
/// Render-side state, owned by the mixer.
pub struct Player {
    epoch: u64,
    held: Option<Scheduled>,
    clicks: [Click; 8],
    frame: u64,
    rate: u32,
}
impl Default for Player {
    fn default() -> Self {
        Self {
            epoch: 0,
            held: None,
            clicks: [Click::default(); 8],
            frame: 0,
            rate: 0,
        }
    }
}
impl Player {
    pub fn new(bus: &ScheduleBus, rate: u32) -> Self {
        Self {
            epoch: bus.epoch.load(Ordering::Acquire),
            rate,
            ..Self::default()
        }
    }
    pub fn rate(&self) -> u32 {
        self.rate
    }
    /// Adopt published replacements; a release among them silences the stream.
    fn observe(&mut self, bus: &ScheduleBus, offset: u32, emit: &mut impl FnMut(u8, u8, u8, u32)) {
        let epoch = bus.epoch.load(Ordering::Acquire);
        if epoch == self.epoch {
            return;
        }
        let mut e = self.epoch;
        let mut release = false;
        while e != epoch {
            e = e.wrapping_add(1);
            release |= bus.cuts[e as usize % CUTS].load(Ordering::Acquire) == 0;
        }
        if release {
            emit(CONTROL, 123, 0, offset);
            for click in &mut self.clicks {
                click.active = false;
            }
        }
        self.epoch = epoch;
        bus.observed.store(epoch, Ordering::Release);
    }
    fn admits(&self, bus: &ScheduleBus, s: &Scheduled) -> bool {
        let age = self.epoch.wrapping_sub(s.epoch);
        if age == 0 {
            return true;
        }
        // Events kept before the cuts of up to WINDOW replacements published
        // during a stall still play, releases among them. The cuts they are
        // checked against are intact up to that age (see CUTS).
        if age > WINDOW {
            return false;
        }
        let mut e = s.epoch;
        while e != self.epoch {
            e = e.wrapping_add(1);
            let cut = bus.cuts[e as usize % CUTS].load(Ordering::Acquire);
            if s.event.at >= cut {
                return false;
            }
        }
        true
    }
    /// Apply events presented within this quantum, starting at `start` for
    /// `frames` frames. `emit(kind, key, value, offset)` reaches the contacts.
    pub fn quantum(
        &mut self,
        bus: &ScheduleBus,
        start: u64,
        frames: usize,
        mut emit: impl FnMut(u8, u8, u8, u32),
    ) {
        if self.rate == 0 || frames == 0 {
            return;
        }
        self.observe(bus, 0, &mut emit);
        let rate = self.rate as u64;
        let mut offset = 0u32;
        for _ in 0..BUDGET {
            let Some(s) = self.held.take().or_else(|| bus.queue.pop()) else {
                break;
            };
            if s.epoch.wrapping_sub(self.epoch) as i64 > 0 {
                // Its replacement was published before it was pushed.
                self.observe(bus, offset, &mut emit);
            }
            if !self.admits(bus, &s) {
                continue;
            }
            let e = s.event;
            let at = e.at.saturating_sub(start).saturating_mul(rate) / 1_000_000;
            if at >= frames as u64 {
                self.held = Some(s);
                break;
            }
            if matches!(e.kind, NOTE_ON | CLICK) && start.saturating_sub(e.at) > LATE_MICROS {
                bus.late.fetch_add(1, Ordering::Relaxed);
                continue;
            }
            // The sampler accepts nondecreasing offsets within a block.
            offset = offset.max(at as u32);
            if e.kind == CLICK {
                self.click(self.frame + offset as u64, e.value == 1);
            } else {
                emit(e.kind, e.key, e.value, offset);
            }
        }
    }
    fn click(&mut self, start: u64, accent: bool) {
        let slot = self
            .clicks
            .iter_mut()
            .min_by_key(|c| (c.active, c.start))
            .unwrap();
        *slot = Click {
            start,
            accent,
            active: true,
        };
    }
    /// The practice metronome's click: a short sine blip, higher on the bar.
    pub fn click_sample(&mut self, index: usize) -> f32 {
        let now = self.frame + index as u64;
        let mut sum = 0.0f64;
        for click in &mut self.clicks {
            if !click.active || now < click.start {
                continue;
            }
            let age = (now - click.start) as f64 / self.rate as f64;
            if age >= 0.045 {
                click.active = false;
                continue;
            }
            let (frequency, amplitude) = if click.accent { (1200.0, 0.16) } else { (900.0, 0.12) };
            sum += amplitude * (-age * 110.0).exp() * (age * frequency * std::f64::consts::TAU).sin();
        }
        sum as f32
    }
    pub fn advance(&mut self, frames: usize) {
        self.frame += frames as u64;
    }
    /// Published once per device transfer for the producer's lead.
    pub fn rendered(&self, bus: &ScheduleBus, end: u64, span: u64) {
        bus.transfer.fetch_max(span, Ordering::AcqRel);
        bus.rendered.store(end, Ordering::Release);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    type Emitted = Vec<(u8, u8, u8, u32, u64)>;
    const RATE: u32 = 48_000;
    const BLOCK: usize = 256;
    fn running(bus: &ScheduleBus, now: u64) {
        bus.rendered.store(now + 10_000, Ordering::Release);
        bus.transfer.store(5_334, Ordering::Release);
    }
    fn on(at: u64, key: u8) -> Event {
        Event { at, kind: NOTE_ON, key, value: 80 }
    }
    fn off(at: u64, key: u8) -> Event {
        Event { at, kind: NOTE_OFF, key, value: 0 }
    }
    /// Render quanta from `start` until `until`, recording (kind,key,value,offset,quantum start).
    fn render(player: &mut Player, bus: &ScheduleBus, start: u64, until: u64, out: &mut Emitted) -> u64 {
        let mut t = start;
        while t < until {
            player.quantum(bus, t, BLOCK, |k, key, v, o| out.push((k, key, v, o, t)));
            player.advance(BLOCK);
            let span = (BLOCK as u64 * 1_000_000) / RATE as u64;
            player.rendered(bus, t + span, span);
            t += span;
        }
        t
    }
    fn presented(e: &(u8, u8, u8, u32, u64)) -> u64 {
        e.4 + e.3 as u64 * 1_000_000 / RATE as u64
    }

    #[test]
    fn events_land_at_their_sample_offsets_on_the_midi_clock() {
        let bus = ScheduleBus::default();
        bus.restart();
        let mut player = Player::new(&bus, RATE);
        let mut sub = Submitter::default();
        let now = 1_000_000;
        running(&bus, now);
        let lead = bus.lead(now).unwrap();
        assert_eq!(lead, 10_000 + 2 * 5_334 + 5_000);
        let first = now + lead + 1_000;
        let events = [on(first, 60), on(first + 250_000, 64), off(first + 500_000, 60), off(first + 500_000, 64)];
        let receipt = bus.replace(&mut sub, now, None, &events).unwrap();
        assert_eq!(receipt.accepted, 4);
        let mut out = vec![];
        render(&mut player, &bus, now, first + 600_000, &mut out);
        // Starting a stream releases whatever it had sounding (nothing yet);
        // every event is then presented within one sample of its instant.
        assert_eq!(out.iter().map(|e| (e.0, e.1)).collect::<Vec<_>>(), [(3, 123), (1, 60), (1, 64), (2, 60), (2, 64)]);
        for (e, want) in out[1..].iter().zip(events) {
            let at = presented(e);
            assert!(at <= want.at && want.at - at < 1_000_000 / RATE as u64 + 1, "{at} vs {}", want.at);
        }
        assert_eq!(bus.late.load(Ordering::Relaxed), 0);
    }

    #[test]
    fn keep_replacement_retains_earlier_events_and_retimes_the_rest() {
        let bus = ScheduleBus::default();
        bus.restart();
        let mut player = Player::new(&bus, RATE);
        let mut sub = Submitter::default();
        let now = 2_000_000;
        running(&bus, now);
        let t0 = now + 100_000;
        // 60 bpm quarters: 0 s, 1 s, 2 s; each key lifts 0.9 s after its attack.
        let slow = [on(t0, 60), off(t0 + 900_000, 60), on(t0 + 1_000_000, 62), off(t0 + 1_900_000, 62), on(t0 + 2_000_000, 64)];
        let first = bus.replace(&mut sub, now, None, &slow).unwrap();
        let mut out = vec![];
        let t = render(&mut player, &bus, now, t0 + 500_000, &mut out);
        // At 0.5 s the tempo doubles from a cut 50 ms ahead: C stays down and
        // lifts at its new time; D and E come at the new tempo.
        let cut = t + 50_000;
        let fast = [off(cut + 200_000, 60), on(cut + 250_000, 62), off(cut + 700_000, 62), on(cut + 750_000, 64)];
        let second = bus.replace(&mut sub, t, Some(cut), &fast).unwrap();
        assert_eq!(second.epoch, first.epoch + 1);
        render(&mut player, &bus, t, cut + 2_500_000, &mut out);
        let heard: Vec<_> = out.iter().filter(|e| e.0 != CONTROL).map(|e| (e.0, e.1, presented(e))).collect();
        let want = [(NOTE_ON, 60, t0), (NOTE_OFF, 60, cut + 200_000), (NOTE_ON, 62, cut + 250_000), (NOTE_OFF, 62, cut + 700_000), (NOTE_ON, 64, cut + 750_000)];
        assert_eq!(heard.len(), want.len(), "old D/E and the old C lift were discarded: {heard:?}");
        for (got, want) in heard.iter().zip(want) {
            assert_eq!((got.0, got.1), (want.0, want.1));
            assert!(want.2 - got.2 <= 21, "{got:?} vs {want:?}");
        }
        assert!(out.iter().all(|e| !(e.0 == 3 && e.4 > t0)), "a keep replacement never releases");
    }

    #[test]
    fn release_replacement_silences_once_and_rejects_the_old_epoch() {
        let bus = ScheduleBus::default();
        bus.restart();
        let mut player = Player::new(&bus, RATE);
        let mut sub = Submitter::default();
        let now = 3_000_000;
        running(&bus, now);
        let t0 = now + 100_000;
        let receipt = bus.replace(&mut sub, now, None, &[on(t0, 60), off(t0 + 2_000_000, 60)]).unwrap();
        let mut out = vec![];
        let t = render(&mut player, &bus, now, t0 + 200_000, &mut out);
        out.clear();
        bus.replace(&mut sub, t, None, &[]).unwrap();
        render(&mut player, &bus, t, t0 + 3_000_000, &mut out);
        assert_eq!(out.iter().map(|e| (e.0, e.1, e.3)).collect::<Vec<_>>(), [(3, 123, 0)]);
        assert_eq!(bus.submit(&mut sub, t, receipt.epoch, &[on(t + 100_000, 61)]), Err(STALE.into()));
    }

    #[test]
    fn producer_never_outruns_the_cut_ring_and_stale_events_drain() {
        let bus = ScheduleBus::default();
        bus.restart();
        let mut player = Player::new(&bus, RATE);
        let mut sub = Submitter::default();
        let now = 4_000_000;
        running(&bus, now);
        for i in 0..WINDOW {
            let cut = now + 100_000 + i * 1_000;
            bus.replace(&mut sub, now, Some(cut), &[on(cut, 60)]).unwrap();
        }
        assert_eq!(bus.replace(&mut sub, now, None, &[]), Err(BUSY.into()));
        let mut out = vec![];
        render(&mut player, &bus, now, now + 50_000, &mut out);
        assert!(bus.replace(&mut sub, now, None, &[]).is_ok());
        render(&mut player, &bus, now + 50_000, now + 500_000, &mut out);
        assert!(out.iter().all(|e| e.0 == 3), "every superseded attack was discarded: {out:?}");
    }

    #[test]
    fn kept_releases_survive_a_stall_of_queued_replacements() {
        let bus = ScheduleBus::default();
        bus.restart();
        let mut player = Player::new(&bus, RATE);
        let mut sub = Submitter::default();
        let now = 4_500_000;
        running(&bus, now);
        let t0 = now + 100_000;
        bus.replace(&mut sub, now, None, &[on(t0, 60), off(t0 + 200_000, 60)]).unwrap();
        let mut out = vec![];
        let t = render(&mut player, &bus, now, t0 + 20_000, &mut out);
        // The output stalls while the tempo changes four times; every cut
        // falls after C lifts, so its release belongs to the first stream.
        for i in 0..WINDOW {
            let cut = t0 + 300_000 + i * 1_000;
            bus.replace(&mut sub, t, Some(cut), &[on(cut + 10_000, 62)]).unwrap();
        }
        assert_eq!(bus.replace(&mut sub, t, None, &[]), Err(BUSY.into()));
        render(&mut player, &bus, t, t0 + 600_000, &mut out);
        let heard: Vec<_> = out.iter().filter(|e| e.0 != CONTROL).map(|e| (e.0, e.1)).collect();
        assert_eq!(heard, [(NOTE_ON, 60), (NOTE_OFF, 60), (NOTE_ON, 62)], "C lifts; only the last D sounds");
    }

    #[test]
    fn bounded_validation_ordering_capacity_and_resubmission() {
        let bus = ScheduleBus::default();
        bus.restart();
        let mut sub = Submitter::default();
        let now = 5_000_000;
        assert!(bus.replace(&mut sub, now, None, &[on(now + 1_000_000, 60)]).is_err(), "not rendering");
        running(&bus, now);
        let lead = bus.lead(now).unwrap();
        assert_eq!(bus.replace(&mut sub, now, Some(now + lead - 1), &[]), Err(TOO_SOON.into()));
        // Play, Home and resume start a fresh stream: an event the output has
        // already passed is too soon, so the producer retries with a new lead.
        assert_eq!(bus.replace(&mut sub, now, None, &[on(now + lead - 1, 60)]), Err(TOO_SOON.into()));
        assert!(bus.replace(&mut sub, now, None, &[on(now + lead, 60)]).is_ok());
        for bad in [
            Event { at: now + 100_000, kind: 9, key: 60, value: 1 },
            Event { at: now + 100_000, kind: NOTE_ON, key: 128, value: 1 },
            Event { at: now + 100_000, kind: NOTE_ON, key: 60, value: 0 },
            Event { at: now + 100_000, kind: CLICK, key: 0, value: 2 },
            Event { at: now + 61_000_000, kind: NOTE_OFF, key: 60, value: 0 },
        ] {
            assert!(bus.replace(&mut sub, now, None, &[bad]).is_err(), "{bad:?}");
        }
        assert!(bus.replace(&mut sub, now, None, &[on(now + 200_000, 60), on(now + 100_000, 60)]).is_err());
        assert!(bus.replace(&mut sub, now, None, &vec![on(now + 100_000, 60); MAX_SUBMIT + 1]).is_err());
        let receipt = bus.replace(&mut sub, now, None, &[]).unwrap();
        let start = now + 100_000;
        let mut accepted = 0;
        let mut at = start;
        while accepted < CAPACITY as u32 {
            let batch: Vec<_> = (0..MAX_SUBMIT as u64).map(|i| off(at + i, 60)).collect();
            let r = bus.submit(&mut sub, now, receipt.epoch, &batch).unwrap();
            accepted += r.accepted;
            at += r.accepted as u64;
        }
        assert_eq!(bus.submit(&mut sub, now, receipt.epoch, &[off(at, 60)]).unwrap().accepted, 0, "full queue backpressure");
        assert!(bus.submit(&mut sub, now, receipt.epoch, &[off(at - 2, 60)]).is_err(), "never earlier than accepted");
    }

    #[test]
    fn late_attacks_are_skipped_but_releases_always_apply() {
        let bus = ScheduleBus::default();
        bus.restart();
        let mut player = Player::new(&bus, RATE);
        let mut sub = Submitter::default();
        let now = 6_000_000;
        running(&bus, now);
        let t0 = now + 100_000;
        bus.replace(&mut sub, now, None, &[on(t0, 60), off(t0 + 10_000, 60), on(t0 + 40_000, 62)]).unwrap();
        let mut out = vec![];
        // The output stalled: the first quantum after the events is 80 ms late.
        // The 80 ms-late attack is skipped, its release and the 40 ms-late one play.
        render(&mut player, &bus, t0 + 80_000, t0 + 90_000, &mut out);
        assert_eq!(out.iter().filter(|e| e.0 != CONTROL).map(|e| (e.0, e.1)).collect::<Vec<_>>(), [(2, 60), (1, 62)]);
        assert_eq!(bus.late.load(Ordering::Relaxed), 1);
    }

    #[test]
    fn clicks_share_the_clock_and_ring_like_the_practice_metronome() {
        let bus = ScheduleBus::default();
        bus.restart();
        let mut player = Player::new(&bus, RATE);
        let mut sub = Submitter::default();
        let now = 7_000_000;
        running(&bus, now);
        let t0 = now + 100_000;
        let beat = 500_000;
        let clicks = [
            Event { at: t0, kind: CLICK, key: 0, value: 1 },
            Event { at: t0 + beat, kind: CLICK, key: 0, value: 0 },
            on(t0 + 2 * beat, 60),
        ];
        bus.replace(&mut sub, now, None, &clicks).unwrap();
        let mut pcm = vec![];
        let mut notes = vec![];
        let mut t = now;
        let mut frame_time = vec![];
        while t < t0 + 3 * beat {
            player.quantum(&bus, t, BLOCK, |k, key, _, o| notes.push((k, key, t + o as u64 * 1_000_000 / RATE as u64)));
            for i in 0..BLOCK {
                pcm.push(player.click_sample(i));
                frame_time.push(t as f64 + i as f64 * 1e6 / RATE as f64);
            }
            player.advance(BLOCK);
            t += BLOCK as u64 * 1_000_000 / RATE as u64;
        }
        let onsets: Vec<f64> = (1..pcm.len()).filter(|&i| pcm[i] != 0.0 && pcm[i - 1] == 0.0).map(|i| frame_time[i - 1]).collect();
        assert_eq!(onsets.len(), 2, "{onsets:?}");
        for (onset, want) in onsets.iter().zip([t0, t0 + beat]) {
            assert!((onset - want as f64).abs() < 1e6 / RATE as f64 * 2.0, "{onset} vs {want}");
        }
        let note = notes.iter().find(|n| n.0 == NOTE_ON).unwrap();
        assert!(note.2.abs_diff(t0 + 2 * beat) <= 21);
        let peak = pcm.iter().fold(0f32, |m, v| m.max(v.abs()));
        assert!(peak > 0.1 && peak <= 0.16, "{peak}");
    }

    #[test]
    fn restart_invalidates_the_previous_output_stream() {
        let bus = ScheduleBus::default();
        bus.restart();
        let mut sub = Submitter::default();
        let now = 8_000_000;
        running(&bus, now);
        let r = bus.replace(&mut sub, now, None, &[on(now + 100_000, 60)]).unwrap();
        bus.restart();
        let mut player = Player::new(&bus, RATE);
        assert_eq!(bus.submit(&mut sub, now, r.epoch, &[]), Err(STALE.into()));
        assert!(bus.lead(now).is_err(), "a new output must render before scheduling");
        running(&bus, now);
        let mut out = vec![];
        render(&mut player, &bus, now, now + 500_000, &mut out);
        assert!(out.is_empty(), "{out:?}");
    }
}
