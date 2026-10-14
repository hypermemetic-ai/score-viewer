// One-shot public WebKit check. No production app/managed data boot.
import AppKit
import WebKit
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
  if done { return }; done = true
  webView?.stopLoading(); webView?.configuration.userContentController.removeScriptMessageHandler(forName: "footerInk")
  do { let data = try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]); try data.write(to: URL(fileURLWithPath: output), options: .atomic) }
  catch { fputs("Cannot write WebKit probe receipt\n", stderr); exit(3) }
  exit(status)
 }
 func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
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
 func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { finish(["status":"failed", "message":error.localizedDescription], 6) }
 func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { finish(["status":"failed", "message":error.localizedDescription], 6) }
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
  let application = NSApplication.shared
  application.setActivationPolicy(.prohibited)
  let owner = Probe(url: url, nonce: nonce, output: output, helperArchitecture: helperArchitecture, webkitVersion: webkitVersion)
  let configuration = WKWebViewConfiguration()
  configuration.websiteDataStore = WKWebsiteDataStore.nonPersistent()
  configuration.userContentController.add(owner, name: "footerInk")
  let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 1800, height: 1500), configuration: configuration)
  owner.webView = webView; webView.navigationDelegate = owner
  webView.load(URLRequest(url: url))
  DispatchQueue.main.asyncAfter(deadline: .now() + 80) { owner.finish(["status":"failed", "message":"Bounded WebKit runtime check timed out"], 7) }
  application.run()
 }
}
