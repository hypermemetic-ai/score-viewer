/*! Private score-converter package. alphaTab 1.8.4: Copyright Daniel Kuschny and Contributors; covered Source Code Form is under Mozilla Public License 2.0. Exact covered source/inventory/patches: ../../third_party/alphatab. Runtime licenses: ./NOTICE.txt. */

// src/core/report.ts
var Refusal = class extends Error {
  constructor(code, message, location = { member: "input" }) {
    super(message);
    this.code = code;
    this.location = location;
  }
};
var refuse = (code, message, location) => {
  throw new Refusal(code, message, location);
};
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) freeze(item);
  }
  return value;
}

// src/adapters/guitar-pro/limits.ts
var limits = Object.freeze({
  inputBytes: 8 * 1024 * 1024,
  entries: 32,
  memberBytes: 4 * 1024 * 1024,
  decodedBytes: 8 * 1024 * 1024,
  compressionRatio: 100,
  xmlDepth: 48,
  xmlNodes: 1e5,
  xmlText: 2 * 1024 * 1024,
  xmlAttributes: 16,
  xmlName: 80,
  xmlAttributeValue: 4096,
  xmlNodeText: 65536,
  xmlPath: 4096,
  xmlPathTotal: 8 * 1024 * 1024,
  tracks: 32,
  measures: 512,
  occurrences: 2e4,
  binaryRecords: 2e5,
  captureBytes: 24 * 1024 * 1024,
  reportBytes: 8 * 1024 * 1024,
  resultBytes: 32 * 1024 * 1024,
  workerMs: 5e3,
  workerHeapMb: 96
});

// src/guitar-pro-input.ts
var apply = Reflect.apply;
var descriptor = Object.getOwnPropertyDescriptor;
var isArray = Array.isArray;
var ByteArray = Uint8Array;
var typedArray = Object.getPrototypeOf(ByteArray.prototype);
var tag = descriptor(typedArray, Symbol.toStringTag).get;
var buffer = descriptor(typedArray, "buffer").get;
var byteOffset = descriptor(typedArray, "byteOffset").get;
var byteLength = descriptor(typedArray, "byteLength").get;
var arrayBufferLength = descriptor(ArrayBuffer.prototype, "byteLength").get;
var set = ByteArray.prototype.set;
function inputView(bytes, maximum = limits.inputBytes, sizeMessage = "GP input exceeds 8 MiB; no snapshot, digest, worker or decoding started.") {
  if (apply(tag, bytes, []) !== "Uint8Array") throw new TypeError("Expected a Uint8Array input view.");
  const length = apply(byteLength, bytes, []);
  if (length > maximum) throw new RangeError(sizeMessage);
  const storage = apply(buffer, bytes, []);
  try {
    apply(arrayBufferLength, storage, []);
  } catch {
    throw new TypeError("Expected a Uint8Array with non-shared backing storage.");
  }
  return { buffer: storage, byteOffset: apply(byteOffset, bytes, []), byteLength: length };
}
function snapshotTrackIds(ids) {
  if (ids === void 0) return void 0;
  if (!isArray(ids)) throw new TypeError("Expected 1\u20138 bounded source track ID strings.");
  const length = descriptor(ids, "length")?.value;
  if (typeof length !== "number" || !Number.isInteger(length) || length < 1 || length > limits.tracks) throw new TypeError("Expected 1\u20138 bounded source track ID strings.");
  const result = [];
  for (let i = 0; i < length; i++) {
    const entry = descriptor(ids, String(i));
    if (!entry || !("value" in entry) || typeof entry.value !== "string" || !/^\d{1,6}$/.test(entry.value)) throw new TypeError("Expected 1\u20138 bounded own source track ID strings.");
    result[i] = entry.value;
  }
  return result;
}
function snapshotInput(view) {
  const source = new ByteArray(view.buffer, view.byteOffset, view.byteLength);
  const result = new ByteArray(view.byteLength);
  apply(set, result, [source]);
  return result;
}

