use std::{fs,path::Path};
pub const MAX_SCORE_BYTES:usize=50_000_000;
pub fn validate(data:&[u8],filename:&str)->Result<(),String>{
 if data.len()>MAX_SCORE_BYTES||!data.starts_with(b"PK\x03\x04"){return Err("Invalid or oversized shared score".into());}
 let base=filename.strip_suffix(".tuna").ok_or("Invalid shared score filename")?;
 let upper=base.to_ascii_uppercase();
 let reserved=matches!(upper.as_str(),"CON"|"PRN"|"AUX"|"NUL")||(upper.len()==4&&(upper.starts_with("COM")||upper.starts_with("LPT"))&&matches!(upper.as_bytes()[3],b'1'..=b'9'));
 if filename.len()>100||base.is_empty()||!base.as_bytes()[0].is_ascii_alphanumeric()||!base.bytes().all(|c|c.is_ascii_alphanumeric()||c==b'-')||reserved{return Err("Invalid shared score filename".into());}Ok(())
}
pub fn save(data:&[u8],path:Option<&Path>)->Result<bool,String>{
 match path{None=>Ok(false),Some(p)=>{fs::write(p,data).map_err(|e|e.to_string())?;Ok(true)}}
}
#[cfg(test)] mod tests{
 use super::*;
 #[test]fn filenames_and_archive_bounds(){
  assert!(validate(b"PK\x03\x04data","Zeldas-Lullaby.tuna").is_ok());
  for name in ["../Score.tuna","Score.zip","CON.tuna","LPT1.tuna",".tuna","-Score.tuna","a/b.tuna"]{assert!(validate(b"PK\x03\x04",name).is_err());}
  assert!(validate(b"not zip","Score.tuna").is_err());assert!(validate(&vec![0;MAX_SCORE_BYTES+1],"Score.tuna").is_err());
 }
 #[test]fn cancellation_and_write_error_are_distinct(){assert!(!save(b"score",None).unwrap());assert!(save(b"score",Some(Path::new("/missing-tuna-save-directory/score.tuna"))).is_err());}
 #[test]fn selected_path_receives_exact_bytes(){let p=std::env::temp_dir().join(format!("tuna-save-{}.tuna",std::process::id()));let b=b"PK\x03\x04bounded";assert!(save(b,Some(&p)).unwrap());assert_eq!(fs::read(&p).unwrap(),b);fs::remove_file(p).unwrap();}
}
