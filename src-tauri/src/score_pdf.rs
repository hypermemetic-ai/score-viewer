// Save the reader's prepared print document as a vector PDF. WebView2 prints
// with the same Chromium engine that paints the reader, so fonts, footer ink
// and personal pages match what is on screen. Managed data is never touched.
pub const MIN_PAGE_POINTS:f64=72.0;
pub const MAX_PAGE_POINTS:f64=14_400.0;
pub fn validate(filename:&str,width:f64,height:f64)->Result<(),String>{
 let base=filename.strip_suffix(".pdf").ok_or("Invalid PDF filename")?;
 let upper=base.to_ascii_uppercase();
 let reserved=matches!(upper.as_str(),"CON"|"PRN"|"AUX"|"NUL")||(upper.len()==4&&(upper.starts_with("COM")||upper.starts_with("LPT"))&&matches!(upper.as_bytes()[3],b'1'..=b'9'));
 if filename.len()>100||base.is_empty()||!base.as_bytes()[0].is_ascii_alphanumeric()||!base.bytes().all(|c|c.is_ascii_alphanumeric()||c==b'-')||reserved{return Err("Invalid PDF filename".into());}
 if ![width,height].iter().all(|n|n.is_finite()&&(MIN_PAGE_POINTS..=MAX_PAGE_POINTS).contains(n)){return Err("Invalid PDF page size".into());}
 Ok(())
}
#[cfg(windows)]
pub async fn print(window:&tauri::WebviewWindow,path:std::path::PathBuf,width:f64,height:f64)->Result<(),String>{
 use webview2_com::{Microsoft::Web::WebView2::Win32::*,PrintToPdfCompletedHandler};
 use windows::core::{Interface,HSTRING};
 let (tx,rx)=std::sync::mpsc::channel::<Result<(),String>>();
 let target=HSTRING::from(path.as_path());
 window.with_webview(move|webview|{
  let done=tx.clone();
  let started=(||->windows::core::Result<()>{unsafe{
   let core:ICoreWebView2_7=webview.controller().CoreWebView2()?.cast()?;
   let settings=webview.environment().cast::<ICoreWebView2Environment6>()?.CreatePrintSettings()?;
   settings.SetOrientation(COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT)?;
   settings.SetPageWidth(width/72.0)?;settings.SetPageHeight(height/72.0)?;
   settings.SetMarginTop(0.0)?;settings.SetMarginBottom(0.0)?;settings.SetMarginLeft(0.0)?;settings.SetMarginRight(0.0)?;
   settings.SetScaleFactor(1.0)?;settings.SetShouldPrintBackgrounds(true)?;settings.SetShouldPrintHeaderAndFooter(false)?;settings.SetShouldPrintSelectionOnly(false)?;
   core.PrintToPdf(&target,&settings,&PrintToPdfCompletedHandler::create(Box::new(move|result,saved|{
    let _=done.send(match result{Err(error)=>Err(error.message()),Ok(())if saved=>Ok(()),Ok(())=>Err("The PDF could not be written.".into())});Ok(())
   })))
  }})();
  if let Err(error)=started{let _=tx.send(Err(error.message()));}
 }).map_err(|e|e.to_string())?;
 tauri::async_runtime::spawn_blocking(move||rx.recv_timeout(std::time::Duration::from_secs(300)).map_err(|_|"PDF export did not finish.".to_string())?).await.map_err(|e|e.to_string())?
}
#[cfg(test)] mod tests{
 use super::*;
 #[test]fn filenames_and_page_bounds(){
  assert!(validate("Kleine-Studie.pdf",595.28,841.89).is_ok());
  for name in ["../Score.pdf","Score.tuna","CON.pdf","LPT1.pdf",".pdf","-Score.pdf","a/b.pdf","Score.PDF"]{assert!(validate(name,595.28,841.89).is_err(),"{name}");}
  for (w,h) in [(0.0,841.89),(595.28,f64::NAN),(595.28,f64::INFINITY),(20_000.0,841.89),(71.0,100.0)]{assert!(validate("Score.pdf",w,h).is_err());}
 }
}