// src/adapters/guitar-pro/work-budgets.ts
function jsonBytes(value, maximum, code = "message-budget", location) {
  let bytes = 0;
  const add = (n) => {
    if ((bytes += n) > maximum) refuse(code, "Serialized source/report/result exceeds the explicit work budget; no partial output is admitted.", location);
  };
  const string = (s) => {
    add(2);
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c === 34 || c === 92 || [8, 9, 10, 12, 13].includes(c)) add(2);
      else if (c < 32) add(6);
      else if (c < 128) add(1);
      else if (c < 2048) add(2);
      else if (c >= 55296 && c <= 56319 && i + 1 < s.length && s.charCodeAt(i + 1) >= 56320 && s.charCodeAt(i + 1) <= 57343) {
        add(4);
        i++;
      } else if (c >= 55296 && c <= 57343) add(6);
      else add(3);
    }
  };
  const visit = (v) => {
    if (typeof v === "string") string(v);
    else if (v === null || typeof v === "boolean" || typeof v === "number") add(typeof v === "number" && !Number.isFinite(v) ? 4 : String(v).length);
    else if (Array.isArray(v)) {
      add(2 + Math.max(0, v.length - 1));
      for (const item of v) visit(item === void 0 ? null : item);
    } else if (v && typeof v === "object") {
      add(2);
      let count = 0;
      for (const [key, item] of Object.entries(v)) if (item !== void 0) {
        if (count++) add(1);
        string(key);
        add(1);
        visit(item);
      }
    }
  };
  visit(value);
  return bytes;
}

// src/webview/protocol.ts
var protocol = "score-converter-gp-worker/1";
function hostFailure(operation, inputSha256, trackIds, code, message) {
  return freeze({ ok: false, report: {
    schema: "score-converter-report/0",
    inputSha256,
    adapter: "alphatab-1.8.4-022a45c8+source-hook/1",
    profile: operation === "inspect" ? "gp-family-inventory/0" : "gp-family-fretted/0",
    requestedScope: trackIds ? { trackIds } : "all-tracks",
    findings: [{ disposition: "blocking", code, message, location: { member: "input" } }]
  } });
}

