//! Transactional selected-device buffer ownership. A later external change wins.
pub trait Device {
    fn read(&self) -> Result<u32, String>;
    fn write(&self, frames: u32) -> Result<(), String>;
}
pub struct Lease<D: Device> {
    device: D,
    original: u32,
    owned: Option<u32>,
}
impl<D: Device> Lease<D> {
    pub fn acquire(device: D, requested: u32) -> Result<Self, String> {
        let original = device.read()?;
        let mut lease = Self {
            device,
            original,
            owned: None,
        };
        if requested != original {
            lease.owned = Some(requested);
            if let Err(error) = lease.device.write(requested) {
                let restore = lease.restore();
                return Err(match restore {
                    Ok(()) => error,
                    Err(r) => format!("{error}; could not restore original buffer: {r}"),
                });
            }
            let confirmation = (|| {
                let deadline = std::time::Instant::now() + std::time::Duration::from_secs(1);
                let mut prior = None;
                loop {
                    let actual = lease.device.read()?;
                    if actual != original && prior == Some(actual) {
                        return Ok(actual);
                    }
                    prior = Some(actual);
                    if std::time::Instant::now() >= deadline {
                        return Err(
                            "The audio device did not confirm its requested buffer change"
                                .to_string(),
                        );
                    }
                    std::thread::sleep(std::time::Duration::from_millis(5));
                }
            })();
            match confirmation {
                Ok(actual) => lease.owned = Some(actual),
                Err(error) => {
                    let restore = lease.restore();
                    return Err(match restore {
                        Ok(()) => error,
                        Err(r) => format!("{error}; could not restore original buffer: {r}"),
                    });
                }
            }
        }
        Ok(lease)
    }
    pub fn current(&self) -> Result<u32, String> {
        self.device.read()
    }
    pub fn restore(&mut self) -> Result<(), String> {
        let Some(owned) = self.owned else {
            return Ok(());
        };
        if self.device.read()? == owned {
            self.device.write(self.original)?;
            let deadline = std::time::Instant::now() + std::time::Duration::from_secs(1);
            let mut confirmed = false;
            loop {
                if self.device.read()? == self.original {
                    if confirmed {
                        break;
                    }
                    confirmed = true;
                } else {
                    confirmed = false;
                }
                if std::time::Instant::now() >= deadline {
                    return Err(
                        "The audio device did not confirm restoration of its original buffer"
                            .into(),
                    );
                }
                std::thread::sleep(std::time::Duration::from_millis(5));
            }
        }
        self.owned = None;
        Ok(())
    }
}
impl<D: Device> Drop for Lease<D> {
    fn drop(&mut self) {
        let _ = self.restore();
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::{cell::Cell, rc::Rc};
    #[derive(Clone)]
    struct Fake {
        value: Rc<Cell<u32>>,
        fail: Rc<Cell<bool>>,
    }
    impl Device for Fake {
        fn read(&self) -> Result<u32, String> {
            Ok(self.value.get())
        }
        fn write(&self, v: u32) -> Result<(), String> {
            self.value.set(v);
            if self.fail.replace(false) {
                Err("write failed after applying".into())
            } else {
                Ok(())
            }
        }
    }
    fn fake() -> Fake {
        Fake {
            value: Rc::new(Cell::new(512)),
            fail: Rc::new(Cell::new(false)),
        }
    }
    #[test]
    fn restores_only_own_buffer_and_respects_external_changes() {
        let d = fake();
        let mut l = Lease::acquire(d.clone(), 128).unwrap();
        assert_eq!(d.value.get(), 128);
        l.restore().unwrap();
        assert_eq!(d.value.get(), 512);
        let mut l = Lease::acquire(d.clone(), 128).unwrap();
        d.value.set(256);
        l.restore().unwrap();
        assert_eq!(d.value.get(), 256);
    }
    #[test]
    fn failed_initialization_restores_and_replacement_keeps_original() {
        let d = fake();
        d.fail.set(true);
        assert!(Lease::acquire(d.clone(), 128).is_err());
        assert_eq!(d.value.get(), 512);
        {
            let _l = Lease::acquire(d.clone(), 128).unwrap();
        }
        assert_eq!(d.value.get(), 512);
        {
            let _l = Lease::acquire(d.clone(), 256).unwrap();
        }
        assert_eq!(d.value.get(), 512);
    }
    #[test]
    fn delayed_apply_and_restore_are_confirmed_off_callback() {
        #[derive(Clone)]
        struct Delayed {
            value: Rc<Cell<u32>>,
            pending: Rc<Cell<Option<(u32, u8)>>>,
        }
        impl Device for Delayed {
            fn read(&self) -> Result<u32, String> {
                if let Some((value, left)) = self.pending.get() {
                    if left == 0 {
                        self.value.set(value);
                        self.pending.set(None);
                    } else {
                        self.pending.set(Some((value, left - 1)));
                    }
                }
                Ok(self.value.get())
            }
            fn write(&self, value: u32) -> Result<(), String> {
                self.pending.set(Some((value, 3)));
                Ok(())
            }
        }
        let device = Delayed {
            value: Rc::new(Cell::new(512)),
            pending: Rc::new(Cell::new(None)),
        };
        let mut lease = Lease::acquire(device.clone(), 128).unwrap();
        assert_eq!(device.value.get(), 128);
        lease.restore().unwrap();
        assert_eq!(device.value.get(), 512);
        assert!(device.pending.get().is_none());
    }
}
