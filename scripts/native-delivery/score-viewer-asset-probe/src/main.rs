// Match the locked Tauri release compression and HTML serializer, not Node's encoder.
// Both manifests enable portable-float to avoid platform libm encoder differences.
use std::{fs, io::Cursor};
fn main() {
    let args: Vec<String> = std::env::args().collect();
    assert!(args.len() == 3 || args.len() == 4, "input, output, optional normalize-html");
    let mut bytes = fs::read(&args[1]).unwrap();
    if args.len() == 4 {
        assert_eq!(args[3], "normalize-html");
        let document = dom_query::Document::from(String::from_utf8(bytes).unwrap());
        assert_eq!(document.select("script[src^=\"http\"]").length(), 0);
        assert_eq!(document.select("style").length(), 0);
        assert_eq!(document.select("script:not(:empty)").length(), 0);
        bytes = document.html().as_bytes().to_vec();
    }
    let mut input = Cursor::new(bytes);
    let mut output = fs::File::create(&args[2]).unwrap();
    let mut settings = brotli::enc::BrotliEncoderParams::default();
    settings.quality = 9;
    brotli::BrotliCompress(&mut input, &mut output, &settings).unwrap();
}
