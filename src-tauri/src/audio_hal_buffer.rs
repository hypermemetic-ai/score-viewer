//! Documented CoreAudio HAL property calls, exclusively on the control worker.
use super::{
    buffer_lease::{Device, Lease},
    period,
};
use std::{ffi::c_void, ptr};
#[repr(C)]
struct Address {
    selector: u32,
    scope: u32,
    element: u32,
}
#[repr(C)]
#[derive(Default)]
struct Range {
    min: f64,
    max: f64,
}
const fn four(v: &[u8; 4]) -> u32 {
    u32::from_be_bytes(*v)
}
fn address(selector: u32) -> Address {
    Address {
        selector,
        scope: four(b"glob"),
        element: 0,
    }
}
#[link(name = "CoreAudio", kind = "framework")]
extern "C" {
    fn AudioObjectGetPropertyDataSize(
        id: u32,
        address: *const Address,
        qualifier_size: u32,
        qualifier: *const c_void,
        size: *mut u32,
    ) -> i32;
    fn AudioObjectGetPropertyData(
        id: u32,
        address: *const Address,
        qualifier_size: u32,
        qualifier: *const c_void,
        size: *mut u32,
        value: *mut c_void,
    ) -> i32;
    fn AudioObjectIsPropertySettable(id: u32, address: *const Address, settable: *mut u8) -> i32;
    fn AudioObjectSetPropertyData(
        id: u32,
        address: *const Address,
        qualifier_size: u32,
        qualifier: *const c_void,
        size: u32,
        value: *const c_void,
    ) -> i32;
}
#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFStringGetLength(value: *const c_void) -> isize;
    fn CFStringGetMaximumSizeForEncoding(length: isize, encoding: u32) -> isize;
    fn CFStringGetCString(value: *const c_void, buffer: *mut i8, size: isize, encoding: u32) -> u8;
    fn CFRelease(value: *const c_void);
}
fn check(status: i32) -> Result<(), String> {
    if status == 0 {
        Ok(())
    } else {
        Err(format!("CoreAudio property failed ({status})"))
    }
}
unsafe fn read<T: Default>(id: u32, selector: u32) -> Result<T, String> {
    let mut value = T::default();
    let mut size = std::mem::size_of::<T>() as u32;
    check(AudioObjectGetPropertyData(
        id,
        &address(selector),
        0,
        ptr::null(),
        &mut size,
        (&mut value as *mut T).cast(),
    ))?;
    if size as usize != std::mem::size_of::<T>() {
        return Err("Invalid CoreAudio property size".into());
    }
    Ok(value)
}
unsafe fn text(id: u32, selector: u32) -> Result<String, String> {
    let value = read::<usize>(id, selector)? as *const c_void;
    if value.is_null() {
        return Err("Missing CoreAudio identity".into());
    }
    let length = CFStringGetLength(value);
    let capacity = CFStringGetMaximumSizeForEncoding(length, 0x08000100) + 1;
    if capacity <= 0 || capacity > 16384 {
        CFRelease(value);
        return Err("Invalid CoreAudio identity length".into());
    }
    let mut bytes = vec![0u8; capacity as usize];
    let result = CFStringGetCString(value, bytes.as_mut_ptr().cast(), capacity, 0x08000100);
    CFRelease(value);
    if result == 0 {
        return Err("Invalid CoreAudio identity encoding".into());
    }
    let n = bytes.iter().position(|b| *b == 0).unwrap_or(bytes.len());
    String::from_utf8(bytes[..n].to_vec()).map_err(|e| e.to_string())
}
unsafe fn has_output(id: u32) -> bool {
    let a = Address {
        selector: four(b"slay"),
        scope: four(b"outp"),
        element: 0,
    };
    let mut size = 0;
    if AudioObjectGetPropertyDataSize(id, &a, 0, ptr::null(), &mut size) != 0
        || size < 4
        || size > 65536
    {
        return false;
    }
    let mut data = vec![0u64; (size as usize).div_ceil(8)];
    if AudioObjectGetPropertyData(id, &a, 0, ptr::null(), &mut size, data.as_mut_ptr().cast()) != 0
    {
        return false;
    }
    let count = *(data.as_ptr().cast::<u32>()) as usize;
    #[repr(C)]
    struct Buffer {
        channels: u32,
        bytes: u32,
        data: *mut c_void,
    }
    #[repr(C)]
    struct List {
        count: u32,
        first: Buffer,
    }
    let offset = std::mem::offset_of!(List, first);
    if count > 256 || offset + count * std::mem::size_of::<Buffer>() > size as usize {
        return false;
    }
    let buffers = std::slice::from_raw_parts(
        (data.as_ptr().cast::<u8>().add(offset)).cast::<Buffer>(),
        count,
    );
    buffers.iter().any(|b| b.channels > 0)
}
pub struct HalDevice {
    id: u32,
    uid: String,
}
impl HalDevice {
    pub fn by_name(name: &str) -> Result<Self, String> {
        unsafe {
            let a = address(four(b"dev#"));
            let mut size = 0;
            check(AudioObjectGetPropertyDataSize(
                1,
                &a,
                0,
                ptr::null(),
                &mut size,
            ))?;
            if size == 0 || size > 4096 || size % 4 != 0 {
                return Err("Invalid CoreAudio device inventory".into());
            }
            let mut ids = vec![0u32; size as usize / 4];
            check(AudioObjectGetPropertyData(
                1,
                &a,
                0,
                ptr::null(),
                &mut size,
                ids.as_mut_ptr().cast(),
            ))?;
            let matches: Vec<_> = ids
                .into_iter()
                .filter(|id| {
                    has_output(*id) && text(*id, four(b"lnam")).ok().as_deref() == Some(name)
                })
                .collect();
            if matches.len() != 1 {
                return Err("Selected CoreAudio name is missing or ambiguous".into());
            }
            let id = matches[0];
            Ok(Self {
                id,
                uid: text(id, four(b"uid "))?,
            })
        }
    }
    fn identity(&self) -> Result<(), String> {
        if unsafe { text(self.id, four(b"uid "))? } != self.uid {
            return Err(
                "Selected CoreAudio device identity changed; buffer was not overwritten".into(),
            );
        }
        Ok(())
    }
    pub fn rate(&self) -> Result<f64, String> {
        self.identity()?;
        unsafe { read(self.id, four(b"nsrt")) }
    }
    pub fn uid(&self) -> &str {
        &self.uid
    }
    pub fn current(&self) -> Result<u32, String> {
        self.read()
    }
    pub fn request(
        self,
        rate: u32,
        tier: u8,
    ) -> Result<(Option<Lease<Self>>, u32, Option<String>), String> {
        unsafe {
            self.identity()?;
            let mut writable = 0;
            check(AudioObjectIsPropertySettable(
                self.id,
                &address(four(b"fsiz")),
                &mut writable,
            ))?;
            let current = self.read()?;
            if writable == 0 {
                return Ok((
                    None,
                    current,
                    Some(
                        "Selected output buffer is read-only; retaining current shared buffer."
                            .into(),
                    ),
                ));
            }
            let range = read::<Range>(self.id, four(b"fsz#"))?;
            if !range.min.is_finite()
                || !range.max.is_finite()
                || range.min < 1.0
                || range.max > 65536.0
            {
                return Err("Invalid CoreAudio buffer range".into());
            }
            let requested = period::choose_hal(
                rate,
                range.min.ceil() as u32,
                range.max.floor() as u32,
                current,
                tier,
            )
            .ok_or("Invalid CoreAudio buffer request")?;
            let lease = Lease::acquire(self, requested)?;
            let actual = lease.current()?;
            Ok((Some(lease), actual, None))
        }
    }
}
impl Device for HalDevice {
    fn read(&self) -> Result<u32, String> {
        self.identity()?;
        unsafe { read(self.id, four(b"fsiz")) }
    }
    fn write(&self, frames: u32) -> Result<(), String> {
        self.identity()?;
        unsafe {
            check(AudioObjectSetPropertyData(
                self.id,
                &address(four(b"fsiz")),
                0,
                ptr::null(),
                4,
                (&frames as *const u32).cast(),
            ))
        }
    }
}
