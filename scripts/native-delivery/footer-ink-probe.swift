// One-shot public WebKit check. No production app/managed data boot.
import AppKit
import WebKit
let started = Date()
func elapsed() -> String { String(format: "%.1f", Date().timeIntervalSince(started)) }
func trace(_ line: String) { fputs("footer-ink +\(elapsed())s \(line)\n", stderr); fflush(stderr) }
@MainActor
final class Probe: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
 let url: URL
 let nonce: String
 let output: String
 let helperArchitecture: String
 let webkitVersion: String
 var done = false
 var webView: WKWebView?
 var window: NSWindow?
 // Each stage the page begins, so a stalled or suspended page names where it stopped.
 var progress: [[String: Any]] = []
 init(url: URL, nonce: String, output: String, helperArchitecture: String, webkitVersion: String) {
  self.url = url; self.nonce = nonce; self.output = output
  self.helperArchitecture = helperArchitecture; self.webkitVersion = webkitVersion
  super.init()
 }
 var lastStage: String { progress.last?["stage"] as? String ?? "before the page reported a stage" }
 var hosting: String {
  let page = progress.last?["visibility"] as? String ?? "unknown"
  let shown = window.map { $0.occlusionState.contains(.visible) ? "visible" : "occluded" } ?? "no window"
  return "page \(page), window \(shown)"
 }
 func finish(_ value: [String: Any], _ status: Int32) {
  if done { return }; done = true
  var value = value; value["progress"] = progress
  trace("finish exit \(status) after stage '\(lastStage)' (\(hosting))")
  webView?.stopLoading()
  for name in ["footerInk", "footerInkProgress"] { webView?.configuration.userContentController.removeScriptMessageHandler(forName: name) }
  do { let data = try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]); try data.write(to: URL(fileURLWithPath: output), options: .atomic) }
  catch { fputs("Cannot write WebKit probe receipt\n", stderr); exit(3) }
  exit(status)
 }
 func fail(_ message: String, _ status: Int32) {
  finish(["status":"failed", "message":"\(message) at stage '\(lastStage)' (\(hosting))"], status)
 }
 func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
  guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.host == "127.0.0.1",
        message.frameInfo.securityOrigin.protocol == "http", message.frameInfo.securityOrigin.port == (url.port ?? 80),
        let result = message.body as? [String: Any], result["nonce"] as? String == nonce else {
   fail("Unexpected probe frame or nonce", 4); return
  }
  if message.name == "footerInkProgress" {
   guard let stage = result["progress"] as? String, stage.count <= 128 else { fail("Malformed probe progress", 4); return }
   let page = (result["t"] as? Double).flatMap { $0.isFinite && abs($0) < 1e12 ? $0 : nil } ?? -1
   let visibility = String((result["visibility"] as? String ?? "unknown").prefix(16))
   // Bounded: a long run keeps its first stages and always its latest one.
   if progress.count >= 256 { progress.removeLast() }
   progress.append(["stage":stage, "pageMs":page, "helperSeconds":Date().timeIntervalSince(started), "visibility":visibility])
   trace("stage '\(stage)' (page \(Int(page)) ms, \(hosting))")
   return
  }
  let success = result["status"] as? String == "passed"
  finish(["runtime":"WKWebView", "os":ProcessInfo.processInfo.operatingSystemVersionString,
          "helperArchitecture":helperArchitecture, "webkitVersion":webkitVersion, "result":result], success ? 0 : 5)
 }
 func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
  decisionHandler(navigationAction.request.url == url && navigationAction.targetFrame?.isMainFrame == true ? .allow : .cancel)
 }
 func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { fail(error.localizedDescription, 6) }
 func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { fail(error.localizedDescription, 6) }
 func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { fail("WebKit content process terminated", 8) }
}
@main
struct FooterInkProbeMain {
 @MainActor
 static func main() {
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
  trace("WebKit \(webkitVersion), \(ProcessInfo.processInfo.operatingSystemVersionString), \(helperArchitecture)")
  // App Nap coalesces a background helper's timers by seconds, which let the
  // caller's kill arrive before this helper's own bounded failure report.
  let activity = ProcessInfo.processInfo.beginActivity(options: [.userInitiated], reason: "Bounded WebKit footer check")
  let application = NSApplication.shared
  // WebKit treats a web view outside a visible window as a hidden page and
  // suspends its content process a few seconds after load. The application
  // shows its reader in a visible window, so the check draws in one too:
  // borderless, never activated and ignoring input.
  application.setActivationPolicy(.accessory)
  let owner = Probe(url: url, nonce: nonce, output: output, helperArchitecture: helperArchitecture, webkitVersion: webkitVersion)
  let configuration = WKWebViewConfiguration()
  configuration.websiteDataStore = WKWebsiteDataStore.nonPersistent()
  configuration.userContentController.add(owner, name: "footerInk")
  configuration.userContentController.add(owner, name: "footerInkProgress")
  let frame = NSRect(x: 0, y: 0, width: 1800, height: 1500)
  let webView = WKWebView(frame: frame, configuration: configuration)
  let window = NSWindow(contentRect: NSRect(origin: NSScreen.main?.frame.origin ?? .zero, size: frame.size), styleMask: [.borderless], backing: .buffered, defer: false)
  // Floating, so an ordinary window cannot cover and hide the page.
  window.isReleasedWhenClosed = false; window.ignoresMouseEvents = true; window.level = .floating; window.contentView = webView
  window.orderFrontRegardless()
  owner.webView = webView; owner.window = window; webView.navigationDelegate = owner
  trace("window on " + (NSScreen.main.map { "screen \(Int($0.frame.width))x\(Int($0.frame.height))" } ?? "no screen"))
  webView.load(URLRequest(url: url))
  let guardTimer = DispatchSource.makeTimerSource(queue: .main)
  guardTimer.schedule(deadline: .now() + 80, leeway: .milliseconds(250))
  guardTimer.setEventHandler { MainActor.assumeIsolated { owner.fail("Bounded WebKit runtime check timed out", 7) } }
  guardTimer.resume()
  withExtendedLifetime((activity, guardTimer, window)) { application.run() }
 }
}
