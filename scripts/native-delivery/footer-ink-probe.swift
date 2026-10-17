// DIAGNOSTIC BRANCH ONLY. Instrumented one-shot public WebKit check.
import AppKit
import WebKit
let started = Date()
let diagLock = NSLock()
nonisolated(unsafe) var lastMainBeat = Date()
func stamp() -> String { String(format: "%.3f", Date().timeIntervalSince(started)) }
func diag(_ s: String) { diagLock.lock(); fputs("footer-ink +\(stamp())s \(s)\n", stderr); fflush(stderr); diagLock.unlock() }
let diagScript = #"""
(()=>{if(window.top!==window)return;const h=window.webkit.messageHandlers.footerInkDiag;
const c={fetchStart:0,fetchEnd:0,digestStart:0,digestEnd:0,fontLoadStart:0,fontLoadEnd:0,readyGets:0,readyResolved:0,mounts:0,removes:0,timersSet:0,timersFired:0,clones:0};
let last='';const send=(k,extra)=>{try{h.postMessage(JSON.stringify(Object.assign({k,t:Math.round(performance.now()),vis:document.visibilityState,hidden:document.hidden,fonts:document.fonts&&document.fonts.status,result:window.__viewerFooterInkProbe&&window.__viewerFooterInkProbe.status,c},extra||{})));}catch(e){}};
const f=window.fetch;window.fetch=function(...a){c.fetchStart++;send('fetch',{url:String(a[0]).slice(-70)});return f.apply(this,a).then(r=>{c.fetchEnd++;send('fetched');return r;});};
const d=SubtleCrypto.prototype.digest;SubtleCrypto.prototype.digest=function(...a){c.digestStart++;return d.apply(this,a).then(r=>{c.digestEnd++;return r;});};
const l=FontFace.prototype.load;FontFace.prototype.load=function(...a){c.fontLoadStart++;send('fontload');return l.apply(this,a).then(r=>{c.fontLoadEnd++;send('fontloaded');return r;});};
const rd=Object.getOwnPropertyDescriptor(FontFaceSet.prototype,'ready');if(rd&&rd.get)Object.defineProperty(FontFaceSet.prototype,'ready',{configurable:true,get(){c.readyGets++;const p=rd.get.call(this);p.then(()=>{c.readyResolved++;});return p;}});
const sc=globalThis.structuredClone;if(sc)globalThis.structuredClone=function(...a){c.clones++;return sc.apply(this,a);};
const st=window.setTimeout;window.setTimeout=function(fn,ms,...r){c.timersSet++;return st.call(this,function(...x){c.timersFired++;return typeof fn==='function'?fn.apply(this,x):undefined;},ms,...r);};
new MutationObserver(m=>{for(const r of m){c.mounts+=r.addedNodes.length;c.removes+=r.removedNodes.length;}}).observe(document,{childList:true,subtree:true});
addEventListener('error',e=>send('error',{msg:String(e.message)}));addEventListener('unhandledrejection',e=>send('rejection',{msg:String(e.reason)}));
document.addEventListener('visibilitychange',()=>send('visibility'));addEventListener('DOMContentLoaded',()=>send('dcl'));addEventListener('load',()=>send('load'));
send('start',{ua:navigator.userAgent});setInterval(()=>send('hb'),2000);
})();
"""#
@MainActor
final class Probe: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
 let url: URL
 let nonce: String
 let output: String
 let helperArchitecture: String
 let webkitVersion: String
 var done = false
 var webView: WKWebView?
 init(url: URL, nonce: String, output: String, helperArchitecture: String, webkitVersion: String) {
  self.url = url; self.nonce = nonce; self.output = output
  self.helperArchitecture = helperArchitecture; self.webkitVersion = webkitVersion
  super.init()
 }
 func finish(_ value: [String: Any], _ status: Int32) {
  diag("finish status=\(status) value=\(String(describing: value["message"] ?? (value["result"] as? [String: Any])?["status"] ?? ""))")
  if done { return }; done = true
  webView?.stopLoading(); webView?.configuration.userContentController.removeScriptMessageHandler(forName: "footerInk")
  do { let data = try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]); try data.write(to: URL(fileURLWithPath: output), options: .atomic) }
  catch { fputs("Cannot write WebKit probe receipt\n", stderr); exit(3) }
  diag("receipt written; exiting")
  exit(status)
 }
 func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
  if message.name == "footerInkDiag" { diag("page " + String(String(describing: message.body).prefix(700))); return }
  guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.host == "127.0.0.1",
        message.frameInfo.securityOrigin.protocol == "http", message.frameInfo.securityOrigin.port == (url.port ?? 80),
        let result = message.body as? [String: Any], result["nonce"] as? String == nonce else {
   finish(["status":"failed", "message":"Unexpected probe frame or nonce"], 4); return
  }
  let success = result["status"] as? String == "passed"
  finish(["runtime":"WKWebView", "os":ProcessInfo.processInfo.operatingSystemVersionString,
          "helperArchitecture":helperArchitecture, "webkitVersion":webkitVersion, "result":result], success ? 0 : 5)
 }
 func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
  decisionHandler(navigationAction.request.url == url && navigationAction.targetFrame?.isMainFrame == true ? .allow : .cancel)
 }
 func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) { diag("didCommit") }
 func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { diag("didFinish") }
 func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { diag("WebContent process terminated"); finish(["status":"failed", "message":"WebContent process terminated"], 8) }
 func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { finish(["status":"failed", "message":error.localizedDescription], 6) }
 func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { finish(["status":"failed", "message":error.localizedDescription], 6) }
}
@main
struct FooterInkProbeMain {
 @MainActor
 static func main() {
  diag("helper main wall=\(Int(Date().timeIntervalSince1970 * 1000)) variant=\(ProcessInfo.processInfo.environment["FOOTER_INK_DIAG_VARIANT"] ?? "none")")
  let arguments = CommandLine.arguments
  if arguments.count != 4 { fputs("usage: helper <loopback-url> <nonce> <output-json>\n", stderr); exit(2) }
  guard let url = URL(string: arguments[1]), url.scheme == "http", url.host == "127.0.0.1", url.path == "/footer-ink-probe.html" else { exit(2) }
  let nonce = arguments[2], output = arguments[3]
  guard nonce.range(of: "^[a-f0-9]{32}$", options: .regularExpression) != nil,
        URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems == [URLQueryItem(name: "nonce", value: nonce)] else { exit(2) }
  #if arch(arm64)
  let helperArchitecture = "arm64"
  #elseif arch(x86_64)
  let helperArchitecture = "x64"
  #else
  fputs("Unaccepted helper architecture\n", stderr); exit(2)
  #endif
  guard let webkitVersion = Bundle(for: WKWebView.self).object(forInfoDictionaryKey: "CFBundleVersion") as? String,
        !webkitVersion.isEmpty else { fputs("Actual WebKit framework version unavailable\n", stderr); exit(2) }
  diag("webkit \(webkitVersion) os \(ProcessInfo.processInfo.operatingSystemVersionString) arch \(helperArchitecture)")
  let variant = ProcessInfo.processInfo.environment["FOOTER_INK_DIAG_VARIANT"] ?? "none"
  let application = NSApplication.shared
  application.setActivationPolicy(variant == "none" ? .prohibited : .accessory)
  let owner = Probe(url: url, nonce: nonce, output: output, helperArchitecture: helperArchitecture, webkitVersion: webkitVersion)
  let configuration = WKWebViewConfiguration()
  configuration.websiteDataStore = WKWebsiteDataStore.nonPersistent()
  configuration.userContentController.add(owner, name: "footerInk")
  configuration.userContentController.add(owner, name: "footerInkDiag")
  configuration.userContentController.addUserScript(WKUserScript(source: diagScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
  let frame = NSRect(x: 0, y: 0, width: 1800, height: 1500)
  let webView = WKWebView(frame: frame, configuration: configuration)
  owner.webView = webView; webView.navigationDelegate = owner
  var made: NSWindow?
  if variant != "none" {
   let origin = variant == "offscreen" ? NSPoint(x: -20000, y: -20000) : NSPoint(x: 0, y: 0)
   let w = NSWindow(contentRect: NSRect(origin: origin, size: frame.size), styleMask: [.borderless], backing: .buffered, defer: false)
   w.isReleasedWhenClosed = false; w.contentView = webView; w.orderFrontRegardless(); made = w
   diag("window visible=\(w.isVisible) occlusionVisible=\(w.occlusionState.contains(.visible)) screen=\(String(describing: w.screen?.frame)) screens=\(NSScreen.screens.map { $0.frame })")
  }
  let window = made
  webView.load(URLRequest(url: url))
  diag("load requested")
  DispatchQueue.main.asyncAfter(deadline: .now() + 80) { diag("80s guard fired"); owner.finish(["status":"failed", "message":"Bounded WebKit runtime check timed out"], 7) }
  Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { _ in
   diagLock.lock(); lastMainBeat = Date(); diagLock.unlock()
   MainActor.assumeIsolated { diag("main beat" + (window.map { " occlusionVisible=\($0.occlusionState.contains(.visible))" } ?? "")) }
  }
  Thread.detachNewThread {
   while true { Thread.sleep(forTimeInterval: 5); diagLock.lock(); let seen = Date().timeIntervalSince(lastMainBeat); diagLock.unlock(); diag(String(format: "bg beat; main last beat %.1fs ago", seen)) }
  }
  application.run()
 }
}