// src/webview/index.ts
var sequence = 0;
var cancellationReason = (signal) => signal.reason === void 0 ? new Error("Conversion cancelled.") : signal.reason;
async function convertGuitarPro(bytes, options = {}) {
  return run("convert", bytes, options);
}
async function inspectGuitarPro(bytes, options = {}) {
  return run("inspect", bytes, options);
}
async function run(operation, bytes, options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("Expected a conversion options object.");
  const signal = options.signal, requestedTrackIds = options.trackIds;
  if (operation === "inspect" && requestedTrackIds !== void 0) throw new TypeError("Inspection discovers source tracks; selection belongs to conversion.");
  if (signal !== void 0 && (!signal || typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function")) throw new TypeError("Expected an AbortSignal.");
  if (signal?.aborted) throw cancellationReason(signal);
  const view = inputView(bytes), trackIds = snapshotTrackIds(requestedTrackIds);
  if (typeof Worker !== "function" || typeof globalThis.crypto?.subtle?.digest !== "function" || typeof globalThis.performance?.now !== "function") throw new TypeError("This entry requires local module Workers, WebCrypto SHA-256 and a monotonic clock.");
  const inputBytes = view.byteLength;
  const input = snapshotInput(view);
  const requestId = ++sequence, started = performance.now();
  return new Promise((resolve, reject) => {
    let worker, done = false, inputSha256;
    const finish = (result, error) => {
      if (done) return;
      let immutable = result === void 0 ? void 0 : freeze(result);
      if (immutable !== void 0 && inputSha256 && performance.now() - started >= limits.workerMs) immutable = failure("work-budget", "Worker request exceeded 5 seconds; no musical output is admitted.");
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (worker) {
        worker.onmessage = worker.onerror = worker.onmessageerror = null;
        worker.terminate();
      }
      if (error !== void 0) reject(error);
      else resolve(immutable);
    };
    const failure = (code, message) => hostFailure(operation, inputSha256, trackIds, code, message);
    const abort = () => finish(void 0, cancellationReason(signal));
    const expire = () => {
      if (!inputSha256) finish(void 0, new Error("GP request exceeded 5 seconds before source hashing completed."));
      else finish(failure("work-budget", "Worker request exceeded 5 seconds; no musical output is admitted."));
    };
    const timer = setTimeout(expire, limits.workerMs);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    void (async () => {
      try {
        const digest = await globalThis.crypto.subtle.digest("SHA-256", input);
        if (done) return;
        inputSha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
        if (performance.now() - started >= limits.workerMs) {
          expire();
          return;
        }
        worker = new Worker(new URL("./guitar-pro.worker.js", import.meta.url), { type: "module" });
        worker.onmessage = ({ data }) => {
          if (done) return;
          if (performance.now() - started >= limits.workerMs) {
            expire();
            return;
          }
          try {
            if (!data || data.protocol !== protocol || data.requestId !== requestId || data.operation !== operation || data.result?.report?.inputSha256 !== inputSha256 || typeof data.result.ok !== "boolean") throw new Error("identity");
            jsonBytes(data.result, operation === "inspect" ? limits.reportBytes : limits.resultBytes);
            const result = data.result, report = result.report, requestedScope = report.requestedScope;
            if (trackIds ? !requestedScope || typeof requestedScope !== "object" || Array.isArray(requestedScope) || Object.keys(requestedScope).length !== 1 || !Array.isArray(requestedScope.trackIds) || requestedScope.trackIds.length !== trackIds.length || requestedScope.trackIds.some((id, i) => id !== trackIds[i]) : requestedScope !== "all-tracks") throw new Error("scope");
            if (report.schema !== "score-converter-report/0" || report.adapter !== "alphatab-1.8.4-022a45c8+source-hook/1" || typeof report.profile !== "string" || !Array.isArray(report.findings)) throw new Error("report-shape");
            if (!result.ok) {
              if (Object.keys(result).some((key) => !["ok", "report"].includes(key)) || report.convertedParts !== void 0) throw new Error("failure-shape");
            } else if (operation === "inspect") {
              if (!Array.isArray(result.tracks) || Object.keys(result).some((key) => !["ok", "report", "tracks"].includes(key)) || report.convertedParts !== void 0) throw new Error("inventory-shape");
            } else if (!["fretted", "arrangement"].includes(result.scoreKind) || typeof result.musicxml !== "string" || !Array.isArray(report.convertedParts) || !result.score || !Array.isArray(result.score.parts) || !Array.isArray(result.occurrences) || !Array.isArray(result.containerSource) || !result.inputSource || result.inputSource.bytes !== inputBytes || result.inputSource.sha256 !== inputSha256 || typeof result.inputSource.dataBase64 !== "string" || Object.keys(result).some((key) => !["ok", "report", "musicxml", "scoreKind", "score", "occurrences", "containerSource", "inputSource", "source", "binarySource", "gpxSource"].includes(key)) || ["source", "binarySource", "gpxSource"].some((key) => result[key] !== void 0 && (!result[key] || typeof result[key] !== "object" || Array.isArray(result[key])))) throw new Error("conversion-shape");
            finish(data.result);
          } catch {
            finish(failure("worker-identity", "Worker response does not match the bounded immutable request/result contract."));
          }
        };
        worker.onerror = (event) => {
          event.preventDefault();
          finish(failure("worker-runtime", "Local module Worker failed; no musical output is admitted."));
        };
        worker.onmessageerror = () => finish(failure("worker-message", "Worker result could not be received; no musical output is admitted."));
        worker.postMessage({ protocol, requestId, operation, inputSha256, bytes: input, ...trackIds ? { trackIds } : {} }, [input.buffer]);
      } catch (error) {
        if (inputSha256) finish(failure("worker-runtime", "Local module Worker could not start; no musical output is admitted."));
        else finish(void 0, error);
      }
    })();
  });
}
export {
  convertGuitarPro,
  inspectGuitarPro
};
