/*! Private score-converter package. alphaTab 1.8.4: Copyright Daniel Kuschny and Contributors; covered Source Code Form is under Mozilla Public License 2.0. Exact covered source/inventory/patches: ../../third_party/alphatab. Runtime licenses: ./NOTICE.txt. */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/xmlchars/xml/1.0/ed5.js
var require_ed5 = __commonJS({
  "node_modules/xmlchars/xml/1.0/ed5.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHAR = "	\n\r -\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}";
    exports.S = " 	\r\n";
    exports.NAME_START_CHAR = ":A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}";
    exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9\xB7\u0300-\u036F\u203F-\u2040";
    exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
    exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
    exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
    exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
    exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
    exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    exports.S_LIST = [SPACE, NL, CR, TAB];
    function isChar(c) {
      return c >= SPACE && c <= 55295 || c === NL || c === CR || c === TAB || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isChar = isChar;
    function isS(c) {
      return c === SPACE || c === NL || c === CR || c === TAB;
    }
    exports.isS = isS;
    function isNameStartChar(c) {
      return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNameStartChar = isNameStartChar;
    function isNameChar(c) {
      return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
    }
    exports.isNameChar = isNameChar;
  }
});

// node_modules/xmlchars/xml/1.1/ed2.js
var require_ed2 = __commonJS({
  "node_modules/xmlchars/xml/1.1/ed2.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHAR = "-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}";
    exports.RESTRICTED_CHAR = "-\b\v\f-\x7F-\x84\x86-\x9F";
    exports.S = " 	\r\n";
    exports.NAME_START_CHAR = ":A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}";
    exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9\xB7\u0300-\u036F\u203F-\u2040";
    exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
    exports.RESTRICTED_CHAR_RE = new RegExp("^[" + exports.RESTRICTED_CHAR + "]$", "u");
    exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
    exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
    exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
    exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
    exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    exports.S_LIST = [SPACE, NL, CR, TAB];
    function isChar(c) {
      return c >= 1 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isChar = isChar;
    function isRestrictedChar(c) {
      return c >= 1 && c <= 8 || c === 11 || c === 12 || c >= 14 && c <= 31 || c >= 127 && c <= 132 || c >= 134 && c <= 159;
    }
    exports.isRestrictedChar = isRestrictedChar;
    function isCharAndNotRestricted(c) {
      return c === 9 || c === 10 || c === 13 || c > 31 && c < 127 || c === 133 || c > 159 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isCharAndNotRestricted = isCharAndNotRestricted;
    function isS(c) {
      return c === SPACE || c === NL || c === CR || c === TAB;
    }
    exports.isS = isS;
    function isNameStartChar(c) {
      return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNameStartChar = isNameStartChar;
    function isNameChar(c) {
      return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
    }
    exports.isNameChar = isNameChar;
  }
});

// node_modules/xmlchars/xmlns/1.0/ed3.js
var require_ed3 = __commonJS({
  "node_modules/xmlchars/xmlns/1.0/ed3.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NC_NAME_START_CHAR = "A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}";
    exports.NC_NAME_CHAR = "-" + exports.NC_NAME_START_CHAR + ".0-9\xB7\u0300-\u036F\u203F-\u2040";
    exports.NC_NAME_START_CHAR_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "]$", "u");
    exports.NC_NAME_CHAR_RE = new RegExp("^[" + exports.NC_NAME_CHAR + "]$", "u");
    exports.NC_NAME_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "][" + exports.NC_NAME_CHAR + "]*$", "u");
    function isNCNameStartChar(c) {
      return c >= 65 && c <= 90 || c === 95 || c >= 97 && c <= 122 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8204 && c <= 8205 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNCNameStartChar = isNCNameStartChar;
    function isNCNameChar(c) {
      return isNCNameStartChar(c) || (c === 45 || c === 46 || c >= 48 && c <= 57 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256);
    }
    exports.isNCNameChar = isNCNameChar;
  }
});

// node_modules/saxes/saxes.js
var require_saxes = __commonJS({
  "node_modules/saxes/saxes.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SaxesParser = exports.EVENTS = void 0;
    var ed5 = require_ed5();
    var ed2 = require_ed2();
    var NSed3 = require_ed3();
    var isS = ed5.isS;
    var isChar10 = ed5.isChar;
    var isNameStartChar = ed5.isNameStartChar;
    var isNameChar = ed5.isNameChar;
    var S_LIST = ed5.S_LIST;
    var NAME_RE = ed5.NAME_RE;
    var isChar11 = ed2.isChar;
    var isNCNameStartChar = NSed3.isNCNameStartChar;
    var isNCNameChar = NSed3.isNCNameChar;
    var NC_NAME_RE = NSed3.NC_NAME_RE;
    var XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
    var XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
    var rootNS = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      __proto__: null,
      xml: XML_NAMESPACE,
      xmlns: XMLNS_NAMESPACE
    };
    var XML_ENTITIES = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      __proto__: null,
      amp: "&",
      gt: ">",
      lt: "<",
      quot: '"',
      apos: "'"
    };
    var EOC = -1;
    var NL_LIKE = -2;
    var S_BEGIN = 0;
    var S_BEGIN_WHITESPACE = 1;
    var S_DOCTYPE = 2;
    var S_DOCTYPE_QUOTE = 3;
    var S_DTD = 4;
    var S_DTD_QUOTED = 5;
    var S_DTD_OPEN_WAKA = 6;
    var S_DTD_OPEN_WAKA_BANG = 7;
    var S_DTD_COMMENT = 8;
    var S_DTD_COMMENT_ENDING = 9;
    var S_DTD_COMMENT_ENDED = 10;
    var S_DTD_PI = 11;
    var S_DTD_PI_ENDING = 12;
    var S_TEXT = 13;
    var S_ENTITY = 14;
    var S_OPEN_WAKA = 15;
    var S_OPEN_WAKA_BANG = 16;
    var S_COMMENT = 17;
    var S_COMMENT_ENDING = 18;
    var S_COMMENT_ENDED = 19;
    var S_CDATA = 20;
    var S_CDATA_ENDING = 21;
    var S_CDATA_ENDING_2 = 22;
    var S_PI_FIRST_CHAR = 23;
    var S_PI_REST = 24;
    var S_PI_BODY = 25;
    var S_PI_ENDING = 26;
    var S_XML_DECL_NAME_START = 27;
    var S_XML_DECL_NAME = 28;
    var S_XML_DECL_EQ = 29;
    var S_XML_DECL_VALUE_START = 30;
    var S_XML_DECL_VALUE = 31;
    var S_XML_DECL_SEPARATOR = 32;
    var S_XML_DECL_ENDING = 33;
    var S_OPEN_TAG = 34;
    var S_OPEN_TAG_SLASH = 35;
    var S_ATTRIB = 36;
    var S_ATTRIB_NAME = 37;
    var S_ATTRIB_NAME_SAW_WHITE = 38;
    var S_ATTRIB_VALUE = 39;
    var S_ATTRIB_VALUE_QUOTED = 40;
    var S_ATTRIB_VALUE_CLOSED = 41;
    var S_ATTRIB_VALUE_UNQUOTED = 42;
    var S_CLOSE_TAG = 43;
    var S_CLOSE_TAG_SAW_WHITE = 44;
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    var BANG = 33;
    var DQUOTE = 34;
    var AMP = 38;
    var SQUOTE = 39;
    var MINUS = 45;
    var FORWARD_SLASH = 47;
    var SEMICOLON = 59;
    var LESS = 60;
    var EQUAL = 61;
    var GREATER = 62;
    var QUESTION = 63;
    var OPEN_BRACKET = 91;
    var CLOSE_BRACKET = 93;
    var NEL = 133;
    var LS = 8232;
    var isQuote = (c) => c === DQUOTE || c === SQUOTE;
    var QUOTES = [DQUOTE, SQUOTE];
    var DOCTYPE_TERMINATOR = [...QUOTES, OPEN_BRACKET, GREATER];
    var DTD_TERMINATOR = [...QUOTES, LESS, CLOSE_BRACKET];
    var XML_DECL_NAME_TERMINATOR = [EQUAL, QUESTION, ...S_LIST];
    var ATTRIB_VALUE_UNQUOTED_TERMINATOR = [...S_LIST, GREATER, AMP, LESS];
    function nsPairCheck(parser, prefix, uri) {
      switch (prefix) {
        case "xml":
          if (uri !== XML_NAMESPACE) {
            parser.fail(`xml prefix must be bound to ${XML_NAMESPACE}.`);
          }
          break;
        case "xmlns":
          if (uri !== XMLNS_NAMESPACE) {
            parser.fail(`xmlns prefix must be bound to ${XMLNS_NAMESPACE}.`);
          }
          break;
        default:
      }
      switch (uri) {
        case XMLNS_NAMESPACE:
          parser.fail(prefix === "" ? `the default namespace may not be set to ${uri}.` : `may not assign a prefix (even "xmlns") to the URI ${XMLNS_NAMESPACE}.`);
          break;
        case XML_NAMESPACE:
          switch (prefix) {
            case "xml":
              break;
            case "":
              parser.fail(`the default namespace may not be set to ${uri}.`);
              break;
            default:
              parser.fail("may not assign the xml namespace to another prefix.");
          }
          break;
        default:
      }
    }
    function nsMappingCheck(parser, mapping) {
      for (const local of Object.keys(mapping)) {
        nsPairCheck(parser, local, mapping[local]);
      }
    }
    var isNCName = (name) => NC_NAME_RE.test(name);
    var isName = (name) => NAME_RE.test(name);
    var FORBIDDEN_START = 0;
    var FORBIDDEN_BRACKET = 1;
    var FORBIDDEN_BRACKET_BRACKET = 2;
    exports.EVENTS = [
      "xmldecl",
      "text",
      "processinginstruction",
      "doctype",
      "comment",
      "opentagstart",
      "attribute",
      "opentag",
      "closetag",
      "cdata",
      "error",
      "end",
      "ready"
    ];
    var EVENT_NAME_TO_HANDLER_NAME = {
      xmldecl: "xmldeclHandler",
      text: "textHandler",
      processinginstruction: "piHandler",
      doctype: "doctypeHandler",
      comment: "commentHandler",
      opentagstart: "openTagStartHandler",
      attribute: "attributeHandler",
      opentag: "openTagHandler",
      closetag: "closeTagHandler",
      cdata: "cdataHandler",
      error: "errorHandler",
      end: "endHandler",
      ready: "readyHandler"
    };
    var SaxesParser2 = class {
      /**
       * @param opt The parser options.
       */
      constructor(opt) {
        this.opt = opt !== null && opt !== void 0 ? opt : {};
        this.fragmentOpt = !!this.opt.fragment;
        const xmlnsOpt = this.xmlnsOpt = !!this.opt.xmlns;
        this.trackPosition = this.opt.position !== false;
        this.fileName = this.opt.fileName;
        if (xmlnsOpt) {
          this.nameStartCheck = isNCNameStartChar;
          this.nameCheck = isNCNameChar;
          this.isName = isNCName;
          this.processAttribs = this.processAttribsNS;
          this.pushAttrib = this.pushAttribNS;
          this.ns = Object.assign({ __proto__: null }, rootNS);
          const additional = this.opt.additionalNamespaces;
          if (additional != null) {
            nsMappingCheck(this, additional);
            Object.assign(this.ns, additional);
          }
        } else {
          this.nameStartCheck = isNameStartChar;
          this.nameCheck = isNameChar;
          this.isName = isName;
          this.processAttribs = this.processAttribsPlain;
          this.pushAttrib = this.pushAttribPlain;
        }
        this.stateTable = [
          /* eslint-disable @typescript-eslint/unbound-method */
          this.sBegin,
          this.sBeginWhitespace,
          this.sDoctype,
          this.sDoctypeQuote,
          this.sDTD,
          this.sDTDQuoted,
          this.sDTDOpenWaka,
          this.sDTDOpenWakaBang,
          this.sDTDComment,
          this.sDTDCommentEnding,
          this.sDTDCommentEnded,
          this.sDTDPI,
          this.sDTDPIEnding,
          this.sText,
          this.sEntity,
          this.sOpenWaka,
          this.sOpenWakaBang,
          this.sComment,
          this.sCommentEnding,
          this.sCommentEnded,
          this.sCData,
          this.sCDataEnding,
          this.sCDataEnding2,
          this.sPIFirstChar,
          this.sPIRest,
          this.sPIBody,
          this.sPIEnding,
          this.sXMLDeclNameStart,
          this.sXMLDeclName,
          this.sXMLDeclEq,
          this.sXMLDeclValueStart,
          this.sXMLDeclValue,
          this.sXMLDeclSeparator,
          this.sXMLDeclEnding,
          this.sOpenTag,
          this.sOpenTagSlash,
          this.sAttrib,
          this.sAttribName,
          this.sAttribNameSawWhite,
          this.sAttribValue,
          this.sAttribValueQuoted,
          this.sAttribValueClosed,
          this.sAttribValueUnquoted,
          this.sCloseTag,
          this.sCloseTagSawWhite
          /* eslint-enable @typescript-eslint/unbound-method */
        ];
        this._init();
      }
      /**
       * Indicates whether or not the parser is closed. If ``true``, wait for
       * the ``ready`` event to write again.
       */
      get closed() {
        return this._closed;
      }
      _init() {
        var _a;
        this.openWakaBang = "";
        this.text = "";
        this.name = "";
        this.piTarget = "";
        this.entity = "";
        this.q = null;
        this.tags = [];
        this.tag = null;
        this.topNS = null;
        this.chunk = "";
        this.chunkPosition = 0;
        this.i = 0;
        this.prevI = 0;
        this.carriedFromPrevious = void 0;
        this.forbiddenState = FORBIDDEN_START;
        this.attribList = [];
        const { fragmentOpt } = this;
        this.state = fragmentOpt ? S_TEXT : S_BEGIN;
        this.reportedTextBeforeRoot = this.reportedTextAfterRoot = this.closedRoot = this.sawRoot = fragmentOpt;
        this.xmlDeclPossible = !fragmentOpt;
        this.xmlDeclExpects = ["version"];
        this.entityReturnState = void 0;
        let { defaultXMLVersion } = this.opt;
        if (defaultXMLVersion === void 0) {
          if (this.opt.forceXMLVersion === true) {
            throw new Error("forceXMLVersion set but defaultXMLVersion is not set");
          }
          defaultXMLVersion = "1.0";
        }
        this.setXMLVersion(defaultXMLVersion);
        this.positionAtNewLine = 0;
        this.doctype = false;
        this._closed = false;
        this.xmlDecl = {
          version: void 0,
          encoding: void 0,
          standalone: void 0
        };
        this.line = 1;
        this.column = 0;
        this.ENTITIES = Object.create(XML_ENTITIES);
        (_a = this.readyHandler) === null || _a === void 0 ? void 0 : _a.call(this);
      }
      /**
       * The stream position the parser is currently looking at. This field is
       * zero-based.
       *
       * This field is not based on counting Unicode characters but is to be
       * interpreted as a plain index into a JavaScript string.
       */
      get position() {
        return this.chunkPosition + this.i;
      }
      /**
       * The column number of the next character to be read by the parser.  *
       * This field is zero-based. (The first column in a line is 0.)
       *
       * This field reports the index at which the next character would be in the
       * line if the line were represented as a JavaScript string.  Note that this
       * *can* be different to a count based on the number of *Unicode characters*
       * due to how JavaScript handles astral plane characters.
       *
       * See [[column]] for a number that corresponds to a count of Unicode
       * characters.
       */
      get columnIndex() {
        return this.position - this.positionAtNewLine;
      }
      /**
       * Set an event listener on an event. The parser supports one handler per
       * event type. If you try to set an event handler over an existing handler,
       * the old handler is silently overwritten.
       *
       * @param name The event to listen to.
       *
       * @param handler The handler to set.
       */
      on(name, handler) {
        this[EVENT_NAME_TO_HANDLER_NAME[name]] = handler;
      }
      /**
       * Unset an event handler.
       *
       * @parma name The event to stop listening to.
       */
      off(name) {
        this[EVENT_NAME_TO_HANDLER_NAME[name]] = void 0;
      }
      /**
       * Make an error object. The error object will have a message that contains
       * the ``fileName`` option passed at the creation of the parser. If position
       * tracking was turned on, it will also have line and column number
       * information.
       *
       * @param message The message describing the error to report.
       *
       * @returns An error object with a properly formatted message.
       */
      makeError(message) {
        var _a;
        let msg = (_a = this.fileName) !== null && _a !== void 0 ? _a : "";
        if (this.trackPosition) {
          if (msg.length > 0) {
            msg += ":";
          }
          msg += `${this.line}:${this.column}`;
        }
        if (msg.length > 0) {
          msg += ": ";
        }
        return new Error(msg + message);
      }
      /**
       * Report a parsing error. This method is made public so that client code may
       * check for issues that are outside the scope of this project and can report
       * errors.
       *
       * @param message The error to report.
       *
       * @returns this
       */
      fail(message) {
        const err = this.makeError(message);
        const handler = this.errorHandler;
        if (handler === void 0) {
          throw err;
        } else {
          handler(err);
        }
        return this;
      }
      /**
       * Write a XML data to the parser.
       *
       * @param chunk The XML data to write.
       *
       * @returns this
       */
      // We do need object for the type here. Yes, it often causes problems
      // but not in this case.
      write(chunk) {
        if (this.closed) {
          return this.fail("cannot write after close; assign an onready handler.");
        }
        let end = false;
        if (chunk === null) {
          end = true;
          chunk = "";
        } else if (typeof chunk === "object") {
          chunk = chunk.toString();
        }
        if (this.carriedFromPrevious !== void 0) {
          chunk = `${this.carriedFromPrevious}${chunk}`;
          this.carriedFromPrevious = void 0;
        }
        let limit = chunk.length;
        const lastCode = chunk.charCodeAt(limit - 1);
        if (!end && // A trailing CR or surrogate must be carried over to the next
        // chunk.
        (lastCode === CR || lastCode >= 55296 && lastCode <= 56319)) {
          this.carriedFromPrevious = chunk[limit - 1];
          limit--;
          chunk = chunk.slice(0, limit);
        }
        const { stateTable } = this;
        this.chunk = chunk;
        this.i = 0;
        while (this.i < limit) {
          stateTable[this.state].call(this);
        }
        this.chunkPosition += limit;
        return end ? this.end() : this;
      }
      /**
       * Close the current stream. Perform final well-formedness checks and reset
       * the parser tstate.
       *
       * @returns this
       */
      close() {
        return this.write(null);
      }
      /**
       * Get a single code point out of the current chunk. This updates the current
       * position if we do position tracking.
       *
       * This is the algorithm to use for XML 1.0.
       *
       * @returns The character read.
       */
      getCode10() {
        const { chunk, i } = this;
        this.prevI = i;
        this.i = i + 1;
        if (i >= chunk.length) {
          return EOC;
        }
        const code = chunk.charCodeAt(i);
        this.column++;
        if (code < 55296) {
          if (code >= SPACE || code === TAB) {
            return code;
          }
          switch (code) {
            case NL:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL;
            case CR:
              if (chunk.charCodeAt(i + 1) === NL) {
                this.i = i + 2;
              }
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL_LIKE;
            default:
              this.fail("disallowed character.");
              return code;
          }
        }
        if (code > 56319) {
          if (!(code >= 57344 && code <= 65533)) {
            this.fail("disallowed character.");
          }
          return code;
        }
        const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
        this.i = i + 2;
        if (final > 1114111) {
          this.fail("disallowed character.");
        }
        return final;
      }
      /**
       * Get a single code point out of the current chunk. This updates the current
       * position if we do position tracking.
       *
       * This is the algorithm to use for XML 1.1.
       *
       * @returns {number} The character read.
       */
      getCode11() {
        const { chunk, i } = this;
        this.prevI = i;
        this.i = i + 1;
        if (i >= chunk.length) {
          return EOC;
        }
        const code = chunk.charCodeAt(i);
        this.column++;
        if (code < 55296) {
          if (code > 31 && code < 127 || code > 159 && code !== LS || code === TAB) {
            return code;
          }
          switch (code) {
            case NL:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL;
            case CR: {
              const next = chunk.charCodeAt(i + 1);
              if (next === NL || next === NEL) {
                this.i = i + 2;
              }
            }
            /* yes, fall through */
            case NEL:
            // 0x85
            case LS:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL_LIKE;
            default:
              this.fail("disallowed character.");
              return code;
          }
        }
        if (code > 56319) {
          if (!(code >= 57344 && code <= 65533)) {
            this.fail("disallowed character.");
          }
          return code;
        }
        const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
        this.i = i + 2;
        if (final > 1114111) {
          this.fail("disallowed character.");
        }
        return final;
      }
      /**
       * Like ``getCode`` but with the return value normalized so that ``NL`` is
       * returned for ``NL_LIKE``.
       */
      getCodeNorm() {
        const c = this.getCode();
        return c === NL_LIKE ? NL : c;
      }
      unget() {
        this.i = this.prevI;
        this.column--;
      }
      /**
       * Capture characters into a buffer until encountering one of a set of
       * characters.
       *
       * @param chars An array of codepoints. Encountering a character in the array
       * ends the capture. (``chars`` may safely contain ``NL``.)
       *
       * @return The character code that made the capture end, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      captureTo(chars) {
        let { i: start } = this;
        const { chunk } = this;
        while (true) {
          const c = this.getCode();
          const isNLLike = c === NL_LIKE;
          const final = isNLLike ? NL : c;
          if (final === EOC || chars.includes(final)) {
            this.text += chunk.slice(start, this.prevI);
            return final;
          }
          if (isNLLike) {
            this.text += `${chunk.slice(start, this.prevI)}
`;
            start = this.i;
          }
        }
      }
      /**
       * Capture characters into a buffer until encountering a character.
       *
       * @param char The codepoint that ends the capture. **NOTE ``char`` MAY NOT
       * CONTAIN ``NL``.** Passing ``NL`` will result in buggy behavior.
       *
       * @return ``true`` if we ran into the character. Otherwise, we ran into the
       * end of the current chunk.
       */
      captureToChar(char) {
        let { i: start } = this;
        const { chunk } = this;
        while (true) {
          let c = this.getCode();
          switch (c) {
            case NL_LIKE:
              this.text += `${chunk.slice(start, this.prevI)}
`;
              start = this.i;
              c = NL;
              break;
            case EOC:
              this.text += chunk.slice(start);
              return false;
            default:
          }
          if (c === char) {
            this.text += chunk.slice(start, this.prevI);
            return true;
          }
        }
      }
      /**
       * Capture characters that satisfy ``isNameChar`` into the ``name`` field of
       * this parser.
       *
       * @return The character code that made the test fail, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      captureNameChars() {
        const { chunk, i: start } = this;
        while (true) {
          const c = this.getCode();
          if (c === EOC) {
            this.name += chunk.slice(start);
            return EOC;
          }
          if (!isNameChar(c)) {
            this.name += chunk.slice(start, this.prevI);
            return c === NL_LIKE ? NL : c;
          }
        }
      }
      /**
       * Skip white spaces.
       *
       * @return The character that ended the skip, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      skipSpaces() {
        while (true) {
          const c = this.getCodeNorm();
          if (c === EOC || !isS(c)) {
            return c;
          }
        }
      }
      setXMLVersion(version) {
        this.currentXMLVersion = version;
        if (version === "1.0") {
          this.isChar = isChar10;
          this.getCode = this.getCode10;
        } else {
          this.isChar = isChar11;
          this.getCode = this.getCode11;
        }
      }
      // STATE ENGINE METHODS
      // This needs to be a state separate from S_BEGIN_WHITESPACE because we want
      // to be sure never to come back to this state later.
      sBegin() {
        if (this.chunk.charCodeAt(0) === 65279) {
          this.i++;
          this.column++;
        }
        this.state = S_BEGIN_WHITESPACE;
      }
      sBeginWhitespace() {
        const iBefore = this.i;
        const c = this.skipSpaces();
        if (this.prevI !== iBefore) {
          this.xmlDeclPossible = false;
        }
        switch (c) {
          case LESS:
            this.state = S_OPEN_WAKA;
            if (this.text.length !== 0) {
              throw new Error("no-empty text at start");
            }
            break;
          case EOC:
            break;
          default:
            this.unget();
            this.state = S_TEXT;
            this.xmlDeclPossible = false;
        }
      }
      sDoctype() {
        var _a;
        const c = this.captureTo(DOCTYPE_TERMINATOR);
        switch (c) {
          case GREATER: {
            (_a = this.doctypeHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.text);
            this.text = "";
            this.state = S_TEXT;
            this.doctype = true;
            break;
          }
          case EOC:
            break;
          default:
            this.text += String.fromCodePoint(c);
            if (c === OPEN_BRACKET) {
              this.state = S_DTD;
            } else if (isQuote(c)) {
              this.state = S_DOCTYPE_QUOTE;
              this.q = c;
            }
        }
      }
      sDoctypeQuote() {
        const q2 = this.q;
        if (this.captureToChar(q2)) {
          this.text += String.fromCodePoint(q2);
          this.q = null;
          this.state = S_DOCTYPE;
        }
      }
      sDTD() {
        const c = this.captureTo(DTD_TERMINATOR);
        if (c === EOC) {
          return;
        }
        this.text += String.fromCodePoint(c);
        if (c === CLOSE_BRACKET) {
          this.state = S_DOCTYPE;
        } else if (c === LESS) {
          this.state = S_DTD_OPEN_WAKA;
        } else if (isQuote(c)) {
          this.state = S_DTD_QUOTED;
          this.q = c;
        }
      }
      sDTDQuoted() {
        const q2 = this.q;
        if (this.captureToChar(q2)) {
          this.text += String.fromCodePoint(q2);
          this.state = S_DTD;
          this.q = null;
        }
      }
      sDTDOpenWaka() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        switch (c) {
          case BANG:
            this.state = S_DTD_OPEN_WAKA_BANG;
            this.openWakaBang = "";
            break;
          case QUESTION:
            this.state = S_DTD_PI;
            break;
          default:
            this.state = S_DTD;
        }
      }
      sDTDOpenWakaBang() {
        const char = String.fromCodePoint(this.getCodeNorm());
        const owb = this.openWakaBang += char;
        this.text += char;
        if (owb !== "-") {
          this.state = owb === "--" ? S_DTD_COMMENT : S_DTD;
          this.openWakaBang = "";
        }
      }
      sDTDComment() {
        if (this.captureToChar(MINUS)) {
          this.text += "-";
          this.state = S_DTD_COMMENT_ENDING;
        }
      }
      sDTDCommentEnding() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        this.state = c === MINUS ? S_DTD_COMMENT_ENDED : S_DTD_COMMENT;
      }
      sDTDCommentEnded() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        if (c === GREATER) {
          this.state = S_DTD;
        } else {
          this.fail("malformed comment.");
          this.state = S_DTD_COMMENT;
        }
      }
      sDTDPI() {
        if (this.captureToChar(QUESTION)) {
          this.text += "?";
          this.state = S_DTD_PI_ENDING;
        }
      }
      sDTDPIEnding() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        if (c === GREATER) {
          this.state = S_DTD;
        }
      }
      sText() {
        if (this.tags.length !== 0) {
          this.handleTextInRoot();
        } else {
          this.handleTextOutsideRoot();
        }
      }
      sEntity() {
        let { i: start } = this;
        const { chunk } = this;
        loop:
          while (true) {
            switch (this.getCode()) {
              case NL_LIKE:
                this.entity += `${chunk.slice(start, this.prevI)}
`;
                start = this.i;
                break;
              case SEMICOLON: {
                const { entityReturnState } = this;
                const entity = this.entity + chunk.slice(start, this.prevI);
                this.state = entityReturnState;
                let parsed;
                if (entity === "") {
                  this.fail("empty entity name.");
                  parsed = "&;";
                } else {
                  parsed = this.parseEntity(entity);
                  this.entity = "";
                }
                if (entityReturnState !== S_TEXT || this.textHandler !== void 0) {
                  this.text += parsed;
                }
                break loop;
              }
              case EOC:
                this.entity += chunk.slice(start);
                break loop;
              default:
            }
          }
      }
      sOpenWaka() {
        const c = this.getCode();
        if (isNameStartChar(c)) {
          this.state = S_OPEN_TAG;
          this.unget();
          this.xmlDeclPossible = false;
        } else {
          switch (c) {
            case FORWARD_SLASH:
              this.state = S_CLOSE_TAG;
              this.xmlDeclPossible = false;
              break;
            case BANG:
              this.state = S_OPEN_WAKA_BANG;
              this.openWakaBang = "";
              this.xmlDeclPossible = false;
              break;
            case QUESTION:
              this.state = S_PI_FIRST_CHAR;
              break;
            default:
              this.fail("disallowed character in tag name");
              this.state = S_TEXT;
              this.xmlDeclPossible = false;
          }
        }
      }
      sOpenWakaBang() {
        this.openWakaBang += String.fromCodePoint(this.getCodeNorm());
        switch (this.openWakaBang) {
          case "[CDATA[":
            if (!this.sawRoot && !this.reportedTextBeforeRoot) {
              this.fail("text data outside of root node.");
              this.reportedTextBeforeRoot = true;
            }
            if (this.closedRoot && !this.reportedTextAfterRoot) {
              this.fail("text data outside of root node.");
              this.reportedTextAfterRoot = true;
            }
            this.state = S_CDATA;
            this.openWakaBang = "";
            break;
          case "--":
            this.state = S_COMMENT;
            this.openWakaBang = "";
            break;
          case "DOCTYPE":
            this.state = S_DOCTYPE;
            if (this.doctype || this.sawRoot) {
              this.fail("inappropriately located doctype declaration.");
            }
            this.openWakaBang = "";
            break;
          default:
            if (this.openWakaBang.length >= 7) {
              this.fail("incorrect syntax.");
            }
        }
      }
      sComment() {
        if (this.captureToChar(MINUS)) {
          this.state = S_COMMENT_ENDING;
        }
      }
      sCommentEnding() {
        var _a;
        const c = this.getCodeNorm();
        if (c === MINUS) {
          this.state = S_COMMENT_ENDED;
          (_a = this.commentHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.text);
          this.text = "";
        } else {
          this.text += `-${String.fromCodePoint(c)}`;
          this.state = S_COMMENT;
        }
      }
      sCommentEnded() {
        const c = this.getCodeNorm();
        if (c !== GREATER) {
          this.fail("malformed comment.");
          this.text += `--${String.fromCodePoint(c)}`;
          this.state = S_COMMENT;
        } else {
          this.state = S_TEXT;
        }
      }
      sCData() {
        if (this.captureToChar(CLOSE_BRACKET)) {
          this.state = S_CDATA_ENDING;
        }
      }
      sCDataEnding() {
        const c = this.getCodeNorm();
        if (c === CLOSE_BRACKET) {
          this.state = S_CDATA_ENDING_2;
        } else {
          this.text += `]${String.fromCodePoint(c)}`;
          this.state = S_CDATA;
        }
      }
      sCDataEnding2() {
        var _a;
        const c = this.getCodeNorm();
        switch (c) {
          case GREATER: {
            (_a = this.cdataHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.text);
            this.text = "";
            this.state = S_TEXT;
            break;
          }
          case CLOSE_BRACKET:
            this.text += "]";
            break;
          default:
            this.text += `]]${String.fromCodePoint(c)}`;
            this.state = S_CDATA;
        }
      }
      // We need this separate state to check the first character fo the pi target
      // with this.nameStartCheck which allows less characters than this.nameCheck.
      sPIFirstChar() {
        const c = this.getCodeNorm();
        if (this.nameStartCheck(c)) {
          this.piTarget += String.fromCodePoint(c);
          this.state = S_PI_REST;
        } else if (c === QUESTION || isS(c)) {
          this.fail("processing instruction without a target.");
          this.state = c === QUESTION ? S_PI_ENDING : S_PI_BODY;
        } else {
          this.fail("disallowed character in processing instruction name.");
          this.piTarget += String.fromCodePoint(c);
          this.state = S_PI_REST;
        }
      }
      sPIRest() {
        const { chunk, i: start } = this;
        while (true) {
          const c = this.getCodeNorm();
          if (c === EOC) {
            this.piTarget += chunk.slice(start);
            return;
          }
          if (!this.nameCheck(c)) {
            this.piTarget += chunk.slice(start, this.prevI);
            const isQuestion = c === QUESTION;
            if (isQuestion || isS(c)) {
              if (this.piTarget === "xml") {
                if (!this.xmlDeclPossible) {
                  this.fail("an XML declaration must be at the start of the document.");
                }
                this.state = isQuestion ? S_XML_DECL_ENDING : S_XML_DECL_NAME_START;
              } else {
                this.state = isQuestion ? S_PI_ENDING : S_PI_BODY;
              }
            } else {
              this.fail("disallowed character in processing instruction name.");
              this.piTarget += String.fromCodePoint(c);
            }
            break;
          }
        }
      }
      sPIBody() {
        if (this.text.length === 0) {
          const c = this.getCodeNorm();
          if (c === QUESTION) {
            this.state = S_PI_ENDING;
          } else if (!isS(c)) {
            this.text = String.fromCodePoint(c);
          }
        } else if (this.captureToChar(QUESTION)) {
          this.state = S_PI_ENDING;
        }
      }
      sPIEnding() {
        var _a;
        const c = this.getCodeNorm();
        if (c === GREATER) {
          const { piTarget } = this;
          if (piTarget.toLowerCase() === "xml") {
            this.fail("the XML declaration must appear at the start of the document.");
          }
          (_a = this.piHandler) === null || _a === void 0 ? void 0 : _a.call(this, {
            target: piTarget,
            body: this.text
          });
          this.piTarget = this.text = "";
          this.state = S_TEXT;
        } else if (c === QUESTION) {
          this.text += "?";
        } else {
          this.text += `?${String.fromCodePoint(c)}`;
          this.state = S_PI_BODY;
        }
        this.xmlDeclPossible = false;
      }
      sXMLDeclNameStart() {
        const c = this.skipSpaces();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          return;
        }
        if (c !== EOC) {
          this.state = S_XML_DECL_NAME;
          this.name = String.fromCodePoint(c);
        }
      }
      sXMLDeclName() {
        const c = this.captureTo(XML_DECL_NAME_TERMINATOR);
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.name += this.text;
          this.text = "";
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (!(isS(c) || c === EQUAL)) {
          return;
        }
        this.name += this.text;
        this.text = "";
        if (!this.xmlDeclExpects.includes(this.name)) {
          switch (this.name.length) {
            case 0:
              this.fail("did not expect any more name/value pairs.");
              break;
            case 1:
              this.fail(`expected the name ${this.xmlDeclExpects[0]}.`);
              break;
            default:
              this.fail(`expected one of ${this.xmlDeclExpects.join(", ")}`);
          }
        }
        this.state = c === EQUAL ? S_XML_DECL_VALUE_START : S_XML_DECL_EQ;
      }
      sXMLDeclEq() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (isS(c)) {
          return;
        }
        if (c !== EQUAL) {
          this.fail("value required.");
        }
        this.state = S_XML_DECL_VALUE_START;
      }
      sXMLDeclValueStart() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (isS(c)) {
          return;
        }
        if (!isQuote(c)) {
          this.fail("value must be quoted.");
          this.q = SPACE;
        } else {
          this.q = c;
        }
        this.state = S_XML_DECL_VALUE;
      }
      sXMLDeclValue() {
        const c = this.captureTo([this.q, QUESTION]);
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.text = "";
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (c === EOC) {
          return;
        }
        const value2 = this.text;
        this.text = "";
        switch (this.name) {
          case "version": {
            this.xmlDeclExpects = ["encoding", "standalone"];
            const version = value2;
            this.xmlDecl.version = version;
            if (!/^1\.[0-9]+$/.test(version)) {
              this.fail("version number must match /^1\\.[0-9]+$/.");
            } else if (!this.opt.forceXMLVersion) {
              this.setXMLVersion(version);
            }
            break;
          }
          case "encoding":
            if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(value2)) {
              this.fail("encoding value must match /^[A-Za-z0-9][A-Za-z0-9._-]*$/.");
            }
            this.xmlDeclExpects = ["standalone"];
            this.xmlDecl.encoding = value2;
            break;
          case "standalone":
            if (value2 !== "yes" && value2 !== "no") {
              this.fail('standalone value must match "yes" or "no".');
            }
            this.xmlDeclExpects = [];
            this.xmlDecl.standalone = value2;
            break;
          default:
        }
        this.name = "";
        this.state = S_XML_DECL_SEPARATOR;
      }
      sXMLDeclSeparator() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          return;
        }
        if (!isS(c)) {
          this.fail("whitespace required.");
          this.unget();
        }
        this.state = S_XML_DECL_NAME_START;
      }
      sXMLDeclEnding() {
        var _a;
        const c = this.getCodeNorm();
        if (c === GREATER) {
          if (this.piTarget !== "xml") {
            this.fail("processing instructions are not allowed before root.");
          } else if (this.name !== "version" && this.xmlDeclExpects.includes("version")) {
            this.fail("XML declaration must contain a version.");
          }
          (_a = this.xmldeclHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.xmlDecl);
          this.name = "";
          this.piTarget = this.text = "";
          this.state = S_TEXT;
        } else {
          this.fail("The character ? is disallowed anywhere in XML declarations.");
        }
        this.xmlDeclPossible = false;
      }
      sOpenTag() {
        var _a;
        const c = this.captureNameChars();
        if (c === EOC) {
          return;
        }
        const tag2 = this.tag = {
          name: this.name,
          attributes: /* @__PURE__ */ Object.create(null)
        };
        this.name = "";
        if (this.xmlnsOpt) {
          this.topNS = tag2.ns = /* @__PURE__ */ Object.create(null);
        }
        (_a = this.openTagStartHandler) === null || _a === void 0 ? void 0 : _a.call(this, tag2);
        this.sawRoot = true;
        if (!this.fragmentOpt && this.closedRoot) {
          this.fail("documents may contain only one root.");
        }
        switch (c) {
          case GREATER:
            this.openTag();
            break;
          case FORWARD_SLASH:
            this.state = S_OPEN_TAG_SLASH;
            break;
          default:
            if (!isS(c)) {
              this.fail("disallowed character in tag name.");
            }
            this.state = S_ATTRIB;
        }
      }
      sOpenTagSlash() {
        if (this.getCode() === GREATER) {
          this.openSelfClosingTag();
        } else {
          this.fail("forward-slash in opening tag not followed by >.");
          this.state = S_ATTRIB;
        }
      }
      sAttrib() {
        const c = this.skipSpaces();
        if (c === EOC) {
          return;
        }
        if (isNameStartChar(c)) {
          this.unget();
          this.state = S_ATTRIB_NAME;
        } else if (c === GREATER) {
          this.openTag();
        } else if (c === FORWARD_SLASH) {
          this.state = S_OPEN_TAG_SLASH;
        } else {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribName() {
        const c = this.captureNameChars();
        if (c === EQUAL) {
          this.state = S_ATTRIB_VALUE;
        } else if (isS(c)) {
          this.state = S_ATTRIB_NAME_SAW_WHITE;
        } else if (c === GREATER) {
          this.fail("attribute without value.");
          this.pushAttrib(this.name, this.name);
          this.name = this.text = "";
          this.openTag();
        } else if (c !== EOC) {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribNameSawWhite() {
        const c = this.skipSpaces();
        switch (c) {
          case EOC:
            return;
          case EQUAL:
            this.state = S_ATTRIB_VALUE;
            break;
          default:
            this.fail("attribute without value.");
            this.text = "";
            this.name = "";
            if (c === GREATER) {
              this.openTag();
            } else if (isNameStartChar(c)) {
              this.unget();
              this.state = S_ATTRIB_NAME;
            } else {
              this.fail("disallowed character in attribute name.");
              this.state = S_ATTRIB;
            }
        }
      }
      sAttribValue() {
        const c = this.getCodeNorm();
        if (isQuote(c)) {
          this.q = c;
          this.state = S_ATTRIB_VALUE_QUOTED;
        } else if (!isS(c)) {
          this.fail("unquoted attribute value.");
          this.state = S_ATTRIB_VALUE_UNQUOTED;
          this.unget();
        }
      }
      sAttribValueQuoted() {
        const { q: q2, chunk } = this;
        let { i: start } = this;
        while (true) {
          switch (this.getCode()) {
            case q2:
              this.pushAttrib(this.name, this.text + chunk.slice(start, this.prevI));
              this.name = this.text = "";
              this.q = null;
              this.state = S_ATTRIB_VALUE_CLOSED;
              return;
            case AMP:
              this.text += chunk.slice(start, this.prevI);
              this.state = S_ENTITY;
              this.entityReturnState = S_ATTRIB_VALUE_QUOTED;
              return;
            case NL:
            case NL_LIKE:
            case TAB:
              this.text += `${chunk.slice(start, this.prevI)} `;
              start = this.i;
              break;
            case LESS:
              this.text += chunk.slice(start, this.prevI);
              this.fail("disallowed character.");
              return;
            case EOC:
              this.text += chunk.slice(start);
              return;
            default:
          }
        }
      }
      sAttribValueClosed() {
        const c = this.getCodeNorm();
        if (isS(c)) {
          this.state = S_ATTRIB;
        } else if (c === GREATER) {
          this.openTag();
        } else if (c === FORWARD_SLASH) {
          this.state = S_OPEN_TAG_SLASH;
        } else if (isNameStartChar(c)) {
          this.fail("no whitespace between attributes.");
          this.unget();
          this.state = S_ATTRIB_NAME;
        } else {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribValueUnquoted() {
        const c = this.captureTo(ATTRIB_VALUE_UNQUOTED_TERMINATOR);
        switch (c) {
          case AMP:
            this.state = S_ENTITY;
            this.entityReturnState = S_ATTRIB_VALUE_UNQUOTED;
            break;
          case LESS:
            this.fail("disallowed character.");
            break;
          case EOC:
            break;
          default:
            if (this.text.includes("]]>")) {
              this.fail('the string "]]>" is disallowed in char data.');
            }
            this.pushAttrib(this.name, this.text);
            this.name = this.text = "";
            if (c === GREATER) {
              this.openTag();
            } else {
              this.state = S_ATTRIB;
            }
        }
      }
      sCloseTag() {
        const c = this.captureNameChars();
        if (c === GREATER) {
          this.closeTag();
        } else if (isS(c)) {
          this.state = S_CLOSE_TAG_SAW_WHITE;
        } else if (c !== EOC) {
          this.fail("disallowed character in closing tag.");
        }
      }
      sCloseTagSawWhite() {
        switch (this.skipSpaces()) {
          case GREATER:
            this.closeTag();
            break;
          case EOC:
            break;
          default:
            this.fail("disallowed character in closing tag.");
        }
      }
      // END OF STATE ENGINE METHODS
      handleTextInRoot() {
        let { i: start, forbiddenState } = this;
        const { chunk, textHandler: handler } = this;
        scanLoop:
          while (true) {
            switch (this.getCode()) {
              case LESS: {
                this.state = S_OPEN_WAKA;
                if (handler !== void 0) {
                  const { text } = this;
                  const slice = chunk.slice(start, this.prevI);
                  if (text.length !== 0) {
                    handler(text + slice);
                    this.text = "";
                  } else if (slice.length !== 0) {
                    handler(slice);
                  }
                }
                forbiddenState = FORBIDDEN_START;
                break scanLoop;
              }
              case AMP:
                this.state = S_ENTITY;
                this.entityReturnState = S_TEXT;
                if (handler !== void 0) {
                  this.text += chunk.slice(start, this.prevI);
                }
                forbiddenState = FORBIDDEN_START;
                break scanLoop;
              case CLOSE_BRACKET:
                switch (forbiddenState) {
                  case FORBIDDEN_START:
                    forbiddenState = FORBIDDEN_BRACKET;
                    break;
                  case FORBIDDEN_BRACKET:
                    forbiddenState = FORBIDDEN_BRACKET_BRACKET;
                    break;
                  case FORBIDDEN_BRACKET_BRACKET:
                    break;
                  default:
                    throw new Error("impossible state");
                }
                break;
              case GREATER:
                if (forbiddenState === FORBIDDEN_BRACKET_BRACKET) {
                  this.fail('the string "]]>" is disallowed in char data.');
                }
                forbiddenState = FORBIDDEN_START;
                break;
              case NL_LIKE:
                if (handler !== void 0) {
                  this.text += `${chunk.slice(start, this.prevI)}
`;
                }
                start = this.i;
                forbiddenState = FORBIDDEN_START;
                break;
              case EOC:
                if (handler !== void 0) {
                  this.text += chunk.slice(start);
                }
                break scanLoop;
              default:
                forbiddenState = FORBIDDEN_START;
            }
          }
        this.forbiddenState = forbiddenState;
      }
      handleTextOutsideRoot() {
        let { i: start } = this;
        const { chunk, textHandler: handler } = this;
        let nonSpace = false;
        outRootLoop:
          while (true) {
            const code = this.getCode();
            switch (code) {
              case LESS: {
                this.state = S_OPEN_WAKA;
                if (handler !== void 0) {
                  const { text } = this;
                  const slice = chunk.slice(start, this.prevI);
                  if (text.length !== 0) {
                    handler(text + slice);
                    this.text = "";
                  } else if (slice.length !== 0) {
                    handler(slice);
                  }
                }
                break outRootLoop;
              }
              case AMP:
                this.state = S_ENTITY;
                this.entityReturnState = S_TEXT;
                if (handler !== void 0) {
                  this.text += chunk.slice(start, this.prevI);
                }
                nonSpace = true;
                break outRootLoop;
              case NL_LIKE:
                if (handler !== void 0) {
                  this.text += `${chunk.slice(start, this.prevI)}
`;
                }
                start = this.i;
                break;
              case EOC:
                if (handler !== void 0) {
                  this.text += chunk.slice(start);
                }
                break outRootLoop;
              default:
                if (!isS(code)) {
                  nonSpace = true;
                }
            }
          }
        if (!nonSpace) {
          return;
        }
        if (!this.sawRoot && !this.reportedTextBeforeRoot) {
          this.fail("text data outside of root node.");
          this.reportedTextBeforeRoot = true;
        }
        if (this.closedRoot && !this.reportedTextAfterRoot) {
          this.fail("text data outside of root node.");
          this.reportedTextAfterRoot = true;
        }
      }
      pushAttribNS(name, value2) {
        var _a;
        const { prefix, local } = this.qname(name);
        const attr = { name, prefix, local, value: value2 };
        this.attribList.push(attr);
        (_a = this.attributeHandler) === null || _a === void 0 ? void 0 : _a.call(this, attr);
        if (prefix === "xmlns") {
          const trimmed = value2.trim();
          if (this.currentXMLVersion === "1.0" && trimmed === "") {
            this.fail("invalid attempt to undefine prefix in XML 1.0");
          }
          this.topNS[local] = trimmed;
          nsPairCheck(this, local, trimmed);
        } else if (name === "xmlns") {
          const trimmed = value2.trim();
          this.topNS[""] = trimmed;
          nsPairCheck(this, "", trimmed);
        }
      }
      pushAttribPlain(name, value2) {
        var _a;
        const attr = { name, value: value2 };
        this.attribList.push(attr);
        (_a = this.attributeHandler) === null || _a === void 0 ? void 0 : _a.call(this, attr);
      }
      /**
       * End parsing. This performs final well-formedness checks and resets the
       * parser to a clean state.
       *
       * @returns this
       */
      end() {
        var _a, _b;
        if (!this.sawRoot) {
          this.fail("document must contain a root element.");
        }
        const { tags } = this;
        while (tags.length > 0) {
          const tag2 = tags.pop();
          this.fail(`unclosed tag: ${tag2.name}`);
        }
        if (this.state !== S_BEGIN && this.state !== S_TEXT) {
          this.fail("unexpected end.");
        }
        const { text } = this;
        if (text.length !== 0) {
          (_a = this.textHandler) === null || _a === void 0 ? void 0 : _a.call(this, text);
          this.text = "";
        }
        this._closed = true;
        (_b = this.endHandler) === null || _b === void 0 ? void 0 : _b.call(this);
        this._init();
        return this;
      }
      /**
       * Resolve a namespace prefix.
       *
       * @param prefix The prefix to resolve.
       *
       * @returns The namespace URI or ``undefined`` if the prefix is not defined.
       */
      resolve(prefix) {
        var _a, _b;
        let uri = this.topNS[prefix];
        if (uri !== void 0) {
          return uri;
        }
        const { tags } = this;
        for (let index = tags.length - 1; index >= 0; index--) {
          uri = tags[index].ns[prefix];
          if (uri !== void 0) {
            return uri;
          }
        }
        uri = this.ns[prefix];
        if (uri !== void 0) {
          return uri;
        }
        return (_b = (_a = this.opt).resolvePrefix) === null || _b === void 0 ? void 0 : _b.call(_a, prefix);
      }
      /**
       * Parse a qname into its prefix and local name parts.
       *
       * @param name The name to parse
       *
       * @returns
       */
      qname(name) {
        const colon = name.indexOf(":");
        if (colon === -1) {
          return { prefix: "", local: name };
        }
        const local = name.slice(colon + 1);
        const prefix = name.slice(0, colon);
        if (prefix === "" || local === "" || local.includes(":")) {
          this.fail(`malformed name: ${name}.`);
        }
        return { prefix, local };
      }
      processAttribsNS() {
        var _a;
        const { attribList } = this;
        const tag2 = this.tag;
        {
          const { prefix, local } = this.qname(tag2.name);
          tag2.prefix = prefix;
          tag2.local = local;
          const uri = tag2.uri = (_a = this.resolve(prefix)) !== null && _a !== void 0 ? _a : "";
          if (prefix !== "") {
            if (prefix === "xmlns") {
              this.fail('tags may not have "xmlns" as prefix.');
            }
            if (uri === "") {
              this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
              tag2.uri = prefix;
            }
          }
        }
        if (attribList.length === 0) {
          return;
        }
        const { attributes } = tag2;
        const seen = /* @__PURE__ */ new Set();
        for (const attr of attribList) {
          const { name, prefix, local } = attr;
          let uri;
          let eqname;
          if (prefix === "") {
            uri = name === "xmlns" ? XMLNS_NAMESPACE : "";
            eqname = name;
          } else {
            uri = this.resolve(prefix);
            if (uri === void 0) {
              this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
              uri = prefix;
            }
            eqname = `{${uri}}${local}`;
          }
          if (seen.has(eqname)) {
            this.fail(`duplicate attribute: ${eqname}.`);
          }
          seen.add(eqname);
          attr.uri = uri;
          attributes[name] = attr;
        }
        this.attribList = [];
      }
      processAttribsPlain() {
        const { attribList } = this;
        const attributes = this.tag.attributes;
        for (const { name, value: value2 } of attribList) {
          if (attributes[name] !== void 0) {
            this.fail(`duplicate attribute: ${name}.`);
          }
          attributes[name] = value2;
        }
        this.attribList = [];
      }
      /**
       * Handle a complete open tag. This parser code calls this once it has seen
       * the whole tag. This method checks for well-formeness and then emits
       * ``onopentag``.
       */
      openTag() {
        var _a;
        this.processAttribs();
        const { tags } = this;
        const tag2 = this.tag;
        tag2.isSelfClosing = false;
        (_a = this.openTagHandler) === null || _a === void 0 ? void 0 : _a.call(this, tag2);
        tags.push(tag2);
        this.state = S_TEXT;
        this.name = "";
      }
      /**
       * Handle a complete self-closing tag. This parser code calls this once it has
       * seen the whole tag. This method checks for well-formeness and then emits
       * ``onopentag`` and ``onclosetag``.
       */
      openSelfClosingTag() {
        var _a, _b, _c;
        this.processAttribs();
        const { tags } = this;
        const tag2 = this.tag;
        tag2.isSelfClosing = true;
        (_a = this.openTagHandler) === null || _a === void 0 ? void 0 : _a.call(this, tag2);
        (_b = this.closeTagHandler) === null || _b === void 0 ? void 0 : _b.call(this, tag2);
        const top = this.tag = (_c = tags[tags.length - 1]) !== null && _c !== void 0 ? _c : null;
        if (top === null) {
          this.closedRoot = true;
        }
        this.state = S_TEXT;
        this.name = "";
      }
      /**
       * Handle a complete close tag. This parser code calls this once it has seen
       * the whole tag. This method checks for well-formeness and then emits
       * ``onclosetag``.
       */
      closeTag() {
        const { tags, name } = this;
        this.state = S_TEXT;
        this.name = "";
        if (name === "") {
          this.fail("weird empty close tag.");
          this.text += "</>";
          return;
        }
        const handler = this.closeTagHandler;
        let l = tags.length;
        while (l-- > 0) {
          const tag2 = this.tag = tags.pop();
          this.topNS = tag2.ns;
          handler === null || handler === void 0 ? void 0 : handler(tag2);
          if (tag2.name === name) {
            break;
          }
          this.fail("unexpected close tag.");
        }
        if (l === 0) {
          this.closedRoot = true;
        } else if (l < 0) {
          this.fail(`unmatched closing tag: ${name}.`);
          this.text += `</${name}>`;
        }
      }
      /**
       * Resolves an entity. Makes any necessary well-formedness checks.
       *
       * @param entity The entity to resolve.
       *
       * @returns The parsed entity.
       */
      parseEntity(entity) {
        if (entity[0] !== "#") {
          const defined2 = this.ENTITIES[entity];
          if (defined2 !== void 0) {
            return defined2;
          }
          this.fail(this.isName(entity) ? "undefined entity." : "disallowed character in entity name.");
          return `&${entity};`;
        }
        let num = NaN;
        if (entity[1] === "x" && /^#x[0-9a-f]+$/i.test(entity)) {
          num = parseInt(entity.slice(2), 16);
        } else if (/^#[0-9]+$/.test(entity)) {
          num = parseInt(entity.slice(1), 10);
        }
        if (!this.isChar(num)) {
          this.fail("malformed character entity.");
          return `&${entity};`;
        }
        return String.fromCodePoint(num);
      }
    };
    exports.SaxesParser = SaxesParser2;
  }
});

// src/adapters/guitar-pro/bytes.ts
var Bytes = class _Bytes extends Uint8Array {
  static view(value2) {
    return new _Bytes(value2.buffer, value2.byteOffset, value2.byteLength);
  }
  subarray(start, end) {
    return _Bytes.view(super.subarray(start, end));
  }
  readUInt32LE(offset = 0) {
    return this.data().getUint32(offset, true);
  }
  readUInt16LE(offset = 0) {
    return this.data().getUint16(offset, true);
  }
  readUInt32BE(offset = 0) {
    return this.data().getUint32(offset);
  }
  readUInt16BE(offset = 0) {
    return this.data().getUint16(offset);
  }
  readInt32BE(offset = 0) {
    return this.data().getInt32(offset);
  }
  readFloatBE(offset = 0) {
    return this.data().getFloat32(offset);
  }
  data() {
    return new DataView(this.buffer, this.byteOffset, this.byteLength);
  }
  equals(other) {
    return this.length === other.length && this.every((v, i) => v === other[i]);
  }
  copy(target, at, start = 0, end = this.length) {
    target.set(this.subarray(start, end), at);
  }
  text() {
    return new TextDecoder("utf-8", { fatal: true }).decode(this);
  }
  ascii() {
    return Array.from(this, (byte) => String.fromCharCode(byte)).join("");
  }
  base64() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const chunks = [];
    for (let start = 0; start < this.length; start += 12288) {
      let chunk = "";
      for (let i = start; i < Math.min(this.length, start + 12288); i += 3) {
        const a = this[i], b = this[i + 1], c = this[i + 2], n = a << 16 | (b ?? 0) << 8 | (c ?? 0);
        chunk += alphabet[n >>> 18] + alphabet[n >>> 12 & 63] + (i + 1 < this.length ? alphabet[n >>> 6 & 63] : "=") + (i + 2 < this.length ? alphabet[n & 63] : "=");
      }
      chunks.push(chunk);
    }
    return chunks.join("");
  }
};
var shaConstants = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
function sha256(bytes) {
  const state = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]);
  const words = new Uint32Array(64), rotate = (n, bits) => n >>> bits | n << 32 - bits;
  const total = Math.ceil((bytes.length + 9) / 64) * 64, bitLength = bytes.length * 8;
  for (let offset = 0; offset < total; offset += 64) {
    for (let i = 0; i < 16; i++) {
      let word = 0;
      for (let j = 0; j < 4; j++) {
        const p = offset + i * 4 + j;
        const v = p < bytes.length ? bytes[p] : p === bytes.length ? 128 : p >= total - 4 ? Math.floor(bitLength / 2 ** ((total - 1 - p) * 8)) & 255 : p >= total - 8 ? Math.floor(bitLength / 2 ** ((total - 1 - p) * 8)) & 255 : 0;
        word = word << 8 | v;
      }
      words[i] = word;
    }
    for (let i = 16; i < 64; i++) {
      const x = words[i - 15], y = words[i - 2];
      words[i] = words[i - 16] + (rotate(x, 7) ^ rotate(x, 18) ^ x >>> 3) + words[i - 7] + (rotate(y, 17) ^ rotate(y, 19) ^ y >>> 10);
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let i = 0; i < 64; i++) {
      const t1 = h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + (e & f ^ ~e & g) + shaConstants[i] + words[i];
      const t2 = (rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + (a & b ^ a & c ^ b & c);
      h = g;
      g = f;
      f = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    [a, b, c, d, e, f, g, h].forEach((value2, i) => {
      state[i] += value2;
    });
  }
  return [...state].map((value2) => value2.toString(16).padStart(8, "0")).join("");
}
var crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let value2 = i;
  for (let n = 0; n < 8; n++) value2 = value2 & 1 ? 3988292384 ^ value2 >>> 1 : value2 >>> 1;
  return value2 >>> 0;
});
function crc32(bytes) {
  let value2 = 4294967295;
  for (const byte of bytes) value2 = crcTable[(value2 ^ byte) & 255] ^ value2 >>> 8;
  return (value2 ^ 4294967295) >>> 0;
}

// src/adapters/guitar-pro/encoding.ts
function guitarProEncoding(bytes) {
  const prefix = Bytes.view(bytes.subarray(0, 32));
  if (/^(?:FICHIER|CLIPBOARD)/.test(prefix.subarray(1).ascii())) return "binary";
  if (["BCFS", "BCFZ"].includes(prefix.subarray(0, 4).ascii())) return "gpx";
  return "zip";
}

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
function freeze(value2) {
  if (value2 && typeof value2 === "object" && !Object.isFrozen(value2)) {
    Object.freeze(value2);
    for (const item of Object.values(value2)) freeze(item);
  }
  return value2;
}

// src/core/rational.ts
function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return Math.abs(a);
}
function q(n, d = 1) {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d <= 0 || Math.abs(n) > 1e12 || d > 1e9)
    refuse("clock-budget", "Exact rational arithmetic exceeds the proving profile budget.");
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
var add = (a, b) => q(a.n * b.d + b.n * a.d, a.d * b.d);
var mul = (a, b) => q(a.n * b.n, a.d * b.d);
var equal = (a, b) => a.n * b.d === b.n * a.d;
function decimal(s) {
  if (!/^\d{1,4}(?:\.\d{1,6})?$/.test(s)) refuse("number", "Expected a bounded nonnegative decimal.");
  const [whole, fraction = ""] = s.split(".");
  return q(Number(whole + fraction), 10 ** fraction.length);
}
function divisions(clocks) {
  let d = 1;
  for (const c of clocks) {
    d = d / gcd(d, c.d) * c.d;
    if (d > 65536) refuse("divisions-budget", "Exact MusicXML divisions exceed 65536; timing will not be rounded.");
  }
  return d;
}

// src/core/musicxml.ts
var esc = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
var tag = (name, value2) => `<${name}>${esc(String(value2))}</${name}>`;
function pitchXml(p) {
  return tag("step", p.step) + (p.alter ? tag("alter", p.alter) : "") + tag("octave", p.octave);
}
function tuningXml(midi) {
  const [step, alter] = [
    ["C", 0],
    ["C", 1],
    ["D", 0],
    ["D", 1],
    ["E", 0],
    ["F", 0],
    ["F", 1],
    ["G", 0],
    ["G", 1],
    ["A", 0],
    ["A", 1],
    ["B", 0]
  ][midi % 12];
  return tag("tuning-step", step) + (alter ? tag("tuning-alter", alter) : "") + tag("tuning-octave", Math.floor(midi / 12) - 1);
}
function writeMusicXml(score, display = { hideDynamics: false, hideTempo: false }, onPartAssigned, writerLimits) {
  const partIds = score.parts.map((part, i) => {
    const id = `P${i + 1}`;
    onPartAssigned?.(part.id, id);
    return id;
  });
  const clocks = [];
  for (const p of score.parts) for (const m of p.measures) {
    clocks.push(m.duration);
    for (const v of m.voices) for (const e of v) clocks.push(e.start, e.duration);
  }
  for (const t of score.tempos) clocks.push(t.position);
  const d = divisions(clocks);
  const ticks = (r) => {
    const n = r.n * d / r.d;
    if (!Number.isSafeInteger(n)) refuse("writer-clock", "Unable to represent exact clock in MusicXML.");
    return n;
  };
  let out = "", outputBytes = 0;
  const emit = (value2) => {
    if (writerLimits) {
      let bytes = value2.length;
      for (let i = 0; i < value2.length; i++) {
        const c = value2.charCodeAt(i);
        if (c >= 55296 && c <= 56319 && i + 1 < value2.length && value2.charCodeAt(i + 1) >= 56320 && value2.charCodeAt(i + 1) <= 57343) {
          bytes += 2;
          i++;
        } else if (c >= 2048) bytes += 2;
        else if (c >= 128) bytes++;
      }
      outputBytes += bytes;
      if (outputBytes > writerLimits.outputBytes) refuse("writer-output-size", "MusicXML output exceeds the adapter byte budget; no output admitted.");
    }
    out += value2;
  };
  emit('<?xml version="1.0" encoding="utf-8"?>\n<score-partwise version="4.0">');
  emit(`<work>${tag("work-title", score.title)}</work><identification><encoding><software>score-converter proving slice</software></encoding></identification><part-list>`);
  for (let i = 0; i < score.parts.length; i++) {
    const p = score.parts[i];
    emit(`<score-part id="${partIds[i]}">${tag("part-name", p.name)}<score-instrument id="I${i + 1}">${tag("instrument-name", p.instrument)}</score-instrument><midi-instrument id="I${i + 1}">${tag("midi-program", p.midiProgram + 1)}</midi-instrument></score-part>`);
  }
  emit("</part-list>");
  for (let pi = 0; pi < score.parts.length; pi++) {
    const p = score.parts[pi];
    emit(`<part id="${partIds[pi]}">`);
    for (let mi = 0; mi < p.measures.length; mi++) {
      const m = p.measures[mi];
      emit(`<measure number="${mi + 1}"${m.pickup ? ' implicit="yes"' : ""}><attributes>${tag("divisions", d)}<key>${tag("fifths", m.key.fifths)}${tag("mode", m.key.mode)}</key><time>${tag("beats", m.time.beats)}${tag("beat-type", m.time.unit)}</time>`);
      const [sign, line] = { G2: ["G", 2], F4: ["F", 4], C3: ["C", 3], C4: ["C", 4] }[m.clef];
      if (mi === 0) emit(tag("staves", 2));
      emit(`<clef number="1">${tag("sign", sign)}${tag("line", line)}</clef>`);
      if (mi === 0) {
        emit('<clef number="2" print-object="no"><sign>TAB</sign></clef>');
        emit(`<staff-details number="2" print-object="no" print-spacing="no"><staff-type>alternate</staff-type>${tag("staff-lines", p.tuning.length)}`);
        for (let i = 0; i < p.tuning.length; i++) emit(`<staff-tuning line="${i + 1}">${tuningXml(p.tuning[i])}</staff-tuning>`);
        emit("</staff-details>");
        if (p.transposeOctaves) emit(`<transpose>${tag("diatonic", 0)}${tag("chromatic", 0)}${tag("octave-change", p.transposeOctaves)}</transpose>`);
      }
      emit("</attributes>");
      if (m.repeatStart) emit('<barline location="left"><repeat direction="forward"/></barline>');
      for (const tempo of score.tempos.filter((t) => t.measure === mi)) {
        emit(`<direction><direction-type><metronome${tempo.visible && !display.hideTempo ? "" : ' print-object="no"'}>${tag("beat-unit", tempo.unit)}${"<beat-unit-dot/>".repeat(tempo.dots)}${tag("per-minute", tempo.rate)}</metronome></direction-type><offset sound="yes">${ticks(tempo.position)}</offset><staff>1</staff><sound tempo="${tempo.quarterRate}"/></direction>`);
      }
      let wroteVoice = false;
      for (let vi = 0; vi < m.voices.length; vi++) {
        if (!m.voices[vi].length) continue;
        if (wroteVoice) emit(`<backup>${tag("duration", ticks(m.duration))}</backup>`);
        wroteVoice = true;
        for (const e of m.voices[vi]) {
          if (e.dynamic && !display.hideDynamics) emit(`<direction><direction-type><dynamics><${e.dynamic.toLowerCase()}/></dynamics></direction-type>${tag("voice", vi + 1)}<staff>1</staff></direction>`);
          if (e.text) emit(`<direction><direction-type>${tag("words", e.text)}</direction-type>${tag("voice", vi + 1)}<staff>1</staff></direction>`);
          const notes = e.notes.length ? e.notes : [void 0];
          for (let ni = 0; ni < notes.length; ni++) {
            const n = notes[ni];
            emit("<note>" + (ni ? "<chord/>" : ""));
            emit(n ? n.kind === "dead" ? `<unpitched>${tag("display-step", n.written.step)}${tag("display-octave", n.written.octave)}</unpitched>` : `<pitch>${pitchXml(n.written)}</pitch>` : `<rest${e.fullMeasureRest ? ' measure="yes"' : ""}/>`);
            emit(tag("duration", ticks(e.duration)));
            if (n?.tieStop) emit('<tie type="stop"/>');
            if (n?.tieStart) emit('<tie type="start"/>');
            emit(tag("voice", vi + 1) + tag("type", e.type) + "<dot/>".repeat(e.dots));
            if (e.tuplet) emit(`<time-modification>${tag("actual-notes", e.tuplet.actual)}${tag("normal-notes", e.tuplet.normal)}</time-modification>`);
            if (n?.kind === "dead") emit("<notehead>x</notehead>");
            emit("<staff>1</staff>");
            if (e.dynamic && display.hideDynamics && ni === 0) emit(`<notations print-object="no"><dynamics><${e.dynamic.toLowerCase()}/></dynamics></notations>`);
            if (n) {
              if (n.tieStop || n.tieStart || n.hopoStart || n.hopoStop) {
                emit("<notations>");
                if (n.tieStop) emit('<tied type="stop"/>');
                if (n.tieStart) emit('<tied type="start"/>');
                if (n.hopoStop) emit(`<slur type="stop" number="${n.hopoNumber}"/>`);
                if (n.hopoStart) emit(`<slur type="start" number="${n.hopoNumber}"/>`);
                if (n.hopoStart || n.hopoStop) {
                  emit("<technical>");
                  if (n.hopoStop) emit(`<${n.hopoStop} type="stop" number="${n.hopoNumber}"/>`);
                  if (n.hopoStart) emit(`<${n.hopoStart} type="start" number="${n.hopoNumber}">${n.hopoStart === "hammer-on" ? "H" : "P"}</${n.hopoStart}>`);
                  emit("</technical>");
                }
                emit("</notations>");
              }
              emit(`<notations print-object="no"><technical>${tag("string", n.string)}${tag("fret", n.fret)}${n.kind === "dead" ? "<other-technical>dead note</other-technical>" : ""}</technical></notations>`);
            }
            emit("</note>");
          }
        }
      }
      if (m.repeatEnd) emit(`<barline location="right"><repeat direction="backward" times="${m.repeatEnd}"/></barline>`);
      emit("</measure>");
    }
    emit("</part>");
  }
  emit("</score-partwise>\n");
  return out;
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
  tracks: 8,
  measures: 512,
  occurrences: 2e4,
  binaryRecords: 2e5,
  captureBytes: 24 * 1024 * 1024,
  reportBytes: 8 * 1024 * 1024,
  resultBytes: 32 * 1024 * 1024,
  workerMs: 5e3,
  workerHeapMb: 96
});

// src/adapters/guitar-pro/xml.ts
var import_saxes = __toESM(require_saxes(), 1);
function parseXml(bytes, member = "Content/score.gpif", expectedRoot = "GPIF") {
  const xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const parser = new import_saxes.SaxesParser({ xmlns: false, defaultXMLVersion: "1.0", forceXMLVersion: true });
  let root, nodes = 0, text = 0, pathChars = 0;
  const stack = [], siblings = [/* @__PURE__ */ new Map()];
  const fail = (message) => refuse("xml", message, { member, line: parser.line, column: parser.column });
  parser.on("error", (e) => fail(e.message));
  parser.on("doctype", () => fail("DTD and entities are outside the profile."));
  parser.on("processinginstruction", () => fail("Processing instructions are unsupported."));
  parser.on("xmldecl", (d) => {
    if (d.version !== "1.0" || d.encoding && d.encoding.toLowerCase() !== "utf-8") fail("Only XML 1.0 UTF-8 is admitted.");
  });
  parser.on("opentagstart", (tag2) => {
    if (tag2.name.length > limits.xmlName) fail("XML name budget exceeded.");
  });
  parser.on("attribute", (attribute) => {
    if (attribute.name.length > limits.xmlName || attribute.value.length > limits.xmlAttributeValue) fail("XML attribute name/value budget exceeded.");
  });
  parser.on("opentag", (tag2) => {
    if (++nodes > limits.xmlNodes || stack.length >= limits.xmlDepth || Object.keys(tag2.attributes).length > limits.xmlAttributes)
      fail("XML structure budget exceeded.");
    if (tag2.name.includes(":") || Object.keys(tag2.attributes).some((n) => n.includes(":") || n === "xmlns")) fail("GPIF namespaces are outside the profile.");
    const counts = siblings.at(-1), number = (counts.get(tag2.name) ?? 0) + 1;
    counts.set(tag2.name, number);
    const parent = stack.at(-1);
    const suffix = `/${tag2.name}[${number}]`, pathLength = (parent?.location.path?.length ?? 0) + suffix.length;
    if (pathLength > limits.xmlPath || (pathChars += pathLength) > limits.xmlPathTotal) fail("XML path budget exceeded.");
    const path = (parent?.location.path ?? "") + suffix;
    const node = {
      name: tag2.name,
      attrs: { ...tag2.attributes },
      text: "",
      children: [],
      location: { member, path, line: parser.line, column: parser.column, ...tag2.attributes.id ? { id: String(tag2.attributes.id) } : {} }
    };
    if (parent) parent.children.push(node);
    else root = node;
    stack.push(node);
    siblings.push(/* @__PURE__ */ new Map());
  });
  const append = (s) => {
    text += s.length;
    if (text > limits.xmlText) fail("XML text budget exceeded.");
    if (stack.length) {
      const node = stack.at(-1);
      if (node.text.length + s.length > limits.xmlNodeText) fail("XML element text budget exceeded.");
      node.text += s;
    }
  };
  parser.on("text", append);
  parser.on("cdata", append);
  parser.on("closetag", () => {
    stack.pop();
    siblings.pop();
  });
  for (let i = 0; i < xml.length; i += 4096) parser.write(xml.slice(i, i + 4096));
  parser.close();
  if (!root || root.name !== expectedRoot) fail(`Expected exactly one ${expectedRoot} document root.`);
  return { xml, root: freeze(root) };
}
var children = (e, name) => e.children.filter((c) => c.name === name);
function child(e, name, required = true) {
  const list = children(e, name);
  if (list.length > 1 || required && !list.length) refuse("structure", `Expected ${required ? "one" : "at most one"} ${name}.`, e.location);
  return list[0];
}
var value = (e, name, required = true) => child(e, name, required)?.text.trim() ?? "";
function integer(s, min, max, e) {
  if (!/^-?\d{1,6}$/.test(s) || Number(s) < min || Number(s) > max) refuse("number", `Expected an integer in ${min}..${max}.`, e.location);
  return Number(s);
}

// src/adapters/guitar-pro/gp8.ts
function rebuilt(e, elements, text = e.text) {
  return { ...e, text, children: elements };
}
function leaf(e, name, text, attrs2 = {}) {
  return { name, text, attrs: attrs2, children: [], location: e.location };
}
function shape(e, allowed, attrs2 = [], repeated = []) {
  if (allowed.length && e.text.trim()) refuse("mixed-content", "Mixed structural content is unsupported.", e.location);
  for (const a of Object.keys(e.attrs)) if (!attrs2.includes(a)) refuse("unknown-attribute", `Unreviewed ${e.name} attribute ${a}.`, e.location);
  const seen = /* @__PURE__ */ new Set();
  for (const c of e.children) {
    if (!allowed.includes(c.name)) refuse("unknown-element", `Unreviewed ${e.name}/${c.name} before reader projection.`, c.location);
    if (seen.has(c.name) && !repeated.includes(c.name)) refuse("structure", `Duplicate ${e.name}/${c.name}.`, c.location);
    seen.add(c.name);
  }
}
function scalar(e) {
  shape(e, []);
}
function marker(e) {
  scalar(e);
  if (e.text.trim()) refuse("marker-content", "Expected an empty marker.", e.location);
}
function defined(root, group, kind) {
  const result = /* @__PURE__ */ new Map();
  const container = child(root, group);
  shape(container, [kind], [], [kind]);
  for (const e of container.children) {
    for (const a of Object.keys(e.attrs)) if (a !== "id") refuse("unknown-attribute", `Unreviewed ${kind} attribute ${a}.`, e.location);
    if (!/^\d{1,6}$/.test(e.attrs.id) || result.has(e.attrs.id)) refuse("identity", `Invalid/duplicate ${kind} identity.`, e.location);
    result.set(e.attrs.id, e);
  }
  return result;
}
var ids = (e, name, required = true) => {
  const field = child(e, name, required);
  if (!field) return [];
  scalar(field);
  return field.text.trim().split(/\s+/).filter(Boolean);
};
function named(e, permitted, findings, keep, translated = []) {
  shape(e, permitted, ["Track", "Beat", "Bar"].includes(e.name) ? ["id"] : []);
  const result = [];
  for (const c of e.children) {
    if (!permitted.includes(c.name)) refuse("unknown-element", `Unreviewed ${e.name}/${c.name} in the selected GP8 scope.`, c.location);
    if (keep.includes(c.name)) result.push(c);
    else if (!translated.includes(c.name)) findings.push({ disposition: "omitted", code: "gp8-metadata", message: "Preserved in original source; capture is delivered only on success; layout, view, synth/timbre or non-score metadata is not reapplied to ordinary staff output.", location: c.location });
  }
  return result;
}
function checkDefaultArticulation(track) {
  const set = child(track, "InstrumentSet");
  shape(set, ["Name", "Type", "LineCount", "Elements"]);
  for (const c of set.children.filter((e) => e.name !== "Elements")) scalar(c);
  const type = value(set, "Type");
  if (!["electricBass", "electricGuitar"].includes(type) || child(set, "LineCount", false) && value(set, "LineCount") !== "5")
    refuse("instrument-profile", "The fretted source profile admits electricBass/electricGuitar on five ordinary staff lines only.", set.location);
  const container = child(set, "Elements");
  shape(container, ["Element"], [], ["Element"]);
  const elements = container.children;
  if (elements.length !== 1) refuse("articulation-profile", "One pitched instrument element is required.", set.location);
  const element = elements[0];
  shape(element, ["Name", "Type", "SoundbankName", "Articulations"]);
  for (const c of element.children.filter((e) => e.name !== "Articulations")) scalar(c);
  if (value(element, "Type") !== "pitched") refuse("articulation-profile", "Only pitched instrument elements are exercised.", element.location);
  const arts = child(element, "Articulations");
  shape(arts, ["Articulation"], [], ["Articulation"]);
  if (arts.children.length !== 1) refuse("articulation-profile", "One default instrument articulation is required.", arts.location);
  const art = arts.children[0];
  shape(art, ["Name", "StaffLine", "Noteheads", "TechniquePlacement", "TechniqueSymbol", "InputMidiNumbers", "OutputRSESound", "OutputMidiNumber"]);
  for (const c of art.children) scalar(c);
  marker(child(art, "TechniqueSymbol"));
  marker(child(art, "InputMidiNumbers"));
  if (value(art, "OutputMidiNumber") !== "0" || child(art, "StaffLine", false) && value(art, "StaffLine") !== "0" || child(art, "Noteheads", false) && value(art, "Noteheads") !== "noteheadBlack noteheadHalf noteheadWhole" || child(art, "TechniquePlacement", false) && value(art, "TechniquePlacement") !== "outside" || value(art, "OutputRSESound", false))
    refuse("articulation-profile", "Nondefault instrument articulations need an exercised mapping.", art.location);
  return type;
}
function prepareDirectTrack(track, findings) {
  const keep = named(track, ["Name", "ShortName", "Color", "SystemsDefautLayout", "SystemsLayout", "PalmMute", "PlayingStyle", "Instrument", "PartSounding", "Transpose", "RSE", "GeneralMidi", "PlaybackState", "Lyrics", "Properties", "Automations"], findings, ["Name", "Instrument"], ["PartSounding", "Transpose", "GeneralMidi", "Properties"]);
  const midi = child(track, "GeneralMidi");
  shape(midi, ["Program", "Port", "PrimaryChannel", "SecondaryChannel", "ForeOneChannelPerString"], ["table"]);
  midi.children.forEach(scalar);
  const program = integer(value(midi, "Program"), 0, 127, midi);
  if (midi.attrs.table !== "Instrument" || program < 24 || program > 39) refuse("instrument-profile", "Selected GP6 staff requires an explicit guitar/bass MIDI program 24\u201339.", midi.location);
  const playing = child(track, "PlayingStyle", false), palm = child(track, "PalmMute", false), state = child(track, "PlaybackState", false);
  if (playing && !["Default", ...program < 32 ? ["StringedPick"] : []].includes(playing.text.trim()) || palm && palm.text.trim() !== "0" || state && state.text.trim() !== "Default")
    refuse("track-technique", "Active track-wide playing style, mute or nondefault playback state requires mapping.", track.location);
  if (playing?.text.trim() === "StringedPick") findings.push({ disposition: "omitted", code: "source-playing-style", message: "Explicit track playing style StringedPick is retained in source but not reapplied as individual note articulations or performing-hand assignments.", location: playing.location, fact: "StringedPick" });
  for (const name of ["Lyrics", "Automations"]) {
    const field = child(track, name, false);
    if (name === "Automations" && field?.children.length) refuse("track-automation", "Selected GP6 track automation requires mapping.", field.location);
    if (name === "Lyrics" && field) {
      shape(field, ["Line"], ["dispatched"], ["Line"]);
      for (const line of field.children) {
        shape(line, ["Text", "Offset"]);
        line.children.forEach(scalar);
        if (value(line, "Text")) refuse("lyrics", "Nonempty lyrics need an export mapping.", line.location);
      }
    }
  }
  const properties2 = child(track, "Properties");
  shape(properties2, ["Property"], [], ["Property"]);
  const canonical = [], names = /* @__PURE__ */ new Set();
  for (const p of properties2.children) {
    if (names.has(p.attrs.name)) refuse("structure", "Duplicate track property.", p.location);
    names.add(p.attrs.name);
    const name = p.attrs.name;
    if (name === "Tuning") {
      shape(p, ["Pitches"], ["name"]);
      scalar(child(p, "Pitches"));
      canonical.push(p);
    } else if (name === "CapoFret") {
      shape(p, ["Fret"], ["name"]);
      scalar(child(p, "Fret"));
      canonical.push(p);
    } else if (["DiagramCollection", "DiagramWorkingSet", "ChordCollection", "ChordWorkingSet"].includes(name)) {
      shape(p, ["Items"], ["name"]);
      marker(child(p, "Items"));
      findings.push({ disposition: "omitted", code: "empty-diagrams", message: "Empty source diagram collection retained.", location: p.location });
    } else refuse("staff-property", "Unreviewed GP6 staff property.", p.location);
  }
  const sourceTranspose = child(track, "Transpose", false), sounding = child(track, "PartSounding", false);
  if (sourceTranspose && sounding || !sourceTranspose && !sounding) refuse("transpose", "Exactly one explicit GP6 transposition representation is required.", track.location);
  let trans = sourceTranspose;
  if (sounding) {
    shape(sounding, ["NominalKey", "TranspositionPitch"]);
    sounding.children.forEach(scalar);
    const amount = integer(value(sounding, "TranspositionPitch"), -24, 24, sounding);
    if (amount % 12 || value(sounding, "NominalKey") !== "C") refuse("transpose", "Only octave GP6 PartSounding with nominal C is admitted.", sounding.location);
    trans = leaf(sounding, "Transpose", "");
    trans.children = [leaf(child(sounding, "TranspositionPitch"), "Octave", String(amount / 12)), leaf(sounding, "Chromatic", "0")];
    findings.push({ disposition: "preserved", code: "gp6-transpose-alias", message: "Explicit PartSounding semitone octave is translated to the common octave representation without an additional physical sounding-pitch shift.", location: sounding.location, fact: { encodedSemitones: amount } });
  }
  return rebuilt(track, [...keep, trans, rebuilt(properties2, canonical), rebuilt(midi, [child(midi, "Program")])]);
}
function validateGpifHeader(root, family, findings) {
  const version = value(root, "GPVersion", false), revision = child(root, "GPRevision"), encoding = child(root, "Encoding", false);
  if (family === 6 ? version && !/^6(?:\.\d{1,3}){0,2}$/.test(version) : !new RegExp(`^${family}(?:\\.\\d{1,3}){0,2}$`).test(version))
    refuse("version-profile", "Embedded GPIF version conflicts with the identified GP family.", root.location);
  if (!/^\d{1,5}$/.test(revision.text.trim()) || Number(revision.text.trim()) < 1 || Number(revision.text.trim()) > 13007) refuse("version-profile", "GPIF revision exceeds the reviewed reader revision ceiling13007 or is invalid.", revision.location);
  for (const name of Object.keys(revision.attrs)) {
    if (!["required", "recommended"].includes(name)) refuse("version-profile", "Unknown revision attribute.", revision.location);
    integer(revision.attrs[name], 0, 13007, revision);
  }
  if (encoding && value(encoding, "EncodingDescription") !== `GP${family}`)
    refuse("version-profile", "Encoding description conflicts with embedded version; a label alone never establishes pitch semantics.", encoding.location);
  findings.push({ disposition: "preserved", code: "gpif-family", message: "Version/revision/container identifiers are retained separately from strict selected-feature admission and physical pitch corroboration. This does not authenticate a producing application.", location: root.location, fact: { family, version: version || null, revision: revision.text.trim(), encoding: encoding ? value(encoding, "EncodingDescription") : null } });
}
function discoverGpifGraph(root) {
  const tracks = defined(root, "Tracks", "Track"), bars = defined(root, "Bars", "Bar"), voices = defined(root, "Voices", "Voice");
  const beats = defined(root, "Beats", "Beat"), notes = defined(root, "Notes", "Note"), rhythms = defined(root, "Rhythms", "Rhythm");
  const masterTrack = child(root, "MasterTrack"), order = ids(masterTrack, "Tracks");
  if (!order.length || order.length > limits.tracks || order.length !== tracks.size || new Set(order).size !== order.length || order.some((id) => !tracks.has(id)))
    refuse("track-scope", "Master track order must exactly identify all defined tracks within the bounded profile.", masterTrack.location);
  const masterBars = child(root, "MasterBars");
  shape(masterBars, ["MasterBar"], [], ["MasterBar"]);
  if (!masterBars.children.length || masterBars.children.length > limits.measures) refuse("measure-budget", "Measure count outside profile.", masterBars.location);
  const all = { bars: /* @__PURE__ */ new Set(), voices: /* @__PURE__ */ new Set(), beats: /* @__PURE__ */ new Set(), notes: /* @__PURE__ */ new Set(), rhythms: /* @__PURE__ */ new Set() };
  for (const master of masterBars.children) {
    const barIds = ids(master, "Bars");
    if (barIds.length !== order.length) refuse("bar-scope", "Every master bar must identify each source track.", master.location);
    for (const id of barIds) {
      if (!bars.has(id)) refuse("reference", "Unresolved master-bar reference.", master.location);
      all.bars.add(id);
    }
  }
  for (const b of bars.values()) for (const id of ids(b, "Voices")) if (id !== "-1") {
    if (!voices.has(id)) refuse("reference", "Unresolved voice reference.", b.location);
    if (all.bars.has(b.attrs.id)) all.voices.add(id);
  }
  for (const v of voices.values()) for (const id of ids(v, "Beats")) {
    if (!beats.has(id)) refuse("reference", "Unresolved beat reference.", v.location);
    if (all.voices.has(v.attrs.id)) all.beats.add(id);
  }
  for (const b of beats.values()) {
    const ref = child(b, "Rhythm");
    shape(ref, [], ["ref"]);
    if (ref.text.trim()) refuse("marker-content", "Rhythm reference must be empty.", ref.location);
    if (!rhythms.has(ref.attrs.ref)) refuse("reference", "Unresolved rhythm reference.", b.location);
    if (all.beats.has(b.attrs.id)) all.rhythms.add(ref.attrs.ref);
    for (const id of ids(b, "Notes", false)) {
      if (!notes.has(id)) refuse("reference", "Unresolved note reference.", b.location);
      if (all.beats.has(b.attrs.id)) all.notes.add(id);
    }
  }
  for (const [name, definitions] of [["bars", bars], ["voices", voices], ["beats", beats], ["notes", notes], ["rhythms", rhythms]])
    if (all[name].size !== definitions.size) refuse("unreferenced", `Orphan ${name} definition outside all declared track scopes.`, child(root, name[0].toUpperCase() + name.slice(1)).location);
  return { tracks, bars, voices, beats, notes, rhythms, order, all, masterBars };
}
function prepareGp8(root, requested, findings, family = 8) {
  validateGpifHeader(root, family, findings);
  const { tracks, bars, voices, beats, notes, rhythms, order, all, masterBars } = discoverGpifGraph(root);
  const masterTrack = child(root, "MasterTrack");
  const selected = requested ?? order;
  if (!selected.length || new Set(selected).size !== selected.length || selected.some((id) => !tracks.has(id)))
    refuse("track-selection", "Select existing unique source track IDs.", masterTrack.location);
  const selectedOrder = order.filter((id) => selected.includes(id));
  const trackIndexes = selectedOrder.map((id) => order.indexOf(id));
  const kept = { bars: /* @__PURE__ */ new Set(), voices: /* @__PURE__ */ new Set(), beats: /* @__PURE__ */ new Set(), notes: /* @__PURE__ */ new Set(), rhythms: /* @__PURE__ */ new Set() };
  const masters = masterBars.children.map((master) => {
    const barIds = ids(master, "Bars");
    if (barIds.length !== order.length) refuse("bar-scope", "Each master bar must identify every source track.", master.location);
    for (const id of barIds) {
      if (!bars.has(id)) refuse("reference", "Unresolved master-bar reference, including excluded tracks.", master.location);
      all.bars.add(id);
    }
    const chosen = trackIndexes.map((i) => barIds[i]);
    chosen.forEach((id) => kept.bars.add(id));
    const keep2 = named(master, ["Time", "Key", "Bars", "Repeat", "XProperties", "Section"], findings, ["Time", "Key", "Repeat"], ["Bars", "XProperties"]);
    if (child(master, "XProperties", false)) {
      const x = child(master, "XProperties");
      if (value(master, "Time") !== "4/4") refuse("beaming-profile", "Explicit eighth grouping is exercised only in 4/4.", x.location);
      const allowed = /* @__PURE__ */ new Map([["1124139010", "8"], ["1124139264", "2"], ["1124139265", "2"], ["1124139266", "2"], ["1124139267", "2"]]);
      shape(x, ["XProperty"], [], ["XProperty"]);
      const seen = /* @__PURE__ */ new Set();
      for (const p of x.children) {
        shape(p, ["Int"], ["id"]);
        scalar(child(p, "Int"));
        if (!allowed.has(p.attrs.id) || seen.has(p.attrs.id) || value(p, "Int") !== allowed.get(p.attrs.id))
          refuse("beaming-profile", "Master-bar beaming override is outside the exercised 4/4 eighth-group profile.", p.location);
        seen.add(p.attrs.id);
      }
      if (seen.size !== allowed.size) refuse("beaming-profile", "Incomplete source beaming-group tuple.", x.location);
      findings.push({ disposition: "omitted", code: "source-beaming", message: "Explicit source eighth-note grouping observed in source; capture is delivered only on success; MusicXML beam grouping export is not exercised.", location: x.location, fact: { unit: "eighth", groups: [2, 2, 2, 2] } });
    }
    const key = child(master, "Key");
    const keyFields = named(key, ["AccidentalCount", "Mode", "TransposeAs"], findings, ["AccidentalCount", "Mode"], ["TransposeAs"]);
    const keyAlias = child(key, "TransposeAs", false);
    if (keyAlias) scalar(keyAlias);
    if (keyAlias && !["Sharps", "Flats"].includes(keyAlias.text.trim())) refuse("key-transpose", "Unreviewed key spelling preference.", keyAlias.location);
    if (keyAlias) findings.push({ disposition: "omitted", code: "key-preference", message: "Source key spelling preference is retained but not reapplied. Explicit key count/mode and corroborated note spellings are exported; only octave display transpose is admitted.", location: keyAlias.location, fact: keyAlias.text.trim() });
    return rebuilt(master, [...keep2.filter((e) => e.name !== "Key"), rebuilt(key, keyFields), leaf(child(master, "Bars"), "Bars", chosen.join(" "))]);
  });
  const preparedBars = [...kept.bars].map((id) => {
    const bar = bars.get(id), all2 = ids(bar, "Voices");
    const firstAbsent = all2.indexOf("-1");
    if (firstAbsent >= 0 && all2.slice(firstAbsent).some((id2) => id2 !== "-1")) refuse("voice-profile", "Only trailing absent voice slots are exercised.", bar.location);
    const active = all2.filter((id2) => id2 !== "-1");
    if (!active.length) refuse("voice-profile", "A selected bar requires an explicit active voice.", bar.location);
    active.forEach((id2) => kept.voices.add(id2));
    if (active.length !== all2.length) findings.push({ disposition: "preserved", code: "absent-voice-slots", message: "Trailing -1 slots declare absent voices; no written notes or active voice identities are removed.", location: bar.location, fact: { absent: all2.length - active.length } });
    const keep2 = named(bar, ["Clef", "Voices"], findings, ["Clef"], ["Voices"]);
    return rebuilt(bar, [...keep2, leaf(child(bar, "Voices"), "Voices", active.join(" "))]);
  });
  for (const id of kept.voices) ids(voices.get(id), "Beats").forEach((id2) => kept.beats.add(id2));
  for (const id of kept.beats) {
    const b = beats.get(id);
    ids(b, "Notes", false).forEach((id2) => kept.notes.add(id2));
    kept.rhythms.add(child(b, "Rhythm").attrs.ref);
  }
  const preparedTracks = selectedOrder.map((id) => {
    const track = tracks.get(id);
    if (family === 6) return prepareDirectTrack(track, findings);
    const keep2 = named(track, ["Name", "ShortName", "Color", "SystemsDefautLayout", "SystemsLayout", "AutoBrush", "AutoAccentuation", "PalmMute", "PlayingStyle", "UseOneChannelPerString", "IconId", "InstrumentSet", "Transpose", "RSE", "ForcedSound", "Sounds", "MidiConnection", "PlaybackState", "AudioEngineState", "Lyrics", "Staves", "Automations"], findings, ["Name", "Transpose"], ["InstrumentSet", "Sounds", "Staves", "AutoBrush", "AutoAccentuation", "PalmMute"]);
    const type = checkDefaultArticulation(track);
    const playing = child(track, "PlayingStyle", false), palm = child(track, "PalmMute", false), state = child(track, "PlaybackState", false);
    if (playing && !["Default", ...type === "electricGuitar" ? ["StringedPick"] : []].includes(playing.text.trim()) || state && state.text.trim() !== "Default") refuse("track-technique", "Active track-wide style or playback state requires mapping.", track.location);
    for (const parameter of [palm, child(track, "AutoAccentuation", false)].filter((p) => !!p)) {
      scalar(parameter);
      if (!/^(?:0(?:\.\d{1,6})?|1(?:\.0{1,6})?)$/.test(parameter.text.trim())) refuse("track-playback", "Playback interpretation parameter must be a bounded decimal0\u20131.", parameter.location);
      findings.push({ disposition: "omitted", code: "track-playback-interpretation", message: parameter.name === "PalmMute" ? "Source palm-mute intensity parameter is retained, not applied. Selected notes with active palm-mute technique still refuse; this parameter alone does not mark notes or performing hands." : "Source automatic strong-beat accentuation is retained but playback emphasis is not reproduced or invented as written accents/dynamics. No complete playback equivalence is claimed.", location: { ...parameter.location, trackId: id }, fact: { parameter: parameter.name, value: parameter.text.trim() } });
    }
    const autoBrush = child(track, "AutoBrush", false);
    if (autoBrush) {
      marker(autoBrush);
      findings.push({ disposition: "omitted", code: "source-auto-brush", message: "Source automatic chord strum delay is retained but not reproduced. Conversion requires no overlapping selected notes across logical voices; written clocks stay exact.", location: { ...autoBrush.location, trackId: id }, fact: { enabled: true } });
    }
    if (playing?.text.trim() === "StringedPick") findings.push({ disposition: "omitted", code: "source-playing-style", message: "Explicit track playing style StringedPick is retained in source but not reapplied as individual note articulations or performing-hand assignments.", location: playing.location, fact: "StringedPick" });
    findings.push({ disposition: "omitted", code: "instrument-sound-metadata", message: "Instrument/sound names, labels, bank/timbre metadata and default articulation appearance are observed in source; capture is delivered only on success; exported meaning uses the validated pitched articulation and zero-bank MIDI program, without asserting recorded technique.", location: track.location });
    const automation = child(track, "Automations", false);
    const lyrics = child(track, "Lyrics", false);
    if (lyrics) {
      shape(lyrics, ["Line"], ["dispatched"], ["Line"]);
      if (lyrics.attrs.dispatched !== void 0 && lyrics.attrs.dispatched !== "true") refuse("lyrics", "Unreviewed lyric dispatch convention.", lyrics.location);
      for (const line of lyrics.children) {
        shape(line, ["Text", "Offset"]);
        line.children.forEach(scalar);
        if (value(line, "Text").trim()) refuse("lyrics", "Nonempty lyrics require an exercised export mapping.", line.location);
      }
    }
    const staveContainer = child(track, "Staves");
    shape(staveContainer, ["Staff"], [], ["Staff"]);
    const staves = staveContainer.children;
    if (staves.length !== 1) refuse("staff-profile", "One explicitly fretted staff per selected bass track is required.", track.location);
    shape(staves[0], ["Properties"]);
    const properties2 = child(staves[0], "Properties"), canonical = [];
    shape(properties2, ["Property", "Name"], [], ["Property"]);
    const propertyNames = /* @__PURE__ */ new Set();
    for (const property of properties2.children) {
      if (property.name === "Name") {
        scalar(property);
        findings.push({ disposition: "omitted", code: "staff-name", message: "Source display name retained; ordinary source staff clef is exported.", location: property.location });
        continue;
      }
      if (property.name !== "Property") refuse("unknown-property", "Unknown staff property container.", property.location);
      const name = property.attrs.name;
      if (propertyNames.has(name)) refuse("structure", "Duplicate staff property identity.", property.location);
      propertyNames.add(name);
      const fields = { Tuning: ["Pitches", "Flat", "Instrument", "Label", "LabelVisible"], TuningFlat: ["Enable"], CapoFret: ["Fret"], PartialCapoFret: ["Fret"], PartialCapoStringFlags: ["Bitset", "Flags"], FretCount: ["Number"], ChordCollection: ["Items"], ChordWorkingSet: ["Items"], DiagramCollection: ["Items"], DiagramWorkingSet: ["Items"] };
      shape(property, fields[name] ?? [], ["name"]);
      property.children.forEach(scalar);
      if (name === "Tuning") {
        if (property.children.some((e) => !["Pitches", "Flat", "Instrument", "Label", "LabelVisible"].includes(e.name))) refuse("tuning-property", "Unreviewed tuning field.", property.location);
        if (child(property, "Flat", false)) {
          marker(child(property, "Flat"));
          findings.push({ disposition: "omitted", code: "tuning-flat-preference", message: "Encoded tuning flat-spelling preference is retained separately from MIDI values. Generated MusicXML reference tuning spelling remains explicitly inferred.", location: child(property, "Flat").location });
        }
        const visible = child(property, "LabelVisible", false);
        if (visible && !["true", "false"].includes(visible.text.trim())) refuse("tuning-property", "Tuning label visibility must be explicit boolean.", visible.location);
        canonical.push(rebuilt(property, [child(property, "Pitches")]));
      } else if (name === "TuningFlat") {
        marker(child(property, "Enable"));
        findings.push({ disposition: "omitted", code: "tuning-flat-preference", message: "Encoded enabled tuning flat-spelling preference is retained separately from MIDI values. Generated MusicXML reference tuning spelling remains explicitly inferred.", location: property.location });
      } else if (name === "CapoFret") canonical.push(property);
      else if (name === "PartialCapoFret" && value(property, "Fret") === "0" || name === "PartialCapoStringFlags" && property.children.length === 1 && /^0+$/.test(property.children[0].text.trim())) {
        findings.push({ disposition: "preserved", code: "no-partial-capo", message: "Explicitly inactive partial capo retained.", location: property.location });
      } else if (name === "FretCount") integer(value(property, "Number"), 1, 36, property);
      else if (["ChordCollection", "ChordWorkingSet", "DiagramCollection", "DiagramWorkingSet"].includes(name) && !child(property, "Items").children.length) {
        findings.push({ disposition: "omitted", code: "empty-diagrams", message: "Empty diagram container retained; no musical chord data dropped.", location: property.location });
      } else refuse("staff-property", `Staff property ${name} is unsupported or active.`, property.location);
    }
    const soundContainer = child(track, "Sounds");
    shape(soundContainer, ["Sound"], [], ["Sound"]);
    const sounds = soundContainer.children;
    if (sounds.length !== 1) refuse("sound-profile", "One explicit sound program is required; sound changes are unsupported.", track.location);
    shape(sounds[0], ["Name", "Label", "Path", "Role", "MIDI", "RSE"]);
    sounds[0].children.filter((e) => !["MIDI", "RSE"].includes(e.name)).forEach(scalar);
    if (child(sounds[0], "RSE", false)) findings.push({ disposition: "omitted", code: "sound-rse", message: "Source synth setup is captured but not recreated.", location: child(sounds[0], "RSE").location });
    const midi = child(sounds[0], "MIDI");
    shape(midi, ["MSB", "LSB", "Program"]);
    midi.children.forEach(scalar);
    if (integer(value(midi, "MSB"), 0, 127, midi) || integer(value(midi, "LSB"), 0, 127, midi)) refuse("sound-bank", "Nonzero sound-bank interpretation needs separate coverage.", midi.location);
    const program = child(midi, "Program");
    const programNumber = integer(program.text.trim(), 0, 127, program);
    if (type === "electricBass" ? programNumber < 32 || programNumber > 39 : programNumber < 24 || programNumber > 31)
      refuse("instrument-profile", "Encoded instrument family and zero-bank MIDI program disagree.", program.location);
    if (automation) {
      shape(automation, ["Automation"], [], ["Automation"]);
      if (automation.children.length > 1) refuse("track-automation", "Only one initial matching sound declaration is admitted; sound changes require mapping.", automation.location);
      if (automation.children.length) {
        const initial = automation.children[0];
        shape(initial, ["Type", "Linear", "Bar", "Position", "Visible", "Value"]);
        initial.children.forEach(scalar);
        const expected = [value(sounds[0], "Path"), value(sounds[0], "Name"), value(sounds[0], "Role")].join(";");
        if (value(initial, "Type") !== "Sound" || value(initial, "Linear") !== "false" || value(initial, "Bar") !== "0" || value(initial, "Position") !== "0" || !["true", "false"].includes(value(initial, "Visible")) || value(initial, "Value") !== expected)
          refuse("track-automation", "Initial sound must exactly name the one serialized sound at bar zero/position zero.", initial.location);
        findings.push({ disposition: "preserved", code: "initial-sound-alias", message: "Initial Sound declaration exactly names the sole serialized Path/Name/Role. It selects the already validated source program, not a later sound change; synth timbre remains omitted.", location: initial.location, fact: { path: value(sounds[0], "Path"), name: value(sounds[0], "Name"), role: value(sounds[0], "Role"), program: programNumber } });
      }
    }
    return rebuilt(track, [
      ...keep2,
      leaf(child(track, "InstrumentSet"), "Instrument", "", { ref: type }),
      rebuilt(properties2, canonical),
      { ...midi, name: "GeneralMidi", attrs: { table: "Instrument" }, children: [program] }
    ]);
  });
  for (const id of order.filter((id2) => !selected.includes(id2))) findings.push({ disposition: "excluded-by-scope", code: "track-excluded", message: "Track deliberately excluded by the requested source IDs; its facts remain in original source; capture is delivered only on success.", location: { ...tracks.get(id).location, trackId: id }, fact: { trackId: id } });
  const preparedBeats = [...kept.beats].map((id) => {
    const b = beats.get(id);
    const keep2 = named(b, ["Rhythm", "Notes", "Dynamic", "FreeText", "Properties", "TransposedPitchStemOrientation", "ConcertPitchStemOrientation"], findings, ["Rhythm", "Notes", "Dynamic", "FreeText"]);
    const properties2 = child(b, "Properties", false);
    if (properties2) shape(properties2, ["Property"], [], ["Property"]);
    const names = /* @__PURE__ */ new Set();
    for (const p of properties2?.children ?? []) {
      shape(p, ["Float"], ["name"]);
      scalar(child(p, "Float"));
      if (names.has(p.attrs.name)) refuse("structure", "Duplicate beat pickup-control property.", p.location);
      names.add(p.attrs.name);
      if (p.name !== "Property" || !["PrimaryPickupVolume", "PrimaryPickupTone"].includes(p.attrs.name)) refuse("beat-property", "Unreviewed selected beat sound property.", p.location);
      const amount = value(p, "Float");
      if (!/^\d{1,2}(?:\.\d{1,16})?$/.test(amount) || Number(amount) > 10) refuse("pickup-tone", "Invalid bounded synth pickup control.", p.location);
      findings.push({ disposition: "omitted", code: "pickup-tone", message: "Synth pickup tone/volume observed in source; capture is delivered only on success; instrument timbre recreation is not exercised.", location: p.location });
    }
    return rebuilt(b, keep2);
  });
  const score = child(root, "Score");
  const preparedScore = rebuilt(score, named(score, ["Title", "SubTitle", "Artist", "Album", "Words", "Music", "WordsAndMusic", "Copyright", "Tabber", "Instructions", "Notices", "FirstPageHeader", "FirstPageFooter", "PageHeader", "PageFooter", "ScoreSystemsDefaultLayout", "ScoreSystemsLayout", "ScoreZoomPolicy", "ScoreZoom", "MultiVoice", "PageSetup"], findings, ["Title"]));
  const preparedMaster = rebuilt(masterTrack, named(masterTrack, ["Tracks", "Automations", "Anacrusis", "RSE"], findings, ["Automations", "Anacrusis"], ["Tracks"]).concat(leaf(child(masterTrack, "Tracks"), "Tracks", selectedOrder.join(" "))));
  const audio = child(root, "AudioTracks", false);
  if (audio && (audio.children.length || audio.text.trim())) refuse("audio-track", "Audio tracks require a separate timing/media contract.", audio.location);
  const keep = named(root, ["GPVersion", "GPRevision", "Encoding", "Score", "MasterTrack", "Tracks", "MasterBars", "Bars", "Voices", "Beats", "Notes", "Rhythms", "ScoreViews", "AudioTracks"], findings, ["GPVersion", "GPRevision", "Encoding"], ["Score", "MasterTrack", "Tracks", "MasterBars", "Bars", "Voices", "Beats", "Notes", "Rhythms"]);
  const group = (name, elements) => rebuilt(child(root, name), elements);
  return freeze(rebuilt(root, [
    ...keep,
    preparedScore,
    preparedMaster,
    group("Tracks", preparedTracks),
    group("MasterBars", masters),
    group("Bars", preparedBars),
    group("Voices", [...kept.voices].map((id) => voices.get(id))),
    group("Beats", preparedBeats),
    group("Notes", [...kept.notes].map((id) => notes.get(id))),
    group("Rhythms", [...kept.rhythms].map((id) => rhythms.get(id)))
  ]));
}
function serialize(e) {
  const escape = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  return `<${e.name}${Object.entries(e.attrs).map(([k, v]) => ` ${k}="${escape(v)}"`).join("")}>${escape(e.text)}${e.children.map(serialize).join("")}</${e.name}>`;
}

// src/adapters/guitar-pro/container-facts.ts
function stylesheet(b, member) {
  let pos = 0;
  const fail = () => refuse("stylesheet", "Malformed/unsupported bounded stylesheet key/value data.", { member });
  const take = (n) => {
    if (n < 0 || pos + n > b.length) fail();
    const r = b.subarray(pos, pos + n);
    pos += n;
    return r;
  };
  const count = take(4).readUInt32BE();
  if (count > 2048) fail();
  const records = /* @__PURE__ */ Object.create(null);
  for (let i = 0; i < count; i++) {
    const key = new TextDecoder("utf8", { fatal: true }).decode(take(take(1)[0]));
    if (!/^[A-Za-z0-9_. /-]{1,255}$/.test(key) || key in records) fail();
    const type = take(1)[0];
    let value2;
    switch (type) {
      case 0: {
        const v = take(1)[0];
        if (v > 1) fail();
        value2 = !!v;
        break;
      }
      case 1:
        value2 = take(4).readInt32BE();
        break;
      case 2: {
        const v = take(4).readFloatBE();
        if (!Number.isFinite(v)) fail();
        value2 = v;
        break;
      }
      case 3: {
        const length = take(2).readUInt16BE();
        if (length > 16384) fail();
        value2 = new TextDecoder("utf8", { fatal: true }).decode(take(length));
        break;
      }
      case 4:
      case 5:
        value2 = [take(4).readInt32BE(), take(4).readInt32BE()];
        break;
      case 6:
        value2 = [take(4).readInt32BE(), take(4).readInt32BE(), take(4).readInt32BE(), take(4).readInt32BE()];
        break;
      case 7:
        value2 = [...take(4)];
        break;
      default:
        fail();
    }
    records[key] = value2;
  }
  if (pos !== b.length) fail();
  if ("Global/translateTunings" in records && typeof records["Global/translateTunings"] !== "boolean") refuse("stylesheet", "Expected boolean Global/translateTunings.", { member });
  if (records["Global/translateTunings"] === true) refuse("stylesheet-pitch", "Active translated tuning may change displayed pitch; that convention is not exercised.", { member });
  return records;
}
function captureContainer(members, gp8, findings, captureRaw = true) {
  const facts = [], display = { hideDynamics: false, hideTempo: false };
  for (const [member, b] of members) {
    if (member === "Content/score.gpif") continue;
    if (member.endsWith("/")) {
      if (captureRaw) facts.push({ member, kind: "directory", bytes: 0, sha256: sha256(b), dataBase64: "" });
      findings.push({ disposition: "preserved", code: "container-directory", message: "Validated empty ZIP directory is retained as directory metadata, not a payload file.", location: { member } });
      continue;
    }
    if (member !== "VERSION" && (!gp8 || !["Content/BinaryStylesheet", "Content/LayoutConfiguration", "Content/PartConfiguration", "Content/Preferences.json", "Content/misc.xml", "meta.json"].includes(member) && !/^Content\/(?:ScoreViews\/\d{1,2}\.gpsv|Stylesheets\/(?:score|scoreview\d{1,2})\.gpss)$/.test(member)))
      refuse("container-member", `Unreviewed container member ${member}; assets/protection or unknown musical configuration require admission.`, { member });
    const fact = { member, bytes: b.length, sha256: captureRaw ? sha256(b) : "", dataBase64: captureRaw ? b.base64() : "" };
    if (member === "Content/BinaryStylesheet") {
      fact.records = stylesheet(b, member);
      for (const key of ["StandardNotation/hideDynamics", "Global/hideGlobalTempo"]) {
        if (key in fact.records && typeof fact.records[key] !== "boolean") refuse("stylesheet", `Expected boolean ${key}.`, { member });
      }
      display.hideDynamics = fact.records["StandardNotation/hideDynamics"] === true;
      display.hideTempo = fact.records["Global/hideGlobalTempo"] === true;
      findings.push({ disposition: "preserved", code: "source-visibility", message: "Decoded BinaryStylesheet dynamic/tempo visibility flags are applied independently of musical values; opaque GP8 sidecar overrides are not applied.", location: { member }, fact: display });
    } else if (member === "Content/misc.xml") {
      const root = parseXml(b, member, "MISC").root;
      if (root.name !== "MISC" || root.text.trim() || Object.keys(root.attrs).length || root.children.length !== 1 || root.children[0].name !== "TracksView") refuse("container-metadata", "Unreviewed GP6 miscellaneous configuration.", root.location);
      const view = child(root, "TracksView"), count = child(view, "PreferredTrackCount");
      if (view.text.trim() || Object.keys(view.attrs).length || view.children.length !== 1 || Object.keys(count.attrs).length || count.children.length) refuse("container-metadata", "Unreviewed GP6 track-view configuration.", view.location);
      fact.records = { preferredTrackCount: integer(value(view, "PreferredTrackCount"), 1, 8, count) };
    } else if (member === "Content/Preferences.json" || member === "meta.json") {
      const parsed = JSON.parse(new TextDecoder("utf8", { fatal: true }).decode(b));
      if (member === "meta.json" && parsed !== null && !(typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length === 0)) refuse("container-metadata", "Only empty object/null meta.json is exercised.", { member });
      if (member === "Content/Preferences.json") {
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).some((k) => !["tonality", "tempo", "view"].includes(k)))
          refuse("container-preferences", "Unreviewed preferences require admission.", { member });
        fact.records = parsed;
      }
    }
    if (captureRaw) facts.push(fact);
    if (member !== "VERSION") findings.push({ disposition: "omitted", code: "container-display-synth", message: "Original member bytes are observed intact; local capture is delivered only on success. Page/view layout, synth timbre and practice/display preferences are not reapplied; exported musical pitch/rhythm comes from corroborated GPIF facts. Only decoded BinaryStylesheet visibility flags are applied. GP8 .gpss/.gpsv sidecar overrides are unparsed/unapplied and may alter source presentation.", location: { member } });
  }
  return { facts, display };
}

// src/adapters/guitar-pro/profile.ts
var vocabulary = {
  GPIF: "GPVersion GPRevision Encoding Score MasterTrack Tracks MasterBars Bars Voices Beats Notes Rhythms",
  Encoding: "EncodingDescription",
  Score: "Title SubTitle Artist Album Words Music WordsAndMusic Copyright Tabber Instructions Notices ScoreSystemsDefaultLayout ScoreSystemsLayout",
  MasterTrack: "Tracks Automations Anacrusis",
  Tracks: "Track",
  Track: "Name ShortName Instrument GeneralMidi Properties Transpose Color SystemsDefautLayout SystemsLayout",
  GeneralMidi: "Program Port PrimaryChannel SecondaryChannel",
  Transpose: "Chromatic Octave",
  Automations: "Automation",
  Automation: "Type Linear Bar Position Value Visible Text",
  MasterBars: "MasterBar",
  MasterBar: "Time Bars Key Repeat",
  Key: "AccidentalCount Mode",
  Bars: "Bar",
  Bar: "Voices Clef",
  Voices: "Voice",
  Voice: "Beats",
  Beats: "Beat",
  Beat: "Rhythm Notes FreeText",
  Notes: "Note",
  Note: "Properties Tie",
  Rhythms: "Rhythm",
  Rhythm: "NoteValue AugmentationDot PrimaryTuplet",
  Properties: "Property",
  Pitch: "Step Accidental Octave"
};
var attrs = {
  GPRevision: "required recommended",
  Track: "id",
  GeneralMidi: "table",
  Instrument: "ref",
  Bar: "id",
  Voice: "id",
  Beat: "id",
  Note: "id",
  Rhythm: "id ref",
  Property: "name",
  Tie: "origin destination",
  Repeat: "start end count",
  AugmentationDot: "count",
  PrimaryTuplet: "num den"
};
var leaf2 = new Set("GPVersion GPRevision EncodingDescription Title SubTitle Artist Album Words Music WordsAndMusic Copyright Tabber Instructions Notices ScoreSystemsDefaultLayout ScoreSystemsLayout Anacrusis Name ShortName Color SystemsDefautLayout SystemsLayout Instrument Program Port PrimaryChannel SecondaryChannel Chromatic Octave Type Linear Position Value Visible Text Time AccidentalCount Mode Clef FreeText NoteValue AugmentationDot PrimaryTuplet Tie Repeat Pitches Fret String Step Accidental".split(" "));
var properties = {
  Track: { Tuning: "Pitches", CapoFret: "Fret" },
  Note: { String: "String", Fret: "Fret", ConcertPitch: "Pitch", TransposedPitch: "Pitch" }
};
var techniqueNames = new Set("Muted PalmMuted Tapped LeftHandTapped HarmonicType HarmonicFret Bended BendOriginValue BendOriginOffset BendMiddleValue BendMiddleOffset1 BendMiddleOffset2 BendDestinationValue BendDestinationOffset HopoOrigin HopoDestination Slide LetRing Trill Vibrato AntiAccent Accent LeftFingering RightFingering GraceNotes Legato Whammy Ottavia Dynamic Tremolo Hairpin Arpeggio Fadding".split(" "));
var metadata = new Set("SubTitle Artist Album Words Music WordsAndMusic Copyright Tabber Instructions Notices ScoreSystemsDefaultLayout ScoreSystemsLayout Color SystemsDefautLayout SystemsLayout ShortName Port PrimaryChannel SecondaryChannel".split(" "));
function inventory(root, findings, mode = "constructed") {
  const visit = (node, parent, grandparent) => {
    if (node.children.length && node.text.trim()) refuse("mixed-content", "Mixed GPIF element content is unsupported.", node.location);
    let allowed = vocabulary[node.name]?.split(" ") ?? [];
    if (mode !== "constructed" && node.name === "Note") allowed = [...allowed, "InstrumentArticulation"];
    if (mode !== "constructed" && node.name === "Beat") allowed = [...allowed, "Dynamic"];
    if (node.name === "Tracks" && parent?.name === "MasterTrack" || node.name === "Bars" && parent?.name === "MasterBar" || node.name === "Voices" && parent?.name === "Bar" || node.name === "Beats" && parent?.name === "Voice" || node.name === "Notes" && parent?.name === "Beat") allowed = [];
    if (node.name === "Property") {
      const name = node.attrs.name;
      const extra = { Midi: "Number", Muted: "Enable", HopoOrigin: "Enable", HopoDestination: "Enable" };
      const entry = properties[grandparent?.name ?? ""]?.[name] ?? (mode !== "constructed" && grandparent?.name === "Note" ? extra[name] : void 0);
      if (!entry) refuse(techniqueNames.has(name) ? "technique" : "unknown-property", `Property ${name} is outside the exercised musical profile.`, node.location);
      allowed = entry.split(" ");
    }
    if (["Instrument", "Anacrusis", "Tie", "Repeat", "AugmentationDot", "PrimaryTuplet", "Enable"].includes(node.name) && node.text.trim())
      refuse("marker-content", "Unexpected scalar content in an encoded marker.", node.location);
    if (mode === "constructed" && node.name === "GPRevision" && (node.attrs.required !== "0" || node.attrs.recommended !== "0"))
      refuse("version-profile", "Only revision0 with required0/recommended0 is exercised.", node.location);
    const permitted = (attrs[node.name] ?? "").split(" ");
    for (const name of Object.keys(node.attrs)) if (!permitted.includes(name)) refuse("unknown-attribute", `Unreviewed attribute ${name}.`, node.location);
    for (const c of node.children) {
      if (!allowed.includes(c.name)) refuse(techniqueNames.has(c.name) ? "technique" : "unknown-element", `Element ${c.name} is outside the exercised musical profile.`, c.location);
      visit(c, node, parent);
    }
    if (!vocabulary[node.name] && !leaf2.has(node.name) && node.name !== "Property" && !(mode !== "constructed" && ["InstrumentArticulation", "Dynamic", "Number", "Enable"].includes(node.name))) refuse("unknown-element", `Unreviewed element ${node.name}.`, node.location);
    if (metadata.has(node.name)) findings.push({ disposition: "omitted", code: "metadata", message: "Retained in original input (capture delivered only on success); not rendered in this MusicXML proof.", location: node.location, fact: node.text });
  };
  visit(root);
  if (mode === "constructed" && (value(root, "GPVersion") !== "7.0" || value(root, "GPRevision") !== "0"))
    refuse("version-profile", "Only the independently constructed GPIF 7.0/revision 0 fixture profile has been exercised; other producer/header combinations need admission.", root.location);
  const encoding = child(root, "Encoding", false);
  if (mode === "constructed" && (!encoding || !value(encoding, "EncodingDescription"))) refuse("producer", "Encoding provenance is required for this proof.", root.location);
  findings.push({
    disposition: "preserved",
    code: "headers",
    message: mode === "constructed" ? "Container and embedded headers are separate identifiers; fixture profile is not authentic producer acceptance." : "GP8 header tuple retained separately from exercised musical feature and scientific-pitch corroboration profile; it does not identify the producing application.",
    location: root.location,
    fact: { gpVersion: value(root, "GPVersion", false), revision: value(root, "GPRevision"), encoding: encoding ? value(encoding, "EncodingDescription") : void 0, revisionAttributes: child(root, "GPRevision").attrs }
  });
}

// third_party/alphatab/src/AlphaTabError.ts
var AlphaTabError = class extends Error {
  type;
  constructor(type, message = "", inner) {
    super(message ?? "", { cause: inner });
    this.type = type;
  }
};

// third_party/alphatab/src/importer/UnsupportedFormatError.ts
var UnsupportedFormatError = class extends AlphaTabError {
  constructor(message = null, inner) {
    super(1 /* Format */, message ?? "Unsupported format", inner);
  }
};

// third_party/alphatab/src/model/Automation.ts
var SyncPointData = class {
  /**
   * Indicates for which repeat occurence this sync point is valid (e.g. 0 on the first time played, 1 on the second time played)
   */
  barOccurence = 0;
  /**
   * The audio offset marking the position within the audio track in milliseconds.
   * This information is used to regularly sync (or on seeking) to match a given external audio time axis with the internal time axis.
   */
  millisecondOffset = 0;
};
var Automation = class _Automation {
  /**
   * Gets or sets whether the automation is applied linear.
   */
  isLinear = false;
  /**
   * Gets or sets the type of the automation.
   */
  type = 0 /* Tempo */;
  /**
   * Gets or sets the target value of the automation.
   */
  value = 0;
  /**
   * The sync point data in case of {@link AutomationType.SyncPoint}
   */
  syncPointValue;
  /**
   * Gets or sets the relative position of of the automation.
   */
  ratioPosition = 0;
  /**
   * Gets or sets the additional text of the automation.
   */
  text = "";
  /**
   * Whether this automation should be visible. (not all automation types are shown, 
   * e.g. tempo changes shown in the score while volume changes are not).
   */
  isVisible = true;
  static buildTempoAutomation(isLinear, ratioPosition, value2, reference, isVisible = true) {
    if (reference < 1 || reference > 5) {
      reference = 2;
    }
    const references = new Float32Array([1, 0.5, 1, 1.5, 2, 3]);
    const automation = new _Automation();
    automation.type = 0 /* Tempo */;
    automation.isLinear = isLinear;
    automation.ratioPosition = ratioPosition;
    automation.value = value2 * references[reference];
    automation.isVisible = isVisible;
    return automation;
  }
  static buildInstrumentAutomation(isLinear, ratioPosition, value2) {
    const automation = new _Automation();
    automation.type = 2 /* Instrument */;
    automation.isLinear = isLinear;
    automation.ratioPosition = ratioPosition;
    automation.value = value2;
    return automation;
  }
};

// third_party/alphatab/src/model/ElementStyle.ts
var ElementStyle = class {
  /**
   * Changes the color of the specified sub-element within the element this style container belongs to.
   * Null indicates that a certain element should use the default color from {@link RenderingResources}
   * even if some "higher level" element changes colors.
   */
  colors = /* @__PURE__ */ new Map();
};

// third_party/alphatab/src/model/Duration.ts
var Duration = /* @__PURE__ */ ((Duration2) => {
  Duration2[Duration2["QuadrupleWhole"] = -4] = "QuadrupleWhole";
  Duration2[Duration2["DoubleWhole"] = -2] = "DoubleWhole";
  Duration2[Duration2["Whole"] = 1] = "Whole";
  Duration2[Duration2["Half"] = 2] = "Half";
  Duration2[Duration2["Quarter"] = 4] = "Quarter";
  Duration2[Duration2["Eighth"] = 8] = "Eighth";
  Duration2[Duration2["Sixteenth"] = 16] = "Sixteenth";
  Duration2[Duration2["ThirtySecond"] = 32] = "ThirtySecond";
  Duration2[Duration2["SixtyFourth"] = 64] = "SixtyFourth";
  Duration2[Duration2["OneHundredTwentyEighth"] = 128] = "OneHundredTwentyEighth";
  Duration2[Duration2["TwoHundredFiftySixth"] = 256] = "TwoHundredFiftySixth";
  return Duration2;
})(Duration || {});

// third_party/alphatab/src/model/Bar.ts
var SustainPedalMarker = class {
  /**
   * The relative position of pedal markers within the bar.
   */
  ratioPosition = 0;
  /**
   * Whether what should be done with the pedal at this point
   */
  pedalType = 0 /* Down */;
  /**
   * THe bar to which this marker belongs to.
   * @json_ignore
   */
  bar;
  /**
   * The next pedal marker for linking the related markers together to a "down -> hold -> up" or "down -> up" sequence.
   * Always null for "up" markers.
   * @json_ignore
   */
  nextPedalMarker = null;
  /**
   * The previous pedal marker for linking the related markers together to a "down -> hold -> up" or "down -> up" sequence.
   * Always null for "down" markers.
   * @json_ignore
   */
  previousPedalMarker = null;
};
var Bar = class _Bar {
  static _globalBarId = 0;
  /**
   * @internal
   */
  static resetIds() {
    _Bar._globalBarId = 0;
  }
  /**
   * Gets or sets the unique id of this bar.
   */
  id = _Bar._globalBarId++;
  /**
   * Gets or sets the zero-based index of this bar within the staff.
   * @json_ignore
   */
  index = 0;
  /**
   * Gets or sets the next bar that comes after this bar.
   * @json_ignore
   */
  nextBar = null;
  /**
   * Gets or sets the previous bar that comes before this bar.
   * @json_ignore
   */
  previousBar = null;
  /**
   * Gets or sets the clef on this bar.
   */
  clef = 4 /* G2 */;
  /**
   * Gets or sets the ottava applied to the clef.
   */
  clefOttava = 2 /* Regular */;
  /**
   * Gets or sets the reference to the parent staff.
   * @json_ignore
   */
  staff;
  /**
   * Gets or sets the list of voices contained in this bar.
   * @json_add addVoice
   */
  voices = [];
  /**
   * Gets or sets the simile mark on this bar.
   */
  simileMark = 0 /* None */;
  _filledVoices = /* @__PURE__ */ new Set([0]);
  /**
   * Gets a value indicating whether this bar contains multiple voices with notes.
   * @json_ignore
   */
  get isMultiVoice() {
    return this._filledVoices.size > 1;
  }
  /**
   * Gets the number of voices which have content within this stuff.
   * @json_ignore
   */
  get filledVoices() {
    return this._filledVoices;
  }
  /**
   * A relative scale for the size of the bar when displayed. The scale is relative
   * within a single line (system). The sum of all scales in one line make the total width,
   * and then this individual scale gives the relative size.
   */
  displayScale = 1;
  /**
   * An absolute width of the bar to use when displaying in single track display scenarios.
   */
  displayWidth = -1;
  /**
   * The sustain pedal markers within this bar.
   */
  sustainPedals = [];
  get masterBar() {
    return this.staff.track.score.masterBars[this.index];
  }
  _isEmpty = true;
  _isRestOnly = true;
  /**
   * Whether this bar is fully empty (not even having rests).
   */
  get isEmpty() {
    return this._isEmpty;
  }
  /**
   * Whether this bar has any changes applied which are not related to the voices in it.
   * (e.g. new key signatures)
   */
  get hasChanges() {
    if (this.index === 0) {
      return true;
    }
    const hasChangesToPrevious = this.keySignature !== this.previousBar.keySignature || this.keySignatureType !== this.previousBar.keySignatureType || this.clef !== this.previousBar.clef || this.clefOttava !== this.previousBar.clefOttava;
    if (hasChangesToPrevious) {
      return true;
    }
    return this.simileMark !== 0 /* None */ || this.sustainPedals.length > 0 || this.barLineLeft !== 0 /* Automatic */ || this.barLineRight !== 0 /* Automatic */;
  }
  /**
   * Whether this bar is empty or has only rests.
   */
  get isRestOnly() {
    return this._isRestOnly;
  }
  /**
   * The bar line to draw on the left side of the bar.
   * @remarks
   * Note that the combination with {@link barLineRight} of the previous bar matters.
   * If this bar has a Regular/Automatic style but the previous bar is customized, no additional line is drawn by this bar.
   * If both bars have a custom style, both bar styles are drawn.
   */
  barLineLeft = 0 /* Automatic */;
  /**
   * The bar line to draw on the right side of the bar.
   * @remarks
   * Note that the combination with {@link barLineLeft} of the next bar matters.
   * If this bar has a Regular/Automatic style but the next bar is customized, no additional line is drawn by this bar.
   * If both bars have a custom style, both bar styles are drawn.
   */
  barLineRight = 0 /* Automatic */;
  /**
   * Gets or sets the key signature used on all bars.
   */
  keySignature = 0 /* C */;
  /**
   * Gets or sets the type of key signature (major/minor)
   */
  keySignatureType = 0 /* Major */;
  /**
   * How bar numbers should be displayed.
   * If specified, overrides the value from the stylesheet on score level.
   */
  barNumberDisplay;
  /**
   * The shortest duration contained across beats in this bar.
   * @internal
   * @json_ignore
   */
  shortestDuration = -2 /* DoubleWhole */;
  /**
   * The bar line to draw on the left side of the bar with an "automatic" type resolved to the actual one.
   * @param isFirstOfSystem  Whether the bar is the first one in the system.
   */
  getActualBarLineLeft(isFirstOfSystem) {
    return _Bar._actualBarLine(this, false, isFirstOfSystem);
  }
  /**
   * The bar line to draw on the right side of the bar with an "automatic" type resolved to the actual one.
   */
  getActualBarLineRight() {
    return _Bar._actualBarLine(
      this,
      true,
      false
      /* not relevant */
    );
  }
  static _automaticToActualType(masterBar, isRight, firstOfSystem) {
    let actualLineType;
    if (isRight) {
      if (masterBar.isRepeatEnd) {
        actualLineType = 6 /* LightHeavy */;
      } else if (!masterBar.nextMasterBar) {
        actualLineType = 6 /* LightHeavy */;
      } else if (masterBar.isFreeTime) {
        actualLineType = 1 /* Dashed */;
      } else if (masterBar.isDoubleBar) {
        actualLineType = 7 /* LightLight */;
      } else {
        actualLineType = 9 /* Regular */;
      }
    } else {
      if (masterBar.isRepeatStart) {
        actualLineType = 5 /* HeavyLight */;
      } else if (firstOfSystem) {
        actualLineType = 9 /* Regular */;
      } else {
        actualLineType = 8 /* None */;
      }
    }
    return actualLineType;
  }
  static _actualBarLine(bar, isRight, firstOfSystem) {
    const masterBar = bar.masterBar;
    const requestedLineType = isRight ? bar.barLineRight : bar.barLineLeft;
    let actualLineType;
    if (requestedLineType === 0 /* Automatic */) {
      actualLineType = _Bar._automaticToActualType(masterBar, isRight, firstOfSystem);
    } else {
      actualLineType = requestedLineType;
    }
    return actualLineType;
  }
  /**
   * The style customizations for this item.
   */
  style;
  addVoice(voice) {
    voice.bar = this;
    voice.index = this.voices.length;
    this.voices.push(voice);
  }
  finish(settings, sharedDataBag = null) {
    this._filledVoices.clear();
    this._filledVoices.add(0);
    this._isEmpty = true;
    this._isRestOnly = true;
    this.shortestDuration = -2 /* DoubleWhole */;
    for (let i = 0, j = this.voices.length; i < j; i++) {
      const voice = this.voices[i];
      voice.finish(settings, sharedDataBag);
      if (!voice.isEmpty) {
        this._isEmpty = false;
        this._filledVoices.add(i);
        if (voice.shortestDuration > this.shortestDuration) {
          this.shortestDuration = voice.shortestDuration;
        }
      }
      if (!voice.isRestOnly) {
        this._isRestOnly = false;
      }
    }
    const sustainPedals = this.sustainPedals;
    if (sustainPedals.length > 0) {
      let previousMarker = null;
      this.sustainPedals = [];
      if (this.previousBar && this.previousBar.sustainPedals.length > 0) {
        previousMarker = this.previousBar.sustainPedals[this.previousBar.sustainPedals.length - 1];
        if (previousMarker.pedalType === 2 /* Up */) {
          previousMarker = null;
        }
      }
      const isDown = previousMarker !== null && previousMarker.pedalType !== 2 /* Up */;
      for (const marker2 of sustainPedals) {
        if (previousMarker && previousMarker.pedalType !== 2 /* Up */) {
          if (previousMarker.bar === this && marker2.ratioPosition <= previousMarker.ratioPosition) {
            continue;
          }
          previousMarker.nextPedalMarker = marker2;
          marker2.previousPedalMarker = previousMarker;
        }
        if (isDown && marker2.pedalType === 0 /* Down */) {
          marker2.pedalType = 1 /* Hold */;
        }
        marker2.bar = this;
        this.sustainPedals.push(marker2);
        previousMarker = marker2;
      }
    } else if (this.previousBar && this.previousBar.sustainPedals.length > 0) {
      const lastMarker = this.previousBar.sustainPedals[this.previousBar.sustainPedals.length - 1];
      if (lastMarker.pedalType !== 2 /* Up */) {
        const holdMarker = new SustainPedalMarker();
        holdMarker.ratioPosition = 0;
        holdMarker.bar = this;
        holdMarker.pedalType = 1 /* Hold */;
        this.sustainPedals.push(holdMarker);
        lastMarker.nextPedalMarker = holdMarker;
        holdMarker.previousPedalMarker = lastMarker;
      }
    }
  }
  calculateDuration() {
    let duration = 0;
    for (const voice of this.voices) {
      const voiceDuration = voice.calculateDuration();
      if (voiceDuration > duration) {
        duration = voiceDuration;
      }
    }
    return duration;
  }
};

// third_party/alphatab/src/midi/MidiUtils.ts
var MidiUtils = class _MidiUtils {
  static QuarterTime = 960;
  static _minVelocity = 15;
  static VelocityIncrement = 16;
  /**
   * Converts the given midi tick duration into milliseconds.
   * @param ticks The duration in midi ticks
   * @param tempo The current tempo in BPM.
   * @returns The converted duration in milliseconds.
   */
  static ticksToMillis(ticks, tempo) {
    return ticks * (6e4 / (tempo * _MidiUtils.QuarterTime)) | 0;
  }
  /**
   * Converts the given midi tick duration into milliseconds.
   * @param millis The duration in milliseconds
   * @param tempo The current tempo in BPM.
   * @returns The converted duration in midi ticks.
   */
  static millisToTicks(millis, tempo) {
    return millis / (6e4 / (tempo * _MidiUtils.QuarterTime)) | 0;
  }
  /**
   * Converts a duration value to its ticks equivalent.
   */
  static toTicks(duration) {
    return _MidiUtils.valueToTicks(duration);
  }
  /**
   * Converts a numerical value to its ticks equivalent.
   * @param duration the numerical proportion to convert. (i.E. timesignature denominator, note duration,...)
   */
  static valueToTicks(duration) {
    let denomninator = duration;
    if (denomninator < 0) {
      denomninator = 1 / -denomninator;
    }
    return _MidiUtils.QuarterTime * (4 / denomninator) | 0;
  }
  static applyDot(ticks, doubleDotted) {
    if (doubleDotted) {
      return ticks + (ticks / 4 | 0) * 3;
    }
    return ticks + (ticks / 2 | 0);
  }
  static applyTuplet(ticks, numerator, denominator) {
    return ticks * denominator / numerator | 0;
  }
  static removeTuplet(ticks, numerator, denominator) {
    return ticks * numerator / denominator | 0;
  }
  static dynamicToVelocity(dynamicValue, adjustment = 0) {
    let velocity = 1;
    switch (dynamicValue) {
      case 0 /* PPP */:
        velocity = _MidiUtils._minVelocity + 0 * _MidiUtils.VelocityIncrement;
        break;
      case 1 /* PP */:
        velocity = _MidiUtils._minVelocity + 1 * _MidiUtils.VelocityIncrement;
        break;
      case 2 /* P */:
        velocity = _MidiUtils._minVelocity + 2 * _MidiUtils.VelocityIncrement;
        break;
      case 3 /* MP */:
        velocity = _MidiUtils._minVelocity + 3 * _MidiUtils.VelocityIncrement;
        break;
      case 4 /* MF */:
        velocity = _MidiUtils._minVelocity + 4 * _MidiUtils.VelocityIncrement;
        break;
      case 5 /* F */:
        velocity = _MidiUtils._minVelocity + 5 * _MidiUtils.VelocityIncrement;
        break;
      case 6 /* FF */:
        velocity = _MidiUtils._minVelocity + 6 * _MidiUtils.VelocityIncrement;
        break;
      case 7 /* FFF */:
        velocity = _MidiUtils._minVelocity + 7 * _MidiUtils.VelocityIncrement;
        break;
      // special
      case 8 /* PPPP */:
        velocity = 10;
        break;
      case 9 /* PPPPP */:
        velocity = 5;
        break;
      case 10 /* PPPPPP */:
        velocity = 3;
        break;
      case 11 /* FFFF */:
        velocity = _MidiUtils._minVelocity + 8 * _MidiUtils.VelocityIncrement;
        break;
      case 12 /* FFFFF */:
        velocity = _MidiUtils._minVelocity + 9 * _MidiUtils.VelocityIncrement;
        break;
      case 13 /* FFFFFF */:
        velocity = _MidiUtils._minVelocity + 10 * _MidiUtils.VelocityIncrement;
        break;
      // "forced" variants -> a bit louder than normal, same as FF for us
      case 14 /* SF */:
      case 15 /* SFP */:
      case 25 /* SFZP */:
      case 16 /* SFPP */:
      case 20 /* SFZ */:
      case 22 /* FZ */:
        velocity = _MidiUtils._minVelocity + 6 * _MidiUtils.VelocityIncrement;
        break;
      // force -> piano, same as F for us
      case 17 /* FP */:
        velocity = _MidiUtils._minVelocity + 5 * _MidiUtils.VelocityIncrement;
        break;
      // "rinforced" varaints -> like "forced" but typically for a whole passage
      // not a single note, same as FF for us
      case 18 /* RF */:
      case 19 /* RFZ */:
      case 21 /* SFFZ */:
        velocity = _MidiUtils._minVelocity + 5 * _MidiUtils.VelocityIncrement;
        break;
      // almost not hearable but still a value
      case 23 /* N */:
        velocity = 1;
        break;
      // A bit weaker than standard F but stronger than MF
      case 24 /* PF */:
        velocity = _MidiUtils._minVelocity + (4.5 * _MidiUtils.VelocityIncrement | 0);
        break;
    }
    velocity += adjustment * _MidiUtils.VelocityIncrement;
    return Math.min(Math.max(velocity, 1), 127);
  }
};

// third_party/alphatab/src/model/BendPoint.ts
var BendPoint = class {
  static MaxPosition = 60;
  static MaxValue = 12;
  /**
   * Gets or sets offset of the point relative to the note duration (0-60)
   */
  offset;
  /**
   * Gets or sets the 1/4 note value offsets for the bend.
   */
  value;
  /**
   * Initializes a new instance of the {@link BendPoint} class.
   * @param offset The offset.
   * @param value The value.
   */
  constructor(offset = 0, value2 = 0) {
    this.offset = offset;
    this.value = value2;
  }
};

// third_party/alphatab/src/model/Slur.ts
var Slur = class {
  originNote;
  destinationNote;
  segments = [];
};

// third_party/alphatab/src/util/Lazy.ts
var Lazy = class {
  _factory;
  _value = void 0;
  get hasValue() {
    return this._value !== void 0;
  }
  constructor(factory) {
    this._factory = factory;
  }
  get value() {
    if (this._value === void 0) {
      this._value = this._factory();
    }
    return this._value;
  }
  reset() {
    this._value = void 0;
  }
};

// third_party/alphatab/src/Logger.ts
var ConsoleLogger = class _ConsoleLogger {
  static logLevel = 2 /* Info */;
  static _format(category, msg) {
    return `[AlphaTab][${category}] ${msg}`;
  }
  debug(category, msg, ...details) {
    console.debug(_ConsoleLogger._format(category, msg), ...details);
  }
  warning(category, msg, ...details) {
    console.warn(_ConsoleLogger._format(category, msg), ...details);
  }
  info(category, msg, ...details) {
    console.info(_ConsoleLogger._format(category, msg), ...details);
  }
  error(category, msg, ...details) {
    console.error(_ConsoleLogger._format(category, msg), ...details);
  }
};
var Logger = class _Logger {
  static logLevel = 2 /* Info */;
  static log = new ConsoleLogger();
  static _shouldLog(level) {
    return _Logger.logLevel !== 0 /* None */ && level >= _Logger.logLevel;
  }
  static debug(category, msg, ...details) {
    if (_Logger._shouldLog(1 /* Debug */)) {
      _Logger.log.debug(category, msg, ...details);
    }
  }
  static warning(category, msg, ...details) {
    if (_Logger._shouldLog(3 /* Warning */)) {
      _Logger.log.warning(category, msg, ...details);
    }
  }
  static info(category, msg, ...details) {
    if (_Logger._shouldLog(2 /* Info */)) {
      _Logger.log.info(category, msg, ...details);
    }
  }
  static error(category, msg, ...details) {
    if (_Logger._shouldLog(4 /* Error */)) {
      _Logger.log.error(category, msg, ...details);
    }
  }
};

// third_party/alphatab/src/model/MasterBar.ts
var BeamingRules = class _BeamingRules {
  _singleGroupKey;
  /**
   * The the group for a given "longest duration" within the bar.
   * @remarks
   * The map key is the duration to which the bar will be sliced into.
   * The map value defines the "groups" placed within the sliced.
   */
  groups = /* @__PURE__ */ new Map();
  /**
   * @internal
   * @json_ignore
   */
  uniqueId = "";
  /**
   * @internal
   * @json_ignore
   */
  timeSignatureNumerator = 0;
  /**
   * @internal
   * @json_ignore
   */
  timeSignatureDenominator = 0;
  /**
   * @internal
   */
  static createSimple(timeSignatureNumerator, timeSignatureDenominator, duration, groups) {
    const r = new _BeamingRules();
    r.timeSignatureNumerator = timeSignatureNumerator;
    r.timeSignatureDenominator = timeSignatureDenominator;
    r.groups.set(duration, groups);
    r.finish();
    return r;
  }
  /**
   * @internal
   */
  findRule(shortestDuration) {
    const singleGroupKey = this._singleGroupKey;
    if (singleGroupKey) {
      return [singleGroupKey, this.groups.get(singleGroupKey)];
    }
    if (shortestDuration < 4 /* Quarter */) {
      return [shortestDuration, []];
    }
    let durationValue = shortestDuration;
    do {
      const duration = durationValue;
      if (this.groups.has(duration)) {
        return [duration, this.groups.get(duration)];
      }
      durationValue = durationValue * 2;
    } while (durationValue <= 256 /* TwoHundredFiftySixth */);
    durationValue = shortestDuration / 2;
    do {
      const duration = durationValue;
      if (this.groups.has(duration)) {
        return [duration, this.groups.get(duration)];
      }
      durationValue = durationValue / 2;
    } while (durationValue > 2 /* Half */);
    return [shortestDuration, []];
  }
  /**
   * @internal
   */
  finish() {
    let uniqueId = `${this.timeSignatureNumerator}_${this.timeSignatureDenominator}`;
    for (const [k, v] of this.groups) {
      uniqueId += `__${k}`;
      let lastZero = v.length;
      for (let i = v.length - 1; i >= 0; i--) {
        if (v[i] === 0) {
          lastZero = i;
        } else {
          break;
        }
      }
      if (lastZero < v.length) {
        v.splice(lastZero, v.length - lastZero);
      }
      uniqueId += `_${v.join("_")}`;
      if (this.groups.size === 1) {
        this._singleGroupKey = k;
      }
    }
    this.uniqueId = uniqueId;
  }
};
var MasterBar = class {
  static MaxAlternateEndings = 8;
  /**
   * Gets or sets the bitflag for the alternate endings. Each bit defines for which repeat counts
   * the bar is played.
   */
  alternateEndings = 0;
  /**
   * Gets or sets the next masterbar in the song.
   * @json_ignore
   */
  nextMasterBar = null;
  /**
   * Gets or sets the next masterbar in the song.
   * @json_ignore
   */
  previousMasterBar = null;
  /**
   * Gets the zero based index of the masterbar.
   * @json_ignore
   */
  index = 0;
  /**
   * Whether the masterbar is has any changes applied to it (e.g. tempo changes, time signature changes etc)
   * The first bar is always considered changed due to initial setup of values. It does not consider
   * elements like whether the tempo really changes to the previous bar.
   */
  get hasChanges() {
    if (this.index === 0) {
      return false;
    }
    const hasChangesToPrevious = this.timeSignatureCommon !== this.previousMasterBar.timeSignatureCommon || this.timeSignatureNumerator !== this.previousMasterBar.timeSignatureNumerator || this.timeSignatureDenominator !== this.previousMasterBar.timeSignatureDenominator || this.tripletFeel !== this.previousMasterBar.tripletFeel;
    if (hasChangesToPrevious) {
      return true;
    }
    return this.alternateEndings !== 0 || this.isRepeatStart || this.isRepeatEnd || this.isFreeTime || this.isSectionStart || this.tempoAutomations.length > 0 || this.syncPoints && this.syncPoints.length > 0 || this.fermata !== null && this.fermata.size > 0 || this.directions !== null && this.directions.size > 0 || this.isAnacrusis;
  }
  /**
   * The key signature used on all bars.
   * @deprecated Use key signatures on bar level
   */
  get keySignature() {
    return this.score.tracks[0].staves[0].bars[this.index].keySignature;
  }
  /**
   * The key signature used on all bars.
   * @deprecated Use key signatures on bar level
   */
  set keySignature(value2) {
    this.score.tracks[0].staves[0].bars[this.index].keySignature = value2;
  }
  /**
   * The type of key signature (major/minor)
   * @deprecated Use key signatures on bar level
   */
  get keySignatureType() {
    return this.score.tracks[0].staves[0].bars[this.index].keySignatureType;
  }
  /**
   * The type of key signature (major/minor)
   * @deprecated Use key signatures on bar level
   */
  set keySignatureType(value2) {
    this.score.tracks[0].staves[0].bars[this.index].keySignatureType = value2;
  }
  /**
   * Gets or sets whether a double bar is shown for this masterbar.
   * @deprecated Use {@link Bar.barLineLeft} and {@link Bar.barLineRight}
   */
  isDoubleBar = false;
  /**
   * Gets or sets whether a repeat section starts on this masterbar.
   */
  isRepeatStart = false;
  get isRepeatEnd() {
    return this.repeatCount > 0;
  }
  /**
   * Gets or sets the number of repeats for the current repeat section.
   */
  repeatCount = 0;
  /**
   * Gets or sets the repeat group this bar belongs to.
   * @json_ignore
   */
  repeatGroup;
  /**
   * Gets or sets the time signature numerator.
   */
  timeSignatureNumerator = 4;
  /**
   * Gets or sets the time signature denominiator.
   */
  timeSignatureDenominator = 4;
  /**
   * Gets or sets whether this is bar has a common time signature.
   */
  timeSignatureCommon = false;
  /**
   * Defines the custom beaming rules which should be applied to this bar and all bars following.
   */
  beamingRules;
  /**
   * The actual (custom) beaming rules to use for this bar if any were specified.
   * @json_ignore
   * @internal
   */
  actualBeamingRules;
  /**
   * Gets or sets whether the bar indicates a free time playing.
   */
  isFreeTime = false;
  /**
   * Gets or sets the triplet feel that is valid for this bar.
   */
  tripletFeel = 0 /* NoTripletFeel */;
  /**
   * Gets or sets the new section information for this bar.
   */
  section = null;
  get isSectionStart() {
    return !!this.section;
  }
  /**
   * Gets or sets the first tempo automation for this bar.
   * @deprecated Use {@link tempoAutomations}.
   */
  get tempoAutomation() {
    return this.tempoAutomations.length > 0 ? this.tempoAutomations[0] : null;
  }
  /**
   * Gets or sets all tempo automation for this bar.
   */
  tempoAutomations = [];
  /**
   * The sync points for this master bar to synchronize the alphaTab time axis with the
   * external backing track audio.
   * @json_add addSyncPoint
   */
  syncPoints;
  /**
   * Gets or sets the reference to the score this song belongs to.
   * @json_ignore
   */
  score;
  /**
   * Gets or sets the fermatas for this bar. The key is the offset of the fermata in midi ticks.
   * @json_add addFermata
   */
  fermata = null;
  /**
   * The timeline position of the voice within the whole score. (unit: midi ticks)
   */
  start = 0;
  /**
   * Gets or sets a value indicating whether the master bar is an anacrusis (aka. pickup bar)
   */
  isAnacrusis = false;
  /**
   * Gets a percentual scale for the size of the bars when displayed in a multi-track layout.
   */
  displayScale = 1;
  /**
   * An absolute width of the bar to use when displaying in a multi-track layout.
   */
  displayWidth = -1;
  /**
   * The directions applied to this masterbar.
   * @json_add addDirection
   */
  directions = null;
  /**
   * Calculates the time spent in this bar. (unit: midi ticks)
   */
  calculateDuration(respectAnacrusis = true) {
    if (this.isAnacrusis && respectAnacrusis) {
      let duration = 0;
      for (const track of this.score.tracks) {
        for (const staff of track.staves) {
          const barDuration = this.index < staff.bars.length ? staff.bars[this.index].calculateDuration() : 0;
          if (barDuration > duration) {
            duration = barDuration;
          }
        }
      }
      return duration;
    }
    return this.timeSignatureNumerator * MidiUtils.valueToTicks(this.timeSignatureDenominator);
  }
  /**
   * Adds a fermata to the masterbar.
   * @param offset The offset of the fermata within the bar in midi ticks.
   * @param fermata The fermata.
   */
  addFermata(offset, fermata) {
    let fermataMap = this.fermata;
    if (fermataMap === null) {
      fermataMap = /* @__PURE__ */ new Map();
      this.fermata = fermataMap;
    }
    fermataMap.set(offset, fermata);
  }
  /**
   * Adds a direction to the masterbar.
   * @param direction The direction to add.
   */
  addDirection(direction) {
    if (this.directions == null) {
      this.directions = /* @__PURE__ */ new Set();
    }
    this.directions.add(direction);
  }
  /**
   * Gets the fermata for a given beat.
   * @param beat The beat to get the fermata for.
   * @returns
   */
  getFermata(beat) {
    const fermataMap = this.fermata;
    if (fermataMap === null) {
      return null;
    }
    if (fermataMap.has(beat.playbackStart)) {
      return fermataMap.get(beat.playbackStart);
    }
    if (beat.index === 0 && fermataMap.has(0)) {
      return fermataMap.get(0);
    }
    return null;
  }
  /**
   * Adds the given sync point to the list of sync points for this bar.
   * @param syncPoint  The sync point to add.
   */
  addSyncPoint(syncPoint) {
    if (!this.syncPoints) {
      this.syncPoints = [];
    }
    this.syncPoints.push(syncPoint);
  }
  finish(sharedDataBag) {
    let beamingRules = this.beamingRules;
    if (beamingRules) {
      beamingRules.timeSignatureNumerator = this.timeSignatureNumerator;
      beamingRules.timeSignatureDenominator = this.timeSignatureDenominator;
      beamingRules.finish();
    }
    if (this.index > 0) {
      this.start = this.previousMasterBar.start + this.previousMasterBar.calculateDuration();
      const previousRules = sharedDataBag.has("beamingRules") ? sharedDataBag.get("beamingRules") : void 0;
      if (previousRules && previousRules.uniqueId === beamingRules?.uniqueId) {
        this.beamingRules = void 0;
        beamingRules = previousRules;
      } else if (!beamingRules) {
        beamingRules = previousRules;
      }
    }
    this.actualBeamingRules = beamingRules;
    if (this.beamingRules) {
      sharedDataBag.set("beamingRules", beamingRules);
    }
  }
};

// third_party/alphatab/src/model/RenderStylesheet.ts
var RenderStylesheet = class {
  /**
   * Whether dynamics are hidden.
   */
  hideDynamics = false;
  /**
   * The mode in which brackets and braces are drawn.
   */
  bracketExtendMode = 1 /* GroupStaves */;
  /**
   * Whether to draw the // sign to separate systems.
   */
  useSystemSignSeparator = false;
  /**
   * Whether to show the tuning.
   */
  globalDisplayTuning = true;
  /**
   * Whether to show the tuning.(per-track)
   */
  perTrackDisplayTuning = null;
  /**
   * Whether to show the chord diagrams on top.
   */
  globalDisplayChordDiagramsOnTop = true;
  /**
   * Whether to show the chord diagrams on top. (per-track)
   */
  perTrackChordDiagramsOnTop = null;
  /**
   * Whether to show the chord diagrams in score.
   */
  globalDisplayChordDiagramsInScore = false;
  /**
   * The policy where to show track names when a single track is rendered.
   */
  singleTrackTrackNamePolicy = 1 /* FirstSystem */;
  /**
   * The policy where to show track names when a multiple tracks are rendered.
   */
  multiTrackTrackNamePolicy = 1 /* FirstSystem */;
  /**
   * The mode what text to display for the track name on the first system
   */
  firstSystemTrackNameMode = 1 /* ShortName */;
  /**
   * The mode what text to display for the track name on the first system
   */
  otherSystemsTrackNameMode = 1 /* ShortName */;
  /**
   * The orientation of the the track names on the first system
   */
  firstSystemTrackNameOrientation = 1 /* Vertical */;
  /**
   * The orientation of the the track names on other systems
   */
  otherSystemsTrackNameOrientation = 1 /* Vertical */;
  /**
   * If multi track: Whether to render multiple subsequent empty (or rest-only) bars together as multi-bar rest.
   */
  multiTrackMultiBarRest = false;
  /**
   * If single track: Whether to render multiple subsequent empty (or rest-only) bars together as multi-bar rest.
   */
  perTrackMultiBarRest = null;
  /**
   * Whether barlines should be drawn across staves within the same system.
   */
  extendBarLines = false;
  /**
   * Whether to hide empty staves.
   */
  hideEmptyStaves = false;
  /**
   * Whether to also hide empty staves in the first system.
   * @remarks
   * Only has an effect when activating {@link hideEmptyStaves}.
   */
  hideEmptyStavesInFirstSystem = false;
  /**
   * Whether to show brackets and braces across single staves.
   * @remarks
   * This allows a more consistent view for identifying staves when using
   * {@link hideEmptyStaves}
   */
  showSingleStaffBrackets = false;
  /**
   * How bar numbers should be displayed.
   */
  barNumberDisplay = 0 /* AllBars */;
};

// third_party/alphatab/src/model/RepeatGroup.ts
var RepeatGroup = class {
  /**
   * All masterbars repeated within this group
   */
  masterBars = [];
  /**
   * the masterbars which opens the group.
   */
  opening = null;
  /**
   * a list of masterbars which open the group.
   * @deprecated There can only be one opening, use the opening property instead
   */
  get openings() {
    const opening = this.opening;
    return opening ? [opening] : [];
  }
  /**
   * a list of masterbars which close the group.
   */
  closings = [];
  /**
   * Gets whether this repeat group is really opened as a repeat.
   */
  get isOpened() {
    return this.opening?.isRepeatStart === true;
  }
  /**
   * true if the repeat group was closed well
   */
  isClosed = false;
  addMasterBar(masterBar) {
    if (this.opening === null) {
      this.opening = masterBar;
    }
    this.masterBars.push(masterBar);
    masterBar.repeatGroup = this;
    if (masterBar.isRepeatEnd) {
      this.closings.push(masterBar);
      this.isClosed = true;
    }
  }
};

// third_party/alphatab/src/model/GraceGroup.ts
var GraceGroup = class {
  /**
   * All beats within this group.
   */
  beats = [];
  /**
   * Gets a unique ID for this grace group.
   */
  id = "empty";
  /**
   * true if the grace beat are followed by a normal beat within the same
   * bar.
   */
  isComplete = false;
  /**
   * Adds a new beat to this group
   * @param beat The beat to add
   */
  addBeat(beat) {
    beat.graceIndex = this.beats.length;
    beat.graceGroup = this;
    this.beats.push(beat);
  }
  finish() {
    if (this.beats.length > 0) {
      this.id = `${this.beats[0].absoluteDisplayStart}_${this.beats[0].voice.index}`;
    }
  }
};

// third_party/alphatab/src/model/Voice.ts
var Voice = class _Voice {
  _beatLookup;
  _isEmpty = true;
  _isRestOnly = true;
  static _globalVoiceId = 0;
  /**
   * @internal
   */
  static resetIds() {
    _Voice._globalVoiceId = 0;
  }
  /**
   * Gets or sets the unique id of this bar.
   */
  id = _Voice._globalVoiceId++;
  /**
   * Gets or sets the zero-based index of this voice within the bar.
   * @json_ignore
   */
  index = 0;
  /**
   * Gets or sets the reference to the bar this voice belongs to.
   * @json_ignore
   */
  bar;
  /**
   * Gets or sets the list of beats contained in this voice.
   * @json_add addBeat
   */
  beats = [];
  /**
   * Gets or sets a value indicating whether this voice is empty.
   */
  get isEmpty() {
    return this._isEmpty;
  }
  /**
   * The style customizations for this item.
   */
  style;
  /**
   * @internal
   */
  forceNonEmpty() {
    this._isEmpty = false;
  }
  /**
   * Gets or sets a value indicating whether this voice is empty.
   */
  get isRestOnly() {
    return this._isRestOnly;
  }
  /**
   * The shortest duration contained across beats in this bar.
   * @internal
   * @json_ignore
   */
  shortestDuration = -2 /* DoubleWhole */;
  insertBeat(after, newBeat) {
    newBeat.nextBeat = after.nextBeat;
    if (newBeat.nextBeat) {
      newBeat.nextBeat.previousBeat = newBeat;
    }
    newBeat.previousBeat = after;
    newBeat.voice = this;
    after.nextBeat = newBeat;
    this.beats.splice(after.index + 1, 0, newBeat);
  }
  addBeat(beat) {
    beat.voice = this;
    beat.index = this.beats.length;
    this.beats.push(beat);
    if (!beat.isEmpty) {
      this._isEmpty = false;
    }
    if (!beat.isRest) {
      this._isRestOnly = false;
    }
  }
  _chain(beat, sharedDataBag = null) {
    if (!this.bar) {
      return;
    }
    if (beat.index < this.beats.length - 1) {
      beat.nextBeat = this.beats[beat.index + 1];
      beat.nextBeat.previousBeat = beat;
    } else if (beat.isLastOfVoice && beat.voice.bar.nextBar) {
      const nextVoice = this.bar.nextBar.voices[this.index];
      if (nextVoice.beats.length > 0) {
        beat.nextBeat = nextVoice.beats[0];
        beat.nextBeat.previousBeat = beat;
      } else {
        beat.nextBeat.previousBeat = beat;
      }
    }
    beat.chain(sharedDataBag);
  }
  addGraceBeat(beat) {
    if (this.beats.length === 0) {
      this.addBeat(beat);
      return;
    }
    const lastBeat = this.beats[this.beats.length - 1];
    this.beats.splice(this.beats.length - 1, 1);
    this.addBeat(beat);
    this.addBeat(lastBeat);
    this._isEmpty = false;
    this._isRestOnly = false;
  }
  getBeatAtPlaybackStart(playbackStart) {
    if (this._beatLookup.has(playbackStart)) {
      return this._beatLookup.get(playbackStart);
    }
    return null;
  }
  finish(settings, sharedDataBag = null) {
    this._isEmpty = true;
    this._isRestOnly = true;
    this._beatLookup = /* @__PURE__ */ new Map();
    let currentGraceGroup = null;
    for (let index = 0; index < this.beats.length; index++) {
      const beat = this.beats[index];
      beat.index = index;
      this._chain(beat, sharedDataBag);
      if (beat.graceType === 0 /* None */) {
        beat.graceGroup = currentGraceGroup;
        if (currentGraceGroup) {
          currentGraceGroup.isComplete = true;
        }
        currentGraceGroup = null;
      } else {
        if (!currentGraceGroup) {
          currentGraceGroup = new GraceGroup();
        }
        currentGraceGroup.addBeat(beat);
      }
      if (!beat.isEmpty) {
        this._isEmpty = false;
      }
      if (!beat.isRest) {
        this._isRestOnly = false;
      }
    }
    let currentDisplayTick = 0;
    let currentPlaybackTick = 0;
    this.shortestDuration = -2 /* DoubleWhole */;
    for (let i = 0; i < this.beats.length; i++) {
      const beat = this.beats[i];
      beat.index = i;
      beat.finish(settings, sharedDataBag);
      if (beat.graceType === 0 /* None */) {
        if (beat.duration > this.shortestDuration) {
          this.shortestDuration = beat.duration;
        }
        if (beat.graceGroup) {
          const firstGraceBeat = beat.graceGroup.beats[0];
          const lastGraceBeat = beat.graceGroup.beats[beat.graceGroup.beats.length - 1];
          if (firstGraceBeat.graceType !== 3 /* BendGrace */) {
            const stolenDuration = lastGraceBeat.playbackStart + lastGraceBeat.playbackDuration - firstGraceBeat.playbackStart;
            switch (firstGraceBeat.graceType) {
              case 2 /* BeforeBeat */:
                if (firstGraceBeat.previousBeat) {
                  firstGraceBeat.previousBeat.playbackDuration -= stolenDuration;
                  if (firstGraceBeat.previousBeat.voice === this) {
                    currentPlaybackTick = firstGraceBeat.previousBeat.playbackStart + firstGraceBeat.previousBeat.playbackDuration;
                  } else {
                    currentPlaybackTick = -stolenDuration;
                  }
                } else {
                  currentPlaybackTick = -stolenDuration;
                }
                for (const graceBeat of beat.graceGroup.beats) {
                  this._beatLookup.delete(graceBeat.playbackStart);
                  graceBeat.playbackStart = currentPlaybackTick;
                  this._beatLookup.set(graceBeat.playbackStart, beat);
                  currentPlaybackTick += graceBeat.playbackDuration;
                }
                break;
              case 1 /* OnBeat */:
                beat.playbackDuration -= stolenDuration;
                if (lastGraceBeat.voice === this) {
                  currentPlaybackTick = lastGraceBeat.playbackStart + lastGraceBeat.playbackDuration;
                } else {
                  currentPlaybackTick = -stolenDuration;
                }
                break;
            }
          }
        }
        beat.displayStart = currentDisplayTick;
        beat.playbackStart = currentPlaybackTick;
        this._beatLookup.set(beat.playbackStart, beat);
      } else {
        beat.displayStart = currentDisplayTick;
        beat.playbackStart = currentPlaybackTick;
      }
      if (beat.fermata) {
        this.bar.masterBar.addFermata(beat.playbackStart, beat.fermata);
      } else {
        beat.fermata = this.bar.masterBar.getFermata(beat);
      }
      beat.finishTuplet();
      if (beat.graceGroup) {
        beat.graceGroup.finish();
      }
      currentDisplayTick += beat.displayDuration;
      currentPlaybackTick += beat.playbackDuration;
    }
  }
  calculateDuration() {
    if (this.isEmpty || this.beats.length === 0) {
      return 0;
    }
    const lastBeat = this.beats[this.beats.length - 1];
    const firstBeat = this.beats[0];
    return lastBeat.playbackStart + lastBeat.playbackDuration - firstBeat.playbackStart;
  }
};

// third_party/alphatab/src/model/Score.ts
var HeaderFooterStyle = class _HeaderFooterStyle {
  /**
   * The template how the text should be formatted. Following placeholders exist and are filled from the song information:
   * * `%TITLE%`
   * * `%SUBTITLE%`
   * * `%ARTIST%`
   * * `%ALBUM%`
   * * `%WORDS%`
   * * `%WORDSMUSIC%`
   * * `%MUSIC%`
   * * `%TABBER%`
   * * `%COPYRIGHT%`
   */
  template;
  /**
   * Whether the element should be visible. Overriden by {@link NotationSettings.elements} if specified.
   */
  isVisible;
  /**
   * The alignment of the element on the page.
   */
  textAlign;
  constructor(template = "", isVisible = void 0, textAlign = 0 /* Left */) {
    this.template = template;
    this.isVisible = isVisible;
    this.textAlign = textAlign;
  }
  static equals(a, b) {
    const aIsVisible = a.isVisible !== void 0 ? a.isVisible : true;
    const bIsVisible = b.isVisible !== void 0 ? b.isVisible : true;
    if (aIsVisible !== bIsVisible) {
      return false;
    }
    if (a.template !== b.template) {
      return false;
    }
    if (a.textAlign !== b.textAlign) {
      return false;
    }
    return true;
  }
  buildText(score) {
    let anyPlaceholderFilled = false;
    let anyPlaceholder = false;
    const replaced = this.template.replace(
      _HeaderFooterStyle._placeholderPattern,
      (_match, variable) => {
        anyPlaceholder = true;
        let value2 = "";
        switch (variable) {
          case "TITLE":
            value2 = score.title;
            break;
          case "SUBTITLE":
            value2 = score.subTitle;
            break;
          case "ARTIST":
            value2 = score.artist;
            break;
          case "ALBUM":
            value2 = score.album;
            break;
          case "WORDS":
          case "WORDSMUSIC":
            value2 = score.words;
            break;
          case "MUSIC":
            value2 = score.music;
            break;
          case "TABBER":
            value2 = score.tab;
            break;
          case "COPYRIGHT":
            value2 = score.copyright;
            break;
          default:
            value2 = "";
            break;
        }
        if (value2) {
          anyPlaceholderFilled = true;
        }
        return value2;
      }
    );
    if (anyPlaceholder && !anyPlaceholderFilled) {
      return "";
    }
    return replaced;
  }
  static _placeholderPattern = /%([^%]+)%/g;
};
var ScoreStyle = class extends ElementStyle {
  /**
   * Changes additional style aspects fo the of the specified sub-element.
   */
  headerAndFooter = /* @__PURE__ */ new Map();
  /**
   * The default styles applied to headers and footers if not specified
   */
  static defaultHeaderAndFooter = /* @__PURE__ */ new Map([
    [0 /* Title */, new HeaderFooterStyle("%TITLE%", void 0, 1 /* Center */)],
    [1 /* SubTitle */, new HeaderFooterStyle("%SUBTITLE%", void 0, 1 /* Center */)],
    [2 /* Artist */, new HeaderFooterStyle("%ARTIST%", void 0, 1 /* Center */)],
    [3 /* Album */, new HeaderFooterStyle("%ALBUM%", void 0, 1 /* Center */)],
    [4 /* Words */, new HeaderFooterStyle("Words by %WORDS%", void 0, 0 /* Left */)],
    [5 /* Music */, new HeaderFooterStyle("Music by %MUSIC%", void 0, 2 /* Right */)],
    [6 /* WordsAndMusic */, new HeaderFooterStyle("Words & Music by %MUSIC%", void 0, 2 /* Right */)],
    [7 /* Transcriber */, new HeaderFooterStyle("Tabbed by %TABBER%", false, 2 /* Right */)],
    [8 /* Copyright */, new HeaderFooterStyle("%COPYRIGHT%", void 0, 1 /* Center */)],
    [
      9 /* CopyrightSecondLine */,
      new HeaderFooterStyle("All Rights Reserved - International Copyright Secured", true, 1 /* Center */)
    ]
  ]);
};
var Score = class {
  _currentRepeatGroup = null;
  _openedRepeatGroups = [];
  _properlyOpenedRepeatGroups = 0;
  /**
   * Resets all internal ID generators.
   */
  static resetIds() {
    Bar.resetIds();
    Beat.resetIds();
    Voice.resetIds();
    Note.resetIds();
  }
  /**
   * The album of this song.
   */
  album = "";
  /**
   * The artist who performs this song.
   */
  artist = "";
  /**
   * The owner of the copyright of this song.
   */
  copyright = "";
  /**
   * Additional instructions
   */
  instructions = "";
  /**
   * The author of the music.
   */
  music = "";
  /**
   * Some additional notes about the song.
   */
  notices = "";
  /**
   * The subtitle of the song.
   */
  subTitle = "";
  /**
   * The title of the song.
   */
  title = "";
  /**
   * The author of the song lyrics
   */
  words = "";
  /**
   * The author of this tablature.
   */
  tab = "";
  /**
   * The initial tempo of the song in BPM. The tempo might change via {@link MasterBar.tempoAutomations}.
   */
  get tempo() {
    return this.masterBars.length && this.masterBars[0].tempoAutomations.length > 0 ? this.masterBars[0].tempoAutomations[0].value : 120;
  }
  /**
   * The name/label of the initial tempo.
   */
  get tempoLabel() {
    return this.masterBars.length && this.masterBars[0].tempoAutomations.length > 0 ? this.masterBars[0].tempoAutomations[0].text : "";
  }
  /**
   * Gets or sets a list of all masterbars contained in this song.
   * @json_add addMasterBar
   */
  masterBars = [];
  /**
   * Gets or sets a list of all tracks contained in this song.
   * @json_add addTrack
   */
  tracks = [];
  /**
   * Defines how many bars are placed into the systems (rows) when displaying
   * multiple tracks unless a value is set in the systemsLayout.
   */
  defaultSystemsLayout = 3;
  /**
   * Defines how many bars are placed into the systems (rows) when displaying
   * multiple tracks.
   */
  systemsLayout = [];
  /**
   * Gets or sets the rendering stylesheet for this song.
   */
  stylesheet = new RenderStylesheet();
  /**
   * Information about the backing track that can be used instead of the synthesized audio.
   */
  backingTrack;
  /**
   * The style customizations for this item.
   */
  style;
  rebuildRepeatGroups() {
    this._currentRepeatGroup = null;
    this._openedRepeatGroups = [];
    this._properlyOpenedRepeatGroups = 0;
    for (const bar of this.masterBars) {
      this._addMasterBarToRepeatGroups(bar);
    }
  }
  addMasterBar(bar) {
    bar.score = this;
    bar.index = this.masterBars.length;
    if (this.masterBars.length !== 0) {
      bar.previousMasterBar = this.masterBars[this.masterBars.length - 1];
      bar.previousMasterBar.nextMasterBar = bar;
      bar.start = bar.previousMasterBar.start + (bar.previousMasterBar.isAnacrusis ? 0 : bar.previousMasterBar.calculateDuration());
    }
    this._addMasterBarToRepeatGroups(bar);
    this.masterBars.push(bar);
  }
  /**
   * Adds the given bar correctly into the current repeat group setup.
   * @param bar
   */
  _addMasterBarToRepeatGroups(bar) {
    if (bar.isRepeatStart) {
      if (this._currentRepeatGroup?.isClosed) {
        this._openedRepeatGroups.pop();
        this._properlyOpenedRepeatGroups--;
      }
      this._currentRepeatGroup = new RepeatGroup();
      this._openedRepeatGroups.push(this._currentRepeatGroup);
      this._properlyOpenedRepeatGroups++;
    } else if (!this._currentRepeatGroup) {
      this._currentRepeatGroup = new RepeatGroup();
      this._openedRepeatGroups.push(this._currentRepeatGroup);
    }
    this._currentRepeatGroup.addMasterBar(bar);
    if (bar.isRepeatEnd) {
      if (this._properlyOpenedRepeatGroups > 1) {
        this._openedRepeatGroups.pop();
        this._properlyOpenedRepeatGroups--;
        this._currentRepeatGroup = this._openedRepeatGroups.length > 0 ? this._openedRepeatGroups[this._openedRepeatGroups.length - 1] : null;
      }
    }
  }
  addTrack(track) {
    track.score = this;
    track.index = this.tracks.length;
    this.tracks.push(track);
  }
  finish(settings) {
    const sharedDataBag = /* @__PURE__ */ new Map();
    for (let i = 0, j = this.tracks.length; i < j; i++) {
      this.tracks[i].finish(settings, sharedDataBag);
    }
    for (const mb of this.masterBars) {
      mb.finish(sharedDataBag);
    }
  }
  /**
   * Applies the given list of {@link FlatSyncPoint} to this song.
   * @param syncPoints The list of sync points to apply.
   * @since 1.6.0
   */
  applyFlatSyncPoints(syncPoints) {
    for (const b of this.masterBars) {
      b.syncPoints = void 0;
    }
    for (const syncPoint of syncPoints) {
      const automation = new Automation();
      automation.ratioPosition = Math.min(1, Math.max(0, syncPoint.barPosition));
      automation.type = 4 /* SyncPoint */;
      automation.syncPointValue = new SyncPointData();
      automation.syncPointValue.millisecondOffset = syncPoint.millisecondOffset;
      automation.syncPointValue.barOccurence = syncPoint.barOccurence;
      if (syncPoint.barIndex < this.masterBars.length) {
        this.masterBars[syncPoint.barIndex].addSyncPoint(automation);
      }
    }
    for (const b of this.masterBars) {
      if (b.syncPoints) {
        b.syncPoints.sort((a, b2) => {
          const occurence = a.syncPointValue.barOccurence - b2.syncPointValue.barOccurence;
          if (occurence !== 0) {
            return occurence;
          }
          return a.ratioPosition - b2.ratioPosition;
        });
      }
    }
  }
  /**
   * Exports all sync points in this song to a {@link FlatSyncPoint} list.
   * @since 1.6.0
   */
  exportFlatSyncPoints() {
    const syncPoints = [];
    for (const masterBar of this.masterBars) {
      const masterBarSyncPoints = masterBar.syncPoints;
      if (masterBarSyncPoints) {
        for (const syncPoint of masterBarSyncPoints) {
          syncPoints.push({
            barIndex: masterBar.index,
            barOccurence: syncPoint.syncPointValue.barOccurence,
            barPosition: syncPoint.ratioPosition,
            millisecondOffset: syncPoint.syncPointValue.millisecondOffset
          });
        }
      }
    }
    return syncPoints;
  }
};

// third_party/alphatab/src/synth/SynthConstants.ts
var SynthConstants = class _SynthConstants {
  static DefaultChannelCount = 16 + 1;
  static MetronomeKey = 33;
  static AudioChannels = 2;
  static MinVolume = 0;
  static MinProgram = 0;
  static MaxProgram = 127;
  static MinPlaybackSpeed = 0.125;
  static MaxPlaybackSpeed = 8;
  static PercussionChannel = 9;
  static PercussionBank = 128;
  /**
   * The Midi Pitch bend message is a 15-bit value
   */
  static MaxPitchWheel = 16384;
  /**
   * The Midi 2.0 Pitch bend message is a 32-bit value
   */
  static MaxPitchWheel20 = 4294967296;
  /**
   * The pitch wheel value for no pitch change at all.
   */
  static DefaultPitchWheel = _SynthConstants.MaxPitchWheel / 2;
  static MicroBufferCount = 32;
  static MicroBufferSize = 64;
  /**
   * approximately -60 dB, which is inaudible to humans
   */
  static AudibleLevelThreshold = 1e-3;
};

// third_party/alphatab/src/model/ModelUtils.ts
var TuningParseResult = class {
  note = null;
  tone = new TuningParseResultTone();
  octave = 0;
  get realValue() {
    return this.octave * 12 + this.tone.noteValue;
  }
};
var TuningParseResultTone = class {
  noteValue;
  accidentalMode;
  constructor(noteValue = 0, accidentalMode = 0 /* Default */) {
    this.noteValue = noteValue;
    this.accidentalMode = accidentalMode;
  }
};
var ModelUtils = class _ModelUtils {
  static _durationIndices = _ModelUtils._buildDurationIndices();
  static _buildDurationIndices() {
    return new Map(
      Object.values(Duration).filter((k) => typeof k === "number").map((d) => [d, d < 0 ? 0 : Math.log2(d) | 0])
    );
  }
  static getIndex(duration) {
    return _ModelUtils._durationIndices.get(duration);
  }
  static keySignatureIsFlat(ks) {
    return ks < 0;
  }
  static keySignatureIsNatural(ks) {
    return ks === 0;
  }
  static keySignatureIsSharp(ks) {
    return ks > 0;
  }
  static applyPitchOffsets(settings, score) {
    for (let i = 0; i < score.tracks.length; i++) {
      if (i < settings.notation.displayTranspositionPitches.length) {
        for (const staff of score.tracks[i].staves) {
          staff.displayTranspositionPitch = -settings.notation.displayTranspositionPitches[i];
        }
      }
      if (i < settings.notation.transpositionPitches.length) {
        for (const staff of score.tracks[i].staves) {
          staff.transpositionPitch = -settings.notation.transpositionPitches[i];
        }
      }
    }
  }
  /**
   * Checks if the given string is a tuning inticator.
   * @param name
   */
  static isTuning(name) {
    return !!_ModelUtils.parseTuning(name);
  }
  /**
   * @internal
   */
  static tuningLetters = /* @__PURE__ */ new Set([
    67,
    68,
    69,
    70,
    71,
    65,
    66,
    99,
    100,
    101,
    102,
    103,
    97,
    98,
    35
    /* # */
  ]);
  static parseTuning(name) {
    let note = "";
    let octave = "";
    for (let i = 0; i < name.length; i++) {
      const c = name.charCodeAt(i);
      if (c >= 48 && c <= 57) {
        if (!note) {
          return null;
        }
        octave += String.fromCharCode(c);
      } else if (note.length === 0) {
        if (_ModelUtils.tuningLetters.has(c)) {
          note += String.fromCharCode(c);
        } else {
          return null;
        }
      } else {
        note += String.fromCharCode(c);
      }
    }
    if (!octave || !note) {
      return null;
    }
    const result = new TuningParseResult();
    result.octave = Number.parseInt(octave, 10) + 1;
    result.note = note.toLowerCase();
    const tone = _ModelUtils.getToneForText(result.note);
    if (tone === null) {
      return null;
    }
    result.tone = tone;
    if (result.tone.noteValue < 0) {
      result.octave--;
      result.tone.noteValue += 12;
    }
    return result;
  }
  static getTuningForText(str) {
    const result = _ModelUtils.parseTuning(str);
    if (!result) {
      return -1;
    }
    return result.realValue;
  }
  static getToneForText(note) {
    const noteName = note.substring(0, 1);
    const accidental = note.substring(1);
    let noteValue;
    let noteAccidenalMode;
    switch (noteName.toLowerCase()) {
      case "c":
        noteValue = 0;
        break;
      case "d":
        noteValue = 2;
        break;
      case "e":
        noteValue = 4;
        break;
      case "f":
        noteValue = 5;
        break;
      case "g":
        noteValue = 7;
        break;
      case "a":
        noteValue = 9;
        break;
      case "b":
        noteValue = 11;
        break;
      default:
        return null;
    }
    if (!_ModelUtils.accidentalModeMapping.has(accidental)) {
      return null;
    }
    noteAccidenalMode = _ModelUtils.parseAccidentalMode(accidental);
    switch (noteAccidenalMode) {
      case 0 /* Default */:
        break;
      case 1 /* ForceNone */:
        break;
      case 2 /* ForceNatural */:
        break;
      case 3 /* ForceSharp */:
        noteValue++;
        break;
      case 4 /* ForceDoubleSharp */:
        noteValue += 2;
        break;
      case 5 /* ForceFlat */:
        noteValue--;
        break;
      case 6 /* ForceDoubleFlat */:
        noteValue -= 2;
        break;
    }
    return new TuningParseResultTone(noteValue, noteAccidenalMode);
  }
  /**
   * @internal
   */
  static reverseAccidentalModeMapping = /* @__PURE__ */ new Map([
    [0 /* Default */, "d"],
    [1 /* ForceNone */, "forcenone"],
    [2 /* ForceNatural */, "forcenatural"],
    [3 /* ForceSharp */, "#"],
    [4 /* ForceDoubleSharp */, "x"],
    [5 /* ForceFlat */, "b"],
    [6 /* ForceDoubleFlat */, "bb"]
  ]);
  /**
   * @internal
   */
  static accidentalModeMapping = /* @__PURE__ */ new Map([
    ["default", 0 /* Default */],
    ["d", 0 /* Default */],
    ["", 0 /* Default */],
    ["forcenone", 1 /* ForceNone */],
    ["-", 1 /* ForceNone */],
    ["forcenatural", 2 /* ForceNatural */],
    ["n", 2 /* ForceNatural */],
    ["forcesharp", 3 /* ForceSharp */],
    ["#", 3 /* ForceSharp */],
    ["forcedoublesharp", 4 /* ForceDoubleSharp */],
    ["##", 4 /* ForceDoubleSharp */],
    ["x", 4 /* ForceDoubleSharp */],
    ["forceflat", 5 /* ForceFlat */],
    ["b", 5 /* ForceFlat */],
    ["forcedoubleflat", 6 /* ForceDoubleFlat */],
    ["bb", 6 /* ForceDoubleFlat */]
  ]);
  static parseAccidentalMode(data) {
    const key = data.toLowerCase();
    if (_ModelUtils.accidentalModeMapping.has(key)) {
      return _ModelUtils.accidentalModeMapping.get(key);
    }
    return 0 /* Default */;
  }
  static newGuid() {
    return `${Math.floor((1 + Math.random()) * 65536).toString(16).substring(1) + Math.floor((1 + Math.random()) * 65536).toString(16).substring(1)}-${Math.floor((1 + Math.random()) * 65536).toString(16).substring(1)}-${Math.floor((1 + Math.random()) * 65536).toString(16).substring(1)}-${Math.floor((1 + Math.random()) * 65536).toString(16).substring(1)}-${Math.floor((1 + Math.random()) * 65536).toString(16).substring(1)}${Math.floor((1 + Math.random()) * 65536).toString(16).substring(1)}${Math.floor((1 + Math.random()) * 65536).toString(16).substring(1)}`;
  }
  static isAlmostEqualTo(a, b) {
    return Math.abs(a - b) < 1e-5;
  }
  static toHexString(n, digits = 0) {
    let s = "";
    const hexChars = "0123456789ABCDEF";
    do {
      s = String.fromCharCode(hexChars.charCodeAt(n & 15)) + s;
      n = n >> 4;
    } while (n > 0);
    while (s.length < digits) {
      s = `0${s}`;
    }
    return s;
  }
  /**
   * Gets the list of alternate endings on which the master bar is played.
   * @param bitflag The alternate endings bitflag.
   */
  static getAlternateEndingsList(bitflag) {
    const endings = [];
    for (let i = 0; i < MasterBar.MaxAlternateEndings; i++) {
      if ((bitflag & 1 << i) !== 0) {
        endings.push(i);
      }
    }
    return endings;
  }
  static deltaFretToHarmonicValue(deltaFret) {
    switch (deltaFret) {
      case 2:
        return 2.4;
      case 3:
        return 3.2;
      case 4:
      case 5:
      case 7:
      case 9:
      case 12:
      case 16:
      case 17:
      case 19:
      case 24:
        return deltaFret;
      case 8:
        return 8.2;
      case 10:
        return 9.6;
      case 14:
      case 15:
        return 14.7;
      case 21:
      case 22:
        return 21.7;
      default:
        return 12;
    }
  }
  static clamp(value2, min, max) {
    if (value2 <= min) {
      return min;
    }
    if (value2 >= max) {
      return max;
    }
    return value2;
  }
  static buildMultiBarRestInfo(tracks, startIndex, endIndexInclusive) {
    if (!tracks) {
      return null;
    }
    const stylesheet2 = tracks[0].score.stylesheet;
    const shouldDrawMultiBarRests = tracks.length > 1 ? stylesheet2.multiTrackMultiBarRest : stylesheet2.perTrackMultiBarRest?.has(tracks[0].index) === true;
    if (!shouldDrawMultiBarRests) {
      return null;
    }
    const lookup2 = /* @__PURE__ */ new Map();
    const score = tracks[0].score;
    let currentIndex = startIndex;
    let tempo = score.tempo;
    while (currentIndex <= endIndexInclusive) {
      const currentGroupStartIndex = currentIndex;
      let currentGroup = null;
      while (currentIndex <= endIndexInclusive) {
        const masterBar = score.masterBars[currentIndex];
        let hasTempoChange = false;
        for (const a of masterBar.tempoAutomations) {
          if (a.value !== tempo) {
            hasTempoChange = true;
          }
          tempo = a.value;
        }
        if (masterBar.alternateEndings || masterBar.isRepeatStart && masterBar.index !== currentGroupStartIndex || masterBar.isFreeTime || masterBar.isAnacrusis || masterBar.section !== null || masterBar.index !== currentGroupStartIndex && hasTempoChange || masterBar.fermata !== null && masterBar.fermata.size > 0 || masterBar.directions !== null && masterBar.directions.size > 0) {
          break;
        }
        if (currentGroupStartIndex > startIndex && masterBar.previousMasterBar && (masterBar.timeSignatureCommon !== masterBar.previousMasterBar.timeSignatureCommon || masterBar.timeSignatureNumerator !== masterBar.previousMasterBar.timeSignatureNumerator || masterBar.timeSignatureDenominator !== masterBar.previousMasterBar.timeSignatureDenominator || masterBar.tripletFeel !== masterBar.previousMasterBar.tripletFeel)) {
          break;
        }
        let areAllBarsSuitable = true;
        for (const t of tracks) {
          for (const s of t.staves) {
            const bar = s.bars[masterBar.index];
            if (!bar.isRestOnly) {
              areAllBarsSuitable = false;
              break;
            }
            if (bar.index > 0 && (bar.keySignature !== bar.previousBar.keySignature || bar.keySignatureType !== bar.previousBar.keySignatureType)) {
              areAllBarsSuitable = false;
              break;
            }
          }
          if (!areAllBarsSuitable) {
            break;
          }
        }
        if (!areAllBarsSuitable) {
          break;
        }
        currentIndex++;
        if (masterBar.index > currentGroupStartIndex) {
          if (currentGroup === null) {
            currentGroup = [masterBar.index];
          } else {
            currentGroup.push(masterBar.index);
          }
        }
        if (masterBar.isRepeatEnd) {
          break;
        }
      }
      if (currentGroup) {
        lookup2.set(currentGroupStartIndex, currentGroup);
      } else {
        currentIndex++;
      }
    }
    return lookup2;
  }
  static computeFirstDisplayedBarIndex(score, settings) {
    let startIndex = settings.display.startBar;
    startIndex--;
    startIndex = Math.min(score.masterBars.length - 1, Math.max(0, startIndex));
    return startIndex;
  }
  static computeLastDisplayedBarIndex(score, settings, startIndex) {
    let endBarIndex = settings.display.barCount;
    if (endBarIndex < 0) {
      endBarIndex = score.masterBars.length;
    }
    endBarIndex = startIndex + endBarIndex - 1;
    endBarIndex = Math.min(score.masterBars.length - 1, Math.max(0, endBarIndex));
    return endBarIndex;
  }
  static getOrCreateHeaderFooterStyle(score, element) {
    let style = score.style;
    if (!score.style) {
      style = new ScoreStyle();
      score.style = style;
    }
    let headerFooterStyle;
    if (style.headerAndFooter.has(element)) {
      headerFooterStyle = style.headerAndFooter.get(element);
    } else {
      headerFooterStyle = new HeaderFooterStyle();
      if (ScoreStyle.defaultHeaderAndFooter.has(element)) {
        const defaults = ScoreStyle.defaultHeaderAndFooter.get(element);
        headerFooterStyle.template = defaults.template;
        headerFooterStyle.textAlign = defaults.textAlign;
      }
      style.headerAndFooter.set(element, headerFooterStyle);
    }
    return headerFooterStyle;
  }
  /**
   * Performs some general consolidations of inconsistencies on the given score like
   * missing bars, beats, duplicated midi channels etc
   */
  static consolidate(score) {
    if (score.masterBars.length === 0) {
      const master = new MasterBar();
      score.addMasterBar(master);
      const tempoAutomation = new Automation();
      tempoAutomation.isLinear = false;
      tempoAutomation.type = 0 /* Tempo */;
      tempoAutomation.value = score.tempo;
      master.tempoAutomations.push(tempoAutomation);
      const bar = new Bar();
      score.tracks[0].staves[0].addBar(bar);
      const v = new Voice();
      bar.addVoice(v);
      const emptyBeat = new Beat();
      emptyBeat.isEmpty = true;
      v.addBeat(emptyBeat);
      return;
    }
    const usedChannels = /* @__PURE__ */ new Set([SynthConstants.PercussionChannel]);
    for (const track of score.tracks) {
      if (track.staves.length === 1 && track.staves[0].isPercussion) {
        track.playbackInfo.primaryChannel = SynthConstants.PercussionChannel;
        track.playbackInfo.secondaryChannel = SynthConstants.PercussionChannel;
      } else {
        if (track.playbackInfo.primaryChannel !== SynthConstants.PercussionChannel) {
          while (usedChannels.has(track.playbackInfo.primaryChannel)) {
            track.playbackInfo.primaryChannel++;
          }
        }
        usedChannels.add(track.playbackInfo.primaryChannel);
        if (track.playbackInfo.secondaryChannel !== SynthConstants.PercussionChannel) {
          while (usedChannels.has(track.playbackInfo.secondaryChannel)) {
            track.playbackInfo.secondaryChannel++;
          }
        }
        usedChannels.add(track.playbackInfo.secondaryChannel);
      }
      for (const staff of track.staves) {
        for (const b of staff.bars) {
          for (const v of b.voices) {
            if (v.isEmpty && v.beats.length === 0) {
              const emptyBeat = new Beat();
              emptyBeat.isEmpty = true;
              v.addBeat(emptyBeat);
            }
          }
        }
        const voiceCount = staff.bars.length === 0 ? 1 : staff.bars[0].voices.length;
        while (staff.bars.length < score.masterBars.length) {
          const bar = new Bar();
          staff.addBar(bar);
          const previousBar = bar.previousBar;
          if (previousBar) {
            bar.clef = previousBar.clef;
            bar.clefOttava = previousBar.clefOttava;
            bar.keySignature = bar.previousBar.keySignature;
            bar.keySignatureType = bar.previousBar.keySignatureType;
          }
          for (let i = 0; i < voiceCount; i++) {
            const v = new Voice();
            bar.addVoice(v);
            const emptyBeat = new Beat();
            emptyBeat.isEmpty = true;
            v.addBeat(emptyBeat);
          }
        }
      }
    }
    if (score.masterBars.length > 0) {
      const firstTempoAutomation = score.masterBars[0].tempoAutomations.find(
        (a) => a.type === 0 /* Tempo */ && a.ratioPosition === 0
      );
      if (!firstTempoAutomation) {
        const tempoAutomation = new Automation();
        tempoAutomation.isLinear = false;
        tempoAutomation.type = 0 /* Tempo */;
        tempoAutomation.value = score.tempo;
        tempoAutomation.text = score.tempoLabel;
        tempoAutomation.isVisible = false;
        score.masterBars[0].tempoAutomations.push(tempoAutomation);
      }
    }
  }
  /**
   * Trims any empty bars at the end of the song.
   * @param score
   */
  static trimEmptyBarsAtEnd(score) {
    while (score.masterBars.length > 1) {
      const barIndex = score.masterBars.length - 1;
      const masterBar = score.masterBars[barIndex];
      if (masterBar.hasChanges) {
        return;
      }
      for (const track of score.tracks) {
        for (const staff of track.staves) {
          if (barIndex < staff.bars.length) {
            const bar = staff.bars[barIndex];
            if (!bar.isEmpty || bar.hasChanges) {
              return;
            }
          }
        }
      }
      for (const track of score.tracks) {
        for (const staff of track.staves) {
          if (barIndex < staff.bars.length) {
            const bar = staff.bars[barIndex];
            staff.bars.pop();
            bar.previousBar.nextBar = null;
          }
        }
      }
      score.masterBars.pop();
      masterBar.previousMasterBar.nextMasterBar = null;
    }
  }
  /**
   * Lists the display transpositions for some known midi instruments.
   * It is a common practice to transpose the standard notation for instruments like guitars.
   */
  static displayTranspositionPitches = /* @__PURE__ */ new Map([
    // guitar
    [24, -12],
    [25, -12],
    [26, -12],
    [27, -12],
    [28, -12],
    [29, -12],
    [30, -12],
    [31, -12],
    // bass
    [32, -12],
    [33, -12],
    [34, -12],
    [35, -12],
    [36, -12],
    [37, -12],
    [38, -12],
    [39, -12],
    // Contrabass
    [43, -12]
  ]);
  /**
   * @internal
   */
  static flooredDivision(a, b) {
    return a - b * Math.floor(a / b);
  }
  // NOTE: haven't figured out yet what exact formula is applied when transposing key signatures
  // this table is simply created by checking the Guitar Pro behavior,
  // The table is organized as [<transpose>][<key signature>] to match the table above
  // it's also easier to read as we list every key signature per row, transposed by the same value
  // this gives typically just a shifted list according to the transpose (with some special treatments)
  /**
   * Converts the key transpose table to actual key signatures.
   * @param texts An array where every item indicates the number of accidentals and which accidental
   * placed for the key signature.
   *
   * e.g. 3# is 3-sharps -> KeySignature.A
   */
  static _translateKeyTransposeTable(texts) {
    const keySignatures = [];
    for (const transpose of texts) {
      const transposeValues = [];
      keySignatures.push(transposeValues);
      for (const keySignatureText of transpose) {
        const keySignature = (
          // digit
          Number.parseInt(keySignatureText.charAt(0), 10) * // b -> negative, # positive
          (keySignatureText.charAt(1) === "b" ? -1 : 1)
        );
        transposeValues.push(keySignature);
      }
    }
    return keySignatures;
  }
  /**
   * @internal
   */
  static _keyTransposeTable = _ModelUtils._translateKeyTransposeTable([
    /*              Cb    Gb    Db    Ab    Eb    Bb    F     C     G     D     A     E     B     F     C# */
    /* C	 0 */
    ["7b", "6b", "5b", "4b", "3b", "2b", "1b", "0#", "1#", "2#", "3#", "4#", "5#", "6#", "7#"],
    /* Db	 1 */
    ["2b", "1b", "0#", "1#", "2#", "3#", "4#", "5#", "6#", "7#", "4b", "3b", "2b", "1b", "0#"],
    /* D	 2 */
    ["3#", "4#", "7b", "6b", "5b", "4b", "3b", "2b", "1b", "0#", "1#", "2#", "3#", "4#", "5#"],
    /* Eb	 3 */
    ["4b", "3b", "2b", "1b", "0#", "1#", "2#", "3#", "4#", "5#", "6#", "7#", "4b", "3b", "2b"],
    /* E	 4 */
    ["1#", "2#", "3#", "4#", "7b", "6b", "5b", "4b", "3b", "2b", "1b", "0#", "1#", "2#", "3#"],
    /* F	 5 */
    ["6b", "5b", "4b", "3b", "2b", "1b", "0#", "1#", "2#", "3#", "4#", "5#", "6#", "7#", "4b"],
    /* Gb	 6 */
    ["1b", "0#", "1#", "2#", "3#", "4#", "7b", "6#", "7#", "4b", "3b", "2b", "1b", "0#", "1#"],
    /* G	 7 */
    ["4#", "7b", "6b", "5b", "4b", "3b", "2b", "1b", "0#", "1#", "2#", "3#", "4#", "5#", "6#"],
    /* Ab	 8 */
    ["3b", "2b", "1b", "0#", "1#", "2#", "3#", "4#", "5#", "6#", "7#", "4b", "3b", "2b", "1b"],
    /* A	 9 */
    ["2#", "3#", "4#", "7b", "6b", "5b", "4b", "3b", "2b", "1b", "0#", "1#", "2#", "3#", "4#"],
    /* Bb	10 */
    ["5b", "4b", "3b", "2b", "1b", "0#", "1#", "2#", "3#", "4#", "5#", "6#", "7#", "4b", "3b"],
    /* B	11 */
    ["0#", "1#", "2#", "3#", "4#", "7b", "6b", "6#", "4b", "3b", "2b", "1b", "0#", "1#", "2#"]
  ]);
  /**
   * Transposes the given key signature.
   * @internal
   * @param keySignature The key signature to transpose
   * @param transpose The number of semitones to transpose (+/- 0-11)
   * @returns
   */
  static transposeKey(keySignature, transpose) {
    if (transpose === 0) {
      return keySignature;
    }
    if (transpose < 0) {
      const lookup2 = _ModelUtils._keyTransposeTable[-transpose];
      const keySignatureIndex = lookup2.indexOf(keySignature);
      if (keySignatureIndex === -1) {
        return keySignature;
      }
      return keySignatureIndex - 7;
    } else {
      return _ModelUtils._keyTransposeTable[transpose][keySignature + 7];
    }
  }
  /**
   * @internal
   */
  static toArticulationId(plain) {
    return plain.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  }
  static minBoundingBox(a, b) {
    if (Number.isNaN(a)) {
      return b;
    } else if (Number.isNaN(b)) {
      return a;
    }
    return a < b ? a : b;
  }
  static maxBoundingBox(a, b) {
    if (Number.isNaN(a)) {
      return b;
    } else if (Number.isNaN(b)) {
      return a;
    }
    return a > b ? a : b;
  }
  static getSystemLayout(score, systemIndex, displayedTracks) {
    let defaultSystemsLayout;
    let systemsLayout;
    if (displayedTracks.length === 1) {
      defaultSystemsLayout = displayedTracks[0].defaultSystemsLayout;
      systemsLayout = displayedTracks[0].systemsLayout;
    } else {
      defaultSystemsLayout = score.defaultSystemsLayout;
      systemsLayout = score.systemsLayout;
    }
    return systemIndex < systemsLayout.length ? systemsLayout[systemIndex] : defaultSystemsLayout;
  }
  // diatonic accidentals
  static _degreeSemitones = [0, 2, 4, 5, 7, 9, 11];
  static _sharpPreferredSpellings = [
    { degree: 0, accidentalOffset: 0 },
    // C
    { degree: 0, accidentalOffset: 1 },
    // C#
    { degree: 1, accidentalOffset: 0 },
    // D
    { degree: 1, accidentalOffset: 1 },
    // D#
    { degree: 2, accidentalOffset: 0 },
    // E
    { degree: 3, accidentalOffset: 0 },
    // F
    { degree: 3, accidentalOffset: 1 },
    // F#
    { degree: 4, accidentalOffset: 0 },
    // G
    { degree: 4, accidentalOffset: 1 },
    // G#
    { degree: 5, accidentalOffset: 0 },
    // A
    { degree: 5, accidentalOffset: 1 },
    // A#
    { degree: 6, accidentalOffset: 0 }
    // B
  ];
  static _flatPreferredSpellings = [
    { degree: 0, accidentalOffset: 0 },
    // C
    { degree: 1, accidentalOffset: -1 },
    // Db
    { degree: 1, accidentalOffset: 0 },
    // D
    { degree: 2, accidentalOffset: -1 },
    // Eb
    { degree: 2, accidentalOffset: 0 },
    // E
    { degree: 3, accidentalOffset: 0 },
    // F
    { degree: 4, accidentalOffset: -1 },
    // Gb
    { degree: 4, accidentalOffset: 0 },
    // G
    { degree: 5, accidentalOffset: -1 },
    // Ab
    { degree: 5, accidentalOffset: 0 },
    // A
    { degree: 6, accidentalOffset: -1 },
    // Bb
    { degree: 6, accidentalOffset: 0 }
    // B
  ];
  // 12 chromatic pitch classes with always 3 possible spellings in the
  // accidental range of bb..##
  static _spellingCandidates = [
    // 0: C
    [
      { degree: 0, accidentalOffset: 0 },
      // C
      { degree: 1, accidentalOffset: -2 },
      // Dbb
      { degree: 6, accidentalOffset: 1 }
      // B#
    ],
    // 1: C#/Db
    [
      { degree: 0, accidentalOffset: 1 },
      // C#
      { degree: 1, accidentalOffset: -1 },
      // Db
      { degree: 6, accidentalOffset: 2 }
      // B##
    ],
    // 2: D
    [
      { degree: 1, accidentalOffset: 0 },
      // D
      { degree: 0, accidentalOffset: 2 },
      // C##
      { degree: 2, accidentalOffset: -2 }
      // Ebb
    ],
    // 3: D#/Eb
    [
      { degree: 1, accidentalOffset: 1 },
      // D#
      { degree: 2, accidentalOffset: -1 },
      // Eb
      { degree: 3, accidentalOffset: -2 }
      // Fbb
    ],
    // 4: E
    [
      { degree: 2, accidentalOffset: 0 },
      // E
      { degree: 1, accidentalOffset: 2 },
      // D##
      { degree: 3, accidentalOffset: -1 }
      // Fb
    ],
    // 5: F
    [
      { degree: 3, accidentalOffset: 0 },
      // F
      { degree: 2, accidentalOffset: 1 },
      // E#
      { degree: 4, accidentalOffset: -2 }
      // Gbb
    ],
    // 6: F#/Gb
    [
      { degree: 3, accidentalOffset: 1 },
      // F#
      { degree: 4, accidentalOffset: -1 },
      // Gb
      { degree: 2, accidentalOffset: 2 }
      // E##
    ],
    // 7: G
    [
      { degree: 4, accidentalOffset: 0 },
      // G
      { degree: 3, accidentalOffset: 2 },
      // F##
      { degree: 5, accidentalOffset: -2 }
      // Abb
    ],
    // 8: G#/Ab
    [
      { degree: 4, accidentalOffset: 1 },
      // G#
      { degree: 5, accidentalOffset: -1 }
      // Ab
    ],
    // 9: A
    [
      { degree: 5, accidentalOffset: 0 },
      // A
      { degree: 4, accidentalOffset: 2 },
      // G##
      { degree: 6, accidentalOffset: -2 }
      // Bbb
    ],
    // 10: A#/Bb
    [
      { degree: 5, accidentalOffset: 1 },
      // A#
      { degree: 6, accidentalOffset: -1 },
      // Bb
      { degree: 0, accidentalOffset: -2 }
      // Cbb
    ],
    // 11: B
    [
      { degree: 6, accidentalOffset: 0 },
      // B
      { degree: 5, accidentalOffset: 2 },
      // A##
      { degree: 0, accidentalOffset: -1 }
      // Cb
    ]
  ];
  static _sharpKeySignatureOrder = [3, 0, 4, 1, 5, 2, 6];
  // F C G D A E B
  static _flatKeySignatureOrder = [6, 2, 5, 1, 4, 0, 3];
  // B E A D G C F
  static _keySignatureAccidentalByDegree = _ModelUtils._buildKeySignatureAccidentalByDegree();
  static _accidentalOffsetToType = /* @__PURE__ */ new Map([
    [-2, 8 /* DoubleFlat */],
    [-1, 3 /* Flat */],
    [0, 1 /* Natural */],
    [1, 2 /* Sharp */],
    [2, 7 /* DoubleSharp */]
  ]);
  static _forcedAccidentalOffsetByMode = /* @__PURE__ */ new Map([
    [3 /* ForceSharp */, 1],
    [4 /* ForceDoubleSharp */, 2],
    [5 /* ForceFlat */, -1],
    [6 /* ForceDoubleFlat */, -2],
    [2 /* ForceNatural */, 0],
    [1 /* ForceNone */, 0],
    [0 /* Default */, Number.NaN]
  ]);
  static _buildKeySignatureAccidentalByDegree() {
    const lookup2 = [];
    for (let ks = -7; ks <= 7; ks++) {
      const row = [0, 0, 0, 0, 0, 0, 0];
      if (ks > 0) {
        for (let i = 0; i < ks; i++) {
          row[_ModelUtils._sharpKeySignatureOrder[i]] = 1;
        }
      } else if (ks < 0) {
        for (let i = 0; i < -ks; i++) {
          row[_ModelUtils._flatKeySignatureOrder[i]] = -1;
        }
      }
      lookup2.push(row);
    }
    return lookup2;
  }
  static getKeySignatureAccidentalOffset(keySignature, degree) {
    return _ModelUtils._keySignatureAccidentalByDegree[keySignature + 7][degree];
  }
  static resolveSpelling(keySignature, noteValue, accidentalMode) {
    const chroma = _ModelUtils.flooredDivision(noteValue, 12);
    const preferred = _ModelUtils._getPreferredSpellingForKeySignature(keySignature, chroma);
    const desiredOffset = _ModelUtils._forcedAccidentalOffsetByMode.has(accidentalMode) ? _ModelUtils._forcedAccidentalOffsetByMode.get(accidentalMode) : Number.NaN;
    let spelling = preferred;
    if (!Number.isNaN(desiredOffset)) {
      const candidates = _ModelUtils._spellingCandidates[chroma];
      const exact = candidates.find((c) => c.accidentalOffset === desiredOffset);
      if (exact) {
        spelling = exact;
      }
    }
    const baseSemitone = _ModelUtils._degreeSemitones[spelling.degree] + spelling.accidentalOffset;
    const octave = Math.floor((noteValue - baseSemitone) / 12) - 1;
    return {
      degree: spelling.degree,
      accidentalOffset: spelling.accidentalOffset,
      chroma,
      octave
    };
  }
  static computeAccidental(keySignature, accidentalMode, noteValue, quarterBend, currentAccidentalOffset = null) {
    const spelling = _ModelUtils.resolveSpelling(keySignature, noteValue, accidentalMode);
    return _ModelUtils.computeAccidentalForSpelling(
      keySignature,
      accidentalMode,
      spelling,
      quarterBend,
      currentAccidentalOffset
    );
  }
  static computeAccidentalForSpelling(keySignature, accidentalMode, spelling, quarterBend, currentAccidentalOffset = null) {
    if (accidentalMode === 1 /* ForceNone */) {
      return 0 /* None */;
    }
    if (quarterBend) {
      if (spelling.accidentalOffset > 0) {
        return 5 /* SharpQuarterNoteUp */;
      }
      if (spelling.accidentalOffset < 0) {
        return 6 /* FlatQuarterNoteUp */;
      }
      return 4 /* NaturalQuarterNoteUp */;
    }
    const desiredOffset = spelling.accidentalOffset;
    const ksOffset = _ModelUtils.getKeySignatureAccidentalOffset(keySignature, spelling.degree);
    if (currentAccidentalOffset === desiredOffset) {
      return 0 /* None */;
    }
    if (currentAccidentalOffset == null && desiredOffset === ksOffset) {
      return 0 /* None */;
    }
    return _ModelUtils.accidentalOffsetToType(desiredOffset);
  }
  static accidentalOffsetToType(offset) {
    return _ModelUtils._accidentalOffsetToType.has(offset) ? _ModelUtils._accidentalOffsetToType.get(offset) : 0 /* None */;
  }
  static _getPreferredSpellingForKeySignature(keySignature, chroma) {
    const candidates = _ModelUtils._spellingCandidates[chroma];
    const ksMatch = candidates.find(
      (c) => _ModelUtils.getKeySignatureAccidentalOffset(keySignature, c.degree) === c.accidentalOffset
    );
    if (ksMatch) {
      return ksMatch;
    }
    const preferFlat = _ModelUtils.keySignatureIsFlat(keySignature);
    return preferFlat ? _ModelUtils._flatPreferredSpellings[chroma] : _ModelUtils._sharpPreferredSpellings[chroma];
  }
  static _majorKeySignatureTonicDegrees = [
    // Flats: Cb, Gb, Db, Ab, Eb, Bb, F
    0,
    4,
    1,
    5,
    2,
    6,
    3,
    // Natural: C
    0,
    // Sharps: G, D, A, E, B, F#, C#
    4,
    1,
    5,
    2,
    6,
    3,
    0
  ];
  static _minorKeySignatureTonicDegrees = [
    // Flats: Ab, Eb, Bb, F, C, G, D
    5,
    2,
    6,
    3,
    0,
    4,
    1,
    // Natural: A
    5,
    // Sharps: E, B, F#, C#, G#, D#, A#
    2,
    6,
    3,
    0,
    4,
    1,
    5
  ];
  static getKeySignatureTonicDegree(keySignature, keySignatureType) {
    const ksi = keySignature + 7;
    return keySignatureType === 1 /* Minor */ ? _ModelUtils._minorKeySignatureTonicDegrees[ksi] : _ModelUtils._majorKeySignatureTonicDegrees[ksi];
  }
};

// third_party/alphatab/src/model/InstrumentArticulation.ts
var InstrumentArticulation = class _InstrumentArticulation {
  /**
   * An internal ID to identify this articulation for purposes like
   * mapping during exports.The exact meaning of the ID is not defined and dependes on the
   * importer source.
   */
  id = 0;
  /**
   * A unique id for this articulation.
   */
  get uniqueId() {
    return `${this.elementType}.${this.id}`;
  }
  /**
   * Gets or sets the type of the element for which this articulation is for.
   */
  elementType;
  /**
   * The line the note head should be shown for standard notation.
   *
   * @remarks
   * This value is a bit special and its semantics are adopted from Guitar Pro:
   * Staff lines are actually "steps" including lines and spaces on the staff.
   * 1 means the note is on the top line of the staff and from there its counting downwards.
   */
  staffLine;
  /**
   * Gets or sets the note head to display by default.
   */
  noteHeadDefault;
  /**
   * Gets or sets the note head to display for half duration notes.
   */
  noteHeadHalf;
  /**
   * Gets or sets the note head to display for whole duration notes.
   */
  noteHeadWhole;
  /**
   * Gets or sets which additional technique symbol should be placed for the note head.
   */
  techniqueSymbol;
  /**
   * Gets or sets where the technique symbol should be placed.
   */
  techniqueSymbolPlacement;
  /**
   * Gets or sets which midi key to use when playing the note.
   */
  outputMidiNumber;
  constructor(elementType = "", staffLine = 0, outputMidiNumber = 0, noteHeadDefault = -1 /* None */, noteHeadHalf = -1 /* None */, noteHeadWhole = -1 /* None */, techniqueSymbol = -1 /* None */, techniqueSymbolPlacement = 1 /* Inside */, id = 0) {
    this.id = id;
    this.elementType = elementType;
    this.outputMidiNumber = outputMidiNumber;
    this.staffLine = staffLine;
    this.noteHeadDefault = noteHeadDefault;
    this.noteHeadHalf = noteHeadHalf !== -1 /* None */ ? noteHeadHalf : noteHeadDefault;
    this.noteHeadWhole = noteHeadWhole !== -1 /* None */ ? noteHeadWhole : noteHeadDefault;
    this.techniqueSymbol = techniqueSymbol;
    this.techniqueSymbolPlacement = techniqueSymbolPlacement;
  }
  // avoiding breaking change
  /**
   * @internal
   */
  static create(id = 0, elementType = "", staffLine = 0, outputMidiNumber = 0, noteHeadDefault = -1 /* None */, noteHeadHalf = -1 /* None */, noteHeadWhole = -1 /* None */, techniqueSymbol = -1 /* None */, techniqueSymbolPlacement = 1 /* Inside */) {
    return new _InstrumentArticulation(
      elementType,
      staffLine,
      outputMidiNumber,
      noteHeadDefault,
      noteHeadHalf,
      noteHeadWhole,
      techniqueSymbol,
      techniqueSymbolPlacement,
      id
    );
  }
  getSymbol(duration) {
    switch (duration) {
      case 1 /* Whole */:
        return this.noteHeadWhole;
      case 2 /* Half */:
        return this.noteHeadHalf;
      default:
        return this.noteHeadDefault;
    }
  }
};

// third_party/alphatab/src/model/PercussionMapper.ts
var PercussionMapper = class _PercussionMapper {
  // To update the following generated code, use the GpExporterTest.percussion-articulations unit test
  // which will generate the new code to copy for here.
  // We could also use an NPM script for that but for now this is enough.
  // BEGIN generated articulations
  static instrumentArticulations = new Map(
    [
      InstrumentArticulation.create(
        38,
        "Snare",
        3,
        38,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        37,
        "Snare",
        3,
        37,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        91,
        "Snare",
        3,
        38,
        57565 /* NoteheadDiamondWhite */,
        57565 /* NoteheadDiamondWhite */,
        57565 /* NoteheadDiamondWhite */
      ),
      InstrumentArticulation.create(
        42,
        "Charley",
        -1,
        42,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        92,
        "Charley",
        -1,
        46,
        57591 /* NoteheadCircleSlash */,
        57591 /* NoteheadCircleSlash */,
        57591 /* NoteheadCircleSlash */
      ),
      InstrumentArticulation.create(
        46,
        "Charley",
        -1,
        46,
        57523 /* NoteheadCircleX */,
        57523 /* NoteheadCircleX */,
        57523 /* NoteheadCircleX */
      ),
      InstrumentArticulation.create(
        44,
        "Charley",
        9,
        44,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        35,
        "Acoustic Kick Drum",
        8,
        35,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        36,
        "Kick Drum",
        7,
        36,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        50,
        "Tom Very High",
        1,
        50,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        48,
        "Tom High",
        2,
        48,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        47,
        "Tom Medium",
        4,
        47,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        45,
        "Tom Low",
        5,
        45,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        43,
        "Tom Very Low",
        6,
        43,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        93,
        "Ride",
        0,
        51,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        59177 /* PictEdgeOfCymbal */,
        0 /* Above */
      ),
      InstrumentArticulation.create(
        51,
        "Ride",
        0,
        51,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        53,
        "Ride",
        0,
        53,
        57565 /* NoteheadDiamondWhite */,
        57565 /* NoteheadDiamondWhite */,
        57565 /* NoteheadDiamondWhite */
      ),
      InstrumentArticulation.create(
        94,
        "Ride",
        0,
        51,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        58530 /* ArticStaccatoAbove */,
        3 /* Outside */
      ),
      InstrumentArticulation.create(
        55,
        "Splash",
        -2,
        55,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        95,
        "Splash",
        -2,
        55,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        58530 /* ArticStaccatoAbove */,
        3 /* Outside */
      ),
      InstrumentArticulation.create(
        52,
        "China",
        -3,
        52,
        57593 /* NoteheadHeavyXHat */,
        57593 /* NoteheadHeavyXHat */,
        57593 /* NoteheadHeavyXHat */
      ),
      InstrumentArticulation.create(
        96,
        "China",
        -3,
        52,
        57593 /* NoteheadHeavyXHat */,
        57593 /* NoteheadHeavyXHat */,
        57593 /* NoteheadHeavyXHat */
      ),
      InstrumentArticulation.create(
        49,
        "Crash High",
        -2,
        49,
        57592 /* NoteheadHeavyX */,
        57592 /* NoteheadHeavyX */,
        57592 /* NoteheadHeavyX */
      ),
      InstrumentArticulation.create(
        97,
        "Crash High",
        -2,
        49,
        57592 /* NoteheadHeavyX */,
        57592 /* NoteheadHeavyX */,
        57592 /* NoteheadHeavyX */,
        58530 /* ArticStaccatoAbove */,
        3 /* Outside */
      ),
      InstrumentArticulation.create(
        57,
        "Crash Medium",
        -1,
        57,
        57592 /* NoteheadHeavyX */,
        57592 /* NoteheadHeavyX */,
        57592 /* NoteheadHeavyX */
      ),
      InstrumentArticulation.create(
        98,
        "Crash Medium",
        -1,
        57,
        57592 /* NoteheadHeavyX */,
        57592 /* NoteheadHeavyX */,
        57592 /* NoteheadHeavyX */,
        58530 /* ArticStaccatoAbove */,
        3 /* Outside */
      ),
      InstrumentArticulation.create(
        99,
        "Cowbell Low",
        1,
        56,
        57534 /* NoteheadTriangleUpBlack */,
        57532 /* NoteheadTriangleUpHalf */,
        57531 /* NoteheadTriangleUpWhole */
      ),
      InstrumentArticulation.create(
        100,
        "Cowbell Low",
        1,
        56,
        57513 /* NoteheadXBlack */,
        57512 /* NoteheadXHalf */,
        57511 /* NoteheadXWhole */
      ),
      InstrumentArticulation.create(
        56,
        "Cowbell Medium",
        0,
        56,
        57534 /* NoteheadTriangleUpBlack */,
        57532 /* NoteheadTriangleUpHalf */,
        57531 /* NoteheadTriangleUpWhole */
      ),
      InstrumentArticulation.create(
        101,
        "Cowbell Medium",
        0,
        56,
        57513 /* NoteheadXBlack */,
        57512 /* NoteheadXHalf */,
        57511 /* NoteheadXWhole */
      ),
      InstrumentArticulation.create(
        102,
        "Cowbell High",
        -1,
        56,
        57534 /* NoteheadTriangleUpBlack */,
        57532 /* NoteheadTriangleUpHalf */,
        57531 /* NoteheadTriangleUpWhole */
      ),
      InstrumentArticulation.create(
        103,
        "Cowbell High",
        -1,
        56,
        57513 /* NoteheadXBlack */,
        57512 /* NoteheadXHalf */,
        57511 /* NoteheadXWhole */
      ),
      InstrumentArticulation.create(
        77,
        "Woodblock Low",
        -9,
        77,
        57534 /* NoteheadTriangleUpBlack */,
        57534 /* NoteheadTriangleUpBlack */,
        57534 /* NoteheadTriangleUpBlack */
      ),
      InstrumentArticulation.create(
        76,
        "Woodblock High",
        -10,
        76,
        57534 /* NoteheadTriangleUpBlack */,
        57534 /* NoteheadTriangleUpBlack */,
        57534 /* NoteheadTriangleUpBlack */
      ),
      InstrumentArticulation.create(
        60,
        "Bongo High",
        -4,
        60,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        104,
        "Bongo High",
        -5,
        60,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */,
        57550 /* NoteheadParenthesis */,
        1 /* Inside */
      ),
      InstrumentArticulation.create(
        105,
        "Bongo High",
        -6,
        60,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        61,
        "Bongo Low",
        -7,
        61,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        106,
        "Bongo Low",
        -8,
        61,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */,
        57550 /* NoteheadParenthesis */,
        1 /* Inside */
      ),
      InstrumentArticulation.create(
        107,
        "Bongo Low",
        -16,
        61,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        66,
        "Timbale Low",
        10,
        66,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        65,
        "Timbale High",
        9,
        65,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        68,
        "Agogo Low",
        12,
        68,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        67,
        "Agogo High",
        11,
        67,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        64,
        "Conga Low",
        17,
        64,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        108,
        "Conga Low",
        16,
        64,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        109,
        "Conga Low",
        15,
        64,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */,
        57550 /* NoteheadParenthesis */,
        1 /* Inside */
      ),
      InstrumentArticulation.create(
        63,
        "Conga High",
        14,
        63,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        110,
        "Conga High",
        13,
        63,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        62,
        "Conga High",
        19,
        62,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */,
        57550 /* NoteheadParenthesis */,
        1 /* Inside */
      ),
      InstrumentArticulation.create(
        72,
        "Whistle Low",
        -11,
        72,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        71,
        "Whistle High",
        -17,
        71,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        73,
        "Guiro",
        38,
        73,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        74,
        "Guiro",
        37,
        74,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        86,
        "Surdo",
        36,
        86,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        87,
        "Surdo",
        35,
        87,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57550 /* NoteheadParenthesis */,
        1 /* Inside */
      ),
      InstrumentArticulation.create(
        54,
        "Tambourine",
        3,
        54,
        57534 /* NoteheadTriangleUpBlack */,
        57534 /* NoteheadTriangleUpBlack */,
        57534 /* NoteheadTriangleUpBlack */
      ),
      InstrumentArticulation.create(
        111,
        "Tambourine",
        2,
        54,
        57534 /* NoteheadTriangleUpBlack */,
        57534 /* NoteheadTriangleUpBlack */,
        57534 /* NoteheadTriangleUpBlack */,
        58898 /* StringsUpBow */,
        0 /* Above */
      ),
      InstrumentArticulation.create(
        112,
        "Tambourine",
        1,
        54,
        57534 /* NoteheadTriangleUpBlack */,
        57534 /* NoteheadTriangleUpBlack */,
        57534 /* NoteheadTriangleUpBlack */,
        58896 /* StringsDownBow */,
        0 /* Above */
      ),
      InstrumentArticulation.create(
        113,
        "Tambourine",
        -7,
        54,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        79,
        "Cuica",
        30,
        79,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        78,
        "Cuica",
        29,
        78,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        58,
        "Vibraslap",
        28,
        58,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        81,
        "Triangle",
        27,
        81,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        80,
        "Triangle",
        26,
        80,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57550 /* NoteheadParenthesis */,
        1 /* Inside */
      ),
      InstrumentArticulation.create(
        114,
        "Grancassa",
        25,
        43,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        115,
        "Piatti",
        18,
        49,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        116,
        "Piatti",
        24,
        49,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        69,
        "Cabasa",
        23,
        69,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        117,
        "Cabasa",
        22,
        69,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */,
        58898 /* StringsUpBow */,
        3 /* Outside */
      ),
      InstrumentArticulation.create(
        85,
        "Castanets",
        21,
        85,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        75,
        "Claves",
        20,
        75,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        70,
        "Left Maraca",
        -12,
        70,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        118,
        "Left Maraca",
        -13,
        70,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */,
        58898 /* StringsUpBow */,
        3 /* Outside */
      ),
      InstrumentArticulation.create(
        119,
        "Right Maraca",
        -14,
        70,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        120,
        "Right Maraca",
        -15,
        70,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */,
        58898 /* StringsUpBow */,
        3 /* Outside */
      ),
      InstrumentArticulation.create(
        82,
        "Shaker",
        -23,
        82,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        122,
        "Shaker",
        -24,
        82,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */,
        58898 /* StringsUpBow */,
        3 /* Outside */
      ),
      InstrumentArticulation.create(
        84,
        "Bell Tree",
        -18,
        53,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        123,
        "Bell Tree",
        -19,
        53,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */,
        58898 /* StringsUpBow */,
        3 /* Outside */
      ),
      InstrumentArticulation.create(
        83,
        "Jingle Bell",
        -20,
        53,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        83,
        "Tinkle Bell",
        -20,
        53,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        124,
        "Golpe",
        -21,
        62,
        57509 /* NoteheadNull */,
        57509 /* NoteheadNull */,
        57509 /* NoteheadNull */,
        59458 /* GuitarGolpe */,
        2 /* Below */
      ),
      InstrumentArticulation.create(
        125,
        "Golpe",
        -22,
        62,
        57509 /* NoteheadNull */,
        57509 /* NoteheadNull */,
        57509 /* NoteheadNull */,
        59458 /* GuitarGolpe */,
        0 /* Above */
      ),
      InstrumentArticulation.create(
        39,
        "Hand Clap",
        3,
        39,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        40,
        "Electric Snare",
        3,
        40,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        31,
        "Sticks",
        3,
        40,
        57552 /* NoteheadSlashedBlack2 */,
        57552 /* NoteheadSlashedBlack2 */,
        57552 /* NoteheadSlashedBlack2 */
      ),
      InstrumentArticulation.create(
        41,
        "Very Low Floor Tom",
        5,
        41,
        57508 /* NoteheadBlack */,
        57507 /* NoteheadHalf */,
        57506 /* NoteheadWhole */
      ),
      InstrumentArticulation.create(
        59,
        "Ride Cymbal 2",
        2,
        59,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        59177 /* PictEdgeOfCymbal */,
        0 /* Above */
      ),
      InstrumentArticulation.create(
        126,
        "Ride Cymbal 2",
        2,
        59,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        127,
        "Ride Cymbal 2",
        2,
        59,
        57565 /* NoteheadDiamondWhite */,
        57565 /* NoteheadDiamondWhite */,
        57565 /* NoteheadDiamondWhite */
      ),
      InstrumentArticulation.create(
        29,
        "Ride Cymbal 2",
        2,
        59,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        58530 /* ArticStaccatoAbove */,
        3 /* Outside */
      ),
      InstrumentArticulation.create(
        30,
        "Reverse Cymbal",
        -3,
        49,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        33,
        "Metronome",
        3,
        37,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */,
        57513 /* NoteheadXBlack */
      ),
      InstrumentArticulation.create(
        34,
        "Metronome",
        3,
        38,
        57508 /* NoteheadBlack */,
        57508 /* NoteheadBlack */,
        57508 /* NoteheadBlack */
      )
    ].map((articulation) => [articulation.uniqueId, articulation])
  );
  static _instrumentArticulationNames = /* @__PURE__ */ new Map([
    ["Snare (hit)", "Snare.38"],
    ["Snare (side stick)", "Snare.37"],
    ["Snare (rim shot)", "Snare.91"],
    ["Hi-Hat (closed)", "Charley.42"],
    ["Hi-Hat (half)", "Charley.92"],
    ["Hi-Hat (open)", "Charley.46"],
    ["Pedal Hi-Hat (hit)", "Charley.44"],
    ["Kick (hit)", "Acoustic Kick Drum.35"],
    ["Kick (hit) 2", "Kick Drum.36"],
    ["High Floor Tom (hit)", "Tom Very High.50"],
    ["High Tom (hit)", "Tom High.48"],
    ["Mid Tom (hit)", "Tom Medium.47"],
    ["Low Tom (hit)", "Tom Low.45"],
    ["Very Low Tom (hit)", "Tom Very Low.43"],
    ["Ride (edge)", "Ride.93"],
    ["Ride (middle)", "Ride.51"],
    ["Ride (bell)", "Ride.53"],
    ["Ride (choke)", "Ride.94"],
    ["Splash (hit)", "Splash.55"],
    ["Splash (choke)", "Splash.95"],
    ["China (hit)", "China.52"],
    ["China (choke)", "China.96"],
    ["Crash high (hit)", "Crash High.49"],
    ["Crash high (choke)", "Crash High.97"],
    ["Crash medium (hit)", "Crash Medium.57"],
    ["Crash medium (choke)", "Crash Medium.98"],
    ["Cowbell low (hit)", "Cowbell Low.99"],
    ["Cowbell low (tip)", "Cowbell Low.100"],
    ["Cowbell medium (hit)", "Cowbell Medium.56"],
    ["Cowbell medium (tip)", "Cowbell Medium.101"],
    ["Cowbell high (hit)", "Cowbell High.102"],
    ["Cowbell high (tip)", "Cowbell High.103"],
    ["Woodblock low (hit)", "Woodblock Low.77"],
    ["Woodblock high (hit)", "Woodblock High.76"],
    ["Bongo High (hit)", "Bongo High.60"],
    ["Bongo High (mute)", "Bongo High.104"],
    ["Bongo High (slap)", "Bongo High.105"],
    ["Bongo Low (hit)", "Bongo Low.61"],
    ["Bongo Low (mute)", "Bongo Low.106"],
    ["Bongo Low (slap)", "Bongo Low.107"],
    ["Timbale low (hit)", "Timbale Low.66"],
    ["Timbale high (hit)", "Timbale High.65"],
    ["Agogo low (hit)", "Agogo Low.68"],
    ["Agogo high (hit)", "Agogo High.67"],
    ["Conga low (hit)", "Conga Low.64"],
    ["Conga low (slap)", "Conga Low.108"],
    ["Conga low (mute)", "Conga Low.109"],
    ["Conga high (hit)", "Conga High.63"],
    ["Conga high (slap)", "Conga High.110"],
    ["Conga high (mute)", "Conga High.62"],
    ["Whistle low (hit)", "Whistle Low.72"],
    ["Whistle high (hit)", "Whistle High.71"],
    ["Guiro (hit)", "Guiro.73"],
    ["Guiro (scrap-return)", "Guiro.74"],
    ["Surdo (hit)", "Surdo.86"],
    ["Surdo (mute)", "Surdo.87"],
    ["Tambourine (hit)", "Tambourine.54"],
    ["Tambourine (return)", "Tambourine.111"],
    ["Tambourine (roll)", "Tambourine.112"],
    ["Tambourine (hand)", "Tambourine.113"],
    ["Cuica (open)", "Cuica.79"],
    ["Cuica (mute)", "Cuica.78"],
    ["Vibraslap (hit)", "Vibraslap.58"],
    ["Triangle (hit)", "Triangle.81"],
    ["Triangle (mute)", "Triangle.80"],
    ["Grancassa (hit)", "Grancassa.114"],
    ["Piatti (hit)", "Piatti.115"],
    ["Piatti (hand)", "Piatti.116"],
    ["Cabasa (hit)", "Cabasa.69"],
    ["Cabasa (return)", "Cabasa.117"],
    ["Castanets (hit)", "Castanets.85"],
    ["Claves (hit)", "Claves.75"],
    ["Left Maraca (hit)", "Left Maraca.70"],
    ["Left Maraca (return)", "Left Maraca.118"],
    ["Right Maraca (hit)", "Right Maraca.119"],
    ["Right Maraca (return)", "Right Maraca.120"],
    ["Shaker (hit)", "Shaker.82"],
    ["Shaker (return)", "Shaker.122"],
    ["Bell Tree (hit)", "Bell Tree.84"],
    ["Bell Tree (return)", "Bell Tree.123"],
    ["Jingle Bell (hit)", "Jingle Bell.83"],
    ["Tinkle Bell (hit)", "Tinkle Bell.83"],
    ["Golpe (thumb)", "Golpe.124"],
    ["Golpe (finger)", "Golpe.125"],
    ["Hand Clap (hit)", "Hand Clap.39"],
    ["Electric Snare (hit)", "Electric Snare.40"],
    ["Snare (side stick) 2", "Sticks.31"],
    ["Low Floor Tom (hit)", "Very Low Floor Tom.41"],
    ["Ride (edge) 2", "Ride Cymbal 2.59"],
    ["Ride (middle) 2", "Ride Cymbal 2.126"],
    ["Ride (bell) 2", "Ride Cymbal 2.127"],
    ["Ride (choke) 2", "Ride Cymbal 2.29"],
    ["Reverse Cymbal (hit)", "Reverse Cymbal.30"],
    ["Metronome (hit)", "Metronome.33"],
    ["Metronome (bell)", "Metronome.34"]
  ]);
  // END generated articulations
  static _gp6ElementAndVariationToArticulation = [
    // known GP6 elements and variations, analyzed from a GPX test file
    // with all instruments inside manually aligned with the same names of articulations in GP7
    // [{articulation index}]   // [{element number}] => {element name} ({variation[0]}, {variation[1]}, {variation[2]})
    [35, 35, 35],
    // [0] => Kick (hit, unused, unused)
    [38, 91, 37],
    // [1] => Snare (hit, rim shot, side stick)
    [99, 100, 99],
    // [2] => Cowbell low (hit, tip, unused)
    [56, 100, 56],
    // [3] => Cowbell medium (hit, tip, unused)
    [102, 103, 102],
    // [4] => Cowbell high (hit, tip, unused)
    [43, 43, 43],
    // [5] => Tom very low (hit, unused, unused)
    [45, 45, 45],
    // [6] => Tom low (hit, unused, unused)
    [47, 47, 47],
    // [7] => Tom medium (hit, unused, unused)
    [48, 48, 48],
    // [8] => Tom high (hit, unused, unused)
    [50, 50, 50],
    // [9] => Tom very high (hit, unused, unused)
    [42, 92, 46],
    // [10] => Hihat (closed, half, open)
    [44, 44, 44],
    // [11] => Pedal hihat (hit, unused, unused)
    [57, 98, 57],
    // [12] => Crash medium (hit, choke, unused)
    [49, 97, 49],
    // [13] => Crash high (hit, choke, unused)
    [55, 95, 55],
    // [14] => Splash (hit, choke, unused)
    [51, 93, 127],
    // [15] => Ride (middle, edge, bell)
    [52, 96, 52]
    // [16] => China (hit, choke, unused)
  ];
  static articulationFromElementVariation(element, variation) {
    if (element < _PercussionMapper._gp6ElementAndVariationToArticulation.length) {
      if (variation >= _PercussionMapper._gp6ElementAndVariationToArticulation.length) {
        variation = 0;
      }
      return _PercussionMapper._gp6ElementAndVariationToArticulation[element][variation];
    }
    return 38;
  }
  static getArticulationName(n) {
    const articulation = _PercussionMapper.getArticulation(n);
    if (articulation) {
      const uniqueId = articulation.uniqueId;
      for (const [name, value2] of _PercussionMapper.instrumentArticulationNames) {
        if (value2 === uniqueId) {
          return name;
        }
      }
    } else {
      const uniqueId = `.${n.percussionArticulation}`;
      for (const [name, value2] of _PercussionMapper.instrumentArticulationNames) {
        if (value2.endsWith(uniqueId)) {
          return name;
        }
      }
    }
    return "Snare (hit)";
  }
  static getArticulation(n) {
    const articulationIndex = n.percussionArticulation;
    if (articulationIndex < 0) {
      return null;
    }
    const trackArticulations = n.beat.voice.bar.staff.track.percussionArticulations;
    if (articulationIndex < trackArticulations.length) {
      return trackArticulations[articulationIndex];
    }
    return _PercussionMapper.getArticulationById(articulationIndex);
  }
  static _instrumentArticulationsById;
  static _initArticulationsById() {
    let lookup2 = _PercussionMapper._instrumentArticulationsById;
    if (!lookup2) {
      lookup2 = /* @__PURE__ */ new Map();
      for (const articulation of _PercussionMapper.instrumentArticulations.values()) {
        lookup2.set(articulation.id, articulation);
      }
      _PercussionMapper._instrumentArticulationsById = lookup2;
    }
    return lookup2;
  }
  static instrumentArticulationIds() {
    const lookup2 = _PercussionMapper._initArticulationsById();
    return lookup2.keys();
  }
  static getArticulationById(id) {
    const lookup2 = _PercussionMapper._initArticulationsById();
    return lookup2.has(id) ? lookup2.get(id) : null;
  }
  static getElementAndVariation(n) {
    const articulation = _PercussionMapper.getArticulation(n);
    if (!articulation) {
      return [-1, -1];
    }
    for (let element = 0; element < _PercussionMapper._gp6ElementAndVariationToArticulation.length; element++) {
      const variations = _PercussionMapper._gp6ElementAndVariationToArticulation[element];
      for (let variation = 0; variation < variations.length; variation++) {
        const gp6Articulation = _PercussionMapper.getArticulationById(variations[variation]);
        if (gp6Articulation?.outputMidiNumber === articulation.outputMidiNumber) {
          return [element, variation];
        }
      }
    }
    return [-1, -1];
  }
  static instrumentArticulationNames = _PercussionMapper._mergeNames([
    /* @__PURE__ */ new Map([
      // these are historical values we supported in the past, but were
      // renamed in Guitar Pro.
      // mostly typos due to typos or clarifications.
      ["Hand (hit)", "Bongo Low.61"],
      ["Tinkle Bell (hat)", "Tingle Bell.83"],
      ["Cymbal (hit)", "Reverse Cymbal.30"],
      ["Snare (side stick) 3", "Snare.37"],
      ["Snare (hit) 2", "Snare.38"],
      ["Snare (hit) 3", "Snare.40"],
      ["Agogo tow (hit)", "Agogo Low.68"],
      ["Triangle (rnute)", "Triangle.80"],
      ["Hand (mute)", "Bongo High.104"],
      ["Hand (slap)", "Bongo High.105"],
      ["Hand (mute) 2", "Bongo Low.106"],
      ["Hand (slap) 2", "Bongo Low.107"],
      ["Piatti (hat)", "Piatti.115"],
      ["Bell Tee (return)", "Bell Tree.123"]
    ]),
    _PercussionMapper._instrumentArticulationNames
  ]);
  static _mergeNames(maps) {
    const merged = new Map(maps[0]);
    for (let i = 1; i < maps.length; i++) {
      for (const [k, v] of maps[i]) {
        merged.set(k, v);
      }
    }
    return merged;
  }
  static _articulationsByOutputNumber;
  static tryMatchKnownArticulation(articulation) {
    let articulationsByOutputNumber = _PercussionMapper._articulationsByOutputNumber;
    if (!articulationsByOutputNumber) {
      articulationsByOutputNumber = /* @__PURE__ */ new Map();
      for (const a of _PercussionMapper.instrumentArticulations.values()) {
        if (!articulationsByOutputNumber.has(a.outputMidiNumber)) {
          articulationsByOutputNumber.set(a.outputMidiNumber, a);
        }
      }
      _PercussionMapper._articulationsByOutputNumber = articulationsByOutputNumber;
    }
    return articulationsByOutputNumber.has(articulation.outputMidiNumber) ? articulationsByOutputNumber.get(articulation.outputMidiNumber).id : -1;
  }
  static _instrumentArticulationsByUniqueId;
  static getInstrumentArticulationByUniqueId(uniqueId) {
    let lookup2 = _PercussionMapper._instrumentArticulationsByUniqueId;
    if (!lookup2) {
      lookup2 = /* @__PURE__ */ new Map();
      for (const articulation of _PercussionMapper.instrumentArticulations.values()) {
        lookup2.set(articulation.uniqueId, articulation);
      }
      _PercussionMapper._instrumentArticulationsByUniqueId = lookup2;
    }
    return lookup2.has(uniqueId) ? lookup2.get(uniqueId) : void 0;
  }
};

// third_party/alphatab/src/model/Note.ts
var NoteIdBag = class {
  tieDestinationNoteId = -1;
  tieOriginNoteId = -1;
  slurDestinationNoteId = -1;
  slurOriginNoteId = -1;
  hammerPullDestinationNoteId = -1;
  hammerPullOriginNoteId = -1;
  slideTargetNoteId = -1;
  slideOriginNoteId = -1;
};
var Note = class _Note {
  /**
   * @internal
   */
  static globalNoteId = 0;
  /**
   * @internal
   */
  static resetIds() {
    _Note.globalNoteId = 0;
  }
  /**
   * Gets or sets the unique id of this note.
   * @clone_ignore
   */
  id = _Note.globalNoteId++;
  /**
   * Gets or sets the zero-based index of this note within the beat.
   * @json_ignore
   */
  index = 0;
  /**
   * Gets or sets the accentuation of this note.
   */
  accentuated = 0 /* None */;
  /**
   * Gets or sets the bend type for this note.
   */
  bendType = 0 /* None */;
  /**
   * Gets or sets the bend style for this note.
   */
  bendStyle = 0 /* Default */;
  /**
   * Gets or sets the note from which this note continues the bend.
   * @clone_ignore
   * @json_ignore
   */
  bendOrigin = null;
  /**
   * Gets or sets whether this note continues a bend from a previous note.
   */
  isContinuedBend = false;
  /**
   * Gets or sets a list of the points defining the bend behavior.
   * @clone_add addBendPoint
   * @json_add addBendPoint
   */
  bendPoints = null;
  /**
   * Gets or sets the bend point with the highest bend value.
   * @clone_ignore
   * @json_ignore
   */
  maxBendPoint = null;
  get hasBend() {
    return this.bendPoints !== null && this.bendType !== 0 /* None */;
  }
  get isStringed() {
    return this.string >= 0;
  }
  /**
   * Gets or sets the fret on which this note is played on the instrument.
   * 0 is the nut.
   */
  fret = -1;
  /**
   * Gets or sets the string number where the note is placed.
   * 1 is the lowest string on the guitar and the bottom line on the tablature.
   * It then increases the the number of strings on available on the track.
   */
  string = -1;
  /**
   * Gets or sets whether the string number for this note should be shown.
   */
  showStringNumber = false;
  get isPiano() {
    return !this.isStringed && this.octave >= 0 && this.tone >= 0;
  }
  /**
   * Gets or sets the octave on which this note is played.
   */
  octave = -1;
  /**
   * Gets or sets the tone of this note within the octave.
   */
  tone = -1;
  get isPercussion() {
    return !this.isStringed && this.percussionArticulation >= 0;
  }
  /**
   * Gets or sets the percusson element.
   * @deprecated
   */
  get element() {
    return this.isPercussion ? PercussionMapper.getElementAndVariation(this)[0] : -1;
  }
  /**
   * Gets or sets the variation of this note.
   * @deprecated
   */
  get variation() {
    return this.isPercussion ? PercussionMapper.getElementAndVariation(this)[1] : -1;
  }
  /**
   * Gets or sets the index of percussion articulation in the related `track.percussionArticulations`.
   * If the articulation is not listed in `track.percussionArticulations` the following list based on GP7 applies:
   * - 029 Ride (choke)
   * - 030 Cymbal (hit)
   * - 031 Snare (side stick)
   * - 033 Snare (side stick)
   * - 034 Snare (hit)
   * - 035 Kick (hit)
   * - 036 Kick (hit)
   * - 037 Snare (side stick)
   * - 038 Snare (hit)
   * - 039 Hand Clap (hit)
   * - 040 Snare (hit)
   * - 041 Low Floor Tom (hit)
   * - 042 Hi-Hat (closed)
   * - 043 Very Low Tom (hit)
   * - 044 Pedal Hi-Hat (hit)
   * - 045 Low Tom (hit)
   * - 046 Hi-Hat (open)
   * - 047 Mid Tom (hit)
   * - 048 High Tom (hit)
   * - 049 Crash high (hit)
   * - 050 High Floor Tom (hit)
   * - 051 Ride (middle)
   * - 052 China (hit)
   * - 053 Ride (bell)
   * - 054 Tambourine (hit)
   * - 055 Splash (hit)
   * - 056 Cowbell medium (hit)
   * - 057 Crash medium (hit)
   * - 058 Vibraslap (hit)
   * - 059 Ride (edge)
   * - 060 Hand (hit)
   * - 061 Hand (hit)
   * - 062 Conga high (mute)
   * - 063 Conga high (hit)
   * - 064 Conga low (hit)
   * - 065 Timbale high (hit)
   * - 066 Timbale low (hit)
   * - 067 Agogo high (hit)
   * - 068 Agogo tow (hit)
   * - 069 Cabasa (hit)
   * - 070 Left Maraca (hit)
   * - 071 Whistle high (hit)
   * - 072 Whistle low (hit)
   * - 073 Guiro (hit)
   * - 074 Guiro (scrap-return)
   * - 075 Claves (hit)
   * - 076 Woodblock high (hit)
   * - 077 Woodblock low (hit)
   * - 078 Cuica (mute)
   * - 079 Cuica (open)
   * - 080 Triangle (rnute)
   * - 081 Triangle (hit)
   * - 082 Shaker (hit)
   * - 083 Tinkle Bell (hat)
   * - 083 Jingle Bell (hit)
   * - 084 Bell Tree (hit)
   * - 085 Castanets (hit)
   * - 086 Surdo (hit)
   * - 087 Surdo (mute)
   * - 091 Snare (rim shot)
   * - 092 Hi-Hat (half)
   * - 093 Ride (edge)
   * - 094 Ride (choke)
   * - 095 Splash (choke)
   * - 096 China (choke)
   * - 097 Crash high (choke)
   * - 098 Crash medium (choke)
   * - 099 Cowbell low (hit)
   * - 100 Cowbell low (tip)
   * - 101 Cowbell medium (tip)
   * - 102 Cowbell high (hit)
   * - 103 Cowbell high (tip)
   * - 104 Hand (mute)
   * - 105 Hand (slap)
   * - 106 Hand (mute)
   * - 107 Hand (slap)
   * - 108 Conga low (slap)
   * - 109 Conga low (mute)
   * - 110 Conga high (slap)
   * - 111 Tambourine (return)
   * - 112 Tambourine (roll)
   * - 113 Tambourine (hand)
   * - 114 Grancassa (hit)
   * - 115 Piatti (hat)
   * - 116 Piatti (hand)
   * - 117 Cabasa (return)
   * - 118 Left Maraca (return)
   * - 119 Right Maraca (hit)
   * - 120 Right Maraca (return)
   * - 122 Shaker (return)
   * - 123 Bell Tee (return)
   * - 124 Golpe (thumb)
   * - 125 Golpe (finger)
   * - 126 Ride (middle)
   * - 127 Ride (bell)
   */
  percussionArticulation = -1;
  /**
   * Gets or sets whether this note is visible on the music sheet.
   */
  isVisible = true;
  /**
   * Gets a value indicating whether the note is left hand tapped.
   */
  isLeftHandTapped = false;
  /**
   * Gets or sets whether this note starts a hammeron or pulloff.
   */
  isHammerPullOrigin = false;
  get isHammerPullDestination() {
    return !!this.hammerPullOrigin;
  }
  /**
   * Gets the origin of the hammeron/pulloff of this note.
   * @clone_ignore
   * @json_ignore
   */
  hammerPullOrigin = null;
  /**
   * Gets the destination for the hammeron/pullof started by this note.
   * @clone_ignore
   * @json_ignore
   */
  hammerPullDestination = null;
  get isSlurOrigin() {
    return !!this.slurDestination;
  }
  /**
   * Gets or sets whether this note finishes a slur.
   */
  isSlurDestination = false;
  /**
   * Gets or sets the note where the slur of this note starts.
   * @clone_ignore
   * @json_ignore
   */
  slurOrigin = null;
  /**
   * Gets or sets the note where the slur of this note ends.
   * @clone_ignore
   * @json_ignore
   */
  slurDestination = null;
  get isHarmonic() {
    return this.harmonicType !== 0 /* None */;
  }
  /**
   * Gets or sets the harmonic type applied to this note.
   */
  harmonicType = 0 /* None */;
  /**
   * Gets or sets the value defining the harmonic pitch.
   */
  harmonicValue = 0;
  /**
   * Gets or sets whether the note is a ghost note and shown in parenthesis. Also this will make the note a bit more silent.
   */
  isGhost = false;
  /**
   * Gets or sets whether this note has a let-ring effect.
   */
  isLetRing = false;
  /**
   * Gets or sets the destination note for the let-ring effect.
   * @clone_ignore
   * @json_ignore
   */
  letRingDestination = null;
  /**
   * Gets or sets whether this note has a palm-mute effect.
   */
  isPalmMute = false;
  /**
   * Gets or sets the destination note for the palm-mute effect.
   * @clone_ignore
   * @json_ignore
   */
  palmMuteDestination = null;
  /**
   * Gets or sets whether the note is shown and played as dead note.
   */
  isDead = false;
  /**
   * Gets or sets whether the note is played as staccato.
   */
  isStaccato = false;
  /**
   * Gets or sets the slide-in type this note is played with.
   */
  slideInType = 0 /* None */;
  /**
   * Gets or sets the slide-out type this note is played with.
   */
  slideOutType = 0 /* None */;
  /**
   * Gets or sets the target note for several slide types.
   * @clone_ignore
   * @json_ignore
   */
  slideTarget = null;
  /**
   * Gets or sets the source note for several slide types.
   * @clone_ignore
   * @json_ignore
   */
  slideOrigin = null;
  /**
   * Gets or sets whether a vibrato is played on the note.
   */
  vibrato = 0 /* None */;
  /**
   * Gets the origin of the tied if this note is tied.
   * @clone_ignore
   * @json_ignore
   */
  tieOrigin = null;
  /**
   * Gets the desination of the tie.
   * @clone_ignore
   * @json_ignore
   */
  tieDestination = null;
  /**
   * Gets or sets whether this note is ends a tied note.
   */
  isTieDestination = false;
  get isTieOrigin() {
    return this.tieDestination !== null;
  }
  /**
   * Gets or sets the fingers used for this note on the left hand.
   */
  leftHandFinger = -2 /* Unknown */;
  /**
   * Gets or sets the fingers used for this note on the right hand.
   */
  rightHandFinger = -2 /* Unknown */;
  /**
   * Gets or sets whether this note has fingering defined.
   */
  get isFingering() {
    return this.leftHandFinger !== -2 /* Unknown */ || this.rightHandFinger !== -2 /* Unknown */;
  }
  /**
   * Gets or sets the target note value for the trill effect.
   */
  trillValue = -1;
  get trillFret() {
    return this.trillValue - this.stringTuning;
  }
  get isTrill() {
    return this.trillValue >= 0;
  }
  /**
   * Gets or sets the speed of the trill effect.
   */
  trillSpeed = 32 /* ThirtySecond */;
  /**
   * Gets or sets the percentual duration of the note relative to the overall beat duration.
   */
  durationPercent = 1;
  /**
   * Gets or sets how accidetnals for this note should  be handled.
   */
  accidentalMode = 0 /* Default */;
  /**
   * Gets or sets the reference to the parent beat to which this note belongs to.
   * @clone_ignore
   * @json_ignore
   */
  beat;
  /**
   * Gets or sets the dynamics for this note.
   */
  dynamics = 5 /* F */;
  /**
   * @clone_ignore
   * @json_ignore
   */
  isEffectSlurOrigin = false;
  /**
   * @clone_ignore
   * @json_ignore
   */
  hasEffectSlur = false;
  get isEffectSlurDestination() {
    return !!this.effectSlurOrigin;
  }
  /**
   * @clone_ignore
   * @json_ignore
   */
  effectSlurOrigin = null;
  /**
   * @clone_ignore
   * @json_ignore
   */
  effectSlurDestination = null;
  /**
   * The {@link Slur} object whose origin is this note. Populated by
   * `finish()`; non-null only on the chain-origin note of an effect
   * slur. Carries the inner articulation segments used by the
   * renderer to paint H/P/sl. labels along the arc.
   * @clone_ignore
   * @json_ignore
   * @internal
   */
  effectSlur = null;
  /**
   * The ornament applied on the note.
   */
  ornament = 0 /* None */;
  /**
   * The style customizations for this item.
   * @clone_ignore
   */
  style;
  get stringTuning() {
    return this.beat.voice.bar.staff.capo + _Note.getStringTuning(this.beat.voice.bar.staff, this.string);
  }
  static getStringTuning(staff, noteString) {
    if (staff.tuning.length > 0) {
      return staff.tuning[staff.tuning.length - (noteString - 1) - 1];
    }
    return 0;
  }
  get realValue() {
    return this.calculateRealValue(true, true);
  }
  get realValueWithoutHarmonic() {
    return this.calculateRealValue(true, false);
  }
  /**
   * Calculates the real note value of this note as midi key respecting the given options.
   * @param applyTranspositionPitch Whether or not to apply the transposition pitch of the current staff.
   * @param applyHarmonic Whether or not to apply harmonic pitches to the note.
   * @returns The calculated note value as midi key.
   */
  calculateRealValue(applyTranspositionPitch, applyHarmonic) {
    const transpositionPitch = applyTranspositionPitch ? this.beat.voice.bar.staff.transpositionPitch : 0;
    if (applyHarmonic) {
      let realValue = this.calculateRealValue(applyTranspositionPitch, false);
      if (this.isStringed) {
        if (this.harmonicType === 1 /* Natural */) {
          realValue = this.harmonicPitch + this.stringTuning - transpositionPitch;
        } else {
          realValue += this.harmonicPitch;
        }
      }
      return realValue;
    }
    if (this.isPercussion) {
      return this.percussionArticulation;
    }
    if (this.isStringed) {
      return this.fret + this.stringTuning - transpositionPitch;
    }
    if (this.isPiano) {
      return this.octave * 12 + this.tone - transpositionPitch;
    }
    return 0;
  }
  get harmonicPitch() {
    if (this.harmonicType === 0 /* None */ || !this.isStringed) {
      return 0;
    }
    const value2 = this.harmonicValue;
    if (ModelUtils.isAlmostEqualTo(value2, 2.4)) {
      return 36;
    }
    if (ModelUtils.isAlmostEqualTo(value2, 2.7)) {
      return 34;
    }
    if (value2 < 3) {
      return 0;
    }
    if (value2 <= 3.5) {
      return 31;
    }
    if (value2 <= 4) {
      return 28;
    }
    if (value2 <= 5) {
      return 24;
    }
    if (value2 <= 6) {
      return 34;
    }
    if (value2 <= 7) {
      return 19;
    }
    if (value2 <= 8.5) {
      return 36;
    }
    if (value2 <= 9) {
      return 28;
    }
    if (value2 <= 10) {
      return 34;
    }
    if (value2 <= 11) {
      return 0;
    }
    if (value2 <= 12) {
      return 12;
    }
    if (value2 < 14) {
      return 0;
    }
    if (value2 <= 15) {
      return 34;
    }
    if (value2 <= 16) {
      return 28;
    }
    if (value2 <= 17) {
      return 36;
    }
    if (value2 <= 18) {
      return 0;
    }
    if (value2 <= 19) {
      return 19;
    }
    if (value2 <= 21) {
      return 0;
    }
    if (value2 <= 22) {
      return 36;
    }
    if (value2 <= 24) {
      return 24;
    }
    return 0;
  }
  get initialBendValue() {
    if (this.hasBend) {
      return Math.floor(this.bendPoints[0].value / 2);
    }
    if (this.bendOrigin) {
      return Math.floor(this.bendOrigin.bendPoints[this.bendOrigin.bendPoints.length - 1].value / 2);
    }
    if (this.isTieDestination && this.tieOrigin.bendOrigin) {
      return Math.floor(
        this.tieOrigin.bendOrigin.bendPoints[this.tieOrigin.bendOrigin.bendPoints.length - 1].value / 2
      );
    }
    if (this.beat.hasWhammyBar) {
      return Math.floor(this.beat.whammyBarPoints[0].value / 2);
    }
    if (this.beat.isContinuedWhammy) {
      return Math.floor(
        this.beat.previousBeat.whammyBarPoints[this.beat.previousBeat.whammyBarPoints.length - 1].value / 2
      );
    }
    return 0;
  }
  get displayValue() {
    return this.displayValueWithoutBend + this.initialBendValue;
  }
  get displayValueWithoutBend() {
    let noteValue = this.realValue;
    if (this.harmonicType !== 1 /* Natural */ && this.harmonicType !== 0 /* None */) {
      noteValue -= this.harmonicPitch;
    }
    switch (this.beat.ottava) {
      case 0 /* _15ma */:
        noteValue -= 24;
        break;
      case 1 /* _8va */:
        noteValue -= 12;
        break;
      case 2 /* Regular */:
        break;
      case 3 /* _8vb */:
        noteValue += 12;
        break;
      case 4 /* _15mb */:
        noteValue += 24;
        break;
    }
    switch (this.beat.voice.bar.clefOttava) {
      case 0 /* _15ma */:
        noteValue -= 24;
        break;
      case 1 /* _8va */:
        noteValue -= 12;
        break;
      case 2 /* Regular */:
        break;
      case 3 /* _8vb */:
        noteValue += 12;
        break;
      case 4 /* _15mb */:
        noteValue += 24;
        break;
    }
    return noteValue - this.beat.voice.bar.staff.displayTranspositionPitch;
  }
  get hasQuarterToneOffset() {
    if (this.hasBend) {
      return this.bendPoints[0].value % 2 !== 0;
    }
    if (this.bendOrigin) {
      return this.bendOrigin.bendPoints[this.bendOrigin.bendPoints.length - 1].value % 2 !== 0;
    }
    if (this.beat.hasWhammyBar) {
      return this.beat.whammyBarPoints[0].value % 2 !== 0;
    }
    if (this.beat.isContinuedWhammy) {
      return this.beat.previousBeat.whammyBarPoints[this.beat.previousBeat.whammyBarPoints.length - 1].value % 2 !== 0;
    }
    return false;
  }
  addBendPoint(point) {
    let points = this.bendPoints;
    if (points === null) {
      points = [];
      this.bendPoints = points;
    }
    points.push(point);
    if (!this.maxBendPoint || point.value > this.maxBendPoint.value) {
      this.maxBendPoint = point;
    }
    if (this.bendType === 0 /* None */) {
      this.bendType = 1 /* Custom */;
    }
  }
  finish(settings, sharedDataBag = null) {
    const nextNoteOnLine = new Lazy(() => _Note.nextNoteOnSameLine(this));
    const isSongBook = settings && settings.notation.notationMode === 1 /* SongBook */;
    if (this.isTieDestination) {
      this.chain(sharedDataBag);
      if (isSongBook && this.tieOrigin && this.tieOrigin.isLetRing) {
        this.isLetRing = true;
      }
    }
    if (this.isLetRing) {
      if (!nextNoteOnLine.value || !nextNoteOnLine.value.isLetRing) {
        this.letRingDestination = this;
      } else {
        this.letRingDestination = nextNoteOnLine.value;
      }
      if (isSongBook && this.isTieDestination && !this.tieOrigin.hasBend) {
        this.isVisible = false;
      }
    }
    if (this.isPalmMute) {
      if (!nextNoteOnLine.value || !nextNoteOnLine.value.isPalmMute) {
        this.palmMuteDestination = this;
      } else {
        this.palmMuteDestination = nextNoteOnLine.value;
      }
    }
    if (this.isHammerPullOrigin) {
      const hammerPullDestination = _Note.findHammerPullDestination(this);
      if (!hammerPullDestination) {
        this.isHammerPullOrigin = false;
      } else {
        this.hammerPullDestination = hammerPullDestination;
        hammerPullDestination.hammerPullOrigin = this;
      }
    }
    switch (this.slideOutType) {
      case 1 /* Shift */:
      case 2 /* Legato */:
        if (!this.slideTarget) {
          this.slideTarget = nextNoteOnLine.value;
        }
        if (!this.slideTarget) {
          this.slideOutType = 0 /* None */;
        } else {
          this.slideTarget.slideOrigin = this;
        }
        break;
    }
    let effectSlurDestination = null;
    let effectSlurSegmentKind = null;
    if (this.isHammerPullOrigin && this.hammerPullDestination) {
      effectSlurDestination = this.hammerPullDestination;
      effectSlurSegmentKind = 0 /* HammerPull */;
    } else if (this.slideOutType === 2 /* Legato */ && this.slideTarget) {
      effectSlurDestination = this.slideTarget;
      effectSlurSegmentKind = 1 /* LegatoSlide */;
    }
    if (effectSlurDestination) {
      this.hasEffectSlur = true;
      if (this.effectSlurOrigin && this.beat.pickStroke === 0 /* None */) {
        const chainOrigin = this.effectSlurOrigin;
        chainOrigin.effectSlurDestination = effectSlurDestination;
        effectSlurDestination.effectSlurOrigin = chainOrigin;
        this.effectSlurOrigin = null;
        if (effectSlurSegmentKind !== null && chainOrigin.effectSlur !== null) {
          chainOrigin.effectSlur.destinationNote = effectSlurDestination;
          chainOrigin.effectSlur.segments.push({
            fromNote: this,
            toNote: effectSlurDestination,
            kind: effectSlurSegmentKind,
            text: null
          });
        }
      } else {
        this.isEffectSlurOrigin = true;
        this.effectSlurDestination = effectSlurDestination;
        effectSlurDestination.effectSlurOrigin = this;
        const slur = new Slur();
        slur.originNote = this;
        slur.destinationNote = effectSlurDestination;
        if (effectSlurSegmentKind !== null) {
          slur.segments.push({
            fromNote: this,
            toNote: effectSlurDestination,
            kind: effectSlurSegmentKind,
            text: null
          });
        }
        this.effectSlur = slur;
      }
    }
    const points = this.bendPoints;
    const hasBend = points != null && points.length > 0;
    if (hasBend) {
      const isContinuedBend = this.isTieDestination && this.tieOrigin.hasBend;
      this.isContinuedBend = isContinuedBend;
    } else {
      this.bendType = 0 /* None */;
    }
    if (hasBend && this.bendType === 1 /* Custom */) {
      if (points.length === 4) {
        const origin = points[0];
        const middle1 = points[1];
        const middle2 = points[2];
        const destination = points[3];
        if (middle1.value === middle2.value) {
          if (destination.value > origin.value) {
            if (middle1.value > destination.value) {
              this.bendType = 4 /* BendRelease */;
            } else if (!this.isContinuedBend && origin.value > 0) {
              this.bendType = 7 /* PrebendBend */;
              points.splice(2, 1);
              points.splice(1, 1);
            } else {
              this.bendType = 2 /* Bend */;
              points.splice(2, 1);
              points.splice(1, 1);
            }
          } else if (destination.value < origin.value) {
            if (this.isContinuedBend) {
              this.bendType = 3 /* Release */;
              points.splice(2, 1);
              points.splice(1, 1);
            } else {
              this.bendType = 8 /* PrebendRelease */;
              points.splice(2, 1);
              points.splice(1, 1);
            }
          } else {
            if (middle1.value > origin.value) {
              this.bendType = 4 /* BendRelease */;
            } else if (origin.value > 0 && !this.isContinuedBend) {
              this.bendType = 6 /* Prebend */;
              points.splice(2, 1);
              points.splice(1, 1);
            } else {
              this.bendType = 5 /* Hold */;
              points.splice(2, 1);
              points.splice(1, 1);
            }
          }
        } else {
          Logger.warning("Model", "Unsupported bend type detected, fallback to custom", null);
        }
      } else if (points.length === 3) {
        const origin = points[0];
        const middle = points[1];
        const destination = points[2];
        if (destination.value > origin.value) {
          if (middle.value > destination.value) {
            this.bendType = 4 /* BendRelease */;
            points.splice(1, 0, new BendPoint(middle.offset, middle.value));
          } else if (!this.isContinuedBend && origin.value > 0) {
            this.bendType = 7 /* PrebendBend */;
            points.splice(1, 1);
          } else {
            this.bendType = 2 /* Bend */;
            points.splice(1, 1);
          }
        } else if (destination.value < origin.value) {
          if (this.isContinuedBend) {
            this.bendType = 3 /* Release */;
            points.splice(1, 1);
          } else {
            this.bendType = 8 /* PrebendRelease */;
            points.splice(1, 1);
          }
        } else {
          if (middle.value > origin.value) {
            this.bendType = 4 /* BendRelease */;
            points.splice(1, 0, new BendPoint(middle.offset, middle.value));
          } else if (origin.value > 0 && !this.isContinuedBend) {
            this.bendType = 6 /* Prebend */;
            points.splice(1, 1);
          } else {
            this.bendType = 5 /* Hold */;
            points.splice(1, 1);
          }
        }
      } else if (points.length === 2) {
        const origin = points[0];
        const destination = points[1];
        if (destination.value > origin.value) {
          if (!this.isContinuedBend && origin.value > 0) {
            this.bendType = 7 /* PrebendBend */;
          } else {
            this.bendType = 2 /* Bend */;
          }
        } else if (destination.value < origin.value) {
          if (this.isContinuedBend) {
            this.bendType = 3 /* Release */;
          } else {
            this.bendType = 8 /* PrebendRelease */;
          }
        } else {
          if (origin.value > 0 && !this.isContinuedBend) {
            this.bendType = 6 /* Prebend */;
          } else {
            this.bendType = 5 /* Hold */;
          }
        }
      }
    }
    if (this.initialBendValue > 0) {
      this.accidentalMode = 0 /* Default */;
    }
  }
  static _maxOffsetForSameLineSearch = 3;
  static nextNoteOnSameLine(note) {
    let nextBeat = note.beat.nextBeat;
    while (nextBeat && nextBeat.voice.bar.index <= note.beat.voice.bar.index + _Note._maxOffsetForSameLineSearch) {
      const noteOnString = nextBeat.getNoteOnString(note.string);
      if (noteOnString) {
        return noteOnString;
      }
      nextBeat = nextBeat.nextBeat;
    }
    return null;
  }
  static findHammerPullDestination(note) {
    let nextBeat = note.beat.nextBeat;
    while (nextBeat && nextBeat.voice.bar.index <= note.beat.voice.bar.index + _Note._maxOffsetForSameLineSearch) {
      let noteOnString = nextBeat.getNoteOnString(note.string);
      if (noteOnString) {
        return noteOnString;
      }
      for (let str = note.string; str > 0; str--) {
        noteOnString = nextBeat.getNoteOnString(str);
        if (noteOnString) {
          if (noteOnString.isLeftHandTapped) {
            return noteOnString;
          }
          break;
        }
      }
      for (let str = note.string; str <= note.beat.voice.bar.staff.tuning.length; str++) {
        noteOnString = nextBeat.getNoteOnString(str);
        if (noteOnString) {
          if (noteOnString.isLeftHandTapped) {
            return noteOnString;
          }
          break;
        }
      }
      nextBeat = nextBeat.nextBeat;
    }
    return null;
  }
  static findTieOrigin(note) {
    let previousBeat = note.beat.previousBeat;
    while (previousBeat && previousBeat.voice.bar.index >= note.beat.voice.bar.index - _Note._maxOffsetForSameLineSearch) {
      if (note.isStringed) {
        const noteOnString = previousBeat.getNoteOnString(note.string);
        if (noteOnString) {
          return noteOnString;
        }
      } else {
        if (note.octave === -1 && note.tone === -1) {
          if (note.index < previousBeat.notes.length) {
            return previousBeat.notes[note.index];
          }
        } else {
          const noteWithValue = previousBeat.getNoteWithRealValue(note.realValue);
          if (noteWithValue) {
            return noteWithValue;
          }
        }
      }
      previousBeat = previousBeat.previousBeat;
    }
    return null;
  }
  static _noteIdLookupKey = "NoteIdLookup";
  _noteIdBag = null;
  chain(sharedDataBag = null) {
    if (sharedDataBag === null) {
      return;
    }
    if (this._noteIdBag !== null) {
      let noteIdLookup;
      if (sharedDataBag.has(_Note._noteIdLookupKey)) {
        noteIdLookup = sharedDataBag.get(_Note._noteIdLookupKey);
      } else {
        noteIdLookup = /* @__PURE__ */ new Map();
        sharedDataBag.set(_Note._noteIdLookupKey, noteIdLookup);
      }
      if (this._noteIdBag.hammerPullDestinationNoteId !== -1 || this._noteIdBag.tieDestinationNoteId !== -1 || this._noteIdBag.slurDestinationNoteId !== -1 || this._noteIdBag.slideTargetNoteId !== -1) {
        noteIdLookup.set(this.id, this);
      }
      if (this._noteIdBag.hammerPullOriginNoteId !== -1) {
        this.hammerPullOrigin = noteIdLookup.get(this._noteIdBag.hammerPullOriginNoteId);
        this.hammerPullOrigin.hammerPullDestination = this;
      }
      if (this._noteIdBag.tieOriginNoteId !== -1) {
        this.tieOrigin = noteIdLookup.get(this._noteIdBag.tieOriginNoteId);
        this.tieOrigin.tieDestination = this;
      }
      if (this._noteIdBag.slurOriginNoteId !== -1) {
        this.slurOrigin = noteIdLookup.get(this._noteIdBag.slurOriginNoteId);
        this.slurOrigin.slurDestination = this;
      }
      if (this._noteIdBag.slideOriginNoteId !== -1) {
        this.slideOrigin = noteIdLookup.get(this._noteIdBag.slideOriginNoteId);
        this.slideOrigin.slideTarget = this;
      }
      this._noteIdBag = null;
    } else {
      if (!this.isTieDestination && this.tieOrigin === null) {
        return;
      }
      const tieOrigin = this.tieOrigin ?? _Note.findTieOrigin(this);
      if (!tieOrigin) {
        this.isTieDestination = false;
      } else {
        tieOrigin.tieDestination = this;
        this.tieOrigin = tieOrigin;
        this.fret = tieOrigin.fret;
        this.octave = tieOrigin.octave;
        this.tone = tieOrigin.tone;
        if (tieOrigin.hasBend) {
          this.bendOrigin = this.tieOrigin;
        }
      }
    }
  }
  /**
   * @internal
   */
  toJson(o) {
    if (this.tieDestination !== null) {
      o.set("tiedestinationnoteid", this.tieDestination.id);
    }
    if (this.tieOrigin !== null) {
      o.set("tieoriginnoteid", this.tieOrigin.id);
    }
    if (this.slurDestination !== null) {
      o.set("slurdestinationnoteid", this.slurDestination.id);
    }
    if (this.slurOrigin !== null) {
      o.set("sluroriginnoteid", this.slurOrigin.id);
    }
    if (this.hammerPullOrigin !== null) {
      o.set("hammerpulloriginnoteid", this.hammerPullOrigin.id);
    }
    if (this.hammerPullDestination !== null) {
      o.set("hammerpulldestinationnoteid", this.hammerPullDestination.id);
    }
    if (this.slideTarget !== null) {
      o.set("slidetargetnoteid", this.slideTarget.id);
    }
    if (this.slideOrigin !== null) {
      o.set("slideoriginnoteid", this.slideOrigin.id);
    }
  }
  /**
   * @internal
   */
  setProperty(property, v) {
    switch (property) {
      case "tiedestinationnoteid":
        if (this._noteIdBag == null) {
          this._noteIdBag = new NoteIdBag();
        }
        this._noteIdBag.tieDestinationNoteId = v;
        return true;
      case "tieoriginnoteid":
        if (this._noteIdBag == null) {
          this._noteIdBag = new NoteIdBag();
        }
        this._noteIdBag.tieOriginNoteId = v;
        return true;
      case "slurdestinationnoteid":
        if (this._noteIdBag == null) {
          this._noteIdBag = new NoteIdBag();
        }
        this._noteIdBag.slurDestinationNoteId = v;
        return true;
      case "sluroriginnoteid":
        if (this._noteIdBag == null) {
          this._noteIdBag = new NoteIdBag();
        }
        this._noteIdBag.slurOriginNoteId = v;
        return true;
      case "hammerpulloriginnoteid":
        if (this._noteIdBag == null) {
          this._noteIdBag = new NoteIdBag();
        }
        this._noteIdBag.hammerPullOriginNoteId = v;
        return true;
      case "hammerpulldestinationnoteid":
        if (this._noteIdBag == null) {
          this._noteIdBag = new NoteIdBag();
        }
        this._noteIdBag.hammerPullDestinationNoteId = v;
        return true;
      case "slidetargetnoteid":
        if (this._noteIdBag == null) {
          this._noteIdBag = new NoteIdBag();
        }
        this._noteIdBag.slideTargetNoteId = v;
        return true;
      case "slideoriginnoteid":
        if (this._noteIdBag == null) {
          this._noteIdBag = new NoteIdBag();
        }
        this._noteIdBag.slideOriginNoteId = v;
        return true;
    }
    return false;
  }
};

// third_party/alphatab/src/model/TupletGroup.ts
var TupletGroup = class _TupletGroup {
  static _halfTicks = 1920;
  static _quarterTicks = 960;
  static _eighthTicks = 480;
  static _sixteenthTicks = 240;
  static _thirtySecondTicks = 120;
  static _sixtyFourthTicks = 60;
  static _oneHundredTwentyEighthTicks = 30;
  static _twoHundredFiftySixthTicks = 15;
  static _allTicks = [
    _TupletGroup._halfTicks,
    _TupletGroup._quarterTicks,
    _TupletGroup._eighthTicks,
    _TupletGroup._sixteenthTicks,
    _TupletGroup._thirtySecondTicks,
    _TupletGroup._sixtyFourthTicks,
    _TupletGroup._oneHundredTwentyEighthTicks,
    _TupletGroup._twoHundredFiftySixthTicks
  ];
  _isEqualLengthTuplet = true;
  totalDuration = 0;
  /**
   * Gets or sets the list of beats contained in this group.
   */
  beats = [];
  /**
   * Gets or sets the voice this group belongs to.
   */
  voice;
  /**
   * Gets a value indicating whether the tuplet group is fully filled.
   */
  isFull = false;
  /**
   * Initializes a new instance of the {@link TupletGroup} class.
   * @param voice The voice this group belongs to.
   */
  constructor(voice) {
    this.voice = voice;
  }
  check(beat) {
    if (this.beats.length === 0) {
      this.beats.push(beat);
      this.totalDuration += beat.playbackDuration;
      return true;
    }
    if (beat.graceType !== 0 /* None */) {
      return true;
    }
    if (beat.voice !== this.voice || this.isFull || beat.tupletNumerator !== this.beats[0].tupletNumerator || beat.tupletDenominator !== this.beats[0].tupletDenominator) {
      return false;
    }
    if (beat.displayDuration !== this.beats[0].displayDuration) {
      this._isEqualLengthTuplet = false;
    }
    this.beats.push(beat);
    this.totalDuration += beat.displayDuration;
    if (this._isEqualLengthTuplet) {
      if (this.beats.length === this.beats[0].tupletNumerator) {
        this.isFull = true;
      }
    } else {
      const factor = this.beats[0].tupletNumerator / this.beats[0].tupletDenominator | 0;
      for (const potentialMatch of _TupletGroup._allTicks) {
        if (this.totalDuration === potentialMatch * factor) {
          this.isFull = true;
          break;
        }
      }
    }
    return true;
  }
};

// third_party/alphatab/src/generated/model/BendPointCloner.ts
var BendPointCloner = class {
  static clone(original) {
    const clone = new BendPoint();
    clone.offset = original.offset;
    clone.value = original.value;
    return clone;
  }
};

// third_party/alphatab/src/generated/model/NoteCloner.ts
var NoteCloner = class {
  static clone(original) {
    const clone = new Note();
    clone.index = original.index;
    clone.accentuated = original.accentuated;
    clone.bendType = original.bendType;
    clone.bendStyle = original.bendStyle;
    clone.isContinuedBend = original.isContinuedBend;
    if (original.bendPoints) {
      clone.bendPoints = [];
      for (const i of original.bendPoints) {
        clone.addBendPoint(BendPointCloner.clone(i));
      }
    }
    clone.fret = original.fret;
    clone.string = original.string;
    clone.showStringNumber = original.showStringNumber;
    clone.octave = original.octave;
    clone.tone = original.tone;
    clone.percussionArticulation = original.percussionArticulation;
    clone.isVisible = original.isVisible;
    clone.isLeftHandTapped = original.isLeftHandTapped;
    clone.isHammerPullOrigin = original.isHammerPullOrigin;
    clone.isSlurDestination = original.isSlurDestination;
    clone.harmonicType = original.harmonicType;
    clone.harmonicValue = original.harmonicValue;
    clone.isGhost = original.isGhost;
    clone.isLetRing = original.isLetRing;
    clone.isPalmMute = original.isPalmMute;
    clone.isDead = original.isDead;
    clone.isStaccato = original.isStaccato;
    clone.slideInType = original.slideInType;
    clone.slideOutType = original.slideOutType;
    clone.vibrato = original.vibrato;
    clone.isTieDestination = original.isTieDestination;
    clone.leftHandFinger = original.leftHandFinger;
    clone.rightHandFinger = original.rightHandFinger;
    clone.trillValue = original.trillValue;
    clone.trillSpeed = original.trillSpeed;
    clone.durationPercent = original.durationPercent;
    clone.accidentalMode = original.accidentalMode;
    clone.dynamics = original.dynamics;
    clone.ornament = original.ornament;
    return clone;
  }
};

// third_party/alphatab/src/generated/model/SyncPointDataCloner.ts
var SyncPointDataCloner = class {
  static clone(original) {
    const clone = new SyncPointData();
    clone.barOccurence = original.barOccurence;
    clone.millisecondOffset = original.millisecondOffset;
    return clone;
  }
};

// third_party/alphatab/src/generated/model/AutomationCloner.ts
var AutomationCloner = class {
  static clone(original) {
    const clone = new Automation();
    clone.isLinear = original.isLinear;
    clone.type = original.type;
    clone.value = original.value;
    clone.syncPointValue = original.syncPointValue ? SyncPointDataCloner.clone(original.syncPointValue) : void 0;
    clone.ratioPosition = original.ratioPosition;
    clone.text = original.text;
    clone.isVisible = original.isVisible;
    return clone;
  }
};

// third_party/alphatab/src/model/TremoloPickingEffect.ts
var TremoloPickingEffect = class {
  /**
   * The minimum number of marks for the tremolo picking effect to be valid.
   */
  static minMarks = 0;
  /**
   * The max number of marks for the tremolo picking effect to be valid.
   */
  static maxMarks = 5;
  /**
   * The number of marks for the tremolo.
   * A mark is equal to a single bar shown for a default tremolos.
   */
  marks = 0;
  /**
   * The style of the tremolo picking.
   */
  style = 0 /* Default */;
  /**
   * @internal
   * @deprecated use {@link getDurationAsTicks} to handle tremolo durations shorter than typical durations.
   */
  getDuration(beatDuration) {
    let marks = this.marks;
    if (marks < 1) {
      marks = 1;
    }
    const baseDuration = beatDuration;
    const actualDuration = baseDuration * Math.pow(2, marks);
    if (actualDuration <= 256 /* TwoHundredFiftySixth */) {
      return actualDuration;
    } else {
      return 256 /* TwoHundredFiftySixth */;
    }
  }
  /**
   * Gets the duration of a single tremolo note played in a beat of the given duration
   * based on the configured marks.
   */
  getDurationAsTicks(beatDuration) {
    let marks = this.marks;
    if (marks < 1) {
      marks = 1;
    }
    const baseDuration = beatDuration;
    const actualDuration = baseDuration * Math.pow(2, marks);
    return MidiUtils.valueToTicks(actualDuration);
  }
};

// third_party/alphatab/src/generated/model/TremoloPickingEffectCloner.ts
var TremoloPickingEffectCloner = class {
  static clone(original) {
    const clone = new TremoloPickingEffect();
    clone.marks = original.marks;
    clone.style = original.style;
    return clone;
  }
};

// third_party/alphatab/src/generated/model/BeatCloner.ts
var BeatCloner = class {
  static clone(original) {
    const clone = new Beat();
    clone.index = original.index;
    clone.notes = [];
    for (const i of original.notes) {
      clone.addNote(NoteCloner.clone(i));
    }
    clone.isEmpty = original.isEmpty;
    clone.whammyStyle = original.whammyStyle;
    clone.ottava = original.ottava;
    clone.isLegatoOrigin = original.isLegatoOrigin;
    clone.duration = original.duration;
    clone.isLetRing = original.isLetRing;
    clone.isPalmMute = original.isPalmMute;
    clone.automations = [];
    for (const i of original.automations) {
      clone.automations.push(AutomationCloner.clone(i));
    }
    clone.dots = original.dots;
    clone.fade = original.fade;
    clone.lyrics = original.lyrics ? original.lyrics.slice() : null;
    clone.pop = original.pop;
    clone.slap = original.slap;
    clone.tap = original.tap;
    clone.text = original.text;
    clone.slashed = original.slashed;
    clone.deadSlapped = original.deadSlapped;
    clone.brushType = original.brushType;
    clone.brushDuration = original.brushDuration;
    clone.tupletDenominator = original.tupletDenominator;
    clone.tupletNumerator = original.tupletNumerator;
    clone.isContinuedWhammy = original.isContinuedWhammy;
    clone.whammyBarType = original.whammyBarType;
    if (original.whammyBarPoints) {
      clone.whammyBarPoints = [];
      for (const i of original.whammyBarPoints) {
        clone.addWhammyBarPoint(BendPointCloner.clone(i));
      }
    }
    clone.vibrato = original.vibrato;
    clone.chordId = original.chordId;
    clone.graceType = original.graceType;
    clone.pickStroke = original.pickStroke;
    clone.tremoloPicking = original.tremoloPicking ? TremoloPickingEffectCloner.clone(original.tremoloPicking) : void 0;
    clone.crescendo = original.crescendo;
    clone.displayStart = original.displayStart;
    clone.playbackStart = original.playbackStart;
    clone.displayDuration = original.displayDuration;
    clone.playbackDuration = original.playbackDuration;
    clone.overrideDisplayDuration = original.overrideDisplayDuration;
    clone.golpe = original.golpe;
    clone.dynamics = original.dynamics;
    clone.invertBeamDirection = original.invertBeamDirection;
    clone.preferredBeamDirection = original.preferredBeamDirection;
    clone.isEffectSlurOrigin = original.isEffectSlurOrigin;
    clone.beamingMode = original.beamingMode;
    clone.wahPedal = original.wahPedal;
    clone.barreFret = original.barreFret;
    clone.barreShape = original.barreShape;
    clone.rasgueado = original.rasgueado;
    clone.showTimer = original.showTimer;
    clone.timer = original.timer;
    return clone;
  }
};

// third_party/alphatab/src/model/Beat.ts
var Beat = class _Beat {
  static _globalBeatId = 0;
  /**
   * @internal
   */
  static resetIds() {
    _Beat._globalBeatId = 0;
  }
  /**
   * Gets or sets the unique id of this beat.
   * @clone_ignore
   */
  id = _Beat._globalBeatId++;
  /**
   * Gets or sets the zero-based index of this beat within the voice.
   * @json_ignore
   */
  index = 0;
  /**
   * Gets or sets the previous beat within the whole song.
   * @json_ignore
   * @clone_ignore
   */
  previousBeat = null;
  /**
   * Gets or sets the next beat within the whole song.
   * @json_ignore
   * @clone_ignore
   */
  nextBeat = null;
  get isLastOfVoice() {
    return this.index === this.voice.beats.length - 1;
  }
  /**
   * Gets or sets the reference to the parent voice this beat belongs to.
   * @json_ignore
   * @clone_ignore
   */
  voice;
  /**
   * Gets or sets the list of notes contained in this beat.
   * @json_add addNote
   * @clone_add addNote
   */
  notes = [];
  /**
   * Gets the lookup where the notes per string are registered.
   * If this staff contains string based notes this lookup allows fast access.
   * @json_ignore
   */
  noteStringLookup = /* @__PURE__ */ new Map();
  /**
   * Gets the lookup where the notes per value are registered.
   * If this staff contains string based notes this lookup allows fast access.
   * @json_ignore
   */
  noteValueLookup = /* @__PURE__ */ new Map();
  /**
   * Gets or sets a value indicating whether this beat is considered empty.
   */
  isEmpty = false;
  /**
   * Gets or sets which whammy bar style should be used for this bar.
   */
  whammyStyle = 0 /* Default */;
  /**
   * Gets or sets the ottava applied to this beat.
   */
  ottava = 2 /* Regular */;
  /**
   * Gets or sets the fermata applied to this beat.
   * @clone_ignore
   * @json_ignore
   */
  fermata = null;
  /**
   * Gets a value indicating whether this beat starts a legato slur.
   */
  isLegatoOrigin = false;
  get isLegatoDestination() {
    return !!this.previousBeat && this.previousBeat.isLegatoOrigin;
  }
  /**
   * Gets or sets the note with the lowest pitch in this beat. Only visible notes are considered.
   * @json_ignore
   * @clone_ignore
   */
  minNote = null;
  /**
   * Gets or sets the note with the highest pitch in this beat. Only visible notes are considered.
   * @json_ignore
   * @clone_ignore
   */
  maxNote = null;
  /**
   * Gets or sets the note with the highest string number in this beat. Only visible notes are considered.
   * @json_ignore
   * @clone_ignore
   */
  maxStringNote = null;
  /**
   * Gets or sets the note with the lowest string number in this beat. Only visible notes are considered.
   * @json_ignore
   * @clone_ignore
   */
  minStringNote = null;
  /**
   * Gets or sets the duration of this beat.
   */
  duration = 4 /* Quarter */;
  get isRest() {
    return this.isEmpty || !this.deadSlapped && this.notes.length === 0;
  }
  /**
   * Gets a value indicating whether this beat is a full bar rest.
   */
  get isFullBarRest() {
    return this.isRest && this.voice.beats.length === 1 && this.duration === 1 /* Whole */;
  }
  /**
   * Gets or sets whether any note in this beat has a let-ring applied.
   * @json_ignore
   */
  isLetRing = false;
  /**
   * Gets or sets whether any note in this beat has a palm-mute applied.
   * @json_ignore
   */
  isPalmMute = false;
  /**
   * Gets or sets a list of all automations on this beat.
   */
  automations = [];
  /**
   * Gets or sets the number of dots applied to the duration of this beat.
   */
  dots = 0;
  /**
   * Gets a value indicating whether this beat is fade-in.
   * @deprecated Use `fade`
   */
  get fadeIn() {
    return this.fade === 1 /* FadeIn */;
  }
  /**
   * Sets a value indicating whether this beat is fade-in.
   * @deprecated Use `fade`
   */
  set fadeIn(value2) {
    this.fade = value2 ? 1 /* FadeIn */ : 0 /* None */;
  }
  /**
   * Gets or sets a value indicating whether this beat is fade-in.
   */
  fade = 0 /* None */;
  /**
   * Gets or sets the lyrics shown on this beat.
   */
  lyrics = null;
  /**
   * Gets or sets a value indicating whether the beat is played in rasgueado style.
   */
  get hasRasgueado() {
    return this.rasgueado !== 0 /* None */;
  }
  /**
   * Gets or sets a value indicating whether the notes on this beat are played with a pop-style (bass).
   */
  pop = false;
  /**
   * Gets or sets a value indicating whether the notes on this beat are played with a slap-style (bass).
   */
  slap = false;
  /**
   * Gets or sets a value indicating whether the notes on this beat are played with a tap-style (bass).
   */
  tap = false;
  /**
   * Gets or sets the text annotation shown on this beat.
   */
  text = null;
  /**
   * Gets or sets whether this beat should be rendered as slashed note.
   */
  slashed = false;
  /**
   * Whether this beat should rendered and played as "dead slapped".
   */
  deadSlapped = false;
  /**
   * Gets or sets the brush type applied to the notes of this beat.
   */
  brushType = 0 /* None */;
  /**
   * Gets or sets the duration of the brush between the notes in midi ticks.
   */
  brushDuration = 0;
  /**
   * Gets or sets the tuplet denominator.
   */
  tupletDenominator = -1;
  /**
   * Gets or sets the tuplet numerator.
   */
  tupletNumerator = -1;
  get hasTuplet() {
    return !(this.tupletDenominator === -1 && this.tupletNumerator === -1) && !(this.tupletDenominator === 1 && this.tupletNumerator === 1);
  }
  /**
   * @clone_ignore
   * @json_ignore
   */
  tupletGroup = null;
  /**
   * Gets or sets whether this beat continues a whammy effect.
   */
  isContinuedWhammy = false;
  /**
   * Gets or sets the whammy bar style of this beat.
   */
  whammyBarType = 0 /* None */;
  /**
   * Gets or sets the points defining the whammy bar usage.
   * @json_add addWhammyBarPoint
   * @clone_add addWhammyBarPoint
   */
  whammyBarPoints = null;
  /**
   * Gets or sets the highest point with for the highest whammy bar value.
   * @json_ignore
   * @clone_ignore
   */
  maxWhammyPoint = null;
  /**
   * Gets or sets the highest point with for the lowest whammy bar value.
   * @json_ignore
   * @clone_ignore
   */
  minWhammyPoint = null;
  get hasWhammyBar() {
    return this.whammyBarPoints !== null && this.whammyBarType !== 0 /* None */;
  }
  /**
   * Gets or sets the vibrato effect used on this beat.
   */
  vibrato = 0 /* None */;
  /**
   * Gets or sets the ID of the chord used on this beat.
   */
  chordId = null;
  get hasChord() {
    return !!this.chordId;
  }
  get chord() {
    return this.chordId ? this.voice.bar.staff.getChord(this.chordId) : null;
  }
  /**
   * Gets or sets the grace style of this beat.
   */
  graceType = 0 /* None */;
  /**
   * Gets or sets the grace group this beat belongs to.
   * If this beat is not a grace note, it holds the group which belongs to this beat.
   * @json_ignore
   * @clone_ignore
   */
  graceGroup = null;
  /**
   * Gets or sets the index of this beat within the grace group if
   * this is a grace beat.
   * @json_ignore
   * @clone_ignore
   */
  graceIndex = -1;
  /**
   * Gets or sets the pickstroke applied on this beat.
   */
  pickStroke = 0 /* None */;
  /**
   * Whether this beat has a tremolo picking effect.
   */
  get isTremolo() {
    return this.tremoloPicking !== void 0;
  }
  /**
   * The tremolo picking effect.
   */
  tremoloPicking;
  /**
   * The speed of the tremolo.
   * @deprecated Set {@link tremoloPicking} instead.
   */
  get tremoloSpeed() {
    const tremolo = this.tremoloPicking;
    if (tremolo) {
      return tremolo.getDuration(this.duration);
    }
    return null;
  }
  /**
   * The speed of the tremolo.
   * @deprecated Set {@link tremoloPicking} instead.
   */
  set tremoloSpeed(value2) {
    if (value2 === null) {
      this.tremoloPicking = void 0;
      return;
    }
    let effect = this.tremoloPicking;
    if (effect === void 0) {
      effect = new TremoloPickingEffect();
      this.tremoloPicking = effect;
    }
    switch (value2) {
      case 8 /* Eighth */:
        effect.marks = 1;
        break;
      case 16 /* Sixteenth */:
        effect.marks = 2;
        break;
      case 32 /* ThirtySecond */:
        effect.marks = 3;
        break;
      case 64 /* SixtyFourth */:
        effect.marks = 4;
        break;
      case 128 /* OneHundredTwentyEighth */:
        effect.marks = 5;
        break;
    }
  }
  /**
   * Gets or sets whether a crescendo/decrescendo is applied on this beat.
   */
  crescendo = 0 /* None */;
  /**
   * The timeline position of the voice within the current bar as it is displayed. (unit: midi ticks)
   * This might differ from the actual playback time due to special grace types.
   */
  displayStart = 0;
  /**
   * The calculated visual end position of this beat in midi ticks.
   */
  get displayEnd() {
    return this.displayStart + this.displayDuration;
  }
  /**
   * The timeline position of the voice within the current bar as it is played. (unit: midi ticks)
   * This might differ from the actual playback time due to special grace types.
   */
  playbackStart = 0;
  /**
   * Gets or sets the duration that is used for the display of this beat. It defines the size/width of the beat in
   * the music sheet. (unit: midi ticks).
   */
  displayDuration = 0;
  /**
   * Gets or sets the duration that the note is played during the audio generation.
   */
  playbackDuration = 0;
  /**
   * The duration in midi ticks to use for this beat on the {@link displayDuration}
   * controlling the visual display of the beat.
   * @remarks
   * This is used in scenarios where the bar might not have 100% exactly
   * a linear structure between the beats. e.g. in MusicXML when using `<forward />`.
   */
  overrideDisplayDuration;
  /**
   * The type of golpe to play.
   */
  golpe = 0 /* None */;
  get absoluteDisplayStart() {
    return this.voice.bar.masterBar.start + this.displayStart;
  }
  get absolutePlaybackStart() {
    return this.voice.bar.masterBar.start + this.playbackStart;
  }
  /**
   * Gets or sets the dynamics applied to this beat.
   */
  dynamics = 5 /* F */;
  /**
   * Gets or sets a value indicating whether the beam direction should be inverted.
   */
  invertBeamDirection = false;
  /**
   * Gets or sets the preferred beam direction as specified in the input source.
   */
  preferredBeamDirection = null;
  /**
   * @json_ignore
   */
  isEffectSlurOrigin = false;
  get isEffectSlurDestination() {
    return !!this.effectSlurOrigin;
  }
  /**
   * @clone_ignore
   * @json_ignore
   */
  effectSlurOrigin = null;
  /**
   * @clone_ignore
   * @json_ignore
   */
  effectSlurDestination = null;
  /**
   * Convenience accessor for the {@link Slur} of this beat. Returns
   * the effect slur of whichever note in this beat owns it (the
   * chain-origin note populated during `Note.finish()`), or `null`
   * when no note in the beat is an effect-slur origin.
   * @clone_ignore
   * @json_ignore
   * @internal
   */
  get effectSlur() {
    for (const n of this.notes) {
      if (n.effectSlur !== null) {
        return n.effectSlur;
      }
    }
    return null;
  }
  /**
   * Gets or sets how the beaming should be done for this beat.
   */
  beamingMode = 0 /* Auto */;
  /**
   * Whether the wah pedal should be used when playing the beat.
   */
  wahPedal = 0 /* None */;
  /**
   * The fret of a barré being played on this beat.
   */
  barreFret = -1;
  /**
   * The shape how the barre should be played on this beat.
   */
  barreShape = 0 /* None */;
  /**
   * Gets a value indicating whether the beat should be played as Barré
   */
  get isBarre() {
    return this.barreShape !== 0 /* None */ && this.barreFret >= 0;
  }
  /**
   * The Rasgueado pattern to play with this beat.
   */
  rasgueado = 0 /* None */;
  /**
   * Whether to show the time when this beat is played the first time.
   * (requires that the midi for the song is generated so that times are calculated).
   * If no midi is generated the timer value might be filled from the input file (or manually).
   */
  showTimer = false;
  /**
   * The absolute time in milliseconds when this beat will be played the first time.
   */
  timer = null;
  /**
   * The style customizations for this item.
   * @clone_ignore
   */
  style;
  addWhammyBarPoint(point) {
    let points = this.whammyBarPoints;
    if (points === null) {
      points = [];
      this.whammyBarPoints = points;
    }
    points.push(point);
    if (!this.maxWhammyPoint || point.value > this.maxWhammyPoint.value) {
      this.maxWhammyPoint = point;
    }
    if (!this.minWhammyPoint || point.value < this.minWhammyPoint.value) {
      this.minWhammyPoint = point;
    }
    if (this.whammyBarType === 0 /* None */) {
      this.whammyBarType = 1 /* Custom */;
    }
  }
  removeWhammyBarPoint(index) {
    const points = this.whammyBarPoints;
    if (points === null || index < 0 || index >= points.length) {
      return;
    }
    points.splice(index, 1);
    const point = points[index];
    if (point === this.maxWhammyPoint) {
      this.maxWhammyPoint = null;
      for (const currentPoint of points) {
        if (!this.maxWhammyPoint || currentPoint.value > this.maxWhammyPoint.value) {
          this.maxWhammyPoint = currentPoint;
        }
      }
    }
    if (point === this.minWhammyPoint) {
      this.minWhammyPoint = null;
      for (const currentPoint of points) {
        if (!this.minWhammyPoint || currentPoint.value < this.minWhammyPoint.value) {
          this.minWhammyPoint = currentPoint;
        }
      }
    }
  }
  addNote(note) {
    note.beat = this;
    note.index = this.notes.length;
    this.notes.push(note);
    if (note.isStringed) {
      this.noteStringLookup.set(note.string, note);
    }
  }
  removeNote(note) {
    const index = this.notes.indexOf(note);
    if (index >= 0) {
      this.notes.splice(index, 1);
      if (note.isStringed) {
        this.noteStringLookup.delete(note.string);
      }
    }
  }
  getAutomation(type) {
    for (let i = 0, j = this.automations.length; i < j; i++) {
      const automation = this.automations[i];
      if (automation.type === type) {
        return automation;
      }
    }
    return null;
  }
  getNoteOnString(noteString) {
    if (this.noteStringLookup.has(noteString)) {
      return this.noteStringLookup.get(noteString);
    }
    return null;
  }
  _calculateDuration() {
    if (this.overrideDisplayDuration !== void 0) {
      return this.overrideDisplayDuration;
    }
    if (this.isFullBarRest) {
      return this.voice.bar.masterBar.calculateDuration();
    }
    let ticks = MidiUtils.toTicks(this.duration);
    if (this.dots === 2) {
      ticks = MidiUtils.applyDot(ticks, true);
    } else if (this.dots === 1) {
      ticks = MidiUtils.applyDot(ticks, false);
    }
    if (this.tupletDenominator > 0 && this.tupletNumerator >= 0) {
      ticks = MidiUtils.applyTuplet(ticks, this.tupletNumerator, this.tupletDenominator);
    }
    return ticks;
  }
  updateDurations() {
    const ticks = this._calculateDuration();
    this.playbackDuration = ticks;
    switch (this.graceType) {
      case 2 /* BeforeBeat */:
      case 1 /* OnBeat */:
        switch (this.duration) {
          case 16 /* Sixteenth */:
            this.playbackDuration = MidiUtils.toTicks(64 /* SixtyFourth */);
            break;
          case 32 /* ThirtySecond */:
            this.playbackDuration = MidiUtils.toTicks(128 /* OneHundredTwentyEighth */);
            break;
          default:
            this.playbackDuration = MidiUtils.toTicks(32 /* ThirtySecond */);
            break;
        }
        this.displayDuration = 0;
        break;
      case 3 /* BendGrace */:
        this.playbackDuration /= 2;
        this.displayDuration = 0;
        break;
      default:
        this.displayDuration = ticks;
        const previous = this.previousBeat;
        if (previous && previous.graceType === 3 /* BendGrace */) {
          this.playbackDuration = previous.playbackDuration;
        }
        break;
    }
  }
  finishTuplet() {
    const previousBeat = this.previousBeat;
    let currentTupletGroup = previousBeat ? previousBeat.tupletGroup : null;
    if (this.hasTuplet || this.graceType !== 0 /* None */ && currentTupletGroup) {
      if (!previousBeat || !currentTupletGroup || !currentTupletGroup.check(this)) {
        currentTupletGroup = new TupletGroup(this.voice);
        currentTupletGroup.check(this);
      }
      this.tupletGroup = currentTupletGroup;
    }
    const barDuration = this.voice.bar.masterBar.calculateDuration(false);
    const validBeatAutomations = [];
    for (const automation of this.automations) {
      if (automation.ratioPosition === 0) {
        automation.ratioPosition = this.playbackStart / barDuration;
      }
      if (automation.type !== 0 /* Tempo */) {
        validBeatAutomations.push(automation);
      }
    }
    this.automations = validBeatAutomations;
  }
  finish(settings, sharedDataBag = null) {
    if (this.getAutomation(2 /* Instrument */) === null && this.index === 0 && this.voice.index === 0 && this.voice.bar.index === 0 && this.voice.bar.staff.index === 0) {
      this.automations.push(
        Automation.buildInstrumentAutomation(false, 0, this.voice.bar.staff.track.playbackInfo.program)
      );
    }
    switch (this.graceType) {
      case 1 /* OnBeat */:
      case 2 /* BeforeBeat */:
        const numberOfGraceBeats = this.graceGroup.beats.length;
        if (numberOfGraceBeats === 1) {
          this.duration = 8 /* Eighth */;
        } else if (numberOfGraceBeats === 2) {
          this.duration = 16 /* Sixteenth */;
        } else {
          this.duration = 32 /* ThirtySecond */;
        }
        break;
    }
    if (this.brushType === 0 /* None */) {
      this.brushDuration = 0;
    }
    const tremolo = this.tremoloPicking;
    if (tremolo !== void 0) {
      if (tremolo.marks < TremoloPickingEffect.minMarks || tremolo.marks > TremoloPickingEffect.maxMarks) {
        this.tremoloPicking = void 0;
      }
    }
    const displayMode = !settings ? 0 /* GuitarPro */ : settings.notation.notationMode;
    let isGradual = this.text === "grad" || this.text === "grad.";
    if (isGradual && displayMode === 1 /* SongBook */) {
      this.text = "";
    }
    let needCopyBeatForBend = false;
    this.minNote = null;
    this.maxNote = null;
    this.minStringNote = null;
    this.maxStringNote = null;
    let visibleNotes = 0;
    let isEffectSlurBeat = false;
    for (let i = 0, j = this.notes.length; i < j; i++) {
      const note = this.notes[i];
      note.dynamics = this.dynamics;
      note.finish(settings, sharedDataBag);
      if (note.isLetRing) {
        this.isLetRing = true;
      }
      if (note.isPalmMute) {
        this.isPalmMute = true;
      }
      if (displayMode === 1 /* SongBook */ && note.hasBend && this.graceType !== 3 /* BendGrace */) {
        if (!note.isTieOrigin) {
          switch (note.bendType) {
            case 2 /* Bend */:
            case 8 /* PrebendRelease */:
            case 7 /* PrebendBend */:
              needCopyBeatForBend = true;
              break;
          }
        }
        if (isGradual || note.bendStyle === 1 /* Gradual */) {
          isGradual = true;
          note.bendStyle = 1 /* Gradual */;
          needCopyBeatForBend = false;
        } else {
          note.bendStyle = 2 /* Fast */;
        }
      }
      if (note.isVisible) {
        visibleNotes++;
        if (!this.minNote || note.realValue < this.minNote.realValue) {
          this.minNote = note;
        }
        if (!this.maxNote || note.realValue > this.maxNote.realValue) {
          this.maxNote = note;
        }
        if (!this.minStringNote || note.string < this.minStringNote.string) {
          this.minStringNote = note;
        }
        if (!this.maxStringNote || note.string > this.maxStringNote.string) {
          this.maxStringNote = note;
        }
        if (note.hasEffectSlur) {
          isEffectSlurBeat = true;
        }
      }
    }
    if (isEffectSlurBeat) {
      if (this.effectSlurOrigin) {
        this.effectSlurOrigin.effectSlurDestination = this.nextBeat;
        if (this.effectSlurOrigin.effectSlurDestination) {
          this.effectSlurOrigin.effectSlurDestination.effectSlurOrigin = this.effectSlurOrigin;
        }
        this.effectSlurOrigin = null;
      } else {
        this.isEffectSlurOrigin = true;
        this.effectSlurDestination = this.nextBeat;
        if (this.effectSlurDestination) {
          this.effectSlurDestination.effectSlurOrigin = this;
        }
      }
    }
    if (this.notes.length > 0 && visibleNotes === 0) {
      this.isEmpty = true;
    }
    if (!this.isRest && (!this.isLetRing || !this.isPalmMute)) {
      let currentBeat = this.previousBeat;
      while (currentBeat && currentBeat.isRest) {
        if (!this.isLetRing) {
          currentBeat.isLetRing = false;
        }
        if (!this.isPalmMute) {
          currentBeat.isPalmMute = false;
        }
        currentBeat = currentBeat.previousBeat;
      }
    } else if (this.isRest && this.previousBeat && settings && settings.notation.notationMode === 0 /* GuitarPro */) {
      if (this.previousBeat.isLetRing) {
        this.isLetRing = true;
      }
      if (this.previousBeat.isPalmMute) {
        this.isPalmMute = true;
      }
    }
    const points = this.whammyBarPoints;
    const hasWhammy = points !== null && points.length > 0;
    if (hasWhammy) {
      const isContinuedWhammy = !!this.previousBeat && this.previousBeat.hasWhammyBar;
      this.isContinuedWhammy = isContinuedWhammy;
    } else {
      this.whammyBarType = 0 /* None */;
    }
    if (hasWhammy && this.whammyBarType === 1 /* Custom */) {
      if (displayMode === 1 /* SongBook */) {
        this.whammyStyle = isGradual ? 1 /* Gradual */ : 2 /* Fast */;
      }
      if (points.length === 4) {
        const origin = points[0];
        const middle1 = points[1];
        const middle2 = points[2];
        const destination = points[3];
        if (middle1.value === middle2.value) {
          if (origin.value < middle1.value && middle1.value < destination.value || origin.value > middle1.value && middle1.value > destination.value) {
            if (origin.value !== 0 && !this.isContinuedWhammy) {
              this.whammyBarType = 6 /* PrediveDive */;
            } else {
              this.whammyBarType = 2 /* Dive */;
            }
            points.splice(2, 1);
            points.splice(1, 1);
          } else if (origin.value > middle1.value && middle1.value < destination.value || origin.value < middle1.value && middle1.value > destination.value) {
            this.whammyBarType = 3 /* Dip */;
            if (middle1.offset === middle2.offset || displayMode === 1 /* SongBook */) {
              points.splice(2, 1);
            }
          } else if (origin.value === middle1.value && middle1.value === destination.value) {
            if (origin.value !== 0 && !this.isContinuedWhammy) {
              this.whammyBarType = 5 /* Predive */;
            } else {
              this.whammyBarType = 4 /* Hold */;
            }
            points.splice(2, 1);
            points.splice(1, 1);
          }
        }
      } else if (points.length === 3) {
        const origin = points[0];
        const middle = points[1];
        const destination = points[2];
        if (origin.value < middle.value && middle.value < destination.value || origin.value > middle.value && middle.value > destination.value) {
          if (origin.value !== 0 && !this.isContinuedWhammy) {
            this.whammyBarType = 6 /* PrediveDive */;
          } else {
            this.whammyBarType = 2 /* Dive */;
          }
          points.splice(1, 1);
        } else if (origin.value > middle.value && middle.value < destination.value || origin.value < middle.value && middle.value > destination.value) {
          this.whammyBarType = 3 /* Dip */;
        } else if (origin.value === middle.value && middle.value === destination.value) {
          if (origin.value !== 0 && !this.isContinuedWhammy) {
            this.whammyBarType = 5 /* Predive */;
          } else {
            this.whammyBarType = 4 /* Hold */;
          }
          points.splice(1, 1);
        }
      } else if (points.length === 2) {
        const origin = points[0];
        const destination = points[1];
        if (origin.value < destination.value || origin.value > destination.value) {
          if (origin.value !== 0 && !this.isContinuedWhammy) {
            this.whammyBarType = 6 /* PrediveDive */;
          } else {
            this.whammyBarType = 2 /* Dive */;
          }
        } else if (origin.value === destination.value) {
          if (origin.value !== 0 && !this.isContinuedWhammy) {
            this.whammyBarType = 5 /* Predive */;
          } else {
            this.whammyBarType = 4 /* Hold */;
          }
        }
      }
    }
    this.updateDurations();
    if (needCopyBeatForBend) {
      const cloneBeat = BeatCloner.clone(this);
      cloneBeat.id = _Beat._globalBeatId++;
      cloneBeat.pickStroke = 0 /* None */;
      for (let i = 0, j = cloneBeat.notes.length; i < j; i++) {
        const cloneNote = cloneBeat.notes[i];
        const note = this.notes[i];
        cloneNote.bendType = 0 /* None */;
        cloneNote.maxBendPoint = null;
        cloneNote.bendPoints = null;
        cloneNote.bendStyle = 0 /* Default */;
        cloneNote.id = Note.globalNoteId++;
        if (note.isTieOrigin) {
          cloneNote.tieDestination = note.tieDestination;
          note.tieDestination.tieOrigin = cloneNote;
        }
        if (note.isTieDestination) {
          cloneNote.tieOrigin = note.tieOrigin ? note.tieOrigin : null;
          note.tieOrigin.tieDestination = cloneNote;
        }
        if (note.hasBend && note.isTieOrigin) {
          const tieDestination = Note.findTieOrigin(note);
          if (tieDestination && tieDestination.hasBend) {
            cloneNote.bendType = 5 /* Hold */;
            const lastPoint = note.bendPoints[note.bendPoints.length - 1];
            cloneNote.addBendPoint(new BendPoint(0, lastPoint.value));
            cloneNote.addBendPoint(new BendPoint(BendPoint.MaxPosition, lastPoint.value));
          }
        }
        cloneNote.isTieDestination = true;
      }
      this.graceType = 3 /* BendGrace */;
      this.graceGroup = new GraceGroup();
      this.graceGroup.addBeat(this);
      this.graceGroup.isComplete = true;
      this.graceGroup.finish();
      this.updateDurations();
      this.voice.insertBeat(this, cloneBeat);
      cloneBeat.graceGroup = new GraceGroup();
      cloneBeat.graceGroup.addBeat(this);
      cloneBeat.graceGroup.isComplete = true;
      cloneBeat.graceGroup.finish();
    }
  }
  /**
   * Checks whether the current beat is timewise before the given beat.
   * @param beat
   * @returns
   */
  isBefore(beat) {
    return this.voice.bar.index < beat.voice.bar.index || beat.voice.bar.index === this.voice.bar.index && this.index < beat.index;
  }
  /**
   * Checks whether the current beat is timewise after the given beat.
   * @param beat
   * @returns
   */
  isAfter(beat) {
    return this.voice.bar.index > beat.voice.bar.index || beat.voice.bar.index === this.voice.bar.index && this.index > beat.index;
  }
  hasNoteOnString(noteString) {
    return this.noteStringLookup.has(noteString);
  }
  getNoteWithRealValue(noteRealValue) {
    if (this.noteValueLookup.has(noteRealValue)) {
      return this.noteValueLookup.get(noteRealValue);
    }
    return null;
  }
  chain(sharedDataBag = null) {
    for (const n of this.notes) {
      this.noteValueLookup.set(n.realValue, n);
      n.chain(sharedDataBag);
    }
  }
};

// third_party/alphatab/src/model/Chord.ts
var Chord = class {
  /**
   * Gets or sets the name of the chord
   */
  name = "";
  /**
   * Indicates the first fret of the chord diagram.
   */
  firstFret = 1;
  /**
   * Gets or sets the frets played on the individual strings for this chord.
   * - The order in this list goes from the highest string to the lowest string.
   * - -1 indicates that the string is not played.
   */
  strings = [];
  /**
   * Gets or sets a list of frets where the finger should hold a barre
   */
  barreFrets = [];
  /**
   * Gets or sets the staff the chord belongs to.
   * @json_ignore
   */
  staff;
  /**
   * Gets or sets whether the chord name is shown above the chord diagram.
   */
  showName = true;
  /**
   * Gets or sets whether the chord diagram is shown.
   */
  showDiagram = true;
  /**
   * Gets or sets whether the fingering is shown below the chord diagram.
   */
  showFingering = true;
  /**
   * Gets a unique id for this chord based on its properties.
   */
  get uniqueId() {
    const properties2 = [
      this.name,
      this.firstFret.toString(),
      this.strings.join(","),
      this.barreFrets.join(","),
      this.showDiagram.toString(),
      this.showFingering.toString(),
      this.showName.toString()
    ];
    return properties2.join("|");
  }
};

// third_party/alphatab/src/FormatError.ts
var FormatError = class extends AlphaTabError {
  constructor(message) {
    super(1 /* Format */, message);
  }
};

// third_party/alphatab/src/model/Color.ts
var Color = class _Color {
  static BlackRgb = "#000000";
  /**
   * Initializes a new instance of the {@link Color} class.
   * @param r The red component.
   * @param g The green component.
   * @param b The blue component.
   * @param a The alpha component.
   */
  constructor(r, g, b, a = 255) {
    this.raw = (a & 255) << 24 | (r & 255) << 16 | (g & 255) << 8 | b & 255;
    this.updateRgba();
  }
  updateRgba() {
    if (this.a === 255) {
      this.rgba = `#${ModelUtils.toHexString(this.r, 2)}${ModelUtils.toHexString(this.g, 2)}${ModelUtils.toHexString(this.b, 2)}`;
    } else {
      this.rgba = `rgba(${this.r},${this.g},${this.b},${this.a / 255})`;
    }
  }
  /**
   * Gets or sets the raw RGBA value.
   */
  raw = 0;
  get a() {
    return this.raw >> 24 & 255;
  }
  get r() {
    return this.raw >> 16 & 255;
  }
  get g() {
    return this.raw >> 8 & 255;
  }
  get b() {
    return this.raw & 255;
  }
  /**
   * Gets the RGBA hex string to use in CSS areas.
   */
  rgba;
  static random(opacity = 100) {
    return new _Color(Math.random() * 255 | 0, Math.random() * 255 | 0, Math.random() * 255 | 0, opacity);
  }
  static fromJson(v) {
    if (v instanceof _Color) {
      return v;
    }
    switch (typeof v) {
      case "number": {
        const c = new _Color(0, 0, 0, 0);
        c.raw = v;
        c.updateRgba();
        return c;
      }
      case "string": {
        const json = v;
        if (json.startsWith("#")) {
          if (json.length === 4) {
            return new _Color(
              Number.parseInt(json[1], 16) * 17,
              Number.parseInt(json[2], 16) * 17,
              Number.parseInt(json[3], 16) * 17
            );
          }
          if (json.length === 5) {
            return new _Color(
              Number.parseInt(json[1], 16) * 17,
              Number.parseInt(json[2], 16) * 17,
              Number.parseInt(json[3], 16) * 17,
              Number.parseInt(json[4], 16) * 17
            );
          }
          if (json.length === 7) {
            return new _Color(
              Number.parseInt(json.substring(1, 3), 16),
              Number.parseInt(json.substring(3, 5), 16),
              Number.parseInt(json.substring(5, 7), 16)
            );
          }
          if (json.length === 9) {
            return new _Color(
              Number.parseInt(json.substring(1, 3), 16),
              Number.parseInt(json.substring(3, 5), 16),
              Number.parseInt(json.substring(5, 7), 16),
              Number.parseInt(json.substring(7, 9), 16)
            );
          }
        } else if (json.startsWith("rgba") || json.startsWith("rgb")) {
          const start = json.indexOf("(");
          const end = json.lastIndexOf(")");
          if (start === -1 || end === -1) {
            throw new FormatError("No values specified for rgb/rgba function");
          }
          const numbers = json.substring(start + 1, end).split(",");
          if (numbers.length === 3) {
            return new _Color(
              Number.parseInt(numbers[0], 10),
              Number.parseInt(numbers[1], 10),
              Number.parseInt(numbers[2], 10)
            );
          }
          if (numbers.length === 4) {
            return new _Color(
              Number.parseInt(numbers[0], 10),
              Number.parseInt(numbers[1], 10),
              Number.parseInt(numbers[2], 10),
              Number.parseFloat(numbers[3]) * 255
            );
          }
        }
        return null;
      }
    }
    throw new FormatError("Unsupported format for color");
  }
  static toJson(obj) {
    return obj === null ? null : obj.raw;
  }
};

// third_party/alphatab/src/model/Fermata.ts
var Fermata = class {
  /**
   * Gets or sets the type of fermata.
   */
  type = 0 /* Short */;
  /**
   * Gets or sets the actual length of the fermata.
   */
  length = 0;
};

// third_party/alphatab/src/model/Lyrics.ts
var Lyrics = class _Lyrics {
  static _charCodeLF = 10;
  static _charCodeTab = 9;
  static _charCodeCR = 13;
  static _charCodeSpace = 32;
  static _charCodeBrackedClose = 93;
  static _charCodeBrackedOpen = 91;
  static _charCodeDash = 45;
  /**
   * Gets or sets he start bar on which the lyrics should begin.
   */
  startBar = 0;
  /**
   * Gets or sets the raw lyrics text in Guitar Pro format.
   * (spaces split word syllables, plus merge syllables, [..] are comments)
   */
  text = "";
  /**
   * Gets or sets the prepared chunks of the lyrics to apply to beats.
   */
  chunks;
  finish(skipEmptyEntries = false) {
    this.chunks = [];
    this._parse(this.text, 0, this.chunks, skipEmptyEntries);
  }
  _parse(str, p, _chunks, skipEmptyEntries) {
    if (!str) {
      return;
    }
    let state = 1 /* Begin */;
    let next = 1 /* Begin */;
    let skipSpace = false;
    let start = 0;
    while (p < str.length) {
      const c = str.charCodeAt(p);
      switch (state) {
        case 0 /* IgnoreSpaces */:
          switch (c) {
            case _Lyrics._charCodeLF:
            case _Lyrics._charCodeCR:
            case _Lyrics._charCodeTab:
              break;
            case _Lyrics._charCodeSpace:
              if (!skipSpace) {
                state = next;
                continue;
              }
              break;
            default:
              skipSpace = false;
              state = next;
              continue;
          }
          break;
        case 1 /* Begin */:
          switch (c) {
            case _Lyrics._charCodeBrackedOpen:
              state = 3 /* Comment */;
              break;
            default:
              start = p;
              state = 2 /* Text */;
              continue;
          }
          break;
        case 3 /* Comment */:
          switch (c) {
            case _Lyrics._charCodeBrackedClose:
              state = 1 /* Begin */;
              break;
          }
          break;
        case 2 /* Text */:
          switch (c) {
            case _Lyrics._charCodeDash:
              state = 4 /* Dash */;
              break;
            case _Lyrics._charCodeCR:
            case _Lyrics._charCodeLF:
            case _Lyrics._charCodeSpace:
              const txt = str.substr(start, p - start);
              this._addChunk(txt, skipEmptyEntries);
              state = 0 /* IgnoreSpaces */;
              next = 1 /* Begin */;
              break;
          }
          break;
        case 4 /* Dash */:
          switch (c) {
            case _Lyrics._charCodeDash:
              break;
            default:
              const txt = str.substr(start, p - start);
              this._addChunk(txt, skipEmptyEntries);
              skipSpace = true;
              state = 0 /* IgnoreSpaces */;
              next = 1 /* Begin */;
              continue;
          }
          break;
      }
      p += 1;
    }
    if (state === 2 /* Text */) {
      if (p !== start) {
        this._addChunk(str.substr(start, p - start), skipEmptyEntries);
      }
    }
  }
  _addChunk(txt, skipEmptyEntries) {
    txt = this._prepareChunk(txt);
    if (!skipEmptyEntries || txt.length > 0 && txt !== "-") {
      this.chunks.push(txt);
    }
  }
  _prepareChunk(txt) {
    const chunk = txt.split("+").join(" ");
    let endLength = chunk.length;
    while (endLength > 0 && chunk.charAt(endLength - 1) === "_") {
      endLength--;
    }
    return endLength !== chunk.length ? chunk.substr(0, endLength) : chunk;
  }
};

// third_party/alphatab/src/model/Section.ts
var Section = class {
  /**
   * Gets or sets the marker ID for this section.
   */
  marker = "";
  /**
   * Gets or sets the descriptional text of this section.
   */
  text = "";
};

// third_party/alphatab/src/model/PlaybackInformation.ts
var PlaybackInformation = class {
  /**
   * Gets or sets the volume (0-16)
   */
  volume = 15;
  /**
   * Gets or sets the balance (0-16; 8=center)
   */
  balance = 8;
  /**
   * Gets or sets the midi port to use.
   */
  port = 1;
  /**
   * Gets or sets the midi program to use.
   */
  program = 0;
  /**
   * The midi bank to use. 
   */
  bank = 0;
  /**
   * Gets or sets the primary channel for all normal midi events.
   */
  primaryChannel = 0;
  /**
   * Gets or sets the secondary channel for special midi events.
   */
  secondaryChannel = 0;
  /**
   * Gets or sets whether the track is muted.
   */
  isMute = false;
  /**
   * Gets or sets whether the track is playing alone.
   */
  isSolo = false;
};

// third_party/alphatab/src/model/Tuning.ts
var Tuning = class _Tuning {
  static _sevenStrings = [];
  static _sixStrings = [];
  static _fiveStrings = [];
  static _fourStrings = [];
  static _defaultTunings = /* @__PURE__ */ new Map();
  static noteNames = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  static getTextForTuning(tuning, includeOctave) {
    const parts = _Tuning.getTextPartsForTuning(tuning);
    return includeOctave ? parts.join("") : parts[0];
  }
  static getTextPartsForTuning(tuning, octaveShift = -1) {
    const octave = tuning / 12 | 0;
    const note = tuning % 12;
    const notes = _Tuning.noteNames;
    return [notes[note], (octave + octaveShift).toString()];
  }
  /**
   * Gets the default tuning for the given string count.
   * @param stringCount The string count.
   * @returns The tuning for the given string count or null if the string count is not defined.
   */
  static getDefaultTuningFor(stringCount) {
    if (_Tuning._defaultTunings.has(stringCount)) {
      const d = _Tuning._defaultTunings.get(stringCount);
      return new _Tuning(d.name, d.tunings, d.isStandard);
    }
    return null;
  }
  /**
   * Gets a list of all tuning presets for a given stirng count.
   * @param stringCount The string count.
   * @returns The list of known tunings for the given string count or an empty list if the string count is not defined.
   */
  static getPresetsFor(stringCount) {
    switch (stringCount) {
      case 7:
        return _Tuning._sevenStrings;
      case 6:
        return _Tuning._sixStrings;
      case 5:
        return _Tuning._fiveStrings;
      case 4:
        return _Tuning._fourStrings;
    }
    return [];
  }
  static initialize() {
    _Tuning._defaultTunings.set(7, new _Tuning("Guitar 7 strings", [64, 59, 55, 50, 45, 40, 35], true));
    _Tuning._sevenStrings.push(_Tuning._defaultTunings.get(7));
    _Tuning._defaultTunings.set(6, new _Tuning("Guitar Standard Tuning", [64, 59, 55, 50, 45, 40], true));
    _Tuning._sixStrings.push(_Tuning._defaultTunings.get(6));
    _Tuning._sixStrings.push(new _Tuning("Guitar Tune down \xBD step", [63, 58, 54, 49, 44, 39], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Tune down 1 step", [62, 57, 53, 48, 43, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Tune down 2 step", [60, 55, 51, 46, 41, 36], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Dropped D Tuning", [64, 59, 55, 50, 45, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Dropped D Tuning variant", [64, 57, 55, 50, 45, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Double Dropped D Tuning", [62, 59, 55, 50, 45, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Dropped E Tuning", [66, 61, 57, 52, 47, 40], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Dropped C Tuning", [62, 57, 53, 48, 43, 36], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open C Tuning", [64, 60, 55, 48, 43, 36], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open Cm Tuning", [63, 60, 55, 48, 43, 36], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open C6 Tuning", [64, 57, 55, 48, 43, 36], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open Cmaj7 Tuning", [64, 59, 55, 52, 43, 36], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open D Tuning", [62, 57, 54, 50, 45, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open Dm Tuning", [62, 57, 53, 50, 45, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open D5 Tuning", [62, 57, 50, 50, 45, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open D6 Tuning", [62, 59, 54, 50, 45, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open Dsus4 Tuning", [62, 57, 55, 50, 45, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open E Tuning", [64, 59, 56, 52, 47, 40], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open Em Tuning", [64, 59, 55, 52, 47, 40], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open Esus11 Tuning", [64, 59, 55, 52, 45, 40], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open F Tuning", [65, 60, 53, 48, 45, 41], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open G Tuning", [62, 59, 55, 50, 43, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open Gm Tuning", [62, 58, 55, 50, 43, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open G6 Tuning", [64, 59, 55, 50, 43, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open Gsus4 Tuning", [62, 60, 55, 50, 43, 38], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open A Tuning", [64, 61, 57, 52, 45, 40], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Open Am Tuning", [64, 60, 57, 52, 45, 40], false));
    _Tuning._sixStrings.push(new _Tuning("Guitar Nashville Tuning", [64, 59, 67, 62, 57, 52], false));
    _Tuning._sixStrings.push(new _Tuning("Bass 6 Strings Tuning", [48, 43, 38, 33, 28, 23], false));
    _Tuning._sixStrings.push(new _Tuning("Lute or Vihuela Tuning", [64, 59, 54, 50, 45, 40], false));
    _Tuning._defaultTunings.set(5, new _Tuning("Bass 5 Strings Tuning", [43, 38, 33, 28, 23], true));
    _Tuning._fiveStrings.push(_Tuning._defaultTunings.get(5));
    _Tuning._fiveStrings.push(new _Tuning("Banjo Dropped C Tuning", [62, 59, 55, 48, 67], false));
    _Tuning._fiveStrings.push(new _Tuning("Banjo Open D Tuning", [62, 57, 54, 50, 69], false));
    _Tuning._fiveStrings.push(new _Tuning("Banjo Open G Tuning", [62, 59, 55, 50, 67], false));
    _Tuning._fiveStrings.push(new _Tuning("Banjo G Minor Tuning", [62, 58, 55, 50, 67], false));
    _Tuning._fiveStrings.push(new _Tuning("Banjo G Modal Tuning", [62, 57, 55, 50, 67], false));
    _Tuning._defaultTunings.set(4, new _Tuning("Bass Standard Tuning", [43, 38, 33, 28], true));
    _Tuning._fourStrings.push(_Tuning._defaultTunings.get(4));
    _Tuning._fourStrings.push(new _Tuning("Bass Tune down \xBD step", [42, 37, 32, 27], false));
    _Tuning._fourStrings.push(new _Tuning("Bass Tune down 1 step", [41, 36, 31, 26], false));
    _Tuning._fourStrings.push(new _Tuning("Bass Tune down 2 step", [39, 34, 29, 24], false));
    _Tuning._fourStrings.push(new _Tuning("Bass Dropped D Tuning", [43, 38, 33, 26], false));
    _Tuning._fourStrings.push(new _Tuning("Ukulele C Tuning", [45, 40, 36, 43], false));
    _Tuning._fourStrings.push(new _Tuning("Ukulele G Tuning", [52, 47, 43, 38], false));
    _Tuning._fourStrings.push(new _Tuning("Mandolin Standard Tuning", [64, 57, 50, 43], false));
    _Tuning._fourStrings.push(new _Tuning("Mandolin or Violin Tuning", [76, 69, 62, 55], false));
    _Tuning._fourStrings.push(new _Tuning("Viola Tuning", [69, 62, 55, 48], false));
    _Tuning._fourStrings.push(new _Tuning("Cello Tuning", [57, 50, 43, 36], false));
  }
  /**
   * Tries to find a known tuning by a given list of tuning values.
   * @param strings The values defining the tuning.
   * @returns The known tuning.
   */
  static findTuning(strings) {
    const tunings = _Tuning.getPresetsFor(strings.length);
    for (let t = 0, tc = tunings.length; t < tc; t++) {
      const tuning = tunings[t];
      let equals = true;
      for (let i = 0, j = strings.length; i < j; i++) {
        if (strings[i] !== tuning.tunings[i]) {
          equals = false;
          break;
        }
      }
      if (equals) {
        return new _Tuning(tuning.name, tuning.tunings, tuning.isStandard);
      }
    }
    return null;
  }
  /**
   * Gets or sets whether this is the standard tuning for this number of strings.
   */
  isStandard;
  /**
   * Gets or sets the name of the tuning.
   */
  name;
  /**
   * Gets or sets the values for each string of the instrument.
   */
  tunings;
  /**
   * Initializes a new instance of the {@link Tuning} class.
   * @param name The name.
   * @param tuning The tuning.
   * @param isStandard if set to`true`[is standard].
   */
  constructor(name = "", tuning = null, isStandard = false) {
    this.isStandard = isStandard;
    this.name = name;
    this.tunings = tuning ?? [];
  }
  reset() {
    this.isStandard = false;
    this.name = "";
    this.tunings = [];
  }
  /**
   * Tries to detect the name and standard flag of the tuning from a known tuning list based
   * on the string values.
   */
  finish() {
    const knownTuning = _Tuning.findTuning(this.tunings);
    if (knownTuning) {
      if (this.name.length === 0) {
        this.name = knownTuning.name;
      }
      this.isStandard = knownTuning.isStandard;
    }
  }
};
Tuning.initialize();

// third_party/alphatab/src/model/Staff.ts
var Staff = class _Staff {
  static DefaultStandardNotationLineCount = 5;
  /**
   * Gets or sets the zero-based index of this staff within the track.
   * @json_ignore
   */
  index = 0;
  /**
   * Gets or sets the reference to the track this staff belongs to.
   * @json_ignore
   */
  track;
  /**
   * Gets or sets a list of all bars contained in this staff.
   * @json_add addBar
   */
  bars = [];
  /**
   * Gets or sets a list of all chords defined for this staff. {@link Beat.chordId} refers to entries in this lookup.
   * @json_add addChord
   */
  chords = null;
  /**
   * Gets or sets the fret on which a capo is set.
   */
  capo = 0;
  /**
   * Gets or sets the number of semitones this track should be
   * transposed. This applies to rendering and playback.
   */
  transpositionPitch = 0;
  /**
   * Gets or sets the number of semitones this track should be
   * transposed. This applies only to rendering.
   */
  displayTranspositionPitch = 0;
  /**
   * Get or set the guitar tuning of the guitar. This tuning also indicates the number of strings shown in the
   * guitar tablature. Unlike the {@link Note.string} property this array directly represents
   * the order of the tracks shown in the tablature. The first item is the most top tablature line.
   */
  stringTuning = new Tuning("", [], false);
  /**
   * Get or set the values of the related guitar tuning.
   */
  get tuning() {
    return this.stringTuning.tunings;
  }
  /**
   * Gets or sets the name of the tuning.
   */
  get tuningName() {
    return this.stringTuning.name;
  }
  get isStringed() {
    return this.stringTuning.tunings.length > 0;
  }
  /**
   * Gets or sets whether the slash notation is shown.
   */
  showSlash = false;
  /**
   * Gets or sets whether the numbered notation is shown.
   */
  showNumbered = false;
  /**
   * Gets or sets whether the tabs are shown.
   */
  showTablature = true;
  /**
   * Gets or sets whether the standard notation is shown.
   */
  showStandardNotation = true;
  /**
   * Gets or sets whether the staff contains percussion notation
   */
  isPercussion = false;
  // alphaTab2.0: should be on track level
  /**
   * The number of lines shown for the standard notation.
   * For some percussion instruments this number might vary.
   */
  standardNotationLineCount = _Staff.DefaultStandardNotationLineCount;
  _filledVoices = /* @__PURE__ */ new Set([0]);
  /**
   * The indexes of the non-empty voices in this staff..
   * @json_ignore
   */
  get filledVoices() {
    return this._filledVoices;
  }
  finish(settings, sharedDataBag = null) {
    if (this.isPercussion) {
      this.stringTuning.tunings = [];
      this.showTablature = false;
      this.displayTranspositionPitch = 0;
    }
    this.stringTuning.finish();
    if (this.stringTuning.tunings.length === 0) {
      this.showTablature = false;
    }
    for (let i = 0, j = this.bars.length; i < j; i++) {
      this.bars[i].finish(settings, sharedDataBag);
      for (const v of this.bars[i].filledVoices) {
        this._filledVoices.add(v);
      }
    }
  }
  addChord(chordId, chord) {
    chord.staff = this;
    let chordMap = this.chords;
    if (chordMap === null) {
      chordMap = /* @__PURE__ */ new Map();
      this.chords = chordMap;
    }
    chordMap.set(chordId, chord);
  }
  hasChord(chordId) {
    return this.chords?.has(chordId) ?? false;
  }
  getChord(chordId) {
    return this.chords?.get(chordId) ?? null;
  }
  addBar(bar) {
    const bars = this.bars;
    bar.staff = this;
    bar.index = bars.length;
    if (bars.length > 0) {
      bar.previousBar = bars[bars.length - 1];
      bar.previousBar.nextBar = bar;
    }
    bars.push(bar);
  }
};

// third_party/alphatab/src/model/Track.ts
var Track = class _Track {
  static _shortNameMaxLength = 10;
  /**
   * Gets or sets the zero-based index of this track.
   * @json_ignore
   */
  index = 0;
  /**
   * Gets or sets the reference this track belongs to.
   * @json_ignore
   */
  score;
  /**
   * Gets or sets the list of staves that are defined for this track.
   * @json_add addStaff
   */
  staves = [];
  /**
   * Gets or sets the playback information for this track.
   */
  playbackInfo = new PlaybackInformation();
  /**
   * Gets or sets the display color defined for this track.
   */
  color = new Color(200, 0, 0, 255);
  /**
   * Gets or sets the long name of this track.
   */
  name = "";
  /**
   * Gets or sets whether this track should be visible in the UI.
   * This information is purely informational and might not be provided by all input formats.
   * In formats like Guitar Pro this flag indicates whether on the default "multi-track" layout
   * tracks should be visible or not.
   */
  isVisibleOnMultiTrack = true;
  /**
   * Gets or sets the short name of this track.
   */
  shortName = "";
  /**
   * Defines how many bars are placed into the systems (rows) when displaying
   * the track unless a value is set in the systemsLayout.
   */
  defaultSystemsLayout = 3;
  /**
   * Defines how many bars are placed into the systems (rows) when displaying
   * the track.
   */
  systemsLayout = [];
  /**
   * Defines on which bars specifically a line break is forced.
   * @json_add addLineBreaks
   */
  lineBreaks;
  /**
   * Gets whether this track is a percussion track.
   */
  get isPercussion() {
    return this.staves.some((s) => s.isPercussion);
  }
  /**
   * Adds a new line break.
   * @param index  The index of the bar before which a line break should happen.
   */
  addLineBreaks(index) {
    if (!this.lineBreaks) {
      this.lineBreaks = /* @__PURE__ */ new Set();
    }
    this.lineBreaks.add(index);
  }
  /**
   * Gets or sets a mapping on which staff lines particular percussion instruments
   * should be shown.
   */
  percussionArticulations = [];
  /**
   * The style customizations for this item.
   */
  style;
  ensureStaveCount(staveCount) {
    while (this.staves.length < staveCount) {
      this.addStaff(new Staff());
    }
  }
  addStaff(staff) {
    staff.index = this.staves.length;
    staff.track = this;
    this.staves.push(staff);
  }
  finish(settings, sharedDataBag = null) {
    if (!this.shortName) {
      this.shortName = this.name;
      if (this.shortName.length > _Track._shortNameMaxLength) {
        this.shortName = this.shortName.substr(0, _Track._shortNameMaxLength);
      }
    }
    for (const s of this.staves) {
      s.finish(settings, sharedDataBag);
      if (s.isPercussion) {
        this.playbackInfo.program = 0;
      }
    }
  }
  applyLyrics(lyrics) {
    for (const lyric of lyrics) {
      lyric.finish();
    }
    const staff = this.staves[0];
    for (let li = 0; li < lyrics.length; li++) {
      const lyric = lyrics[li];
      if (lyric.startBar >= 0 && lyric.startBar < staff.bars.length) {
        let beat = staff.bars[lyric.startBar].voices[0].beats[0];
        for (let ci = 0; ci < lyric.chunks.length && beat; ci++) {
          while (beat && (beat.isEmpty || beat.isRest)) {
            beat = beat.nextBeat;
          }
          if (beat) {
            if (!beat.lyrics) {
              beat.lyrics = new Array(lyrics.length);
              beat.lyrics.fill("");
            }
            beat.lyrics[li] = lyric.chunks[ci];
            beat = beat.nextBeat;
          }
        }
      }
    }
  }
};

// third_party/alphatab/src/xml/XmlNode.ts
var XmlNode = class _XmlNode {
  nodeType = 0 /* None */;
  localName = null;
  value = null;
  childNodes = [];
  attributes = /* @__PURE__ */ new Map();
  firstChild = null;
  firstElement = null;
  *childElements() {
    for (const c of this.childNodes) {
      if (c.nodeType === 1 /* Element */) {
        yield c;
      }
    }
  }
  addChild(node) {
    this.childNodes.push(node);
    this.firstChild = node;
    if (node.nodeType === 1 /* Element */ || node.nodeType === 3 /* CDATA */) {
      this.firstElement = node;
    }
  }
  getAttribute(name, defaultValue = "") {
    if (this.attributes.has(name)) {
      return this.attributes.get(name);
    }
    return defaultValue;
  }
  getElementsByTagName(name, recursive = false) {
    const tags = [];
    this._searchElementsByTagName(this.childNodes, tags, name, recursive);
    return tags;
  }
  _searchElementsByTagName(all, result, name, recursive = false) {
    for (const c of all) {
      if (c && c.nodeType === 1 /* Element */ && c.localName === name) {
        result.push(c);
      }
      if (recursive) {
        this._searchElementsByTagName(c.childNodes, result, name, true);
      }
    }
  }
  findChildElement(name) {
    for (const c of this.childNodes) {
      if (c && c.nodeType === 1 /* Element */ && c.localName === name) {
        return c;
      }
    }
    return null;
  }
  addElement(name) {
    const newNode = new _XmlNode();
    newNode.nodeType = 1 /* Element */;
    newNode.localName = name;
    this.addChild(newNode);
    return newNode;
  }
  get innerText() {
    if (this.nodeType === 1 /* Element */ || this.nodeType === 4 /* Document */) {
      if (this.firstElement && this.firstElement.nodeType === 3 /* CDATA */) {
        return this.firstElement.innerText;
      }
      let txt = "";
      for (const c of this.childNodes) {
        txt += c.innerText?.toString();
      }
      const s = txt;
      return s.trim();
    }
    return this.value ?? "";
  }
  set innerText(value2) {
    const textNode = new _XmlNode();
    textNode.nodeType = 2 /* Text */;
    textNode.value = value2;
    this.childNodes = [textNode];
  }
  setCData(s) {
    const textNode = new _XmlNode();
    textNode.nodeType = 3 /* CDATA */;
    textNode.value = s;
    this.childNodes = [textNode];
  }
};

// third_party/alphatab/src/xml/XmlError.ts
var XmlError = class extends AlphaTabError {
  xml;
  pos = 0;
  constructor(message, xml, pos) {
    super(1 /* Format */, message);
    this.xml = xml;
    this.pos = pos;
  }
};

// third_party/alphatab/src/xml/XmlParser.ts
var XmlParser = class _XmlParser {
  static CharCodeLF = 10;
  static CharCodeTab = 9;
  static CharCodeCR = 13;
  static CharCodeSpace = 32;
  static CharCodeLowerThan = 60;
  static CharCodeAmp = 38;
  static CharCodeBrackedClose = 93;
  static CharCodeBrackedOpen = 91;
  static CharCodeGreaterThan = 62;
  static CharCodeExclamation = 33;
  static CharCodeUpperD = 68;
  static CharCodeLowerD = 100;
  static CharCodeMinus = 45;
  static CharCodeQuestion = 63;
  static CharCodeSlash = 47;
  static CharCodeEquals = 61;
  static CharCodeDoubleQuote = 34;
  static CharCodeSingleQuote = 39;
  static CharCodeSharp = 35;
  static CharCodeLowerX = 120;
  static CharCodeLowerA = 97;
  static CharCodeLowerZ = 122;
  static CharCodeUpperA = 65;
  static CharCodeUpperZ = 90;
  static CharCode0 = 48;
  static CharCode9 = 57;
  static CharCodeColon = 58;
  static CharCodeDot = 46;
  static CharCodeUnderscore = 95;
  static CharCodeSemi = 59;
  static _escapes = /* @__PURE__ */ new Map([
    ["lt", "<"],
    ["gt", ">"],
    ["amp", "&"],
    ["quot", '"'],
    ["apos", "'"]
  ]);
  static parse(str, p, parent) {
    let c = str.charCodeAt(p);
    let state = 1 /* Begin */;
    let next = 1 /* Begin */;
    let start = 0;
    let buf = "";
    let escapeNext = 1 /* Begin */;
    let xml = null;
    let aname = null;
    let nbrackets = 0;
    let attrValQuote = 0;
    while (p < str.length) {
      c = str.charCodeAt(p);
      switch (state) {
        case 0 /* IgnoreSpaces */:
          switch (c) {
            case _XmlParser.CharCodeLF:
            case _XmlParser.CharCodeCR:
            case _XmlParser.CharCodeTab:
            case _XmlParser.CharCodeSpace:
              break;
            default:
              state = next;
              continue;
          }
          break;
        case 1 /* Begin */:
          switch (c) {
            case _XmlParser.CharCodeLowerThan:
              state = 0 /* IgnoreSpaces */;
              next = 2 /* BeginNode */;
              break;
            default:
              start = p;
              state = 13 /* Pcdata */;
              continue;
          }
          break;
        case 13 /* Pcdata */:
          if (c === _XmlParser.CharCodeLowerThan) {
            buf += str.substr(start, p - start);
            const child2 = new XmlNode();
            child2.nodeType = 2 /* Text */;
            child2.value = buf;
            buf = "";
            parent.addChild(child2);
            state = 0 /* IgnoreSpaces */;
            next = 2 /* BeginNode */;
          } else if (c === _XmlParser.CharCodeAmp) {
            buf += str.substr(start, p - start);
            state = 18 /* Escape */;
            escapeNext = 13 /* Pcdata */;
            start = p + 1;
          }
          break;
        case 17 /* Cdata */:
          if (c === _XmlParser.CharCodeBrackedClose && str.charCodeAt(p + 1) === _XmlParser.CharCodeBrackedClose && str.charCodeAt(p + 2) === _XmlParser.CharCodeGreaterThan) {
            const child2 = new XmlNode();
            child2.nodeType = 3 /* CDATA */;
            child2.value = str.substr(start, p - start);
            parent.addChild(child2);
            p += 2;
            state = 1 /* Begin */;
          }
          break;
        case 2 /* BeginNode */:
          switch (c) {
            case _XmlParser.CharCodeExclamation:
              if (str.charCodeAt(p + 1) === _XmlParser.CharCodeBrackedOpen) {
                p += 2;
                if (str.substr(p, 6).toUpperCase() !== "CDATA[") {
                  throw new XmlError("Expected <![CDATA[", str, p);
                }
                p += 5;
                state = 17 /* Cdata */;
                start = p + 1;
              } else if (str.charCodeAt(p + 1) === _XmlParser.CharCodeUpperD || str.charCodeAt(p + 1) === _XmlParser.CharCodeLowerD) {
                if (str.substr(p + 2, 6).toUpperCase() !== "OCTYPE") {
                  throw new XmlError("Expected <!DOCTYPE", str, p);
                }
                p += 8;
                state = 16 /* Doctype */;
                start = p + 1;
              } else if (str.charCodeAt(p + 1) !== _XmlParser.CharCodeMinus || str.charCodeAt(p + 2) !== _XmlParser.CharCodeMinus) {
                throw new XmlError("Expected <!--", str, p);
              } else {
                p += 2;
                state = 15 /* Comment */;
                start = p + 1;
              }
              break;
            case _XmlParser.CharCodeQuestion:
              state = 14 /* Header */;
              start = p;
              break;
            case _XmlParser.CharCodeSlash:
              if (!parent) {
                throw new XmlError("Expected node name", str, p);
              }
              start = p + 1;
              state = 0 /* IgnoreSpaces */;
              next = 10 /* Close */;
              break;
            default:
              state = 3 /* TagName */;
              start = p;
              continue;
          }
          break;
        case 3 /* TagName */:
          if (!_XmlParser._isValidChar(c)) {
            if (p === start) {
              throw new XmlError("Expected node name", str, p);
            }
            xml = new XmlNode();
            xml.nodeType = 1 /* Element */;
            xml.localName = str.substr(start, p - start);
            parent.addChild(xml);
            state = 0 /* IgnoreSpaces */;
            next = 4 /* Body */;
            continue;
          }
          break;
        case 4 /* Body */:
          switch (c) {
            case _XmlParser.CharCodeSlash:
              state = 11 /* WaitEnd */;
              break;
            case _XmlParser.CharCodeGreaterThan:
              state = 9 /* Childs */;
              break;
            default:
              state = 5 /* AttribName */;
              start = p;
              continue;
          }
          break;
        case 5 /* AttribName */:
          if (!_XmlParser._isValidChar(c)) {
            if (start === p) {
              throw new XmlError("Expected attribute name", str, p);
            }
            const tmp = str.substr(start, p - start);
            aname = tmp;
            if (xml.attributes.has(aname)) {
              throw new XmlError(`Duplicate attribute [${aname}]`, str, p);
            }
            state = 0 /* IgnoreSpaces */;
            next = 6 /* Equals */;
            continue;
          }
          break;
        case 6 /* Equals */:
          switch (c) {
            case _XmlParser.CharCodeEquals:
              state = 0 /* IgnoreSpaces */;
              next = 7 /* AttvalBegin */;
              break;
            default:
              throw new XmlError("Expected =", str, p);
          }
          break;
        case 7 /* AttvalBegin */:
          switch (c) {
            case _XmlParser.CharCodeDoubleQuote:
            case _XmlParser.CharCodeSingleQuote:
              buf = "";
              state = 8 /* AttribVal */;
              start = p + 1;
              attrValQuote = c;
              break;
          }
          break;
        case 8 /* AttribVal */:
          switch (c) {
            case _XmlParser.CharCodeAmp:
              buf += str.substr(start, p - start);
              state = 18 /* Escape */;
              escapeNext = 8 /* AttribVal */;
              start = p + 1;
              break;
            default:
              if (c === attrValQuote) {
                buf += str.substr(start, p - start);
                const value2 = buf;
                buf = "";
                xml.attributes.set(aname, value2);
                state = 0 /* IgnoreSpaces */;
                next = 4 /* Body */;
              }
              break;
          }
          break;
        case 9 /* Childs */:
          p = _XmlParser.parse(str, p, xml);
          start = p;
          state = 1 /* Begin */;
          break;
        case 11 /* WaitEnd */:
          switch (c) {
            case _XmlParser.CharCodeGreaterThan:
              state = 1 /* Begin */;
              break;
            default:
              throw new XmlError("Expected >", str, p);
          }
          break;
        case 12 /* WaitEndRet */:
          switch (c) {
            case _XmlParser.CharCodeGreaterThan:
              return p;
            default:
              throw new XmlError("Expected >", str, p);
          }
        case 10 /* Close */:
          if (!_XmlParser._isValidChar(c)) {
            if (start === p) {
              throw new XmlError("Expected node name", str, p);
            }
            const v = str.substr(start, p - start);
            if (v !== parent.localName) {
              throw new XmlError(`Expected </${parent.localName}>`, str, p);
            }
            state = 0 /* IgnoreSpaces */;
            next = 12 /* WaitEndRet */;
            continue;
          }
          break;
        case 15 /* Comment */:
          if (c === _XmlParser.CharCodeMinus && str.charCodeAt(p + 1) === _XmlParser.CharCodeMinus && str.charCodeAt(p + 2) === _XmlParser.CharCodeGreaterThan) {
            p += 2;
            state = 1 /* Begin */;
          }
          break;
        case 16 /* Doctype */:
          if (c === _XmlParser.CharCodeBrackedOpen) {
            nbrackets++;
          } else if (c === _XmlParser.CharCodeBrackedClose) {
            nbrackets--;
          } else if (c === _XmlParser.CharCodeGreaterThan && nbrackets === 0) {
            const node = new XmlNode();
            node.nodeType = 5 /* DocumentType */;
            node.value = str.substr(start, p - start);
            parent.addChild(node);
            state = 1 /* Begin */;
          }
          break;
        case 14 /* Header */:
          if (c === _XmlParser.CharCodeQuestion && str.charCodeAt(p + 1) === _XmlParser.CharCodeGreaterThan) {
            p++;
            state = 1 /* Begin */;
          }
          break;
        case 18 /* Escape */:
          if (c === _XmlParser.CharCodeSemi) {
            const s = str.substr(start, p - start);
            if (s.charCodeAt(0) === _XmlParser.CharCodeSharp) {
              const code = s.charCodeAt(1) === _XmlParser.CharCodeLowerX ? Number.parseInt(`0${s.substr(1, s.length - 1)}`, 10) : Number.parseInt(s.substr(1, s.length - 1), 10);
              buf += String.fromCharCode(code);
            } else if (_XmlParser._escapes.has(s)) {
              buf += _XmlParser._escapes.get(s);
            } else {
              buf += `&${s};`?.toString();
            }
            start = p + 1;
            state = escapeNext;
          } else if (!_XmlParser._isValidChar(c) && c !== _XmlParser.CharCodeSharp) {
            buf += "&";
            buf += str.substr(start, p - start);
            p--;
            start = p + 1;
            state = escapeNext;
          }
          break;
      }
      p++;
    }
    if (state === 1 /* Begin */) {
      start = p;
      state = 13 /* Pcdata */;
    }
    if (state === 13 /* Pcdata */) {
      if (p !== start) {
        buf += str.substr(start, p - start);
        const node = new XmlNode();
        node.nodeType = 2 /* Text */;
        node.value = buf;
        parent.addChild(node);
      }
      return p;
    }
    if (state === 18 /* Escape */ && escapeNext === 13 /* Pcdata */) {
      buf += "&";
      buf += str.substr(start, p - start);
      const node = new XmlNode();
      node.nodeType = 2 /* Text */;
      node.value = buf;
      parent.addChild(node);
      return p;
    }
    throw new XmlError("Unexpected end", str, p);
  }
  static _isValidChar(c) {
    return c >= _XmlParser.CharCodeLowerA && c <= _XmlParser.CharCodeLowerZ || c >= _XmlParser.CharCodeUpperA && c <= _XmlParser.CharCodeUpperZ || c >= _XmlParser.CharCode0 && c <= _XmlParser.CharCode9 || c === _XmlParser.CharCodeColon || c === _XmlParser.CharCodeDot || c === _XmlParser.CharCodeUnderscore || c === _XmlParser.CharCodeMinus;
  }
};

// third_party/alphatab/src/xml/XmlWriter.ts
var XmlWriter = class _XmlWriter {
  // NOTE: we use the string.join variant rather than the
  // string concatenation for IE performnace concerns
  _result = [];
  _indention;
  _xmlHeader;
  _isStartOfLine;
  _currentIndention;
  constructor(indention, xmlHeader) {
    this._indention = indention;
    this._xmlHeader = xmlHeader;
    this._currentIndention = "";
    this._isStartOfLine = true;
  }
  writeNode(xml) {
    switch (xml.nodeType) {
      case 0 /* None */:
        break;
      case 1 /* Element */:
        if (this._result.length > 0) {
          this._writeLine();
        }
        this._write(`<${xml.localName}`);
        for (const [name, value2] of xml.attributes) {
          this._write(` ${name}="`);
          this._writeAttributeValue(value2);
          this._write('"');
        }
        if (xml.childNodes.length === 0) {
          this._write("/>");
        } else {
          this._write(">");
          if (xml.childNodes.length === 1 && !xml.firstElement) {
            this.writeNode(xml.childNodes[0]);
          } else {
            this._indent();
            for (const child2 of xml.childNodes) {
              if (child2.nodeType === 1 /* Element */ || child2.nodeType === 6 /* Comment */) {
                this.writeNode(child2);
              }
            }
            this._unindend();
            this._writeLine();
          }
          this._write(`</${xml.localName}>`);
        }
        break;
      case 2 /* Text */:
        if (xml.value) {
          this._write(xml.value);
        }
        break;
      case 3 /* CDATA */:
        if (xml.value !== null) {
          this._write(`<![CDATA[${xml.value}]]>`);
        }
        break;
      case 4 /* Document */:
        if (this._xmlHeader) {
          this._write('<?xml version="1.0" encoding="utf-8"?>');
        }
        for (const child2 of xml.childNodes) {
          this.writeNode(child2);
        }
        break;
      case 5 /* DocumentType */:
        this._write(`<!DOCTYPE ${xml.value}>`);
        break;
      case 6 /* Comment */:
        this._write(`<!-- ${xml.value} -->`);
        break;
    }
  }
  _unindend() {
    this._currentIndention = this._currentIndention.substr(
      0,
      this._currentIndention.length - this._indention.length
    );
  }
  _indent() {
    this._currentIndention += this._indention;
  }
  _writeAttributeValue(value2) {
    for (let i = 0; i < value2.length; i++) {
      const c = value2.charAt(i);
      switch (c) {
        case "<":
          this._result.push("&lt;");
          break;
        case ">":
          this._result.push("&gt;");
          break;
        case "&":
          this._result.push("&amp;");
          break;
        case "'":
          this._result.push("&apos;");
          break;
        case '"':
          this._result.push("&quot;");
          break;
        default:
          this._result.push(c);
          break;
      }
    }
  }
  static write(xml, indention, xmlHeader) {
    const writer = new _XmlWriter(indention, xmlHeader);
    writer.writeNode(xml);
    return writer.toString();
  }
  _write(s) {
    if (this._isStartOfLine) {
      this._result.push(this._currentIndention);
    }
    this._result.push(s);
    this._isStartOfLine = false;
  }
  _writeLine(s = null) {
    if (s) {
      this._write(s);
    }
    if (this._indention.length > 0 && !this._isStartOfLine) {
      this._result.push("\n");
      this._isStartOfLine = true;
    }
  }
  toString() {
    return this._result.join("").trimRight();
  }
};

// third_party/alphatab/src/xml/XmlDocument.ts
var XmlDocument = class extends XmlNode {
  constructor() {
    super();
    this.nodeType = 4 /* Document */;
  }
  parse(xml) {
    XmlParser.parse(xml, 0, this);
  }
  toString() {
    return this.toFormattedString();
  }
  toFormattedString(indention = "", xmlHeader = false) {
    return XmlWriter.write(this, indention, xmlHeader);
  }
};

// third_party/alphatab/src/model/BackingTrack.ts
var BackingTrack = class {
  /**
   * The data of the raw audio file to be used for playback.
   * @json_ignore
   */
  rawAudioFile;
};

// third_party/alphatab/src/importer/GpifParser.ts
var GpifRhythm = class {
  id = "";
  dots = 0;
  tupletDenominator = -1;
  tupletNumerator = -1;
  value = 4 /* Quarter */;
};
var GpifSound = class {
  name = "";
  path = "";
  role = "";
  get uniqueId() {
    return `${this.path};${this.name};${this.role}`;
  }
  program = 0;
  bank = 0;
};
var GpifParser = class _GpifParser {
  static _invalidId = "-1";
  /**
   * GPX range: 0-100
   * Internal range: 0 - 60
   */
  static _bendPointPositionFactor = BendPoint.MaxPosition / 100;
  /**
   * GPIF: 25 per quarternote
   * Internal Range: 1 per quarter note
   */
  static _bendPointValueFactor = 1 / 25;
  // tests have shown that Guitar Pro seem to always work with 44100hz for the frame offsets,
  // they are NOT using the sample rate of the input file.
  // Downsampling a 44100hz ogg to 8000hz and using it in as audio track resulted in the same frame offset when placing sync points.
  static _sampleRate = 44100;
  score;
  _backingTrackAssetId;
  _masterTrackAutomations;
  _automationsPerTrackIdAndBarIndex;
  _sustainPedalsPerTrackIdAndBarIndex;
  _tracksMapping;
  _tracksById;
  _masterBars;
  _barsOfMasterBar;
  _barsById;
  _voicesOfBar;
  _voiceById;
  _beatsOfVoice;
  _rhythmOfBeat;
  _beatById;
  _rhythmById;
  _noteById;
  _notesOfBeat;
  _tappedNotes;
  _lyricsByTrack;
  _soundsByTrack;
  _hasAnacrusis = false;
  _articulationByName;
  _skipApplyLyrics = false;
  _backingTrackPadding = 0;
  _doubleBars = /* @__PURE__ */ new Set();
  _keySignatures = /* @__PURE__ */ new Map();
  /** Converter preservation hook. Called for each cloned note before finish/chaining. */
  onNoteOccurrence;
  loadAsset;
  parseXml(xml, settings) {
    this._masterTrackAutomations = /* @__PURE__ */ new Map();
    this._automationsPerTrackIdAndBarIndex = /* @__PURE__ */ new Map();
    this._sustainPedalsPerTrackIdAndBarIndex = /* @__PURE__ */ new Map();
    this._tracksMapping = [];
    this._tracksById = /* @__PURE__ */ new Map();
    this._masterBars = [];
    this._barsOfMasterBar = [];
    this._voicesOfBar = /* @__PURE__ */ new Map();
    this._barsById = /* @__PURE__ */ new Map();
    this._voiceById = /* @__PURE__ */ new Map();
    this._beatsOfVoice = /* @__PURE__ */ new Map();
    this._beatById = /* @__PURE__ */ new Map();
    this._rhythmOfBeat = /* @__PURE__ */ new Map();
    this._rhythmById = /* @__PURE__ */ new Map();
    this._notesOfBeat = /* @__PURE__ */ new Map();
    this._noteById = /* @__PURE__ */ new Map();
    this._tappedNotes = /* @__PURE__ */ new Map();
    this._lyricsByTrack = /* @__PURE__ */ new Map();
    this._soundsByTrack = /* @__PURE__ */ new Map();
    this._skipApplyLyrics = false;
    const dom = new XmlDocument();
    try {
      dom.parse(xml);
    } catch (e) {
      throw new UnsupportedFormatError("Could not parse XML", e);
    }
    this._parseDom(dom);
    this._buildModel();
    ModelUtils.consolidate(this.score);
    this.score.finish(settings);
    if (!this._skipApplyLyrics && this._lyricsByTrack.size > 0) {
      for (const [t, lyrics] of this._lyricsByTrack) {
        const track = this._tracksById.get(t);
        track.applyLyrics(lyrics);
      }
    }
  }
  _parseDom(dom) {
    const root = dom.firstElement;
    if (!root) {
      return;
    }
    if (root.localName === "GPIF") {
      this.score = new Score();
      for (const n of root.childElements()) {
        switch (n.localName) {
          case "Score":
            this._parseScoreNode(n);
            break;
          case "MasterTrack":
            this._parseMasterTrackNode(n);
            break;
          case "BackingTrack":
            this._parseBackingTrackNode(n);
            break;
          case "Tracks":
            this._parseTracksNode(n);
            break;
          case "MasterBars":
            this._parseMasterBarsNode(n);
            break;
          case "Bars":
            this._parseBars(n);
            break;
          case "Voices":
            this._parseVoices(n);
            break;
          case "Beats":
            this._parseBeats(n);
            break;
          case "Notes":
            this._parseNotes(n);
            break;
          case "Rhythms":
            this._parseRhythms(n);
            break;
          case "Assets":
            this._parseAssets(n);
            break;
        }
      }
    } else {
      throw new UnsupportedFormatError("Root node of XML was not GPIF");
    }
  }
  _parseAssets(element) {
    for (const c of element.childElements()) {
      switch (c.localName) {
        case "Asset":
          if (c.getAttribute("id") === this._backingTrackAssetId) {
            this._parseBackingTrackAsset(c);
          }
          break;
      }
    }
  }
  _parseBackingTrackAsset(element) {
    let embeddedFilePath = "";
    for (const c of element.childElements()) {
      switch (c.localName) {
        case "EmbeddedFilePath":
          embeddedFilePath = c.innerText;
          break;
      }
    }
    const loadAsset = this.loadAsset;
    if (loadAsset) {
      const assetData = loadAsset(embeddedFilePath);
      if (assetData) {
        this.score.backingTrack.rawAudioFile = assetData;
      } else {
        this.score.backingTrack = void 0;
      }
    }
  }
  //
  // <Score>...</Score>
  //
  _parseScoreNode(element) {
    for (const c of element.childElements()) {
      switch (c.localName) {
        case "Title":
          this.score.title = c.innerText;
          break;
        case "SubTitle":
          this.score.subTitle = c.innerText;
          break;
        case "Artist":
          this.score.artist = c.innerText;
          break;
        case "Album":
          this.score.album = c.innerText;
          break;
        case "Words":
          this.score.words = c.innerText;
          break;
        case "Music":
          this.score.music = c.innerText;
          break;
        case "WordsAndMusic":
          const wordsAndMusic = c.innerText;
          if (wordsAndMusic !== "") {
            if (wordsAndMusic && !this.score.words) {
              this.score.words = wordsAndMusic;
            }
            if (wordsAndMusic && !this.score.music) {
              this.score.music = wordsAndMusic;
            }
          }
          break;
        case "Copyright":
          this.score.copyright = c.innerText;
          break;
        case "Tabber":
          this.score.tab = c.innerText;
          break;
        case "Instructions":
          this.score.instructions = c.innerText;
          break;
        case "Notices":
          this.score.notices = c.innerText;
          break;
        case "ScoreSystemsDefaultLayout":
          this.score.defaultSystemsLayout = _GpifParser._parseIntSafe(c.innerText, 4);
          break;
        case "ScoreSystemsLayout":
          this.score.systemsLayout = _GpifParser._splitSafe(c.innerText).map(
            (i) => _GpifParser._parseIntSafe(i, 4)
          );
          break;
      }
    }
  }
  static _parseIntSafe(text, fallback) {
    if (!text) {
      return fallback;
    }
    const i = Number.parseInt(text, 10);
    if (!Number.isNaN(i)) {
      return i;
    }
    return fallback;
  }
  static _parseFloatSafe(text, fallback) {
    if (!text) {
      return fallback;
    }
    const i = Number.parseFloat(text);
    if (!Number.isNaN(i)) {
      return i;
    }
    return fallback;
  }
  static _splitSafe(text, separator = " ") {
    if (!text) {
      return [];
    }
    return text.split(separator).map((t) => t.trim()).filter((t) => t.length > 0);
  }
  //
  // <BackingTrack>...</BackingTrack>
  //
  _parseBackingTrackNode(node) {
    const backingTrack = new BackingTrack();
    let enabled = false;
    let source = "";
    let assetId = "";
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Enabled":
          enabled = c.innerText === "true";
          break;
        case "Source":
          source = c.innerText;
          break;
        case "AssetId":
          assetId = c.innerText;
          break;
        case "FramePadding":
          this._backingTrackPadding = _GpifParser._parseIntSafe(c.innerText, 0) / _GpifParser._sampleRate * 1e3;
          break;
      }
    }
    if (enabled && source === "Local") {
      this.score.backingTrack = backingTrack;
      this._backingTrackAssetId = assetId;
    }
  }
  //
  // <MasterTrack>...</MasterTrack>
  //
  _parseMasterTrackNode(node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Automations":
          this._parseAutomations(c, this._masterTrackAutomations, null, null);
          break;
        case "Tracks":
          this._tracksMapping = _GpifParser._splitSafe(c.innerText);
          break;
        case "Anacrusis":
          this._hasAnacrusis = true;
          break;
      }
    }
  }
  _parseAutomations(node, automations, sounds, sustainPedals) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Automation":
          this._parseAutomation(c, automations, sounds, sustainPedals);
          break;
      }
    }
  }
  _parseAutomation(node, automations, sounds, sustainPedals) {
    let type = null;
    let isLinear = false;
    let barIndex = -1;
    let ratioPosition = 0;
    let numberValue = 0;
    let textValue = null;
    let reference = 0;
    let text = null;
    let syncPointValue = void 0;
    let isVisible = true;
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Type":
          type = c.innerText;
          break;
        case "Linear":
          isLinear = c.innerText.toLowerCase() === "true";
          break;
        case "Bar":
          barIndex = _GpifParser._parseIntSafe(c.innerText, 0);
          break;
        case "Position":
          ratioPosition = _GpifParser._parseFloatSafe(c.innerText, 0);
          break;
        case "Value":
          if (c.firstElement && c.firstElement.nodeType === 3 /* CDATA */) {
            textValue = c.innerText;
          } else if (c.firstElement && c.firstElement.nodeType === 1 /* Element */ && type === "SyncPoint") {
            syncPointValue = new SyncPointData();
            for (const vc of c.childElements()) {
              switch (vc.localName) {
                case "BarIndex":
                  barIndex = _GpifParser._parseIntSafe(vc.innerText, 0);
                  break;
                case "BarOccurrence":
                  syncPointValue.barOccurence = _GpifParser._parseIntSafe(vc.innerText, 0);
                  break;
                case "FrameOffset":
                  const frameOffset = _GpifParser._parseFloatSafe(vc.innerText, 0);
                  syncPointValue.millisecondOffset = frameOffset / _GpifParser._sampleRate * 1e3;
                  break;
              }
            }
          } else {
            const parts = _GpifParser._splitSafe(c.innerText);
            if (parts.length === 1) {
              numberValue = _GpifParser._parseFloatSafe(parts[0], 0);
              reference = 1;
            } else {
              numberValue = _GpifParser._parseFloatSafe(parts[0], 0);
              reference = _GpifParser._parseIntSafe(parts[1], 0);
            }
          }
          break;
        case "Text":
          text = c.innerText;
          break;
        case "Visible":
          isVisible = c.innerText.toLowerCase() === "true";
          break;
      }
    }
    if (!type) {
      return;
    }
    const newAutomations = [];
    switch (type) {
      case "Tempo":
        newAutomations.push(
          Automation.buildTempoAutomation(isLinear, ratioPosition, numberValue, reference, isVisible)
        );
        break;
      case "SyncPoint":
        const syncPoint = new Automation();
        syncPoint.type = 4 /* SyncPoint */;
        syncPoint.isLinear = isLinear;
        syncPoint.ratioPosition = ratioPosition;
        syncPoint.syncPointValue = syncPointValue;
        syncPoint.isVisible = isVisible;
        newAutomations.push(syncPoint);
        break;
      case "Sound":
        if (textValue && sounds && sounds.has(textValue)) {
          const bankChange = new Automation();
          bankChange.type = 4 /* Bank */;
          bankChange.ratioPosition = ratioPosition;
          bankChange.value = sounds.get(textValue).bank;
          bankChange.isVisible = isVisible;
          newAutomations.push(bankChange);
          const programChange = Automation.buildInstrumentAutomation(
            isLinear,
            ratioPosition,
            sounds.get(textValue).program
          );
          newAutomations.push(programChange);
        }
        break;
      case "SustainPedal":
        if (sustainPedals) {
          let v;
          if (sustainPedals.has(barIndex)) {
            v = sustainPedals.get(barIndex);
          } else {
            v = [];
            sustainPedals.set(barIndex, v);
          }
          const sustain = new SustainPedalMarker();
          sustain.ratioPosition = ratioPosition;
          switch (reference) {
            case 1:
              sustain.pedalType = 0 /* Down */;
              break;
            case 3:
              sustain.pedalType = 2 /* Up */;
              break;
          }
          v.push(sustain);
        }
        break;
    }
    if (newAutomations.length) {
      if (text) {
        for (const a of newAutomations) {
          a.text = text;
        }
      }
      if (barIndex >= 0) {
        if (!automations.has(barIndex)) {
          automations.set(barIndex, []);
        }
        for (const a of newAutomations) {
          automations.get(barIndex).push(a);
        }
      }
    }
  }
  //
  // <Tracks>...</Tracks>
  //
  _parseTracksNode(node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Track":
          this._parseTrack(c);
          break;
      }
    }
  }
  _parseTrack(node) {
    this._articulationByName = /* @__PURE__ */ new Map();
    const track = new Track();
    track.ensureStaveCount(1);
    const staff = track.staves[0];
    staff.showStandardNotation = true;
    const trackId = node.getAttribute("id");
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Name":
          track.name = c.innerText;
          break;
        case "Color":
          const parts = _GpifParser._splitSafe(c.innerText);
          if (parts.length >= 3) {
            const r = _GpifParser._parseIntSafe(parts[0], 0);
            const g = _GpifParser._parseIntSafe(parts[1], 0);
            const b = _GpifParser._parseIntSafe(parts[2], 0);
            track.color = new Color(r, g, b, 255);
          }
          break;
        case "Instrument":
          const instrumentName = c.getAttribute("ref");
          if (instrumentName.endsWith("-gs") || instrumentName.endsWith("GrandStaff")) {
            track.ensureStaveCount(2);
            track.staves[1].showStandardNotation = true;
          }
          break;
        case "InstrumentSet":
          this._parseInstrumentSet(track, c);
          break;
        case "NotationPatch":
          this._parseNotationPatch(track, c);
          break;
        case "ShortName":
          track.shortName = c.innerText;
          break;
        case "SystemsDefautLayout":
          track.defaultSystemsLayout = _GpifParser._parseIntSafe(c.innerText, 4);
          break;
        case "SystemsLayout":
          track.systemsLayout = _GpifParser._splitSafe(c.innerText).map((i) => _GpifParser._parseIntSafe(i, 4));
          break;
        case "Lyrics":
          this._parseLyrics(trackId, c);
          break;
        case "Properties":
          this._parseTrackProperties(track, c);
          break;
        case "GeneralMidi":
        case "MidiConnection":
        case "MIDISettings":
          this._parseGeneralMidi(track, c);
          break;
        case "Sounds":
          this._parseSounds(trackId, track, c);
          break;
        case "PlaybackState":
          const state = c.innerText;
          track.playbackInfo.isSolo = state === "Solo";
          track.playbackInfo.isMute = state === "Mute";
          break;
        case "PartSounding":
          this._parsePartSounding(trackId, track, c);
          break;
        case "Staves":
          this._parseStaves(track, c);
          break;
        case "Transpose":
          this._parseTranspose(trackId, track, c);
          break;
        case "RSE":
          this._parseRSE(track, c);
          break;
        case "Automations":
          this._parseTrackAutomations(trackId, c);
          break;
      }
    }
    this._tracksById.set(trackId, track);
  }
  _parseTrackAutomations(trackId, c) {
    const trackAutomations = /* @__PURE__ */ new Map();
    this._automationsPerTrackIdAndBarIndex.set(trackId, trackAutomations);
    const sustainPedals = /* @__PURE__ */ new Map();
    this._sustainPedalsPerTrackIdAndBarIndex.set(trackId, sustainPedals);
    this._parseAutomations(c, trackAutomations, this._soundsByTrack.get(trackId), sustainPedals);
  }
  _parseNotationPatch(track, node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "LineCount":
          const lineCount = _GpifParser._parseIntSafe(c.innerText, 5);
          for (const staff of track.staves) {
            staff.standardNotationLineCount = lineCount;
          }
          break;
        case "Elements":
          this._parseElements(track, c, false);
          break;
      }
    }
  }
  _parseInstrumentSet(track, node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Type":
          if (c.innerText === "drumKit") {
            for (const staff of track.staves) {
              staff.isPercussion = true;
            }
          }
          break;
        case "Elements":
          this._parseElements(track, c, true);
          break;
        case "LineCount":
          const lineCount = _GpifParser._parseIntSafe(c.innerText, 5);
          for (const staff of track.staves) {
            staff.standardNotationLineCount = lineCount;
          }
          break;
      }
    }
  }
  _parseElements(track, node, isInstrumentSet) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Element":
          this._parseElement(track, c, isInstrumentSet);
          break;
      }
    }
  }
  _parseElement(track, node, isInstrumentSet) {
    const name = node.findChildElement("Name")?.innerText ?? "";
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Name":
        case "Articulations":
          this._parseArticulations(track, c, isInstrumentSet, name);
          break;
      }
    }
  }
  _parseArticulations(track, node, isInstrumentSet, elementName) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Articulation":
          this._parseArticulation(track, c, isInstrumentSet, elementName);
          break;
      }
    }
  }
  _parseArticulation(track, node, isInstrumentSet, elementName) {
    const articulation = new InstrumentArticulation();
    articulation.outputMidiNumber = -1;
    articulation.elementType = elementName;
    let name = "";
    for (const c of node.childElements()) {
      const txt = c.innerText;
      switch (c.localName) {
        case "Name":
          name = c.innerText;
          break;
        case "InputMidiNumbers":
          articulation.id = _GpifParser._parseIntSafe(txt.split(" ")[0], 0);
          break;
        case "OutputMidiNumber":
          articulation.outputMidiNumber = _GpifParser._parseIntSafe(txt, 0);
          break;
        case "TechniqueSymbol":
          articulation.techniqueSymbol = _GpifParser.parseTechniqueSymbol(txt);
          break;
        case "TechniquePlacement":
          articulation.techniqueSymbolPlacement = _GpifParser.parseTechniqueSymbolPlacement(txt);
          break;
        case "Noteheads":
          const noteHeadsTxt = _GpifParser._splitSafe(txt);
          if (noteHeadsTxt.length >= 1) {
            articulation.noteHeadDefault = _GpifParser.parseNoteHead(noteHeadsTxt[0]);
          }
          if (noteHeadsTxt.length >= 2) {
            articulation.noteHeadHalf = _GpifParser.parseNoteHead(noteHeadsTxt[1]);
          }
          if (noteHeadsTxt.length >= 3) {
            articulation.noteHeadWhole = _GpifParser.parseNoteHead(noteHeadsTxt[2]);
          }
          if (articulation.noteHeadHalf === -1 /* None */) {
            articulation.noteHeadHalf = articulation.noteHeadDefault;
          }
          if (articulation.noteHeadWhole === -1 /* None */) {
            articulation.noteHeadWhole = articulation.noteHeadDefault;
          }
          break;
        case "StaffLine":
          articulation.staffLine = _GpifParser._parseIntSafe(txt, 0);
          break;
      }
    }
    const fullName = `${elementName}.${name}`;
    if (isInstrumentSet) {
      track.percussionArticulations.push(articulation);
      this._articulationByName.set(fullName, articulation);
    } else if (this._articulationByName.has(fullName)) {
      this._articulationByName.get(fullName).staffLine = articulation.staffLine;
    }
  }
  /**
   * @internal
   */
  static parseTechniqueSymbol(txt) {
    switch (txt) {
      case "pictEdgeOfCymbal":
        return 59177 /* PictEdgeOfCymbal */;
      case "articStaccatoAbove":
        return 58530 /* ArticStaccatoAbove */;
      case "noteheadParenthesis":
        return 57550 /* NoteheadParenthesis */;
      case "stringsUpBow":
        return 58898 /* StringsUpBow */;
      case "stringsDownBow":
        return 58896 /* StringsDownBow */;
      case "guitarGolpe":
        return 59458 /* GuitarGolpe */;
      default:
        return -1 /* None */;
    }
  }
  /**
   * @internal
   */
  static parseTechniqueSymbolPlacement(txt) {
    switch (txt) {
      case "outside":
        return 3 /* Outside */;
      case "inside":
        return 1 /* Inside */;
      case "above":
        return 0 /* Above */;
      case "below":
        return 2 /* Below */;
      default:
        return 3 /* Outside */;
    }
  }
  /**
   * @internal
   */
  static parseNoteHead(txt) {
    switch (txt) {
      case "noteheadDoubleWholeSquare":
        return 57505 /* NoteheadDoubleWholeSquare */;
      case "noteheadDoubleWhole":
        return 57504 /* NoteheadDoubleWhole */;
      case "noteheadWhole":
        return 57506 /* NoteheadWhole */;
      case "noteheadHalf":
        return 57507 /* NoteheadHalf */;
      case "noteheadBlack":
        return 57508 /* NoteheadBlack */;
      case "noteheadNull":
        return 57509 /* NoteheadNull */;
      case "noteheadXOrnate":
        return 57514 /* NoteheadXOrnate */;
      case "noteheadTriangleUpWhole":
        return 57531 /* NoteheadTriangleUpWhole */;
      case "noteheadTriangleUpHalf":
        return 57532 /* NoteheadTriangleUpHalf */;
      case "noteheadTriangleUpBlack":
        return 57534 /* NoteheadTriangleUpBlack */;
      case "noteheadDiamondBlackWide":
        return 57564 /* NoteheadDiamondBlackWide */;
      case "noteheadDiamondWhite":
        return 57565 /* NoteheadDiamondWhite */;
      case "noteheadDiamondWhiteWide":
        return 57566 /* NoteheadDiamondWhiteWide */;
      case "noteheadCircleX":
        return 57523 /* NoteheadCircleX */;
      case "noteheadXWhole":
        return 57511 /* NoteheadXWhole */;
      case "noteheadXHalf":
        return 57512 /* NoteheadXHalf */;
      case "noteheadXBlack":
        return 57513 /* NoteheadXBlack */;
      case "noteheadParenthesis":
        return 57550 /* NoteheadParenthesis */;
      case "noteheadSlashedBlack2":
        return 57552 /* NoteheadSlashedBlack2 */;
      case "noteheadCircleSlash":
        return 57591 /* NoteheadCircleSlash */;
      case "noteheadHeavyX":
        return 57592 /* NoteheadHeavyX */;
      case "noteheadHeavyXHat":
        return 57593 /* NoteheadHeavyXHat */;
      default:
        Logger.warning("GPIF", "Unknown notehead symbol", txt);
        return -1 /* None */;
    }
  }
  _parseStaves(track, node) {
    let staffIndex = 0;
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Staff":
          track.ensureStaveCount(staffIndex + 1);
          const staff = track.staves[staffIndex];
          this._parseStaff(staff, c);
          staffIndex++;
          break;
      }
    }
  }
  _parseStaff(staff, node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Properties":
          this._parseStaffProperties(staff, c);
          break;
      }
    }
  }
  _parseStaffProperties(staff, node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Property":
          this._parseStaffProperty(staff, c);
          break;
      }
    }
  }
  _parseStaffProperty(staff, node) {
    const propertyName = node.getAttribute("name");
    switch (propertyName) {
      case "Tuning":
        for (const c of node.childElements()) {
          switch (c.localName) {
            case "Pitches":
              const tuningParts = _GpifParser._splitSafe(
                node.findChildElement("Pitches")?.innerText
              );
              const tuning = new Array(tuningParts.length);
              for (let i = 0; i < tuning.length; i++) {
                tuning[tuning.length - 1 - i] = _GpifParser._parseIntSafe(tuningParts[i], 0);
              }
              staff.stringTuning.tunings = tuning;
              break;
            case "Label":
              staff.stringTuning.name = c.innerText;
              break;
          }
        }
        if (!staff.isPercussion) {
          staff.showTablature = true;
        }
        break;
      case "DiagramCollection":
      case "ChordCollection":
        this._parseDiagramCollectionForStaff(staff, node);
        break;
      case "CapoFret":
        const capo = _GpifParser._parseIntSafe(node.findChildElement("Fret")?.innerText, 0);
        staff.capo = capo;
        break;
    }
  }
  _parseLyrics(trackId, node) {
    const tracks = [];
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Line":
          tracks.push(this._parseLyricsLine(c));
          break;
      }
    }
    this._lyricsByTrack.set(trackId, tracks);
  }
  _parseLyricsLine(node) {
    const lyrics = new Lyrics();
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Offset":
          lyrics.startBar = _GpifParser._parseIntSafe(c.innerText, 0);
          break;
        case "Text":
          lyrics.text = c.innerText;
          break;
      }
    }
    return lyrics;
  }
  _parseDiagramCollectionForTrack(track, node) {
    const items = node.findChildElement("Items");
    if (items) {
      for (const c of items.childElements()) {
        switch (c.localName) {
          case "Item":
            this._parseDiagramItemForTrack(track, c);
            break;
        }
      }
    }
  }
  _parseDiagramCollectionForStaff(staff, node) {
    const items = node.findChildElement("Items");
    if (items) {
      for (const c of items.childElements()) {
        switch (c.localName) {
          case "Item":
            this._parseDiagramItemForStaff(staff, c);
            break;
        }
      }
    }
  }
  _parseDiagramItemForTrack(track, node) {
    const chord = new Chord();
    const chordId = node.getAttribute("id");
    for (const staff of track.staves) {
      staff.addChord(chordId, chord);
    }
    this._parseDiagramItemForChord(chord, node);
  }
  _parseDiagramItemForStaff(staff, node) {
    const chord = new Chord();
    const chordId = node.getAttribute("id");
    staff.addChord(chordId, chord);
    this._parseDiagramItemForChord(chord, node);
  }
  _parseDiagramItemForChord(chord, node) {
    chord.name = node.getAttribute("name");
    const diagram = node.findChildElement("Diagram");
    if (!diagram) {
      chord.showDiagram = false;
      chord.showFingering = false;
      return;
    }
    const stringCount = _GpifParser._parseIntSafe(diagram.getAttribute("stringCount"), 6);
    const baseFret = _GpifParser._parseIntSafe(diagram.getAttribute("baseFret"), 0);
    chord.firstFret = baseFret + 1;
    for (let i = 0; i < stringCount; i++) {
      chord.strings.push(-1);
    }
    for (const c of diagram.childElements()) {
      switch (c.localName) {
        case "Fret":
          const guitarString = _GpifParser._parseIntSafe(c.getAttribute("string"), 0);
          chord.strings[stringCount - guitarString - 1] = baseFret + _GpifParser._parseIntSafe(c.getAttribute("fret"), 0);
          break;
        case "Fingering":
          const existingFingers = /* @__PURE__ */ new Map();
          for (const p of c.childElements()) {
            switch (p.localName) {
              case "Position":
                let finger = -2 /* Unknown */;
                const fret = baseFret + _GpifParser._parseIntSafe(p.getAttribute("fret"), 0);
                switch (p.getAttribute("finger")) {
                  case "Index":
                    finger = 1 /* IndexFinger */;
                    break;
                  case "Middle":
                    finger = 2 /* MiddleFinger */;
                    break;
                  case "Rank":
                    finger = 3 /* AnnularFinger */;
                    break;
                  case "Pinky":
                    finger = 4 /* LittleFinger */;
                    break;
                  case "Thumb":
                    finger = 0 /* Thumb */;
                    break;
                  case "None":
                    break;
                }
                if (finger !== -2 /* Unknown */) {
                  if (existingFingers.has(finger)) {
                    chord.barreFrets.push(fret);
                  } else {
                    existingFingers.set(finger, true);
                  }
                }
                break;
            }
          }
          break;
        case "Property":
          switch (c.getAttribute("name")) {
            case "ShowName":
              chord.showName = c.getAttribute("value") === "true";
              break;
            case "ShowDiagram":
              chord.showDiagram = c.getAttribute("value") === "true";
              break;
            case "ShowFingering":
              chord.showFingering = c.getAttribute("value") === "true";
              break;
          }
          break;
      }
    }
  }
  _parseTrackProperties(track, node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Property":
          this._parseTrackProperty(track, c);
          break;
      }
    }
  }
  _parseTrackProperty(track, node) {
    const propertyName = node.getAttribute("name");
    switch (propertyName) {
      case "Tuning":
        const tuningParts = _GpifParser._splitSafe(node.findChildElement("Pitches")?.innerText);
        const tuning = new Array(tuningParts.length);
        for (let i = 0; i < tuning.length; i++) {
          tuning[tuning.length - 1 - i] = _GpifParser._parseIntSafe(tuningParts[i], 0);
        }
        for (const staff of track.staves) {
          staff.stringTuning.tunings = tuning;
          staff.showStandardNotation = true;
          staff.showTablature = true;
        }
        break;
      case "DiagramCollection":
      case "ChordCollection":
        this._parseDiagramCollectionForTrack(track, node);
        break;
      case "CapoFret":
        const capo = _GpifParser._parseIntSafe(node.findChildElement("Fret")?.innerText, 0);
        for (const staff of track.staves) {
          staff.capo = capo;
        }
        break;
    }
  }
  _parseGeneralMidi(track, node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Program":
          track.playbackInfo.program = _GpifParser._parseIntSafe(c.innerText, 0);
          break;
        case "Port":
          track.playbackInfo.port = _GpifParser._parseIntSafe(c.innerText, 0);
          break;
        case "PrimaryChannel":
          track.playbackInfo.primaryChannel = _GpifParser._parseIntSafe(c.innerText, 0);
          break;
        case "SecondaryChannel":
          track.playbackInfo.secondaryChannel = _GpifParser._parseIntSafe(c.innerText, 0);
          break;
      }
    }
    const isPercussion = node.getAttribute("table") === "Percussion";
    if (isPercussion) {
      for (const staff of track.staves) {
        staff.isPercussion = true;
      }
    }
  }
  _parseSounds(trackId, track, node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Sound":
          this._parseSound(trackId, track, c);
          break;
      }
    }
  }
  _parseSound(trackId, track, node) {
    const sound = new GpifSound();
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Name":
          sound.name = c.innerText;
          break;
        case "Path":
          sound.path = c.innerText;
          break;
        case "Role":
          sound.role = c.innerText;
          break;
        case "MIDI":
          this._parseSoundMidi(sound, c);
          break;
      }
    }
    if (!this._soundsByTrack.has(trackId)) {
      this._soundsByTrack.set(trackId, /* @__PURE__ */ new Map());
      track.playbackInfo.program = sound.program;
      track.playbackInfo.bank = sound.bank;
    }
    this._soundsByTrack.get(trackId).set(sound.uniqueId, sound);
  }
  _parseSoundMidi(sound, node) {
    let bankMsb = 0;
    let bankLsb = 0;
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Program":
          sound.program = _GpifParser._parseIntSafe(c.innerText, 0);
          break;
        case "MSB":
          bankMsb = _GpifParser._parseIntSafe(c.innerText, 0);
          break;
        case "LSB":
          bankLsb = _GpifParser._parseIntSafe(c.innerText, 0);
          break;
      }
    }
    sound.bank = (bankMsb & 127) << 7 | bankLsb;
  }
  _parsePartSounding(trackId, track, node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "TranspositionPitch":
          for (const staff of track.staves) {
            staff.displayTranspositionPitch = _GpifParser._parseIntSafe(c.innerText, 0);
          }
          break;
        case "NominalKey":
          const transposeIndex = Math.max(0, Tuning.noteNames.indexOf(c.innerText));
          this._transposeKeySignaturePerTrack.set(trackId, transposeIndex);
          break;
      }
    }
  }
  _transposeKeySignaturePerTrack = /* @__PURE__ */ new Map();
  _parseTranspose(trackId, track, node) {
    let octave = 0;
    let chromatic = 0;
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Chromatic":
          chromatic = _GpifParser._parseIntSafe(c.innerText, 0);
          break;
        case "Octave":
          octave = _GpifParser._parseIntSafe(c.innerText, 0);
          break;
      }
    }
    const pitch2 = octave * 12 + chromatic;
    for (const staff of track.staves) {
      staff.displayTranspositionPitch = pitch2;
    }
    const transposeIndex = ModelUtils.flooredDivision(pitch2, 12);
    this._transposeKeySignaturePerTrack.set(trackId, transposeIndex);
  }
  _parseRSE(track, node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "ChannelStrip":
          this._parseChannelStrip(track, c);
          break;
      }
    }
  }
  _parseChannelStrip(track, node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Parameters":
          this._parseChannelStripParameters(track, c);
          break;
      }
    }
  }
  _parseChannelStripParameters(track, node) {
    if (node.firstChild && node.firstChild.value) {
      const parameters = _GpifParser._splitSafe(node.firstChild.value);
      if (parameters.length >= 12) {
        track.playbackInfo.balance = Math.floor(_GpifParser._parseFloatSafe(parameters[11], 0.5) * 16);
        track.playbackInfo.volume = Math.floor(_GpifParser._parseFloatSafe(parameters[12], 0.9) * 16);
      }
    }
  }
  //
  // <MasterBars>...</MasterBars>
  //
  _parseMasterBarsNode(node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "MasterBar":
          this._parseMasterBar(c);
          break;
      }
    }
  }
  _parseMasterBar(node) {
    const masterBar = new MasterBar();
    if (this._masterBars.length === 0 && this._hasAnacrusis) {
      masterBar.isAnacrusis = true;
    }
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Time":
          const timeParts = c.innerText.split("/");
          masterBar.timeSignatureNumerator = _GpifParser._parseIntSafe(timeParts[0], 4);
          masterBar.timeSignatureDenominator = _GpifParser._parseIntSafe(timeParts[1], 4);
          break;
        case "FreeTime":
          masterBar.isFreeTime = true;
          break;
        case "DoubleBar":
          masterBar.isDoubleBar = true;
          this._doubleBars.add(masterBar);
          break;
        case "Section":
          masterBar.section = new Section();
          masterBar.section.marker = c.findChildElement("Letter")?.innerText ?? "";
          masterBar.section.text = c.findChildElement("Text")?.innerText ?? "";
          break;
        case "Repeat":
          if (c.getAttribute("start").toLowerCase() === "true") {
            masterBar.isRepeatStart = true;
          }
          if (c.getAttribute("end").toLowerCase() === "true" && c.getAttribute("count")) {
            masterBar.repeatCount = _GpifParser._parseIntSafe(c.getAttribute("count"), 1);
          }
          break;
        case "AlternateEndings":
          const alternateEndings = _GpifParser._splitSafe(c.innerText);
          let i = 0;
          for (let k = 0; k < alternateEndings.length; k++) {
            i = i | 1 << -1 + _GpifParser._parseIntSafe(alternateEndings[k], 0);
          }
          masterBar.alternateEndings = i;
          break;
        case "Bars":
          this._barsOfMasterBar.push(_GpifParser._splitSafe(c.innerText));
          break;
        case "TripletFeel":
          switch (c.innerText) {
            case "NoTripletFeel":
              masterBar.tripletFeel = 0 /* NoTripletFeel */;
              break;
            case "Triplet8th":
              masterBar.tripletFeel = 2 /* Triplet8th */;
              break;
            case "Triplet16th":
              masterBar.tripletFeel = 1 /* Triplet16th */;
              break;
            case "Dotted8th":
              masterBar.tripletFeel = 4 /* Dotted8th */;
              break;
            case "Dotted16th":
              masterBar.tripletFeel = 3 /* Dotted16th */;
              break;
            case "Scottish8th":
              masterBar.tripletFeel = 6 /* Scottish8th */;
              break;
            case "Scottish16th":
              masterBar.tripletFeel = 5 /* Scottish16th */;
              break;
          }
          break;
        case "Key":
          const keySignature = _GpifParser._parseIntSafe(
            c.findChildElement("AccidentalCount")?.innerText,
            0
          );
          const mode = c.findChildElement("Mode");
          let keySignatureType = 0 /* Major */;
          if (mode) {
            switch (mode.innerText.toLowerCase()) {
              case "major":
                keySignatureType = 0 /* Major */;
                break;
              case "minor":
                keySignatureType = 1 /* Minor */;
                break;
            }
          }
          this._keySignatures.set(this._masterBars.length, [keySignature, keySignatureType]);
          break;
        case "Fermatas":
          this._parseFermatas(masterBar, c);
          break;
        case "XProperties":
          this._parseMasterBarXProperties(masterBar, c);
          break;
        case "Directions":
          this._parseDirections(masterBar, c);
          break;
      }
    }
    this._masterBars.push(masterBar);
  }
  _parseDirections(masterBar, node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Target":
          switch (c.innerText) {
            case "Coda":
              masterBar.addDirection(3 /* TargetCoda */);
              break;
            case "DoubleCoda":
              masterBar.addDirection(4 /* TargetDoubleCoda */);
              break;
            case "Segno":
              masterBar.addDirection(1 /* TargetSegno */);
              break;
            case "SegnoSegno":
              masterBar.addDirection(2 /* TargetSegnoSegno */);
              break;
            case "Fine":
              masterBar.addDirection(0 /* TargetFine */);
              break;
          }
          break;
        case "Jump":
          switch (c.innerText) {
            case "DaCapo":
              masterBar.addDirection(5 /* JumpDaCapo */);
              break;
            case "DaCapoAlCoda":
              masterBar.addDirection(6 /* JumpDaCapoAlCoda */);
              break;
            case "DaCapoAlDoubleCoda":
              masterBar.addDirection(7 /* JumpDaCapoAlDoubleCoda */);
              break;
            case "DaCapoAlFine":
              masterBar.addDirection(8 /* JumpDaCapoAlFine */);
              break;
            // Note: no typo on our side, GPIF has wrongly "DaSegno" instead of "DalSegno"
            case "DaSegno":
              masterBar.addDirection(9 /* JumpDalSegno */);
              break;
            case "DaSegnoAlCoda":
              masterBar.addDirection(10 /* JumpDalSegnoAlCoda */);
              break;
            case "DaSegnoAlDoubleCoda":
              masterBar.addDirection(11 /* JumpDalSegnoAlDoubleCoda */);
              break;
            case "DaSegnoAlFine":
              masterBar.addDirection(12 /* JumpDalSegnoAlFine */);
              break;
            case "DaSegnoSegno":
              masterBar.addDirection(13 /* JumpDalSegnoSegno */);
              break;
            case "DaSegnoSegnoAlCoda":
              masterBar.addDirection(14 /* JumpDalSegnoSegnoAlCoda */);
              break;
            case "DaSegnoSegnoAlDoubleCoda":
              masterBar.addDirection(15 /* JumpDalSegnoSegnoAlDoubleCoda */);
              break;
            case "DaSegnoSegnoAlFine":
              masterBar.addDirection(16 /* JumpDalSegnoSegnoAlFine */);
              break;
            case "DaCoda":
              masterBar.addDirection(17 /* JumpDaCoda */);
              break;
            case "DaDoubleCoda":
              masterBar.addDirection(18 /* JumpDaDoubleCoda */);
              break;
          }
          break;
      }
    }
  }
  _parseFermatas(masterBar, node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Fermata":
          this._parseFermata(masterBar, c);
          break;
      }
    }
  }
  _parseFermata(masterBar, node) {
    let offset = 0;
    const fermata = new Fermata();
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Type":
          switch (c.innerText) {
            case "Short":
              fermata.type = 0 /* Short */;
              break;
            case "Medium":
              fermata.type = 1 /* Medium */;
              break;
            case "Long":
              fermata.type = 2 /* Long */;
              break;
          }
          break;
        case "Length":
          fermata.length = _GpifParser._parseFloatSafe(c.innerText, 0);
          break;
        case "Offset":
          const parts = c.innerText.split("/");
          if (parts.length === 2) {
            const numerator = _GpifParser._parseIntSafe(parts[0], 4);
            const denominator = _GpifParser._parseIntSafe(parts[1], 4);
            offset = numerator / denominator * MidiUtils.QuarterTime | 0;
          }
          break;
      }
    }
    masterBar.addFermata(offset, fermata);
  }
  //
  // <Bars>...</Bars>
  //
  _parseBars(node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Bar":
          this._parseBar(c);
          break;
      }
    }
  }
  _parseBar(node) {
    const bar = new Bar();
    const barId = node.getAttribute("id");
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Voices":
          this._voicesOfBar.set(barId, _GpifParser._splitSafe(c.innerText));
          break;
        case "Clef":
          switch (c.innerText) {
            case "Neutral":
              bar.clef = 0 /* Neutral */;
              break;
            case "G2":
              bar.clef = 4 /* G2 */;
              break;
            case "F4":
              bar.clef = 3 /* F4 */;
              break;
            case "C4":
              bar.clef = 2 /* C4 */;
              break;
            case "C3":
              bar.clef = 1 /* C3 */;
              break;
          }
          break;
        case "Ottavia":
          switch (c.innerText) {
            case "8va":
              bar.clefOttava = 1 /* _8va */;
              break;
            case "15ma":
              bar.clefOttava = 0 /* _15ma */;
              break;
            case "8vb":
              bar.clefOttava = 3 /* _8vb */;
              break;
            case "15mb":
              bar.clefOttava = 4 /* _15mb */;
              break;
          }
          break;
        case "SimileMark":
          switch (c.innerText) {
            case "Simple":
              bar.simileMark = 1 /* Simple */;
              break;
            case "FirstOfDouble":
              bar.simileMark = 2 /* FirstOfDouble */;
              break;
            case "SecondOfDouble":
              bar.simileMark = 3 /* SecondOfDouble */;
              break;
          }
          break;
        case "XProperties":
          this._parseBarXProperties(c, bar);
          break;
      }
    }
    this._barsById.set(barId, bar);
  }
  //
  // <Voices>...</Voices>
  //
  _parseVoices(node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Voice":
          this._parseVoice(c);
          break;
      }
    }
  }
  _parseVoice(node) {
    const voice = new Voice();
    const voiceId = node.getAttribute("id");
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Beats":
          this._beatsOfVoice.set(voiceId, _GpifParser._splitSafe(c.innerText));
          break;
      }
    }
    this._voiceById.set(voiceId, voice);
  }
  //
  // <Beats>...</Beats>
  //
  _parseBeats(node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Beat":
          this._parseBeat(c);
          break;
      }
    }
  }
  _parseBeat(node) {
    const beat = new Beat();
    const beatId = node.getAttribute("id");
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Notes":
          this._notesOfBeat.set(beatId, _GpifParser._splitSafe(c.innerText));
          break;
        case "Rhythm":
          this._rhythmOfBeat.set(beatId, c.getAttribute("ref"));
          break;
        case "Fadding":
          switch (c.innerText) {
            case "FadeIn":
              beat.fade = 1 /* FadeIn */;
              break;
            case "FadeOut":
              beat.fade = 2 /* FadeOut */;
              break;
            case "VolumeSwell":
              beat.fade = 3 /* VolumeSwell */;
              break;
          }
          break;
        case "Tremolo":
          const tremolo = new TremoloPickingEffect();
          beat.tremoloPicking = tremolo;
          switch (c.innerText) {
            case "1/2":
              tremolo.marks = 1;
              break;
            case "1/4":
              tremolo.marks = 2;
              break;
            case "1/8":
              tremolo.marks = 3;
              break;
          }
          break;
        case "Chord":
          beat.chordId = c.innerText;
          break;
        case "Hairpin":
          switch (c.innerText) {
            case "Crescendo":
              beat.crescendo = 1 /* Crescendo */;
              break;
            case "Decrescendo":
              beat.crescendo = 2 /* Decrescendo */;
              break;
          }
          break;
        case "Arpeggio":
          if (c.innerText === "Up") {
            beat.brushType = 3 /* ArpeggioUp */;
          } else {
            beat.brushType = 4 /* ArpeggioDown */;
          }
          break;
        case "Properties":
          this._parseBeatProperties(c, beat);
          break;
        case "XProperties":
          this._parseBeatXProperties(c, beat);
          break;
        case "FreeText":
          beat.text = c.innerText;
          break;
        case "TransposedPitchStemOrientation":
          switch (c.innerText) {
            case "Upward":
              beat.preferredBeamDirection = 0 /* Up */;
              break;
            case "Downward":
              beat.preferredBeamDirection = 1 /* Down */;
              break;
          }
          break;
        case "Dynamic":
          switch (c.innerText) {
            case "PPP":
              beat.dynamics = 0 /* PPP */;
              break;
            case "PP":
              beat.dynamics = 1 /* PP */;
              break;
            case "P":
              beat.dynamics = 2 /* P */;
              break;
            case "MP":
              beat.dynamics = 3 /* MP */;
              break;
            case "MF":
              beat.dynamics = 4 /* MF */;
              break;
            case "F":
              beat.dynamics = 5 /* F */;
              break;
            case "FF":
              beat.dynamics = 6 /* FF */;
              break;
            case "FFF":
              beat.dynamics = 7 /* FFF */;
              break;
          }
          break;
        case "GraceNotes":
          switch (c.innerText) {
            case "OnBeat":
              beat.graceType = 1 /* OnBeat */;
              break;
            case "BeforeBeat":
              beat.graceType = 2 /* BeforeBeat */;
              break;
          }
          break;
        case "Legato":
          if (c.getAttribute("origin") === "true") {
            beat.isLegatoOrigin = true;
          }
          break;
        case "Whammy":
          const whammyOrigin = new BendPoint(0, 0);
          whammyOrigin.value = this._toBendValue(
            _GpifParser._parseFloatSafe(c.getAttribute("originValue"), 0)
          );
          whammyOrigin.offset = this._toBendOffset(
            _GpifParser._parseFloatSafe(c.getAttribute("originOffset"), 0)
          );
          beat.addWhammyBarPoint(whammyOrigin);
          const whammyMiddle1 = new BendPoint(0, 0);
          whammyMiddle1.value = this._toBendValue(
            _GpifParser._parseFloatSafe(c.getAttribute("middleValue"), 0)
          );
          whammyMiddle1.offset = this._toBendOffset(
            _GpifParser._parseFloatSafe(c.getAttribute("middleOffset1"), 0)
          );
          beat.addWhammyBarPoint(whammyMiddle1);
          const whammyMiddle2 = new BendPoint(0, 0);
          whammyMiddle2.value = this._toBendValue(
            _GpifParser._parseFloatSafe(c.getAttribute("middleValue"), 0)
          );
          whammyMiddle2.offset = this._toBendOffset(
            _GpifParser._parseFloatSafe(c.getAttribute("middleOffset2"), 0)
          );
          beat.addWhammyBarPoint(whammyMiddle2);
          const whammyDestination = new BendPoint(0, 0);
          whammyDestination.value = this._toBendValue(
            _GpifParser._parseFloatSafe(c.getAttribute("destinationValue"), 0)
          );
          whammyDestination.offset = this._toBendOffset(
            _GpifParser._parseFloatSafe(c.getAttribute("destinationOffset"), 0)
          );
          beat.addWhammyBarPoint(whammyDestination);
          break;
        case "Ottavia":
          switch (c.innerText) {
            case "8va":
              beat.ottava = 1 /* _8va */;
              break;
            case "8vb":
              beat.ottava = 3 /* _8vb */;
              break;
            case "15ma":
              beat.ottava = 0 /* _15ma */;
              break;
            case "15mb":
              beat.ottava = 4 /* _15mb */;
              break;
          }
          break;
        case "Lyrics":
          beat.lyrics = this._parseBeatLyrics(c);
          this._skipApplyLyrics = true;
          break;
        case "Slashed":
          beat.slashed = true;
          break;
        case "DeadSlapped":
          beat.deadSlapped = true;
          break;
        case "Golpe":
          switch (c.innerText) {
            case "Finger":
              beat.golpe = 2 /* Finger */;
              break;
            case "Thumb":
              beat.golpe = 1 /* Thumb */;
              break;
          }
          break;
        case "Wah":
          switch (c.innerText) {
            case "Open":
              beat.wahPedal = 1 /* Open */;
              break;
            case "Closed":
              beat.wahPedal = 2 /* Closed */;
              break;
          }
          break;
        case "UserTransposedPitchStemOrientation":
          switch (c.innerText) {
            case "Downward":
              beat.preferredBeamDirection = 1 /* Down */;
              break;
            case "Upward":
              beat.preferredBeamDirection = 0 /* Up */;
              break;
          }
          break;
        case "Timer":
          beat.showTimer = true;
          beat.timer = _GpifParser._parseIntSafe(c.innerText, -1);
          if (beat.timer < 0) {
            beat.timer = null;
          }
          break;
      }
    }
    this._beatById.set(beatId, beat);
  }
  _parseBeatLyrics(node) {
    const lines = [];
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Line":
          lines.push(c.innerText);
          break;
      }
    }
    return lines;
  }
  _parseBeatXProperties(node, beat) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "XProperty":
          const id = c.getAttribute("id");
          let value2 = 0;
          switch (id) {
            case "1124204546":
              value2 = _GpifParser._parseIntSafe(c.findChildElement("Int")?.innerText, 0);
              switch (value2) {
                case 1:
                  beat.beamingMode = 2 /* ForceMergeWithNext */;
                  break;
                case 2:
                  beat.beamingMode = 1 /* ForceSplitToNext */;
                  break;
              }
              break;
            case "1124204552":
              value2 = _GpifParser._parseIntSafe(c.findChildElement("Int")?.innerText, 0);
              switch (value2) {
                case 1:
                  if (beat.beamingMode !== 1 /* ForceSplitToNext */) {
                    beat.beamingMode = 3 /* ForceSplitOnSecondaryToNext */;
                  }
                  break;
              }
              break;
            case "1124204545":
              value2 = _GpifParser._parseIntSafe(c.findChildElement("Int")?.innerText, 0);
              beat.invertBeamDirection = value2 === 1;
              break;
            case "687935489":
              value2 = _GpifParser._parseIntSafe(c.findChildElement("Int")?.innerText, 0);
              beat.brushDuration = value2;
              break;
          }
          break;
      }
    }
  }
  _parseBarXProperties(node, bar) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "XProperty":
          const id = c.getAttribute("id");
          switch (id) {
            case "1124139520":
              const childNode = c.findChildElement("Double") ?? c.findChildElement("Float");
              bar.displayScale = _GpifParser._parseFloatSafe(childNode?.innerText, 1);
              break;
          }
          break;
      }
    }
  }
  _parseMasterBarXProperties(masterBar, node) {
    let beamingRuleDuration = Number.NaN;
    let beamingRuleGroups = void 0;
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "XProperty":
          const id = c.getAttribute("id");
          switch (id) {
            case "1124073984":
              masterBar.displayScale = _GpifParser._parseFloatSafe(
                c.findChildElement("Double")?.innerText,
                1
              );
              break;
            case "1124139010":
              beamingRuleDuration = _GpifParser._parseIntSafe(
                c.findChildElement("Int")?.innerText,
                Number.NaN
              );
              break;
            default:
              const idNumeric = _GpifParser._parseIntSafe(id, 0);
              if (idNumeric >= 1124139264 && idNumeric <= 1124139295) {
                const groupIndex = idNumeric - 1124139264;
                const groupSize = _GpifParser._parseIntSafe(
                  c.findChildElement("Int")?.innerText,
                  Number.NaN
                );
                if (beamingRuleGroups === void 0) {
                  beamingRuleGroups = [];
                }
                while (beamingRuleGroups.length < groupIndex + 1) {
                  beamingRuleGroups.push(0);
                }
                beamingRuleGroups[groupIndex] = groupSize;
              }
              break;
          }
          break;
      }
    }
    if (!Number.isNaN(beamingRuleDuration) && beamingRuleGroups) {
      const rules = new BeamingRules();
      rules.groups.set(beamingRuleDuration, beamingRuleGroups);
      masterBar.beamingRules = rules;
    }
  }
  _parseBeatProperties(node, beat) {
    let isWhammy = false;
    let whammyOrigin = null;
    let whammyMiddleValue = null;
    let whammyMiddleOffset1 = null;
    let whammyMiddleOffset2 = null;
    let whammyDestination = null;
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Property":
          const name = c.getAttribute("name");
          switch (name) {
            case "Brush":
              if (c.findChildElement("Direction")?.innerText === "Up") {
                beat.brushType = 1 /* BrushUp */;
              } else {
                beat.brushType = 2 /* BrushDown */;
              }
              break;
            case "PickStroke":
              if (c.findChildElement("Direction")?.innerText === "Up") {
                beat.pickStroke = 1 /* Up */;
              } else {
                beat.pickStroke = 2 /* Down */;
              }
              break;
            case "Slapped":
              if (c.findChildElement("Enable")) {
                beat.slap = true;
              }
              break;
            case "Popped":
              if (c.findChildElement("Enable")) {
                beat.pop = true;
              }
              break;
            case "VibratoWTremBar":
              switch (c.findChildElement("Strength")?.innerText) {
                case "Wide":
                  beat.vibrato = 2 /* Wide */;
                  break;
                case "Slight":
                  beat.vibrato = 1 /* Slight */;
                  break;
              }
              break;
            case "WhammyBar":
              isWhammy = true;
              break;
            case "WhammyBarExtend":
              break;
            case "WhammyBarOriginValue":
              if (!whammyOrigin) {
                whammyOrigin = new BendPoint(0, 0);
              }
              whammyOrigin.value = this._toBendValue(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "WhammyBarOriginOffset":
              if (!whammyOrigin) {
                whammyOrigin = new BendPoint(0, 0);
              }
              whammyOrigin.offset = this._toBendOffset(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "WhammyBarMiddleValue":
              whammyMiddleValue = this._toBendValue(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "WhammyBarMiddleOffset1":
              whammyMiddleOffset1 = this._toBendOffset(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "WhammyBarMiddleOffset2":
              whammyMiddleOffset2 = this._toBendOffset(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "WhammyBarDestinationValue":
              if (!whammyDestination) {
                whammyDestination = new BendPoint(BendPoint.MaxPosition, 0);
              }
              whammyDestination.value = this._toBendValue(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "WhammyBarDestinationOffset":
              if (!whammyDestination) {
                whammyDestination = new BendPoint(0, 0);
              }
              whammyDestination.offset = this._toBendOffset(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "BarreFret":
              beat.barreFret = _GpifParser._parseIntSafe(c.findChildElement("Fret")?.innerText, 0);
              break;
            case "BarreString":
              switch (c.findChildElement("String")?.innerText) {
                case "0":
                  beat.barreShape = 1 /* Full */;
                  break;
                case "1":
                  beat.barreShape = 2 /* Half */;
                  break;
              }
              break;
            case "Rasgueado":
              switch (c.findChildElement("Rasgueado")?.innerText) {
                case "ii_1":
                  beat.rasgueado = 1 /* Ii */;
                  break;
                case "mi_1":
                  beat.rasgueado = 2 /* Mi */;
                  break;
                case "mii_1":
                  beat.rasgueado = 3 /* MiiTriplet */;
                  break;
                case "mii_2":
                  beat.rasgueado = 4 /* MiiAnapaest */;
                  break;
                case "pmp_1":
                  beat.rasgueado = 5 /* PmpTriplet */;
                  break;
                case "pmp_2":
                  beat.rasgueado = 6 /* PmpAnapaest */;
                  break;
                case "pei_1":
                  beat.rasgueado = 7 /* PeiTriplet */;
                  break;
                case "pei_2":
                  beat.rasgueado = 8 /* PeiAnapaest */;
                  break;
                case "pai_1":
                  beat.rasgueado = 9 /* PaiTriplet */;
                  break;
                case "pai_2":
                  beat.rasgueado = 10 /* PaiAnapaest */;
                  break;
                case "ami_1":
                  beat.rasgueado = 11 /* AmiTriplet */;
                  break;
                case "ami_2":
                  beat.rasgueado = 12 /* AmiAnapaest */;
                  break;
                case "ppp_1":
                  beat.rasgueado = 13 /* Ppp */;
                  break;
                case "amii_1":
                  beat.rasgueado = 14 /* Amii */;
                  break;
                case "amip_1":
                  beat.rasgueado = 15 /* Amip */;
                  break;
                case "eami_1":
                  beat.rasgueado = 16 /* Eami */;
                  break;
                case "eamii_1":
                  beat.rasgueado = 17 /* Eamii */;
                  break;
                case "peami_1":
                  beat.rasgueado = 18 /* Peami */;
                  break;
              }
              break;
          }
          break;
      }
    }
    if (isWhammy) {
      if (!whammyOrigin) {
        whammyOrigin = new BendPoint(0, 0);
      }
      if (!whammyDestination) {
        whammyDestination = new BendPoint(BendPoint.MaxPosition, 0);
      }
      beat.addWhammyBarPoint(whammyOrigin);
      if (whammyMiddleOffset1 && whammyMiddleValue) {
        beat.addWhammyBarPoint(new BendPoint(whammyMiddleOffset1, whammyMiddleValue));
      }
      if (whammyMiddleOffset2 && whammyMiddleValue) {
        beat.addWhammyBarPoint(new BendPoint(whammyMiddleOffset2, whammyMiddleValue));
      }
      if (!whammyMiddleOffset1 && !whammyMiddleOffset2 && whammyMiddleValue) {
        beat.addWhammyBarPoint(new BendPoint(BendPoint.MaxPosition / 2 | 0, whammyMiddleValue));
      }
      beat.addWhammyBarPoint(whammyDestination);
    }
  }
  //
  // <Notes>...</Notes>
  //
  _parseNotes(node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Note":
          this._parseNote(c);
          break;
      }
    }
  }
  _parseNote(node) {
    const note = new Note();
    const noteId = node.getAttribute("id");
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Properties":
          this._parseNoteProperties(c, note, noteId);
          break;
        case "AntiAccent":
          if (c.innerText.toLowerCase() === "normal") {
            note.isGhost = true;
          }
          break;
        case "LetRing":
          note.isLetRing = true;
          break;
        case "Trill":
          note.trillValue = _GpifParser._parseIntSafe(c.innerText, -1);
          note.trillSpeed = 16 /* Sixteenth */;
          break;
        case "Accent":
          const accentFlags = _GpifParser._parseIntSafe(c.innerText, 0);
          if ((accentFlags & 1) !== 0) {
            note.isStaccato = true;
          }
          if ((accentFlags & 4) !== 0) {
            note.accentuated = 2 /* Heavy */;
          }
          if ((accentFlags & 8) !== 0) {
            note.accentuated = 1 /* Normal */;
          }
          if ((accentFlags & 16) !== 0) {
            note.accentuated = 3 /* Tenuto */;
          }
          break;
        case "Tie":
          if (c.getAttribute("destination").toLowerCase() === "true") {
            note.isTieDestination = true;
          }
          break;
        case "Vibrato":
          switch (c.innerText) {
            case "Slight":
              note.vibrato = 1 /* Slight */;
              break;
            case "Wide":
              note.vibrato = 2 /* Wide */;
              break;
          }
          break;
        case "LeftFingering":
          switch (c.innerText) {
            case "P":
              note.leftHandFinger = 0 /* Thumb */;
              break;
            case "I":
              note.leftHandFinger = 1 /* IndexFinger */;
              break;
            case "M":
              note.leftHandFinger = 2 /* MiddleFinger */;
              break;
            case "A":
              note.leftHandFinger = 3 /* AnnularFinger */;
              break;
            case "C":
              note.leftHandFinger = 4 /* LittleFinger */;
              break;
          }
          break;
        case "RightFingering":
          switch (c.innerText) {
            case "P":
              note.rightHandFinger = 0 /* Thumb */;
              break;
            case "I":
              note.rightHandFinger = 1 /* IndexFinger */;
              break;
            case "M":
              note.rightHandFinger = 2 /* MiddleFinger */;
              break;
            case "A":
              note.rightHandFinger = 3 /* AnnularFinger */;
              break;
            case "C":
              note.rightHandFinger = 4 /* LittleFinger */;
              break;
          }
          break;
        case "InstrumentArticulation":
          note.percussionArticulation = _GpifParser._parseIntSafe(c.innerText, 0);
          break;
        case "Ornament":
          switch (c.innerText) {
            case "Turn":
              note.ornament = 2 /* Turn */;
              break;
            case "InvertedTurn":
              note.ornament = 1 /* InvertedTurn */;
              break;
            case "UpperMordent":
              note.ornament = 3 /* UpperMordent */;
              break;
            case "LowerMordent":
              note.ornament = 4 /* LowerMordent */;
              break;
          }
          break;
      }
    }
    this._noteById.set(noteId, note);
  }
  _parseNoteProperties(node, note, noteId) {
    let isBended = false;
    let bendOrigin = null;
    let bendMiddleValue = null;
    let bendMiddleOffset1 = null;
    let bendMiddleOffset2 = null;
    let bendDestination = null;
    let element = -1;
    let variation = -1;
    let hasTransposedPitch = false;
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Property":
          const name = c.getAttribute("name");
          switch (name) {
            case "ShowStringNumber":
              if (c.findChildElement("Enable")) {
                note.showStringNumber = true;
              }
              break;
            case "String":
              note.string = _GpifParser._parseIntSafe(c.findChildElement("String")?.innerText, 0) + 1;
              break;
            case "Fret":
              note.fret = _GpifParser._parseIntSafe(c.findChildElement("Fret")?.innerText, 0);
              break;
            case "Element":
              element = _GpifParser._parseIntSafe(c.findChildElement("Element")?.innerText, 0);
              break;
            case "Variation":
              variation = _GpifParser._parseIntSafe(c.findChildElement("Variation")?.innerText, 0);
              break;
            case "Tapped":
              this._tappedNotes.set(noteId, true);
              break;
            case "HarmonicType":
              const htype = c.findChildElement("HType");
              if (htype) {
                switch (htype.innerText.toLowerCase()) {
                  case "noharmonic":
                    note.harmonicType = 0 /* None */;
                    break;
                  case "natural":
                    note.harmonicType = 1 /* Natural */;
                    break;
                  case "artificial":
                    note.harmonicType = 2 /* Artificial */;
                    break;
                  case "pinch":
                    note.harmonicType = 3 /* Pinch */;
                    break;
                  case "tap":
                    note.harmonicType = 4 /* Tap */;
                    break;
                  case "semi":
                    note.harmonicType = 5 /* Semi */;
                    break;
                  case "feedback":
                    note.harmonicType = 6 /* Feedback */;
                    break;
                }
              }
              break;
            case "HarmonicFret":
              const hfret = c.findChildElement("HFret");
              if (hfret) {
                note.harmonicValue = _GpifParser._parseFloatSafe(hfret.innerText, 0);
              }
              break;
            case "Muted":
              if (c.findChildElement("Enable")) {
                note.isDead = true;
              }
              break;
            case "PalmMuted":
              if (c.findChildElement("Enable")) {
                note.isPalmMute = true;
              }
              break;
            case "Octave":
              note.octave = _GpifParser._parseIntSafe(c.findChildElement("Number")?.innerText, 0);
              if (note.tone === -1) {
                note.tone = 0;
              }
              break;
            case "Tone":
              note.tone = _GpifParser._parseIntSafe(c.findChildElement("Step")?.innerText, 0);
              break;
            case "ConcertPitch":
              if (!hasTransposedPitch) {
                this._parseConcertPitch(c, note);
              }
              break;
            case "TransposedPitch":
              note.accidentalMode = 0 /* Default */;
              this._parseConcertPitch(c, note);
              hasTransposedPitch = true;
              break;
            case "Bended":
              isBended = true;
              break;
            case "BendOriginValue":
              if (!bendOrigin) {
                bendOrigin = new BendPoint(0, 0);
              }
              bendOrigin.value = this._toBendValue(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "BendOriginOffset":
              if (!bendOrigin) {
                bendOrigin = new BendPoint(0, 0);
              }
              bendOrigin.offset = this._toBendOffset(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "BendMiddleValue":
              bendMiddleValue = this._toBendValue(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "BendMiddleOffset1":
              bendMiddleOffset1 = this._toBendOffset(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "BendMiddleOffset2":
              bendMiddleOffset2 = this._toBendOffset(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "BendDestinationValue":
              if (!bendDestination) {
                bendDestination = new BendPoint(BendPoint.MaxPosition, 0);
              }
              bendDestination.value = this._toBendValue(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "BendDestinationOffset":
              if (!bendDestination) {
                bendDestination = new BendPoint(0, 0);
              }
              bendDestination.offset = this._toBendOffset(
                _GpifParser._parseFloatSafe(c.findChildElement("Float")?.innerText, 0)
              );
              break;
            case "HopoOrigin":
              if (c.findChildElement("Enable")) {
                note.isHammerPullOrigin = true;
              }
              break;
            case "HopoDestination":
              break;
            case "LeftHandTapped":
              note.isLeftHandTapped = true;
              break;
            case "Slide":
              const slideFlags = _GpifParser._parseIntSafe(
                c.findChildElement("Flags")?.innerText,
                0
              );
              if ((slideFlags & 1) !== 0) {
                note.slideOutType = 1 /* Shift */;
              } else if ((slideFlags & 2) !== 0) {
                note.slideOutType = 2 /* Legato */;
              } else if ((slideFlags & 4) !== 0) {
                note.slideOutType = 4 /* OutDown */;
              } else if ((slideFlags & 8) !== 0) {
                note.slideOutType = 3 /* OutUp */;
              }
              if ((slideFlags & 16) !== 0) {
                note.slideInType = 1 /* IntoFromBelow */;
              } else if ((slideFlags & 32) !== 0) {
                note.slideInType = 2 /* IntoFromAbove */;
              }
              if ((slideFlags & 64) !== 0) {
                note.slideOutType = 5 /* PickSlideDown */;
              } else if ((slideFlags & 128) !== 0) {
                note.slideOutType = 6 /* PickSlideUp */;
              }
              break;
          }
          break;
      }
    }
    if (isBended) {
      if (!bendOrigin) {
        bendOrigin = new BendPoint(0, 0);
      }
      if (!bendDestination) {
        bendDestination = new BendPoint(BendPoint.MaxPosition, 0);
      }
      note.addBendPoint(bendOrigin);
      if (bendMiddleOffset1 && bendMiddleValue) {
        note.addBendPoint(new BendPoint(bendMiddleOffset1, bendMiddleValue));
      }
      if (bendMiddleOffset2 && bendMiddleValue) {
        note.addBendPoint(new BendPoint(bendMiddleOffset2, bendMiddleValue));
      }
      if (!bendMiddleOffset1 && !bendMiddleOffset2 && bendMiddleValue) {
        note.addBendPoint(new BendPoint(BendPoint.MaxPosition / 2 | 0, bendMiddleValue));
      }
      note.addBendPoint(bendDestination);
    }
    if (element !== -1 && variation !== -1) {
      note.percussionArticulation = PercussionMapper.articulationFromElementVariation(element, variation);
    }
  }
  _parseConcertPitch(node, note) {
    const pitch2 = node.findChildElement("Pitch");
    if (pitch2) {
      for (const c of pitch2.childElements()) {
        switch (c.localName) {
          case "Accidental":
            switch (c.innerText) {
              case "":
                note.accidentalMode = 2 /* ForceNatural */;
                break;
              case "x":
                note.accidentalMode = 4 /* ForceDoubleSharp */;
                break;
              case "#":
                note.accidentalMode = 3 /* ForceSharp */;
                break;
              case "b":
                note.accidentalMode = 5 /* ForceFlat */;
                break;
              case "bb":
                note.accidentalMode = 6 /* ForceDoubleFlat */;
                break;
            }
            break;
        }
      }
    }
  }
  _toBendValue(gpxValue) {
    return gpxValue * _GpifParser._bendPointValueFactor | 0;
  }
  _toBendOffset(gpxOffset) {
    return gpxOffset * _GpifParser._bendPointPositionFactor;
  }
  _parseRhythms(node) {
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "Rhythm":
          this._parseRhythm(c);
          break;
      }
    }
  }
  _parseRhythm(node) {
    const rhythm = new GpifRhythm();
    const rhythmId = node.getAttribute("id");
    rhythm.id = rhythmId;
    for (const c of node.childElements()) {
      switch (c.localName) {
        case "NoteValue":
          switch (c.innerText) {
            case "Long":
              rhythm.value = -4 /* QuadrupleWhole */;
              break;
            case "DoubleWhole":
              rhythm.value = -2 /* DoubleWhole */;
              break;
            case "Whole":
              rhythm.value = 1 /* Whole */;
              break;
            case "Half":
              rhythm.value = 2 /* Half */;
              break;
            case "Quarter":
              rhythm.value = 4 /* Quarter */;
              break;
            case "Eighth":
              rhythm.value = 8 /* Eighth */;
              break;
            case "16th":
              rhythm.value = 16 /* Sixteenth */;
              break;
            case "32nd":
              rhythm.value = 32 /* ThirtySecond */;
              break;
            case "64th":
              rhythm.value = 64 /* SixtyFourth */;
              break;
            case "128th":
              rhythm.value = 128 /* OneHundredTwentyEighth */;
              break;
            case "256th":
              rhythm.value = 256 /* TwoHundredFiftySixth */;
              break;
          }
          break;
        case "PrimaryTuplet":
          rhythm.tupletNumerator = _GpifParser._parseIntSafe(c.getAttribute("num"), -1);
          rhythm.tupletDenominator = _GpifParser._parseIntSafe(c.getAttribute("den"), -1);
          break;
        case "AugmentationDot":
          rhythm.dots = _GpifParser._parseIntSafe(c.getAttribute("count"), 0);
          break;
      }
    }
    this._rhythmById.set(rhythmId, rhythm);
  }
  _buildModel() {
    for (let i = 0, j = this._masterBars.length; i < j; i++) {
      const masterBar = this._masterBars[i];
      this.score.addMasterBar(masterBar);
    }
    const lastMasterBar = this._masterBars[this._masterBars.length - 1];
    if (this._doubleBars.has(lastMasterBar)) {
      this._doubleBars.delete(lastMasterBar);
      lastMasterBar.isDoubleBar = false;
    }
    const trackIndexToTrackId = [];
    for (const trackId of this._tracksMapping) {
      if (!trackId) {
        continue;
      }
      const track = this._tracksById.get(trackId);
      this.score.addTrack(track);
      trackIndexToTrackId.push(trackId);
    }
    let keySignature;
    for (const barIds of this._barsOfMasterBar) {
      let staffIndex = 0;
      let trackIndex = 0;
      keySignature = [0 /* C */, 0 /* Major */];
      if (this._transposeKeySignaturePerTrack.has(trackIndexToTrackId[0])) {
        keySignature = [
          ModelUtils.transposeKey(
            keySignature[0],
            this._transposeKeySignaturePerTrack.get(trackIndexToTrackId[0])
          ),
          keySignature[1]
        ];
      }
      for (let barIndex = 0; barIndex < barIds.length && trackIndex < this.score.tracks.length; barIndex++) {
        const barId = barIds[barIndex];
        if (barId !== _GpifParser._invalidId) {
          const bar = this._barsById.get(barId);
          const track = this.score.tracks[trackIndex];
          const staff = track.staves[staffIndex];
          staff.addBar(bar);
          const masterBarIndex = staff.bars.length - 1;
          if (this._keySignatures.has(masterBarIndex)) {
            keySignature = this._keySignatures.get(masterBarIndex);
            if (this._transposeKeySignaturePerTrack.has(trackIndexToTrackId[trackIndex])) {
              keySignature = [
                ModelUtils.transposeKey(
                  keySignature[0],
                  this._transposeKeySignaturePerTrack.get(trackIndexToTrackId[trackIndex])
                ),
                keySignature[1]
              ];
            }
          }
          bar.keySignature = keySignature[0];
          bar.keySignatureType = keySignature[1];
          if (this._doubleBars.has(bar.masterBar)) {
            bar.barLineRight = 7 /* LightLight */;
          }
          if (this._voicesOfBar.has(barId)) {
            for (const voiceId of this._voicesOfBar.get(barId)) {
              if (voiceId !== _GpifParser._invalidId) {
                const voice = this._voiceById.get(voiceId);
                bar.addVoice(voice);
                if (this._beatsOfVoice.has(voiceId)) {
                  for (const beatId of this._beatsOfVoice.get(voiceId)) {
                    if (beatId !== _GpifParser._invalidId) {
                      const beat = BeatCloner.clone(this._beatById.get(beatId));
                      voice.addBeat(beat);
                      const rhythmId = this._rhythmOfBeat.get(beatId);
                      const rhythm = this._rhythmById.get(rhythmId);
                      beat.duration = rhythm.value;
                      beat.dots = rhythm.dots;
                      beat.tupletNumerator = rhythm.tupletNumerator;
                      beat.tupletDenominator = rhythm.tupletDenominator;
                      if (this._notesOfBeat.has(beatId)) {
                        for (const noteId of this._notesOfBeat.get(beatId)) {
                          if (noteId !== _GpifParser._invalidId) {
                            const note = NoteCloner.clone(this._noteById.get(noteId));
                            if (staff.isPercussion) {
                              note.fret = -1;
                              note.string = -1;
                            } else {
                              note.percussionArticulation = -1;
                            }
                            beat.addNote(note);
                            this.onNoteOccurrence?.({
                              trackId: trackIndexToTrackId[trackIndex],
                              barId,
                              voiceId,
                              beatId,
                              rhythmId,
                              noteId,
                              measure: masterBarIndex,
                              voice: voice.index,
                              beat: beat.index
                            }, note);
                            if (this._tappedNotes.has(noteId)) {
                              beat.tap = true;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } else {
                const voice = new Voice();
                bar.addVoice(voice);
                const beat = new Beat();
                beat.isEmpty = true;
                beat.duration = 4 /* Quarter */;
                voice.addBeat(beat);
              }
            }
          }
          if (staffIndex === track.staves.length - 1) {
            trackIndex++;
            staffIndex = 0;
          } else {
            staffIndex++;
          }
          keySignature = [0 /* C */, 0 /* Major */];
          if (trackIndex < trackIndexToTrackId.length && this._transposeKeySignaturePerTrack.has(trackIndexToTrackId[trackIndex])) {
            keySignature = [
              ModelUtils.transposeKey(
                keySignature[0],
                this._transposeKeySignaturePerTrack.get(trackIndexToTrackId[trackIndex])
              ),
              keySignature[1]
            ];
          }
        } else {
          trackIndex++;
        }
      }
    }
    for (const trackId of this._tracksMapping) {
      if (!trackId) {
        continue;
      }
      const track = this._tracksById.get(trackId);
      let hasPercussion = false;
      for (const staff of track.staves) {
        if (staff.isPercussion) {
          hasPercussion = true;
          break;
        }
      }
      if (!hasPercussion) {
        track.percussionArticulations = [];
      }
      if (this._automationsPerTrackIdAndBarIndex.has(trackId)) {
        const trackAutomations = this._automationsPerTrackIdAndBarIndex.get(trackId);
        for (const [barNumber, automations] of trackAutomations) {
          if (track.staves.length > 0 && barNumber < track.staves[0].bars.length) {
            const bar = track.staves[0].bars[barNumber];
            if (bar.voices.length > 0 && bar.voices[0].beats.length > 0) {
              const beat = bar.voices[0].beats[0];
              for (const a of automations) {
                const skip = (
                  // skip bank automations if they are 0 at start
                  a.type === 4 /* Bank */ && a.value === 0 && bar.index === 0
                );
                if (!skip) {
                  beat.automations.push(a);
                }
              }
            }
          }
        }
      }
      if (this._sustainPedalsPerTrackIdAndBarIndex.has(trackId)) {
        const sustainPedals = this._sustainPedalsPerTrackIdAndBarIndex.get(trackId);
        for (const [barNumber, markers] of sustainPedals) {
          if (track.staves.length > 0 && barNumber < track.staves[0].bars.length) {
            const bar = track.staves[0].bars[barNumber];
            bar.sustainPedals = markers;
          }
        }
      }
    }
    for (const [barNumber, automations] of this._masterTrackAutomations) {
      if (barNumber < 0 || barNumber >= this.score.masterBars.length) {
        continue;
      }
      const masterBar = this.score.masterBars[barNumber];
      for (let i = 0, j = automations.length; i < j; i++) {
        const automation = automations[i];
        switch (automation.type) {
          case 0 /* Tempo */:
            masterBar.tempoAutomations.push(automation);
            break;
          case 4 /* SyncPoint */:
            automation.syncPointValue.millisecondOffset -= this._backingTrackPadding;
            masterBar.addSyncPoint(automation);
            break;
        }
      }
    }
  }
};

// third_party/alphatab/src/ReaderSettings.ts
var Settings = class {
  importer = { encoding: "windows-1252", maxDecodingBufferSize: 65536, beatTextAsLyrics: false };
  notation = {
    notationMode: 0 /* GuitarPro */,
    transpositionPitches: [],
    displayTranspositionPitches: []
  };
  display = { startBar: 1, barCount: -1 };
};

// src/adapters/guitar-pro/admission.ts
var refs = { bass: "bass", "electric-bass": "bass", electricBass: "bass", guitar: "guitar", electricGuitar: "guitar", "s-gtr6": "guitar" };
var observedFamily = (ref) => Object.hasOwn(refs, ref) ? refs[ref] : void 0;
function admittedFamily(ref, program, location) {
  const family = observedFamily(ref);
  if (!family || (family === "bass" ? program < 32 || program > 39 : program < 24 || program > 31))
    refuse("instrument-profile", "Reviewed source instrument reference and encoded guitar/bass MIDI family must agree; names and tuning alone cannot authorize an instrument.", location);
  return family;
}

// src/adapters/guitar-pro/recover.ts
var values = {
  Whole: [1, "whole"],
  Half: [2, "half"],
  Quarter: [4, "quarter"],
  Eighth: [8, "eighth"],
  "16th": [16, "16th"],
  "32nd": [32, "32nd"],
  "64th": [64, "64th"]
};
function idmap(root, group, kind) {
  const result = /* @__PURE__ */ new Map();
  for (const e of children(child(root, group), kind)) {
    const id = e.attrs.id;
    if (!/^[0-9]{1,6}$/.test(id) || result.has(id)) refuse("identity", `Invalid/duplicate ${kind} ID.`, e.location);
    result.set(id, e);
  }
  if (!result.size) refuse("structure", `Empty ${group} are unsupported in this proof.`, root.location);
  return result;
}
function refs2(e, name, required = true) {
  const s = value(e, name, required);
  if (!s) return [];
  if (!/^[0-9]{1,6}(?:\s+[0-9]{1,6})*$/.test(s)) refuse("reference", `Invalid ${name} reference list; missing placeholder scopes require a separate profile.`, e.location);
  return s.split(/\s+/);
}
function lookup(map, id, at) {
  const e = map.get(id);
  if (!e) refuse("reference", `Unresolved source ID ${id}.`, at.location);
  return e;
}
function props(e) {
  const result = /* @__PURE__ */ new Map();
  const group = child(e, "Properties", false);
  for (const p of group?.children ?? []) {
    if (result.has(p.attrs.name)) refuse("property", "Duplicate source property.", p.location);
    result.set(p.attrs.name, p);
  }
  return result;
}
function flag(s, at) {
  if (s === void 0) return false;
  if (s !== "true" && s !== "false") refuse("boolean", "Expected true/false.", at.location);
  return s === "true";
}
var semitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function inferPitch(midi) {
  const steps = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
  const step = steps[midi % 12], alter = midi % 12 - semitones[step];
  return { step, alter, octave: Math.floor(midi / 12) - 1, midi, origin: "inferred" };
}
function pitch(property, expected, convention = "midi-octave") {
  const p = child(property, "Pitch"), step = value(p, "Step"), acc = value(p, "Accidental");
  const alter = { "": 0, "#": 1, b: -1, x: 2, bb: -2 }[acc];
  const octave = integer(value(p, "Octave"), 0, 10, p);
  if (semitones[step] === void 0 || alter === void 0) refuse("pitch", "Unsupported pitch spelling.", p.location);
  const midi = (octave + (convention === "scientific" ? 1 : 0)) * 12 + semitones[step] + alter;
  if (midi !== expected) refuse("pitch-conflict", `Encoded pitch ${step}${acc}${octave} (${midi}) disagrees with physical/transposition pitch ${expected}.`, p.location);
  return { step, alter, octave: octave - (convention === "scientific" ? 0 : 1), midi, origin: "source" };
}
function recover(root, xml, findings, mode = "constructed") {
  const tracks = idmap(root, "Tracks", "Track"), bars = idmap(root, "Bars", "Bar"), voices = idmap(root, "Voices", "Voice");
  const beats = idmap(root, "Beats", "Beat"), notes = idmap(root, "Notes", "Note"), rhythms = idmap(root, "Rhythms", "Rhythm");
  const trackIds = refs2(child(root, "MasterTrack"), "Tracks");
  if (trackIds.length !== tracks.size || new Set(trackIds).size !== trackIds.length || trackIds.length > limits.tracks)
    refuse("track-scope", "Every defined track must occur exactly once in the master track and fit the profile.", root.location);
  const masters = children(child(root, "MasterBars"), "MasterBar");
  if (!masters.length || masters.length > limits.measures) refuse("measure-budget", "Measure count outside profile.", root.location);
  const used = { bars: /* @__PURE__ */ new Set(), voices: /* @__PURE__ */ new Set(), beats: /* @__PURE__ */ new Set(), notes: /* @__PURE__ */ new Set(), rhythms: /* @__PURE__ */ new Set() };
  const expectedOccurrences = [];
  let eventCount = 0, noteCount = 0;
  const pickup = !!child(child(root, "MasterTrack"), "Anacrusis", false);
  let repeatOpen = false;
  const common = masters.map((master, index) => {
    const time = value(master, "Time").split("/");
    if (time.length !== 2) refuse("meter", "Expected n/d meter.", master.location);
    const unit = integer(time[1], 1, 64, master), numerator = integer(time[0], 1, 32, master);
    if (unit & unit - 1) refuse("meter", "Meter denominator must be a power of two.", master.location);
    const key = child(master, "Key"), fifths = integer(value(key, "AccidentalCount"), -7, 7, key), mode2 = value(key, "Mode");
    if (!["Major", "Minor"].includes(mode2)) refuse("key", "Unsupported key mode.", key.location);
    const ids2 = refs2(master, "Bars");
    if (ids2.length !== tracks.size || new Set(ids2).size !== ids2.length) refuse("bar-scope", "One unique staff bar per track is required.", master.location);
    const repeat = child(master, "Repeat", false);
    const start = repeat ? flag(repeat.attrs.start, repeat) : false, end = repeat ? flag(repeat.attrs.end, repeat) : false;
    if (start && repeatOpen) refuse("repeat", "Nested repeats are not supported.", master.location);
    if (start) repeatOpen = true;
    if (end && !repeatOpen) refuse("repeat", "An explicit repeat start is required.", master.location);
    const count = end ? integer(repeat.attrs.count, 2, 8, repeat) : 0;
    if (repeat?.attrs.count) integer(repeat.attrs.count, 2, 8, repeat);
    if (repeat && !end && repeat.attrs.count) findings.push({ disposition: "omitted", code: "inactive-repeat-count", message: "Inactive repeat count does not specify playback without an end flag; retained in original input (capture delivered only on success).", location: repeat.location, fact: repeat.attrs.count });
    if (end) repeatOpen = false;
    return { time: { beats: numerator, unit }, key: { fifths, mode: mode2.toLowerCase() }, duration: q(numerator * 4, unit), ids: ids2, start, count, pickup: index === 0 && pickup };
  });
  if (repeatOpen) refuse("repeat", "Unclosed repeat start.", masters.at(-1).location);
  const parts = trackIds.map((trackId, trackIndex) => {
    const t = lookup(tracks, trackId, root), properties2 = props(t), tuningProperty = properties2.get("Tuning");
    if (!tuningProperty) refuse("tuning", "Explicit tuning is required; no instrument-name defaults.", t.location);
    const tuningText = value(tuningProperty, "Pitches");
    const tuning = tuningText.split(/\s+/).map((s) => integer(s, 12, 108, tuningProperty));
    if (tuning.length < 4 || tuning.length > 8 || tuning.some((n, i) => i > 0 && n <= tuning[i - 1]))
      refuse("tuning", "This profile requires 4\u20138 explicitly ordered ascending strings.", tuningProperty.location);
    const capo = properties2.get("CapoFret");
    if (capo && integer(value(capo, "Fret"), 0, 24, capo) !== 0) refuse("capo", "Nonzero/partial capo needs a separately exercised pitch convention.", capo.location);
    const trans = child(t, "Transpose", false);
    const octaves = trans ? integer(value(trans, "Octave"), -2, 2, trans) : 0;
    if (trans && integer(value(trans, "Chromatic"), -12, 12, trans) !== 0) refuse("transpose", "Only explicitly encoded octave transposition is exercised.", trans.location);
    const midi = child(t, "GeneralMidi");
    if (midi.attrs.table !== "Instrument") refuse("instrument", "Non-string/percussion tables require another profile.", midi.location);
    const program = integer(value(midi, "Program"), 0, 127, midi);
    const instrument = child(t, "Instrument");
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(instrument.attrs.ref ?? "")) refuse("instrument", "An explicit nonempty instrument reference is required.", instrument.location);
    admittedFamily(instrument.attrs.ref, program, instrument.location);
    if (instrument.attrs.ref === "s-gtr6" && tuning.length !== 6) refuse("instrument-profile", "The reviewed s-gtr6 source reference requires six explicit strings.", instrument.location);
    let convention = mode === "gp8-scientific" ? "scientific-physical" : "midi-octave-written";
    if (mode === "gpif-physical") {
      let midiOctave = true, scientific = true, explicit = 0, absent = 0;
      const reachable = /* @__PURE__ */ new Set();
      for (const c of common) for (const voiceId of refs2(lookup(bars, c.ids[trackIndex], t), "Voices"))
        for (const beatId of refs2(lookup(voices, voiceId, t), "Beats"))
          for (const noteId of refs2(lookup(beats, beatId, t), "Notes", false)) reachable.add(noteId);
      for (const id of reachable) {
        const n = lookup(notes, id, t), p = props(n), concert = p.get("ConcertPitch"), transposed = p.get("TransposedPitch"), sourceMidi = p.get("Midi");
        if (!concert && !transposed && !sourceMidi) {
          absent++;
          continue;
        }
        if (!concert || !transposed || !sourceMidi) refuse("pitch-corroboration", "Encoded pitch profile requires complete ConcertPitch/TransposedPitch/Midi triplets, or wholly absent GP6 spelling.", n.location);
        const string = p.get("String"), fret = p.get("Fret");
        if (!string || !fret) refuse("physical-pitch", "Explicit source string/fret required.", n.location);
        const physical = tuning[integer(value(string, "String"), 0, tuning.length - 1, string)] + integer(value(fret, "Fret"), 0, 36, fret);
        if (integer(value(sourceMidi, "Number"), 0, 127, sourceMidi) !== physical) refuse("pitch-conflict", "Source MIDI disagrees with physical tuning plus fret.", sourceMidi.location);
        const raw = (property) => {
          const field = child(property, "Pitch"), step = value(field, "Step"), acc = value(field, "Accidental");
          const alter = { "": 0, "#": 1, b: -1, x: 2, bb: -2 }[acc];
          if (semitones[step] === void 0 || alter === void 0) refuse("pitch", "Unsupported source spelling.", field.location);
          return integer(value(field, "Octave"), 0, 10, field) * 12 + semitones[step] + alter;
        };
        const cp = raw(concert), tp = raw(transposed);
        midiOctave &&= cp === physical && tp === physical - octaves * 12;
        scientific &&= cp + 12 === physical && tp + 12 === physical;
        explicit++;
      }
      const gp6 = !value(root, "GPVersion", false) || /^6(?:\.|$)/.test(value(root, "GPVersion", false));
      if (absent && (!gp6 || explicit)) refuse("pitch-corroboration", "Only GP6 wholly absent spelling is admitted; mixed profiles are refused.", t.location);
      if (explicit && midiOctave === scientific) refuse("pitch-conflict", "All source note tuples must establish one consistent physical pitch convention; version labels do not choose it.", t.location);
      convention = explicit ? midiOctave ? "midi-octave-written" : "scientific-physical" : "absent";
      if (!explicit && !gp6 && reachable.size) refuse("pitch-corroboration", "GP7/8 physical admission requires complete explicit pitch triplets.", t.location);
      findings.push({ disposition: convention === "absent" ? "inferred" : "preserved", code: "gpif-pitch-profile", message: "Pitch encoding profile is established across every reachable source note using physical tuning/fret/MIDI consistency, independently of producer/version labels. Raw pitches remain unchanged.", location: t.location, fact: { convention, explicitNotes: explicit, absentNotes: absent } });
    }
    const measures = common.map((c, measureIndex) => {
      const barId = c.ids[trackIndex], b = lookup(bars, barId, masters[measureIndex]);
      if (used.bars.has(barId)) refuse("bar-reuse", "Reused staff bar objects require distinct occurrence construction.", b.location);
      used.bars.add(barId);
      const clef = value(b, "Clef");
      if (!["G2", "F4", "C3", "C4"].includes(clef)) refuse("clef", "Unsupported clef.", b.location);
      const voiceIds = refs2(b, "Voices");
      if (!voiceIds.length || voiceIds.length > 4 || new Set(voiceIds).size !== voiceIds.length) refuse("voice-scope", "Expected 1\u20134 distinct voices.", b.location);
      const recoveredVoices = voiceIds.map((voiceId, voiceIndex) => {
        const v = lookup(voices, voiceId, b);
        if (used.voices.has(voiceId)) refuse("voice-reuse", "Reused voice objects require a separate reader patch; beat/note reuse is supported.", v.location);
        used.voices.add(voiceId);
        const ids2 = refs2(v, "Beats");
        if (!ids2.length && mode === "constructed") refuse("empty-voice", "Represent silence with explicit rhythmic rests.", v.location);
        let position = q(0);
        return ids2.map((beatId, beatIndex) => {
          if (++eventCount > limits.occurrences) refuse("occurrence-budget", "Expanded occurrence budget exceeded.", v.location);
          used.beats.add(beatId);
          const be = lookup(beats, beatId, v), rhythmRef = child(be, "Rhythm").attrs.ref;
          const r = lookup(rhythms, rhythmRef, be);
          used.rhythms.add(rhythmRef);
          const type = value(r, "NoteValue"), item = values[type];
          if (!item) refuse("rhythm", "Written duration outside whole\u201364th profile.", r.location);
          const dot = child(r, "AugmentationDot", false), dots = dot ? integer(dot.attrs.count, 0, 2, dot) : 0;
          const tuple = child(r, "PrimaryTuplet", false);
          const tuplet = tuple ? { actual: integer(tuple.attrs.num, 2, 16, tuple), normal: integer(tuple.attrs.den, 1, 16, tuple) } : void 0;
          let duration = q(4, item[0]);
          duration = mul(duration, q(2 ** (dots + 1) - 1, 2 ** dots));
          if (tuplet) duration = mul(duration, q(tuplet.normal, tuplet.actual));
          const location = { ...be.location, trackId, measure: measureIndex + 1, voice: voiceIndex + 1, beat: beatIndex + 1 };
          const noteIds = refs2(be, "Notes", false);
          if (new Set(noteIds).size !== noteIds.length || noteIds.length > tuning.length) refuse("chord", "Duplicate/oversized chord.", location);
          if ((noteCount += noteIds.length) > limits.occurrences) refuse("occurrence-budget", "Expanded note occurrence budget exceeded.", location);
          const sourceNotes = noteIds.map((noteId) => {
            used.notes.add(noteId);
            const n = lookup(notes, noteId, be), np = props(n);
            const stringProp = np.get("String"), fretProp = np.get("Fret");
            if (!stringProp || !fretProp) refuse("physical-pitch", "Explicit string and fret are required.", n.location);
            const stringIndex = integer(value(stringProp, "String"), 0, tuning.length - 1, stringProp);
            const fret = integer(value(fretProp, "Fret"), 0, 36, fretProp);
            const soundingMidi = tuning[stringIndex] + fret;
            const writtenMidi = soundingMidi - octaves * 12;
            if (soundingMidi > 127 || writtenMidi < 12 || writtenMidi > 127) refuse("pitch-range", "Pitch outside MIDI/reference range.", n.location);
            const concert = np.get("ConcertPitch"), transposed = np.get("TransposedPitch");
            let sounding, written;
            if (convention === "scientific-physical" && mode !== "constructed") {
              const sourceMidi = np.get("Midi");
              if (!concert || !transposed || !sourceMidi) refuse("pitch-corroboration", "GP8 admission requires both full pitch fields and Midi/Number.", n.location);
              if (integer(value(sourceMidi, "Number"), 0, 127, sourceMidi) !== soundingMidi)
                refuse("pitch-conflict", "Midi/Number differs from independently derived tuning plus fret.", sourceMidi.location);
              sounding = pitch(concert, soundingMidi, "scientific");
              const rawDisplay = pitch(transposed, soundingMidi, "scientific");
              if (rawDisplay.step !== sounding.step || rawDisplay.alter !== sounding.alter)
                refuse("pitch-conflict", "Both encoded pitch spellings must corroborate the observed sounding-pitch convention.", n.location);
              written = { ...rawDisplay, midi: writtenMidi, octave: rawDisplay.octave - octaves, origin: "inferred" };
              findings.push({ disposition: "inferred", code: "gp8-written-register", message: "Observed raw pitch fields encode sounding register. Written register is calculated from corroborated physical/MIDI pitch and explicit source octave display transpose; raw fields stay untouched (gp8-scientific-physical/0).", location: { ...n.location, ...location, path: n.location.path, id: noteId }, fact: { rawConcert: sounding, rawTransposed: rawDisplay, transposeOctaves: octaves } });
            } else {
              sounding = concert ? pitch(concert, soundingMidi) : inferPitch(soundingMidi);
              written = transposed ? pitch(transposed, writtenMidi) : inferPitch(writtenMidi);
            }
            if (mode !== "constructed" && child(n, "InstrumentArticulation", false) && integer(value(n, "InstrumentArticulation"), 0, 127, n) !== 0) refuse("articulation-profile", "Only default pitched articulation0 is admitted.", n.location);
            const dead = np.has("Muted");
            if (dead && !child(np.get("Muted"), "Enable", false)) refuse("technique", "Muted property requires an explicit Enable marker.", n.location);
            const tie = child(n, "Tie", false);
            if (tie && (!("origin" in tie.attrs) || !("destination" in tie.attrs))) refuse("tie", "Both tie endpoint flags must be explicit.", tie.location);
            if (!concert || !transposed) findings.push({ disposition: "inferred", code: "pitch-spelling", message: "Absent spelling uses an explicit sharp-based reference spelling; physical pitch and encoded octave transposition are retained.", location: { ...n.location, ...location, path: n.location.path, id: noteId }, fact: { concertPresent: !!concert, transposedPresent: !!transposed } });
            return {
              source: { ...location, ...n.location, trackId, measure: measureIndex + 1, voice: voiceIndex + 1, beat: beatIndex + 1 },
              id: noteId,
              string: tuning.length - stringIndex,
              fret,
              kind: dead ? "dead" : "pitched",
              sounding: dead ? null : sounding,
              written,
              ...dead ? { referenceSounding: sounding } : {},
              ...np.has("HopoOrigin") ? { sourceHopoOrigin: !!child(np.get("HopoOrigin"), "Enable") } : {},
              ...np.has("HopoDestination") ? { sourceHopoDestination: !!child(np.get("HopoDestination"), "Enable") } : {},
              tieStart: tie ? flag(tie.attrs.origin, tie) : false,
              tieStop: tie ? flag(tie.attrs.destination, tie) : false
            };
          });
          if (new Set(sourceNotes.map((n) => n.string)).size !== sourceNotes.length) refuse("chord-string", "One chord cannot occupy the same string twice.", location);
          const event = {
            source: location,
            id: beatId,
            start: position,
            duration,
            type: item[1],
            dots,
            ...tuplet ? { tuplet } : {},
            notes: sourceNotes,
            ...child(be, "Dynamic", false) ? { dynamic: value(be, "Dynamic") } : {},
            fullMeasureRest: !noteIds.length && ids2.length === 1 && equal(duration, c.duration),
            ...child(be, "FreeText", false) ? { text: value(be, "FreeText") } : {}
          };
          for (const note of sourceNotes) expectedOccurrences.push({ note, event, rhythmId: rhythmRef });
          position = add(position, duration);
          return event;
        });
      });
      const totals = recoveredVoices.filter((v) => v.length).map((v) => v.reduce((s, e) => add(s, e.duration), q(0)));
      if (!totals.length) refuse("empty-measure", "At least one voice must explicitly encode its silence/music span.", b.location);
      const actualDuration = c.pickup ? totals[0] : c.duration;
      if (!totals.every((t2) => equal(t2, actualDuration)) || c.pickup && actualDuration.n * c.duration.d >= c.duration.n * actualDuration.d)
        refuse("measure-duration", "Voices must fill the exact common measure span; pickup voices must agree and be shorter than meter.", b.location);
      return {
        source: { ...b.location, trackId, measure: measureIndex + 1 },
        time: c.time,
        key: c.key,
        clef,
        pickup: c.pickup,
        duration: actualDuration,
        voices: recoveredVoices,
        repeatStart: c.start,
        repeatEnd: c.count
      };
    });
    const pending = /* @__PURE__ */ new Map();
    let absolute = q(0);
    for (const m of measures) {
      for (let vi = 0; vi < m.voices.length; vi++) for (const e of m.voices[vi]) {
        const start = add(absolute, e.start);
        for (const n of e.notes) {
          const key = `${vi}:${n.string}`, previous = pending.get(key);
          if (n.kind === "dead" && (n.tieStart || n.tieStop || n.sourceHopoOrigin || n.sourceHopoDestination)) refuse("dead-relation", "Dead-note tie/HOPO semantics are outside this profile.", n.source);
          if (n.tieStop && (!previous || !equal(previous.end, start) || previous.note.sounding?.midi !== n.sounding?.midi || previous.note.written.midi !== n.written.midi || previous.note.fret !== n.fret || previous.note.written.step !== n.written.step || previous.note.written.alter !== n.written.alter))
            refuse("tie-conflict", "Tie destination has no contiguous, identical explicit origin; no source pitch/fret repair is permitted.", n.source);
          if (!n.tieStop && previous) refuse("tie-conflict", "Explicit tie origin reaches an ordinary attack.", n.source);
          pending.delete(key);
          if (n.tieStart) pending.set(key, { note: n, end: add(start, e.duration) });
        }
      }
      absolute = add(absolute, m.duration);
    }
    for (let vi = 0; vi < Math.max(...measures.map((m) => m.voices.length)); vi++) {
      const events = [];
      let barStart = q(0);
      for (const m of measures) {
        for (const e of m.voices[vi] ?? []) events.push({ e, absolute: add(barStart, e.start) });
        barStart = add(barStart, m.duration);
      }
      const paired = /* @__PURE__ */ new Set();
      for (let ei = 0; ei < events.length; ei++) for (const origin of events[ei].e.notes) {
        if (!origin.sourceHopoOrigin) continue;
        const next = events[ei + 1], target = next?.e.notes.find((n) => n.string === origin.string);
        if (!next || !target?.sourceHopoDestination || !equal(add(events[ei].absolute, events[ei].e.duration), next.absolute) || target.fret === origin.fret || origin.kind !== "pitched" || target.kind !== "pitched")
          refuse("hopo-conflict", "HOPO requires explicit paired same-string contiguous endpoints with a changed fret.", origin.source);
        const kind = target.fret > origin.fret ? "hammer-on" : "pull-off";
        if (events[ei].e.notes.filter((n) => n.sourceHopoOrigin).length > 1) refuse("hopo-polyphony", "Concurrent same-voice HOPO pairs need additional notation numbering coverage.", origin.source);
        origin.hopoStart = kind;
        target.hopoStop = kind;
        origin.hopoNumber = target.hopoNumber = vi + 1;
        paired.add(target);
        findings.push({ disposition: "inferred", code: "hopo-classification", message: "Paired source HOPO flags classified by same-string fret direction; exported as standard hammer-on/pull-off endpoints with a derived short connection slur. This is performance-connection notation, not separately sourced phrasing (source-hopo/0).", location: origin.source, fact: { kind, destination: target.source } });
      }
      for (const { e } of events) for (const n of e.notes) if (n.sourceHopoDestination && !paired.has(n)) refuse("hopo-conflict", "Unpaired explicit HOPO destination.", n.source);
    }
    for (const m of measures) for (const v of m.voices) for (const e of v) {
      if (e.dynamic && !["PPP", "PP", "P", "MP", "MF", "F", "FF", "FFF"].includes(e.dynamic)) refuse("dynamic", "Unknown dynamic value.", e.source);
      for (const n of e.notes) if (n.kind === "dead") findings.push({ disposition: "omitted", code: "dead-playback-timbre", message: "Dead note exports as standard unpitched x notehead with dead-note technical meaning and hidden physical guidance. Original reference pitch is retained; playback timbre is not assigned or verified.", location: n.source, fact: { physicalReference: n.referenceSounding } });
    }
    if (pending.size) refuse("tie-conflict", "Explicit tie origin has no destination.", [...pending.values()][0].note.source);
    return {
      source: t.location,
      id: trackId,
      name: value(t, "Name"),
      instrument: instrument.attrs.ref,
      midiProgram: program,
      tuning,
      transposeOctaves: octaves,
      measures
    };
  });
  if (parts.some((p) => !equal(p.measures[0].duration, parts[0].measures[0].duration)))
    refuse("pickup-span", "All tracks must share one exact master-bar pickup span; no implicit padding.", root.location);
  for (const [name, map] of Object.entries({ bars, voices, beats, notes, rhythms })) {
    for (const [id, e] of map) if (!used[name].has(id)) refuse("unreferenced", `Unreferenced ${name} source object ${id}.`, e.location);
  }
  const tempos = [];
  for (const a of child(child(root, "MasterTrack"), "Automations", false)?.children ?? []) {
    if (value(a, "Type") !== "Tempo" || flag(value(a, "Linear"), a)) refuse("automation", "Only discrete tempo automations are exercised.", a.location);
    const measure = integer(value(a, "Bar"), 0, masters.length - 1, a);
    const position = decimal(value(a, "Position"));
    if (position.n >= position.d) refuse("tempo-position", "Tempo ratio position must be in [0,1).", a.location);
    const partsValue = value(a, "Value").split(/\s+/);
    if (partsValue.length !== 2) refuse("tempo-reference", "Original rate plus explicit tempo unit/reference are required.", a.location);
    const rate = decimal(partsValue[0]), reference = integer(partsValue[1], 1, 5, a);
    if (rate.n <= 0 || rate.n > 1e3 * rate.d) refuse("tempo-rate", "Tempo rate outside profile.", a.location);
    const ref = [null, ["eighth", 0, 0.5], ["quarter", 0, 1], ["quarter", 1, 1.5], ["half", 0, 2], ["half", 1, 3]][reference];
    const actual = parts[0].measures[measure].duration;
    tempos.push({
      source: a.location,
      measure,
      position: mul(position, actual),
      rate: partsValue[0],
      reference,
      unit: ref[0],
      dots: ref[1],
      quarterRate: rate.n / rate.d * ref[2],
      visible: flag(value(a, "Visible"), a)
    });
    findings.push({ disposition: "preserved", code: "tempo-unit", message: "Original tempo rate, unit, visibility and exact position preserved.", location: a.location, fact: { rate: partsValue[0], reference, ratioPosition: position, visible: value(a, "Visible") } });
    if (child(a, "Text", false)) findings.push({ disposition: "omitted", code: "tempo-text", message: "Tempo annotation text retained in original input (capture delivered only on success); notation export not exercised.", location: child(a, "Text").location, fact: value(a, "Text") });
  }
  if (!tempos.length) findings.push({ disposition: "omitted", code: "no-tempo", message: "No encoded tempo exists; no upstream playback default is printed.", location: root.location });
  freeze(parts);
  freeze(tempos);
  const occurrenceKey = (location, noteId) => `${location.trackId}:${location.measure}:${location.voice}:${location.beat}:${noteId}`;
  const expectedByKey = new Map(expectedOccurrences.map((e) => [occurrenceKey(e.note.source, e.note.id), e]));
  const capturedKeys = /* @__PURE__ */ new Set();
  const parser = new GpifParser(), captures = [], normalized = [];
  const capturedExpected = [];
  Logger.logLevel = 0 /* None */;
  parser.onNoteOccurrence = (s, note) => {
    const key = `${s.trackId}:${s.measure + 1}:${s.voice + 1}:${s.beat + 1}:${s.noteId}`;
    const expected = expectedByKey.get(key);
    if (capturedKeys.has(key)) refuse("reader-identity", "Duplicate borrowed source occurrence.", root.location);
    capturedKeys.add(key);
    if (!expected || s.noteId !== expected.note.id || s.beatId !== expected.event.id || s.rhythmId !== expected.rhythmId || s.trackId !== expected.note.source.trackId || s.measure + 1 !== expected.note.source.measure || s.voice + 1 !== expected.note.source.voice || s.beat + 1 !== expected.note.source.beat)
      refuse("reader-identity", "Borrowed reader occurrence identity differs from the complete source traversal.", root.location);
    captures.push({
      source: expected.note.source,
      rhythmId: s.rhythmId,
      noteId: s.noteId,
      before: freeze({ fret: note.fret, string: note.string, tieDestination: note.isTieDestination }),
      after: { fret: 0, string: 0, tieDestination: false, soundingMidi: 0, playbackTicks: 0 }
    });
    normalized.push(note);
    capturedExpected.push(expected);
  };
  try {
    parser.parseXml(xml, new Settings());
  } catch (e) {
    if (e instanceof Error && "code" in e) throw e;
    refuse("reader", "Borrowed GPIF reader failed within the admitted profile.", root.location);
  }
  if (captures.length !== expectedOccurrences.length || parser.score.tracks.length !== parts.length)
    refuse("reader-coverage", "Borrowed reader did not recover the complete requested source scope.", root.location);
  for (let i = 0; i < captures.length; i++) {
    const n = normalized[i], expected = capturedExpected[i];
    captures[i].after = { fret: n.fret, string: n.string, tieDestination: n.isTieDestination, soundingMidi: n.realValue, playbackTicks: n.beat.playbackDuration };
    if (n.realValue !== (expected.note.sounding ?? expected.note.referenceSounding).midi || n.fret !== expected.note.fret || n.string !== parts.find((p) => p.id === expected.note.source.trackId).tuning.length - expected.note.string + 1 || n.isTieDestination !== expected.note.tieStop || n.isDead !== (expected.note.kind === "dead"))
      refuse("reader-reconciliation", "Normalized pitch, physical choice or tie disagrees with immutable source facts.", expected.note.source);
  }
  for (let pi = 0; pi < parts.length; pi++) {
    const track = parser.score.tracks[pi];
    if (track.staves.length !== 1 || track.staves[0].bars.length !== masters.length) refuse("reader-scope", "Borrowed staff/measure scope differs.", parts[pi].source);
    for (let mi = 0; mi < masters.length; mi++) {
      const bar = track.staves[0].bars[mi], measure = parts[pi].measures[mi];
      if (bar.voices.length !== measure.voices.length) refuse("reader-scope", "Borrowed voice scope differs.", measure.source);
      for (let vi = 0; vi < measure.voices.length; vi++) {
        const voice = bar.voices[vi];
        if (!measure.voices[vi].length && voice.beats.every((beat) => beat.isEmpty && !beat.notes.length)) continue;
        if (voice.beats.length !== measure.voices[vi].length) refuse("reader-scope", "Borrowed beat scope differs.", measure.source);
        for (let bi = 0; bi < voice.beats.length; bi++) {
          const be = voice.beats[bi], source = measure.voices[vi][bi];
          if (be.notes.length !== source.notes.length || be.dots !== source.dots || be.duration !== values[Object.keys(values).find((k) => values[k][1] === source.type)][0])
            refuse("reader-rhythm", "Borrowed written rhythm/chord disagrees with source.", source.source);
        }
      }
    }
  }
  findings.push({ disposition: "preserved", code: "source-reconciled", message: "Complete source definitions, cloned occurrence IDs and normalized pitch/voice/rhythm/tie scope reconciled; exact source clocks replace truncated playback ticks.", location: root.location, fact: { noteOccurrences: captures.length, events: eventCount } });
  return { score: freeze({ title: value(child(root, "Score"), "Title"), parts, tempos }), occurrences: freeze(captures) };
}

// third_party/alphatab/src/midi/GeneralMidi.ts
var GeneralMidi = class _GeneralMidi {
  static _values = /* @__PURE__ */ new Map([
    ["acousticgrandpiano", 0],
    ["brightacousticpiano", 1],
    ["electricgrandpiano", 2],
    ["honkytonkpiano", 3],
    ["electricpiano1", 4],
    ["electricpiano2", 5],
    ["harpsichord", 6],
    ["clavinet", 7],
    ["celesta", 8],
    ["glockenspiel", 9],
    ["musicbox", 10],
    ["vibraphone", 11],
    ["marimba", 12],
    ["xylophone", 13],
    ["tubularbells", 14],
    ["dulcimer", 15],
    ["drawbarorgan", 16],
    ["percussiveorgan", 17],
    ["rockorgan", 18],
    ["churchorgan", 19],
    ["reedorgan", 20],
    ["accordion", 21],
    ["harmonica", 22],
    ["tangoaccordion", 23],
    ["acousticguitarnylon", 24],
    ["acousticguitarsteel", 25],
    ["electricguitarjazz", 26],
    ["electricguitarclean", 27],
    ["electricguitarmuted", 28],
    ["overdrivenguitar", 29],
    ["distortionguitar", 30],
    ["guitarharmonics", 31],
    ["acousticbass", 32],
    ["electricbassfinger", 33],
    ["electricbasspick", 34],
    ["fretlessbass", 35],
    ["slapbass1", 36],
    ["slapbass2", 37],
    ["synthbass1", 38],
    ["synthbass2", 39],
    ["violin", 40],
    ["viola", 41],
    ["cello", 42],
    ["contrabass", 43],
    ["tremolostrings", 44],
    ["pizzicatostrings", 45],
    ["orchestralharp", 46],
    ["timpani", 47],
    ["stringensemble1", 48],
    ["stringensemble2", 49],
    ["synthstrings1", 50],
    ["synthstrings2", 51],
    ["choiraahs", 52],
    ["voiceoohs", 53],
    ["synthvoice", 54],
    ["orchestrahit", 55],
    ["trumpet", 56],
    ["trombone", 57],
    ["tuba", 58],
    ["mutedtrumpet", 59],
    ["frenchhorn", 60],
    ["brasssection", 61],
    ["synthbrass1", 62],
    ["synthbrass2", 63],
    ["sopranosax", 64],
    ["altosax", 65],
    ["tenorsax", 66],
    ["baritonesax", 67],
    ["oboe", 68],
    ["englishhorn", 69],
    ["bassoon", 70],
    ["clarinet", 71],
    ["piccolo", 72],
    ["flute", 73],
    ["recorder", 74],
    ["panflute", 75],
    ["blownbottle", 76],
    ["shakuhachi", 77],
    ["whistle", 78],
    ["ocarina", 79],
    ["lead1square", 80],
    ["lead2sawtooth", 81],
    ["lead3calliope", 82],
    ["lead4chiff", 83],
    ["lead5charang", 84],
    ["lead6voice", 85],
    ["lead7fifths", 86],
    ["lead8bassandlead", 87],
    ["pad1newage", 88],
    ["pad2warm", 89],
    ["pad3polysynth", 90],
    ["pad4choir", 91],
    ["pad5bowed", 92],
    ["pad6metallic", 93],
    ["pad7halo", 94],
    ["pad8sweep", 95],
    ["fx1rain", 96],
    ["fx2soundtrack", 97],
    ["fx3crystal", 98],
    ["fx4atmosphere", 99],
    ["fx5brightness", 100],
    ["fx6goblins", 101],
    ["fx7echoes", 102],
    ["fx8scifi", 103],
    ["sitar", 104],
    ["banjo", 105],
    ["shamisen", 106],
    ["koto", 107],
    ["kalimba", 108],
    ["bagpipe", 109],
    ["fiddle", 110],
    ["shanai", 111],
    ["tinklebell", 112],
    ["agogo", 113],
    ["steeldrums", 114],
    ["woodblock", 115],
    ["taikodrum", 116],
    ["melodictom", 117],
    ["synthdrum", 118],
    ["reversecymbal", 119],
    ["guitarfretnoise", 120],
    ["breathnoise", 121],
    ["seashore", 122],
    ["birdtweet", 123],
    ["telephonering", 124],
    ["helicopter", 125],
    ["applause", 126],
    ["gunshot", 127]
  ]);
  static getValue(name) {
    if (!_GeneralMidi._values) {
      _GeneralMidi._values = /* @__PURE__ */ new Map();
    }
    name = name.toLowerCase().replaceAll(" ", "");
    return _GeneralMidi._values.has(name) ? _GeneralMidi._values.get(name) : 0;
  }
  static getName(input) {
    for (const [name, program] of _GeneralMidi._values) {
      if (program === input) {
        return name;
      }
    }
    return input.toString();
  }
  static isPiano(program) {
    return program <= 7 || program >= 16 && program <= 23;
  }
  static isGuitar(program) {
    return program >= 24 && program <= 39 || program === 105 || program === 43;
  }
  static isBass(program) {
    return program >= 32 && program <= 39;
  }
  static bankToLsbMsb(bank) {
    const lsb = bank & 127;
    const msb = bank >> 7 & 127;
    return [lsb, msb];
  }
};

// third_party/alphatab/src/io/IReadable.ts
var EndOfReaderError = class extends AlphaTabError {
  constructor() {
    super(1 /* Format */, "Unexpected end of data within reader");
  }
};
var OverflowError = class extends AlphaTabError {
  constructor(message) {
    super(1 /* Format */, message);
  }
};
var ThrowingReadable = class {
  _readable;
  constructor(readable) {
    this._readable = readable;
  }
  get position() {
    return this._readable.position;
  }
  set position(value2) {
    this._readable.position = value2;
  }
  get length() {
    return this._readable.length;
  }
  reset() {
    this._readable.reset();
  }
  skip(offset) {
    this._readable.skip(offset);
  }
  _requireBytes(bytes) {
    const remaining = this.length - this.position;
    if (remaining < bytes) {
      throw new EndOfReaderError();
    }
  }
  readByte() {
    this._requireBytes(1);
    return this._readable.readByte();
  }
  read(buffer, offset, count) {
    this._requireBytes(count);
    return this._readable.read(buffer, offset, count);
  }
  readAll() {
    return this._readable.readAll();
  }
};

// third_party/alphatab/src/importer/ScoreImporter.ts
var ScoreImporter = class {
  data;
  settings;
  /**
   * Initializes the importer with the given data and settings.
   */
  init(data, settings) {
    if (data instanceof ThrowingReadable) {
      this.data = data;
    } else {
      this.data = new ThrowingReadable(data);
    }
    this.settings = settings;
    Score.resetIds();
  }
};

// third_party/alphatab/src/io/TypeConversions.ts
var TypeConversions = class _TypeConversions {
  static _conversionBuffer = new ArrayBuffer(8);
  static _conversionByteArray = new Uint8Array(_TypeConversions._conversionBuffer);
  static _dataView = new DataView(_TypeConversions._conversionBuffer);
  static float64ToBytes(v) {
    _TypeConversions._dataView.setFloat64(0, v, true);
    return _TypeConversions._conversionByteArray;
  }
  static bytesToInt64LE(bytes) {
    _TypeConversions._conversionByteArray.set(bytes, 0);
    const int64 = _TypeConversions._dataView.getBigInt64(0, true);
    if (int64 <= Number.MAX_SAFE_INTEGER && int64 >= Number.MIN_SAFE_INTEGER) {
      return Number(int64);
    }
    return Number.MAX_SAFE_INTEGER;
  }
  static bytesToFloat64LE(bytes) {
    _TypeConversions._conversionByteArray.set(bytes, 0);
    return _TypeConversions._dataView.getFloat64(0, true);
  }
  static bytesToFloat32LE(bytes) {
    _TypeConversions._conversionByteArray.set(bytes, 0);
    return _TypeConversions._dataView.getFloat32(0, true);
  }
  static float32BEToBytes(v) {
    _TypeConversions._dataView.setFloat32(0, v, false);
    return _TypeConversions._conversionByteArray.slice(0, 4);
  }
  static uint16ToInt16(v) {
    _TypeConversions._dataView.setUint16(0, v, true);
    return _TypeConversions._dataView.getInt16(0, true);
  }
  static int16ToUint32(v) {
    _TypeConversions._dataView.setInt16(0, v, true);
    return _TypeConversions._dataView.getUint32(0, true);
  }
  static int32ToUint16(v) {
    _TypeConversions._dataView.setInt32(0, v, true);
    return _TypeConversions._dataView.getUint16(0, true);
  }
  static int32ToInt16(v) {
    _TypeConversions._dataView.setInt32(0, v, true);
    return _TypeConversions._dataView.getInt16(0, true);
  }
  static int32ToUint32(v) {
    _TypeConversions._dataView.setInt32(0, v, true);
    return _TypeConversions._dataView.getUint32(0, true);
  }
  static uint8ToInt8(v) {
    _TypeConversions._dataView.setUint8(0, v);
    return _TypeConversions._dataView.getInt8(0);
  }
};

// third_party/alphatab/src/io/IOHelper.ts
var IOHelper = class _IOHelper {
  static readInt32BE(input) {
    const ch1 = input.readByte();
    const ch2 = input.readByte();
    const ch3 = input.readByte();
    const ch4 = input.readByte();
    return ch1 << 24 | ch2 << 16 | ch3 << 8 | ch4;
  }
  static readFloat32BE(readable) {
    const bits = new Uint8Array(4);
    readable.read(bits, 0, bits.length);
    bits.reverse();
    return TypeConversions.bytesToFloat32LE(bits);
  }
  static readFloat64BE(readable) {
    const bits = new Uint8Array(8);
    readable.read(bits, 0, bits.length);
    bits.reverse();
    return TypeConversions.bytesToFloat64LE(bits);
  }
  static readInt32LE(input) {
    const ch1 = input.readByte();
    const ch2 = input.readByte();
    const ch3 = input.readByte();
    const ch4 = input.readByte();
    return ch4 << 24 | ch3 << 16 | ch2 << 8 | ch1;
  }
  static readInt64LE(input) {
    const b = new Uint8Array(8);
    input.read(b, 0, b.length);
    return TypeConversions.bytesToInt64LE(b);
  }
  static readUInt32LE(input) {
    const ch1 = input.readByte();
    const ch2 = input.readByte();
    const ch3 = input.readByte();
    const ch4 = input.readByte();
    return ch4 << 24 | ch3 << 16 | ch2 << 8 | ch1;
  }
  static decodeUInt32LE(data, index) {
    const ch1 = data[index];
    const ch2 = data[index + 1];
    const ch3 = data[index + 2];
    const ch4 = data[index + 3];
    return ch4 << 24 | ch3 << 16 | ch2 << 8 | ch1;
  }
  static readUInt16LE(input) {
    const ch1 = input.readByte();
    const ch2 = input.readByte();
    return TypeConversions.int32ToUint16(ch2 << 8 | ch1);
  }
  static readInt16LE(input) {
    const ch1 = input.readByte();
    const ch2 = input.readByte();
    return TypeConversions.int32ToInt16(ch2 << 8 | ch1);
  }
  static readUInt32BE(input) {
    const ch1 = input.readByte();
    const ch2 = input.readByte();
    const ch3 = input.readByte();
    const ch4 = input.readByte();
    return TypeConversions.int32ToUint32(ch1 << 24 | ch2 << 16 | ch3 << 8 | ch4);
  }
  static readUInt16BE(input) {
    const ch1 = input.readByte();
    const ch2 = input.readByte();
    return TypeConversions.int32ToInt16(ch1 << 8 | ch2);
  }
  static readInt16BE(input) {
    const ch1 = input.readByte();
    const ch2 = input.readByte();
    return TypeConversions.int32ToInt16(ch1 << 8 | ch2);
  }
  static readByteArray(input, length) {
    const v = new Uint8Array(length);
    input.read(v, 0, length);
    return v;
  }
  static read8BitChars(input, length) {
    const b = new Uint8Array(length);
    input.read(b, 0, b.length);
    return _IOHelper.toString(b, "utf-8");
  }
  static read8BitString(input) {
    let s = "";
    let c = input.readByte();
    while (c !== 0) {
      s += String.fromCharCode(c);
      c = input.readByte();
    }
    return s;
  }
  static read8BitStringLength(input, length) {
    let s = "";
    let z = -1;
    for (let i = 0; i < length; i++) {
      const c = input.readByte();
      if (c === 0 && z === -1) {
        z = i;
      }
      s += String.fromCharCode(c);
    }
    const t = s;
    if (z >= 0) {
      return t.substr(0, z);
    }
    return t;
  }
  static readSInt8(input) {
    const v = input.readByte();
    return ((v & 255) >> 7) * -256 + (v & 255);
  }
  static readInt24(input, index) {
    let i = input[index] | input[index + 1] << 8 | input[index + 2] << 16;
    if ((i & 8388608) === 8388608) {
      i = i | 255 << 24;
    }
    return i;
  }
  static readInt16(input, index) {
    return TypeConversions.int32ToInt16(input[index] | input[index + 1] << 8);
  }
  static toString(data, encoding) {
    const detectedEncoding = _IOHelper._detectEncoding(data);
    if (detectedEncoding) {
      encoding = detectedEncoding;
    }
    if (!encoding) {
      encoding = "utf-8";
    }
    const decoder = new TextDecoder(encoding);
    return decoder.decode(data);
  }
  static _detectEncoding(data) {
    if (data.length > 2 && data[0] === 254 && data[1] === 255) {
      return "utf-16be";
    }
    if (data.length > 2 && data[0] === 255 && data[1] === 254) {
      return "utf-16le";
    }
    if (data.length > 4 && data[0] === 0 && data[1] === 0 && data[2] === 254 && data[3] === 255) {
      return "utf-32be";
    }
    if (data.length > 4 && data[0] === 255 && data[1] === 254 && data[2] === 0 && data[3] === 0) {
      return "utf-32le";
    }
    return null;
  }
  static stringToBytes(str) {
    const decoder = new TextEncoder();
    return decoder.encode(str);
  }
  static writeInt32BE(o, v) {
    o.writeByte(v >> 24 & 255);
    o.writeByte(v >> 16 & 255);
    o.writeByte(v >> 8 & 255);
    o.writeByte(v >> 0 & 255);
  }
  static writeInt32LE(o, v) {
    o.writeByte(v >> 0 & 255);
    o.writeByte(v >> 8 & 255);
    o.writeByte(v >> 16 & 255);
    o.writeByte(v >> 24 & 255);
  }
  static writeUInt16LE(o, v) {
    o.writeByte(v >> 0 & 255);
    o.writeByte(v >> 8 & 255);
  }
  static writeInt16LE(o, v) {
    o.writeByte(v >> 0 & 255);
    o.writeByte(v >> 8 & 255);
  }
  static writeInt16BE(o, v) {
    o.writeByte(v >> 8 & 255);
    o.writeByte(v >> 0 & 255);
  }
  static writeFloat32BE(o, v) {
    const b = TypeConversions.float32BEToBytes(v);
    o.write(b, 0, b.length);
  }
  static *iterateCodepoints(input) {
    let i = 0;
    while (i < input.length) {
      let c = input.charCodeAt(i);
      if (_IOHelper.isLeadingSurrogate(c) && i + 1 < input.length) {
        i++;
        c = (c - 55296) * 1024 + (input.charCodeAt(i) - 56320) + 65536;
      }
      i++;
      yield c;
    }
  }
  // https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#leading-surrogate
  static isLeadingSurrogate(charCode) {
    return charCode >= 55296 && charCode <= 56319;
  }
  // https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#trailing-surrogate
  static isTrailingSurrogate(charCode) {
    return charCode >= 56320 && charCode <= 57343;
  }
};

// third_party/alphatab/src/importer/Gp3To5Importer.ts
var Gp3To5Importer = class _Gp3To5Importer extends ScoreImporter {
  /** Observe decoded source before consolidation/finishing can synthesize or repair facts. */
  onBeforeFinish;
  /** Raw numeric field observer runs before source values can be normalized or ignored. */
  onSourceField;
  sourceField(name, value2, bytes = 1) {
    this.onSourceField?.(name, value2, this.data.position - bytes, bytes);
  }
  static _versionString = "FICHIER GUITAR PRO ";
  // NOTE: General Midi only defines percussion instruments from 35-81
  // Guitar Pro 5 allowed GS extensions (27-34 and 82-87)
  // GP7-8 do not have all these definitions anymore, this lookup ensures some fallback
  // (even if they are not correct)
  // we can support this properly in future when we allow custom alphaTex articulation definitions
  // then we don't need to rely on GP specifics anymore but handle things on export/import
  static _gp5PercussionInstrumentMap = /* @__PURE__ */ new Map([
    // High Q -> GS "High Q / Filter Snap"
    [27, 42],
    // Slap
    [28, 60],
    // Scratch Push
    [29, 29],
    // Scratch Pull
    [30, 30],
    // Square Click
    [32, 31]
  ]);
  _versionNumber = 0;
  _score;
  _globalTripletFeel = 0 /* NoTripletFeel */;
  _lyricsTrack = 0;
  _lyrics = [];
  _barCount = 0;
  _trackCount = 0;
  _playbackInfos = [];
  _doubleBars = /* @__PURE__ */ new Set();
  _clefsPerTrack = /* @__PURE__ */ new Map();
  _keySignatures = /* @__PURE__ */ new Map();
  _beatTextChunksByTrack = /* @__PURE__ */ new Map();
  _directionLookup = /* @__PURE__ */ new Map();
  _initialTempo;
  get name() {
    return "Guitar Pro 3-5";
  }
  readScore() {
    this._directionLookup.clear();
    this.readVersion();
    this._score = new Score();
    this.readScoreInformation();
    if (this._versionNumber < 500) {
      this._globalTripletFeel = GpBinaryHelpers.gpReadBool(this.data) ? 2 /* Triplet8th */ : 0 /* NoTripletFeel */;
      this.sourceField("global-triplet-feel", this._globalTripletFeel);
    }
    if (this._versionNumber >= 400) {
      this.readLyrics();
    }
    if (this._versionNumber >= 510) {
      this.data.skip(19);
    }
    this._initialTempo = Automation.buildTempoAutomation(false, 0, 0, 0);
    if (this._versionNumber >= 500) {
      this.readPageSetup();
      this._initialTempo.text = GpBinaryHelpers.gpReadStringIntByte(
        this.data,
        this.settings.importer.encoding,
        this.settings.importer.maxDecodingBufferSize
      );
    }
    this._initialTempo.value = IOHelper.readInt32LE(this.data);
    this.sourceField("initial-tempo", this._initialTempo.value, 4);
    if (this._versionNumber >= 510) {
      const hideTempo = this.data.readByte();
      this.sourceField("hide-tempo", hideTempo);
    }
    const initialKey = this._versionNumber >= 500 ? IOHelper.readSInt8(this.data) : IOHelper.readInt32LE(this.data);
    this.sourceField("initial-key", initialKey, this._versionNumber >= 500 ? 1 : 4);
    if (this._versionNumber >= 400) {
      const initialOctave = this._versionNumber >= 500 ? IOHelper.readInt32LE(this.data) : this.data.readByte();
      this.sourceField("initial-octave", initialOctave, this._versionNumber >= 500 ? 4 : 1);
    }
    this.readPlaybackInfos();
    if (this._versionNumber >= 500) {
      this._readDirection(3 /* TargetCoda */);
      this._readDirection(4 /* TargetDoubleCoda */);
      this._readDirection(1 /* TargetSegno */);
      this._readDirection(2 /* TargetSegnoSegno */);
      this._readDirection(0 /* TargetFine */);
      this._readDirection(5 /* JumpDaCapo */);
      this._readDirection(6 /* JumpDaCapoAlCoda */);
      this._readDirection(7 /* JumpDaCapoAlDoubleCoda */);
      this._readDirection(8 /* JumpDaCapoAlFine */);
      this._readDirection(9 /* JumpDalSegno */);
      this._readDirection(10 /* JumpDalSegnoAlCoda */);
      this._readDirection(11 /* JumpDalSegnoAlDoubleCoda */);
      this._readDirection(12 /* JumpDalSegnoAlFine */);
      this._readDirection(13 /* JumpDalSegnoSegno */);
      this._readDirection(14 /* JumpDalSegnoSegnoAlCoda */);
      this._readDirection(15 /* JumpDalSegnoSegnoAlDoubleCoda */);
      this._readDirection(16 /* JumpDalSegnoSegnoAlFine */);
      this._readDirection(17 /* JumpDaCoda */);
      this._readDirection(18 /* JumpDaDoubleCoda */);
      this.data.skip(4);
    }
    this._barCount = IOHelper.readInt32LE(this.data);
    this.sourceField("bar-count", this._barCount, 4);
    this._ensureLoopBoundary(this._barCount, _Gp3To5Importer._maxBarCount, "bar count");
    this._trackCount = IOHelper.readInt32LE(this.data);
    this.sourceField("track-count", this._trackCount, 4);
    this._ensureLoopBoundary(this._trackCount, _Gp3To5Importer._maxTrackCount, "track count");
    this.readMasterBars();
    this.readTracks();
    this.readBars();
    if (this._score.masterBars.length > 0) {
      const automation = Automation.buildTempoAutomation(false, 0, this._score.tempo, 2);
      automation.text = this._score.tempoLabel;
      this._score.masterBars[0].tempoAutomations.push(automation);
    }
    this.onBeforeFinish?.(this._score);
    ModelUtils.consolidate(this._score);
    this._score.finish(this.settings);
    if (this._lyrics && this._lyricsTrack >= 0) {
      this._score.tracks[this._lyricsTrack].applyLyrics(this._lyrics);
    }
    return this._score;
  }
  _readDirection(direction) {
    let directionIndex = IOHelper.readInt16LE(this.data);
    this.sourceField("navigation", directionIndex, 2);
    if (directionIndex === -1) {
      return;
    }
    directionIndex--;
    let directionsList;
    if (this._directionLookup.has(directionIndex)) {
      directionsList = this._directionLookup.get(directionIndex);
    } else {
      directionsList = [];
      this._directionLookup.set(directionIndex, directionsList);
    }
    directionsList.push(direction);
  }
  readVersion() {
    let version = GpBinaryHelpers.gpReadStringByteLength(this.data, 30, this.settings.importer.encoding);
    if (!version.startsWith(_Gp3To5Importer._versionString)) {
      throw new UnsupportedFormatError("Unsupported format");
    }
    version = version.substr(_Gp3To5Importer._versionString.length + 1);
    const dot = version.indexOf(String.fromCharCode(46));
    this._versionNumber = 100 * Number.parseInt(version.substr(0, dot), 10) + Number.parseInt(version.substr(dot + 1), 10);
    Logger.debug(this.name, `Guitar Pro version ${version} detected`);
  }
  readScoreInformation() {
    this._score.title = GpBinaryHelpers.gpReadStringIntUnused(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    this._score.subTitle = GpBinaryHelpers.gpReadStringIntUnused(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    this._score.artist = GpBinaryHelpers.gpReadStringIntUnused(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    this._score.album = GpBinaryHelpers.gpReadStringIntUnused(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    this._score.words = GpBinaryHelpers.gpReadStringIntUnused(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    this._score.music = this._versionNumber >= 500 ? GpBinaryHelpers.gpReadStringIntUnused(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    ) : this._score.words;
    this._score.copyright = GpBinaryHelpers.gpReadStringIntUnused(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    this._score.tab = GpBinaryHelpers.gpReadStringIntUnused(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    this._score.instructions = GpBinaryHelpers.gpReadStringIntUnused(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    const noticeLines = IOHelper.readInt32LE(this.data);
    this._ensureLoopBoundary(noticeLines, _Gp3To5Importer._maxNoticeLines, "notice line count");
    let notice = "";
    for (let i = 0; i < noticeLines; i++) {
      if (i > 0) {
        notice += "\r\n";
      }
      notice += GpBinaryHelpers.gpReadStringIntUnused(
        this.data,
        this.settings.importer.encoding,
        this.settings.importer.maxDecodingBufferSize
      )?.toString();
    }
    this._score.notices = notice;
  }
  // very generous thresholds for values which control loop boundaries
  // prevents DoS or resource exhaustion for corrupt files or files with malicious intent
  // not configurable, as realistically GP3-5 files will not exceed these values,
  // I don't hink anyone is that verbose in the small GP5 box where you can add notices
  static _maxNoticeLines = 1e3;
  // I haven't encountered such a long song in the wild. beyond 1000 bars something is clearly off
  static _maxBarCount = 1e3;
  // I think GP5 itself limits already to ~10. 100 tracks is just unrealistic, proof me wrong
  static _maxTrackCount = 100;
  // nobody reallistically writes that many beats in one bar either.
  static _maxBeatCount = 100;
  // I think GP5 already limits this to way less, very generous to allow 4 times more than likely the UI supports
  static _maxBendPointCount = BendPoint.MaxPosition * 4;
  _ensureLoopBoundary(value2, maximumValue, label) {
    if (value2 > maximumValue) {
      throw new OverflowError(
        `'${label}' with value ${value2} has exceeded the internal safety threshold of ${maximumValue}`
      );
    }
  }
  readLyrics() {
    this._lyrics = [];
    this._lyricsTrack = IOHelper.readInt32LE(this.data) - 1;
    this.sourceField("lyrics-track", this._lyricsTrack, 4);
    for (let i = 0; i < 5; i++) {
      const lyrics = new Lyrics();
      lyrics.startBar = IOHelper.readInt32LE(this.data) - 1;
      const textStart = this.data.position;
      lyrics.text = GpBinaryHelpers.gpReadStringInt(
        this.data,
        this.settings.importer.encoding,
        this.settings.importer.maxDecodingBufferSize
      );
      this.sourceField(`lyrics-present:${i}`, lyrics.text.trim() ? 1 : 0, this.data.position - textStart);
      this._lyrics.push(lyrics);
    }
  }
  readPageSetup() {
    this.data.skip(28);
    const flags = IOHelper.readInt16LE(this.data);
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 0 /* Title */).isVisible = (flags & 1 << 0) !== 0;
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 0 /* Title */).template = GpBinaryHelpers.gpReadStringIntByte(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 1 /* SubTitle */).isVisible = (flags & 1 << 1) !== 0;
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 1 /* SubTitle */).template = GpBinaryHelpers.gpReadStringIntByte(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 2 /* Artist */).isVisible = (flags & 1 << 2) !== 0;
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 2 /* Artist */).template = GpBinaryHelpers.gpReadStringIntByte(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 3 /* Album */).isVisible = (flags & 1 << 3) !== 0;
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 3 /* Album */).template = GpBinaryHelpers.gpReadStringIntByte(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 4 /* Words */).isVisible = (flags & 1 << 4) !== 0;
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 4 /* Words */).template = GpBinaryHelpers.gpReadStringIntByte(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 5 /* Music */).isVisible = (flags & 1 << 5) !== 0;
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 5 /* Music */).template = GpBinaryHelpers.gpReadStringIntByte(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 6 /* WordsAndMusic */).isVisible = (flags & 1 << 6) !== 0;
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 6 /* WordsAndMusic */).template = GpBinaryHelpers.gpReadStringIntByte(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 8 /* Copyright */).isVisible = (flags & 1 << 7) !== 0;
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 8 /* Copyright */).template = GpBinaryHelpers.gpReadStringIntByte(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 9 /* CopyrightSecondLine */).isVisible = (flags & 1 << 7) !== 0;
    ModelUtils.getOrCreateHeaderFooterStyle(this._score, 9 /* CopyrightSecondLine */).template = GpBinaryHelpers.gpReadStringIntByte(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
    GpBinaryHelpers.gpReadStringIntByte(
      this.data,
      this.settings.importer.encoding,
      this.settings.importer.maxDecodingBufferSize
    );
  }
  readPlaybackInfos() {
    this._playbackInfos = [];
    let channel = 0;
    for (let i = 0; i < 64; i++) {
      const info = new PlaybackInformation();
      info.primaryChannel = channel++;
      info.secondaryChannel = channel++;
      info.program = IOHelper.readInt32LE(this.data);
      this.sourceField(`channel-program:${i}`, info.program, 4);
      info.volume = this.data.readByte();
      info.balance = this.data.readByte();
      this.data.skip(6);
      this._playbackInfos.push(info);
    }
  }
  readMasterBars() {
    for (let i = 0; i < this._barCount; i++) {
      this.readMasterBar();
    }
  }
  readMasterBar() {
    let previousMasterBar = null;
    if (this._score.masterBars.length > 0) {
      previousMasterBar = this._score.masterBars[this._score.masterBars.length - 1];
    }
    const newMasterBar = new MasterBar();
    if (!previousMasterBar && this._initialTempo.value > 0) {
      newMasterBar.tempoAutomations.push(this._initialTempo);
    }
    const flags = this.data.readByte();
    this.sourceField("master-flags", flags);
    if ((flags & 1) !== 0) {
      newMasterBar.timeSignatureNumerator = this.data.readByte();
      this.sourceField("meter-numerator", newMasterBar.timeSignatureNumerator);
    } else if (previousMasterBar) {
      newMasterBar.timeSignatureNumerator = previousMasterBar.timeSignatureNumerator;
    }
    if ((flags & 2) !== 0) {
      newMasterBar.timeSignatureDenominator = this.data.readByte();
      this.sourceField("meter-denominator", newMasterBar.timeSignatureDenominator);
    } else if (previousMasterBar) {
      newMasterBar.timeSignatureDenominator = previousMasterBar.timeSignatureDenominator;
    }
    newMasterBar.isRepeatStart = (flags & 4) !== 0;
    if ((flags & 8) !== 0) {
      const repeatCount = this.data.readByte();
      this.sourceField("repeat-count", repeatCount);
      newMasterBar.repeatCount = repeatCount + (this._versionNumber >= 500 ? 0 : 1);
    }
    if ((flags & 16) !== 0 && this._versionNumber < 500) {
      let currentMasterBar = previousMasterBar;
      let existentAlternatives = 0;
      while (currentMasterBar) {
        if (currentMasterBar.isRepeatEnd && currentMasterBar !== previousMasterBar) {
          break;
        }
        if (currentMasterBar.isRepeatStart) {
          break;
        }
        existentAlternatives = existentAlternatives | currentMasterBar.alternateEndings;
        currentMasterBar = currentMasterBar.previousMasterBar;
      }
      let repeatAlternative = 0;
      const repeatMask = this.data.readByte();
      for (let i = 0; i < 8; i++) {
        const repeating = 1 << i;
        if (repeatMask > i && (existentAlternatives & repeating) === 0) {
          repeatAlternative = repeatAlternative | repeating;
        }
      }
      newMasterBar.alternateEndings = repeatAlternative;
    }
    if ((flags & 32) !== 0) {
      const section = new Section();
      section.text = GpBinaryHelpers.gpReadStringIntByte(
        this.data,
        this.settings.importer.encoding,
        this.settings.importer.maxDecodingBufferSize
      );
      section.marker = "";
      GpBinaryHelpers.gpReadColor(this.data, false);
      newMasterBar.section = section;
    }
    if ((flags & 64) !== 0) {
      const key = IOHelper.readSInt8(this.data);
      this.sourceField("key-fifths", key);
      const mode = this.data.readByte();
      this.sourceField("key-mode", mode);
      this._keySignatures.set(this._score.masterBars.length, [key, mode]);
    }
    if (this._versionNumber >= 500 && (flags & 3) !== 0) {
      this.data.skip(4);
    }
    if (this._versionNumber >= 500) {
      newMasterBar.alternateEndings = this.data.readByte();
      this.sourceField("alternate-endings", newMasterBar.alternateEndings);
    }
    if (this._versionNumber >= 500) {
      const tripletFeel = this.data.readByte();
      this.sourceField("triplet-feel", tripletFeel);
      switch (tripletFeel) {
        case 1:
          newMasterBar.tripletFeel = 2 /* Triplet8th */;
          break;
        case 2:
          newMasterBar.tripletFeel = 1 /* Triplet16th */;
          break;
      }
      this.data.readByte();
    } else {
      newMasterBar.tripletFeel = this._globalTripletFeel;
    }
    const isDoubleBar = (flags & 128) !== 0;
    newMasterBar.isDoubleBar = isDoubleBar;
    const barIndexForDirection = this._score.masterBars.length;
    if (this._directionLookup.has(barIndexForDirection)) {
      for (const direction of this._directionLookup.get(barIndexForDirection)) {
        newMasterBar.addDirection(direction);
      }
    }
    this._score.addMasterBar(newMasterBar);
    if (isDoubleBar) {
      this._doubleBars.add(newMasterBar.index);
    }
  }
  readTracks() {
    for (let i = 0; i < this._trackCount; i++) {
      this.readTrack();
    }
    if (this._versionNumber >= 500) this.sourceField("track-separator", this.data.readByte());
  }
  /**
   * Guitar Pro 3-6 changes to a bass clef if any string tuning is below B1
   */
  static _bassClefTuningThreshold = ModelUtils.parseTuning("B1").realValue;
  readTrack() {
    const newTrack = new Track();
    newTrack.ensureStaveCount(1);
    this._score.addTrack(newTrack);
    const mainStaff = newTrack.staves[0];
    const flags = this.data.readByte();
    this.sourceField("track-flags", flags);
    const nameStart = this.data.position;
    newTrack.name = GpBinaryHelpers.gpReadStringByteLength(this.data, 40, this.settings.importer.encoding);
    this.sourceField("track-name-length", newTrack.name.length, this.data.position - nameStart);
    if ((flags & 1) !== 0) {
      mainStaff.isPercussion = true;
    }
    if (this._versionNumber >= 500) {
      newTrack.isVisibleOnMultiTrack = (flags & 8) !== 0;
    }
    if (this._score.stylesheet.perTrackDisplayTuning === null) {
      this._score.stylesheet.perTrackDisplayTuning = /* @__PURE__ */ new Map();
    }
    this._score.stylesheet.perTrackDisplayTuning.set(newTrack.index, (flags & 128) !== 0);
    const stringCount = IOHelper.readInt32LE(this.data);
    this.sourceField("string-count", stringCount, 4);
    const tuning = [];
    for (let i = 0; i < 7; i++) {
      const stringTuning = IOHelper.readInt32LE(this.data);
      this.sourceField(`tuning:${i}`, stringTuning, 4);
      if (stringCount > i) {
        tuning.push(stringTuning);
      }
    }
    mainStaff.stringTuning.tunings = tuning;
    const port = IOHelper.readInt32LE(this.data);
    const index = IOHelper.readInt32LE(this.data) - 1;
    this.sourceField("channel", index + 1, 4);
    const effectChannel = IOHelper.readInt32LE(this.data) - 1;
    this.data.skip(4);
    if (index >= 0 && index < this._playbackInfos.length) {
      const info = this._playbackInfos[index];
      info.port = port;
      info.isSolo = (flags & 16) !== 0;
      info.isMute = (flags & 32) !== 0;
      info.secondaryChannel = effectChannel;
      if (GeneralMidi.isGuitar(info.program)) {
        mainStaff.displayTranspositionPitch = -12;
      }
      newTrack.playbackInfo = info;
    }
    mainStaff.capo = IOHelper.readInt32LE(this.data);
    this.sourceField("capo", mainStaff.capo, 4);
    newTrack.color = GpBinaryHelpers.gpReadColor(this.data, false);
    if (this._versionNumber >= 500) {
      const staffFlags = this.data.readByte();
      mainStaff.showTablature = (staffFlags & 1) !== 0;
      mainStaff.showStandardNotation = (staffFlags & 2) !== 0;
      const showChordDiagramListOnTopOfScore = (staffFlags & 100) !== 0;
      if (this._score.stylesheet.perTrackChordDiagramsOnTop === null) {
        this._score.stylesheet.perTrackChordDiagramsOnTop = /* @__PURE__ */ new Map();
      }
      this._score.stylesheet.perTrackChordDiagramsOnTop.set(newTrack.index, showChordDiagramListOnTopOfScore);
      const automaticMidi = this.data.readByte();
      this.sourceField("automatic-midi", automaticMidi);
      this.sourceField("automatic-accent", this.data.readByte());
      newTrack.playbackInfo.bank = this.data.readByte();
      this.sourceField("sound-bank", newTrack.playbackInfo.bank);
      this.sourceField("humanize", this.data.readByte());
      const clefMode = IOHelper.readInt32LE(this.data);
      this.sourceField("clef-mode", clefMode, 4);
      if (clefMode === 12 || tuning[tuning.length - 1] < _Gp3To5Importer._bassClefTuningThreshold) {
        this._clefsPerTrack.set(newTrack.index, 3 /* F4 */);
      } else {
        this._clefsPerTrack.set(newTrack.index, 4 /* G2 */);
      }
      const secondaryClefMode = IOHelper.readInt32LE(this.data);
      this.sourceField("secondary-clef-mode", secondaryClefMode, 4);
      IOHelper.readInt32LE(this.data);
      this.data.skip(10);
      this.data.readByte();
      this.data.readByte();
      this._readRseBank();
      if (this._versionNumber >= 510) {
        this.data.skip(4);
        GpBinaryHelpers.gpReadStringIntByte(
          this.data,
          this.settings.importer.encoding,
          this.settings.importer.maxDecodingBufferSize
        );
        GpBinaryHelpers.gpReadStringIntByte(
          this.data,
          this.settings.importer.encoding,
          this.settings.importer.maxDecodingBufferSize
        );
      }
    } else {
      if (tuning[tuning.length - 1] < _Gp3To5Importer._bassClefTuningThreshold) {
        this._clefsPerTrack.set(newTrack.index, 3 /* F4 */);
      } else {
        this._clefsPerTrack.set(newTrack.index, 4 /* G2 */);
      }
    }
  }
  readBars() {
    for (let i = 0; i < this._barCount; i++) {
      for (let t = 0; t < this._trackCount; t++) {
        this.readBar(this._score.tracks[t]);
      }
    }
  }
  readBar(track) {
    const newBar = new Bar();
    const mainStaff = track.staves[0];
    if (mainStaff.isPercussion) {
      newBar.clef = 0 /* Neutral */;
    } else if (this._clefsPerTrack.has(track.index)) {
      newBar.clef = this._clefsPerTrack.get(track.index);
    }
    mainStaff.addBar(newBar);
    if (this._keySignatures.has(newBar.index)) {
      const newKeySignature = this._keySignatures.get(newBar.index);
      newBar.keySignature = newKeySignature[0];
      newBar.keySignatureType = newKeySignature[1];
    } else if (newBar.index > 0) {
      newBar.keySignature = newBar.previousBar.keySignature;
      newBar.keySignatureType = newBar.previousBar.keySignatureType;
    }
    if (this._doubleBars.has(newBar.index)) {
      newBar.barLineRight = 7 /* LightLight */;
    }
    let voiceCount = 1;
    if (this._versionNumber >= 500) {
      voiceCount = 2;
    }
    for (let v = 0; v < voiceCount; v++) {
      this.readVoice(track, newBar);
    }
    if (this._versionNumber >= 500) this.sourceField("bar-line-break", this.data.readByte());
  }
  readVoice(track, bar) {
    const beatCount = IOHelper.readInt32LE(this.data);
    this.sourceField("beat-count", beatCount, 4);
    const newVoice = new Voice();
    bar.addVoice(newVoice);
    if (beatCount === 0) {
      return;
    }
    this._ensureLoopBoundary(beatCount, _Gp3To5Importer._maxBeatCount, "beat count");
    for (let i = 0; i < beatCount; i++) {
      this.readBeat(track, bar, newVoice);
    }
  }
  readBeat(track, bar, voice) {
    const newBeat = new Beat();
    const flags = this.data.readByte();
    this.sourceField("beat-flags", flags);
    if ((flags & 1) !== 0) {
      newBeat.dots = 1;
    }
    if ((flags & 64) !== 0) {
      const type = this.data.readByte();
      this.sourceField("beat-status", type);
      newBeat.isEmpty = (type & 2) === 0;
    }
    voice.addBeat(newBeat);
    const duration = IOHelper.readSInt8(this.data);
    this.sourceField("duration-exponent", duration);
    switch (duration) {
      case -2:
        newBeat.duration = 1 /* Whole */;
        break;
      case -1:
        newBeat.duration = 2 /* Half */;
        break;
      case 0:
        newBeat.duration = 4 /* Quarter */;
        break;
      case 1:
        newBeat.duration = 8 /* Eighth */;
        break;
      case 2:
        newBeat.duration = 16 /* Sixteenth */;
        break;
      case 3:
        newBeat.duration = 32 /* ThirtySecond */;
        break;
      case 4:
        newBeat.duration = 64 /* SixtyFourth */;
        break;
      default:
        newBeat.duration = 4 /* Quarter */;
        break;
    }
    if ((flags & 32) !== 0) {
      newBeat.tupletNumerator = IOHelper.readInt32LE(this.data);
      this.sourceField("tuplet", newBeat.tupletNumerator, 4);
      switch (newBeat.tupletNumerator) {
        case 1:
          newBeat.tupletDenominator = 1;
          break;
        case 3:
          newBeat.tupletDenominator = 2;
          break;
        case 5:
        case 6:
        case 7:
          newBeat.tupletDenominator = 4;
          break;
        case 9:
        case 10:
        case 11:
        case 12:
        case 13:
          newBeat.tupletDenominator = 8;
          break;
        case 2:
        case 4:
        case 8:
          break;
        default:
          newBeat.tupletNumerator = 1;
          newBeat.tupletDenominator = 1;
          break;
      }
    }
    if ((flags & 2) !== 0) {
      this.readChord(newBeat);
    }
    const beatTextAsLyrics = this.settings.importer.beatTextAsLyrics && track.index !== this._lyricsTrack;
    if ((flags & 4) !== 0) {
      const text = GpBinaryHelpers.gpReadStringIntUnused(
        this.data,
        this.settings.importer.encoding,
        this.settings.importer.maxDecodingBufferSize
      );
      if (beatTextAsLyrics) {
        const lyrics = new Lyrics();
        lyrics.text = text.trim();
        lyrics.finish(true);
        const beatLyrics = [];
        for (let i = lyrics.chunks.length - 1; i >= 0; i--) {
          beatLyrics.push(lyrics.chunks[i]);
        }
        this._beatTextChunksByTrack.set(track.index, beatLyrics);
      } else {
        newBeat.text = text;
      }
    }
    let allNoteHarmonicType = 0 /* None */;
    if ((flags & 8) !== 0) {
      allNoteHarmonicType = this.readBeatEffects(newBeat);
    }
    if ((flags & 16) !== 0) {
      this.readMixTableChange(newBeat);
    }
    const stringFlags = this.data.readByte();
    this.sourceField("string-mask", stringFlags);
    for (let i = 6; i >= 0; i--) {
      if ((stringFlags & 1 << i) !== 0 && 6 - i < bar.staff.tuning.length) {
        const note = this.readNote(track, bar, voice, newBeat, 6 - i);
        if (allNoteHarmonicType !== 0 /* None */) {
          note.harmonicType = allNoteHarmonicType;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(note.fret);
        }
      }
    }
    if (this._versionNumber >= 500) {
      const flags2 = IOHelper.readInt16LE(this.data);
      this.sourceField("beat-flags2", flags2, 2);
      if ((flags2 & 1) !== 0) {
        if (newBeat.index > 0) {
          voice.beats[newBeat.index - 1].beamingMode = 1 /* ForceSplitToNext */;
        }
      }
      if ((flags2 & 2) !== 0) {
        newBeat.preferredBeamDirection = 1 /* Down */;
      }
      if ((flags2 & 4) !== 0) {
        if (newBeat.index > 0) {
          voice.beats[newBeat.index - 1].beamingMode = 2 /* ForceMergeWithNext */;
        }
      }
      if ((flags2 & 8) !== 0) {
        newBeat.preferredBeamDirection = 0 /* Up */;
      }
      if ((flags2 & 16) !== 0) {
        newBeat.ottava = 1 /* _8va */;
      }
      if ((flags2 & 32) !== 0) {
        newBeat.ottava = 3 /* _8vb */;
      }
      if ((flags2 & 64) !== 0) {
        newBeat.ottava = 0 /* _15ma */;
      }
      if ((flags2 & 256) !== 0) {
        newBeat.ottava = 4 /* _15mb */;
      }
      if ((flags2 & 2048) !== 0) {
        const breakSecondaryBeams = this.data.readByte() !== 0;
        if (newBeat.index > 0 && breakSecondaryBeams) {
          voice.beats[newBeat.index - 1].beamingMode = 3 /* ForceSplitOnSecondaryToNext */;
        }
      }
    }
    if (beatTextAsLyrics && !newBeat.isRest && this._beatTextChunksByTrack.has(track.index) && this._beatTextChunksByTrack.get(track.index).length > 0) {
      newBeat.lyrics = [this._beatTextChunksByTrack.get(track.index).pop()];
    }
  }
  readChord(beat) {
    const chord = new Chord();
    const chordId = ModelUtils.newGuid();
    if (this._versionNumber >= 500) {
      this.data.skip(17);
      chord.name = GpBinaryHelpers.gpReadStringByteLength(this.data, 21, this.settings.importer.encoding);
      this.data.skip(4);
      chord.firstFret = IOHelper.readInt32LE(this.data);
      for (let i = 0; i < 7; i++) {
        const fret = IOHelper.readInt32LE(this.data);
        if (i < beat.voice.bar.staff.tuning.length) {
          chord.strings.push(fret);
        }
      }
      const numberOfBarres = this.data.readByte();
      const barreFrets = new Uint8Array(5);
      this.data.read(barreFrets, 0, barreFrets.length);
      for (let i = 0; i < numberOfBarres; i++) {
        chord.barreFrets.push(barreFrets[i]);
      }
      this.data.skip(26);
    } else {
      if (this.data.readByte() !== 0) {
        if (this._versionNumber >= 400) {
          this.data.skip(16);
          chord.name = GpBinaryHelpers.gpReadStringByteLength(this.data, 21, this.settings.importer.encoding);
          this.data.skip(4);
          chord.firstFret = IOHelper.readInt32LE(this.data);
          for (let i = 0; i < 7; i++) {
            const fret = IOHelper.readInt32LE(this.data);
            if (i < beat.voice.bar.staff.tuning.length) {
              chord.strings.push(fret);
            }
          }
          const numberOfBarres = this.data.readByte();
          const barreFrets = new Uint8Array(5);
          this.data.read(barreFrets, 0, barreFrets.length);
          for (let i = 0; i < numberOfBarres; i++) {
            chord.barreFrets.push(barreFrets[i]);
          }
          this.data.skip(26);
        } else {
          this.data.skip(25);
          chord.name = GpBinaryHelpers.gpReadStringByteLength(this.data, 34, this.settings.importer.encoding);
          chord.firstFret = IOHelper.readInt32LE(this.data);
          for (let i = 0; i < 6; i++) {
            const fret = IOHelper.readInt32LE(this.data);
            if (i < beat.voice.bar.staff.tuning.length) {
              chord.strings.push(fret);
            }
          }
          this.data.skip(36);
        }
      } else {
        const strings = this._versionNumber >= 406 ? 7 : 6;
        chord.name = GpBinaryHelpers.gpReadStringIntByte(
          this.data,
          this.settings.importer.encoding,
          this.settings.importer.maxDecodingBufferSize
        );
        chord.firstFret = IOHelper.readInt32LE(this.data);
        if (chord.firstFret > 0) {
          for (let i = 0; i < strings; i++) {
            const fret = IOHelper.readInt32LE(this.data);
            if (i < beat.voice.bar.staff.tuning.length) {
              chord.strings.push(fret);
            }
          }
        }
      }
    }
    if (chord.name) {
      beat.chordId = chordId;
      beat.voice.bar.staff.addChord(beat.chordId, chord);
    }
  }
  readBeatEffects(beat) {
    const flags = this.data.readByte();
    let flags2 = 0;
    if (this._versionNumber >= 400) {
      flags2 = this.data.readByte();
    }
    if ((flags & 16) !== 0) {
      beat.fade = 1 /* FadeIn */;
    }
    if (this._versionNumber < 400 && (flags & 1) !== 0 || (flags & 2) !== 0) {
      beat.vibrato = 1 /* Slight */;
    }
    if ((flags2 & 1) !== 0) {
      beat.rasgueado = 1 /* Ii */;
    }
    if ((flags & 32) !== 0 && this._versionNumber >= 400) {
      const slapPop = IOHelper.readSInt8(this.data);
      switch (slapPop) {
        case 1:
          beat.tap = true;
          break;
        case 2:
          beat.slap = true;
          break;
        case 3:
          beat.pop = true;
          break;
      }
    } else if ((flags & 32) !== 0) {
      const slapPop = IOHelper.readSInt8(this.data);
      switch (slapPop) {
        case 1:
          beat.tap = true;
          break;
        case 2:
          beat.slap = true;
          break;
        case 3:
          beat.pop = true;
          break;
      }
      this.data.skip(4);
    }
    if ((flags2 & 4) !== 0) {
      this.readTremoloBarEffect(beat);
    }
    if ((flags & 64) !== 0) {
      let strokeUp = 0;
      let strokeDown = 0;
      if (this._versionNumber < 500) {
        strokeDown = this.data.readByte();
        strokeUp = this.data.readByte();
      } else {
        strokeUp = this.data.readByte();
        strokeDown = this.data.readByte();
      }
      if (strokeUp > 0) {
        beat.brushType = 1 /* BrushUp */;
        beat.brushDuration = _Gp3To5Importer._toStrokeValue(strokeUp);
      } else if (strokeDown > 0) {
        beat.brushType = 2 /* BrushDown */;
        beat.brushDuration = _Gp3To5Importer._toStrokeValue(strokeDown);
      }
    }
    if ((flags2 & 2) !== 0) {
      switch (IOHelper.readSInt8(this.data)) {
        case 0:
          beat.pickStroke = 0 /* None */;
          break;
        case 1:
          beat.pickStroke = 1 /* Up */;
          break;
        case 2:
          beat.pickStroke = 2 /* Down */;
          break;
      }
    }
    if (this._versionNumber < 400) {
      if ((flags & 4) !== 0) {
        return 1 /* Natural */;
      }
      if ((flags & 8) !== 0) {
        return 2 /* Artificial */;
      }
    }
    return 0 /* None */;
  }
  readTremoloBarEffect(beat) {
    this.data.readByte();
    IOHelper.readInt32LE(this.data);
    const pointCount = IOHelper.readInt32LE(this.data);
    this._ensureLoopBoundary(pointCount, _Gp3To5Importer._maxBendPointCount, "tremolo bar point count");
    if (pointCount > 0) {
      for (let i = 0; i < pointCount; i++) {
        const point = new BendPoint(0, 0);
        point.offset = IOHelper.readInt32LE(this.data);
        point.value = IOHelper.readInt32LE(this.data) / _Gp3To5Importer._bendStep | 0;
        GpBinaryHelpers.gpReadBool(this.data);
        beat.addWhammyBarPoint(point);
      }
    }
  }
  static _toStrokeValue(value2) {
    switch (value2) {
      case 1:
        return 30;
      case 2:
        return 30;
      case 3:
        return 60;
      case 4:
        return 120;
      case 5:
        return 240;
      case 6:
        return 480;
      default:
        return 0;
    }
  }
  _readRseBank() {
    this.data.skip(4);
    this.data.skip(4);
    this.data.skip(4);
    this.data.skip(4);
  }
  readMixTableChange(beat) {
    const tableChange = new MixTableChange();
    tableChange.instrument = IOHelper.readSInt8(this.data);
    this.sourceField("mix-instrument", tableChange.instrument);
    if (this._versionNumber >= 500) {
      this._readRseBank();
    }
    tableChange.volume = IOHelper.readSInt8(this.data);
    this.sourceField("mix-volume", tableChange.volume);
    tableChange.balance = IOHelper.readSInt8(this.data);
    this.sourceField("mix-balance", tableChange.balance);
    const chorus = IOHelper.readSInt8(this.data);
    this.sourceField("mix-chorus", chorus);
    const reverb = IOHelper.readSInt8(this.data);
    this.sourceField("mix-reverb", reverb);
    const phaser = IOHelper.readSInt8(this.data);
    this.sourceField("mix-phaser", phaser);
    const tremolo = IOHelper.readSInt8(this.data);
    this.sourceField("mix-tremolo", tremolo);
    if (this._versionNumber >= 500) {
      tableChange.tempoName = GpBinaryHelpers.gpReadStringIntByte(
        this.data,
        this.settings.importer.encoding,
        this.settings.importer.maxDecodingBufferSize
      );
    }
    tableChange.tempo = IOHelper.readInt32LE(this.data);
    this.sourceField("mix-tempo", tableChange.tempo, 4);
    if (tableChange.volume >= 0) {
      this.data.readByte();
    }
    if (tableChange.balance >= 0) {
      this.data.readByte();
    }
    if (chorus >= 0) {
      this.data.readByte();
    }
    if (reverb >= 0) {
      this.data.readByte();
    }
    if (phaser >= 0) {
      this.data.readByte();
    }
    if (tremolo >= 0) {
      this.data.readByte();
    }
    if (tableChange.tempo >= 0) {
      tableChange.duration = IOHelper.readSInt8(this.data);
      this.sourceField("mix-duration", tableChange.duration);
      if (this._versionNumber >= 510) {
        this.sourceField("mix-hide-tempo", this.data.readByte());
      }
    }
    if (this._versionNumber >= 400) {
      this.sourceField("mix-flags", this.data.readByte());
    }
    if (this._versionNumber >= 500) {
      const wahType = IOHelper.readSInt8(this.data);
      this.sourceField("mix-wah", wahType);
      if (wahType >= 100) {
        beat.wahPedal = 2 /* Closed */;
      } else if (wahType >= 0) {
        beat.wahPedal = 1 /* Open */;
      }
    }
    if (this._versionNumber >= 510) {
      GpBinaryHelpers.gpReadStringIntByte(
        this.data,
        this.settings.importer.encoding,
        this.settings.importer.maxDecodingBufferSize
      );
      GpBinaryHelpers.gpReadStringIntByte(
        this.data,
        this.settings.importer.encoding,
        this.settings.importer.maxDecodingBufferSize
      );
    }
    if (tableChange.volume >= 0) {
      const volumeAutomation = new Automation();
      volumeAutomation.isLinear = true;
      volumeAutomation.type = 1 /* Volume */;
      volumeAutomation.value = tableChange.volume;
      beat.automations.push(volumeAutomation);
    }
    if (tableChange.balance >= 0) {
      const balanceAutomation = new Automation();
      balanceAutomation.isLinear = true;
      balanceAutomation.type = 3 /* Balance */;
      balanceAutomation.value = tableChange.balance;
      beat.automations.push(balanceAutomation);
    }
    if (tableChange.instrument >= 0) {
      const instrumentAutomation = new Automation();
      instrumentAutomation.isLinear = true;
      instrumentAutomation.type = 2 /* Instrument */;
      instrumentAutomation.value = tableChange.instrument;
      beat.automations.push(instrumentAutomation);
    }
    if (tableChange.tempo >= 0) {
      const tempoAutomation = new Automation();
      tempoAutomation.isLinear = true;
      tempoAutomation.type = 0 /* Tempo */;
      tempoAutomation.value = tableChange.tempo;
      beat.automations.push(tempoAutomation);
      if (!beat.voice.bar.masterBar.tempoAutomations.some(
        (a) => a.ratioPosition === tempoAutomation.ratioPosition && a.value === tempoAutomation.value
      )) {
        beat.voice.bar.masterBar.tempoAutomations.push(tempoAutomation);
      }
    }
  }
  readNote(track, bar, voice, beat, stringIndex) {
    const newNote = new Note();
    newNote.string = bar.staff.tuning.length - stringIndex;
    const flags = this.data.readByte();
    this.sourceField("note-flags", flags);
    if ((flags & 2) !== 0) {
      newNote.accentuated = 2 /* Heavy */;
    } else if ((flags & 64) !== 0) {
      newNote.accentuated = 1 /* Normal */;
    }
    newNote.isGhost = (flags & 4) !== 0;
    if ((flags & 32) !== 0) {
      const noteType = this.data.readByte();
      this.sourceField("note-type", noteType);
      if (noteType === 3) {
        newNote.isDead = true;
      } else if (noteType === 2) {
        newNote.isTieDestination = true;
      }
    }
    if ((flags & 1) !== 0 && this._versionNumber < 500) {
      this.data.readByte();
      this.data.readByte();
    }
    if ((flags & 16) !== 0) {
      const dynamicNumber = IOHelper.readSInt8(this.data);
      this.sourceField("note-dynamic", dynamicNumber);
      newNote.dynamics = this.toDynamicValue(dynamicNumber);
      beat.dynamics = newNote.dynamics;
    }
    if ((flags & 32) !== 0) {
      newNote.fret = IOHelper.readSInt8(this.data);
      this.sourceField("note-fret", newNote.fret);
    }
    if ((flags & 128) !== 0) {
      newNote.leftHandFinger = IOHelper.readSInt8(this.data);
      newNote.rightHandFinger = IOHelper.readSInt8(this.data);
    }
    let swapAccidentals = false;
    if (this._versionNumber >= 500) {
      if ((flags & 1) !== 0) {
        newNote.durationPercent = IOHelper.readFloat64BE(this.data);
      }
      const flags2 = this.data.readByte();
      this.sourceField("note-flags2", flags2);
      swapAccidentals = (flags2 & 2) !== 0;
    }
    beat.addNote(newNote);
    if ((flags & 8) !== 0) {
      this.readNoteEffects(track, voice, beat, newNote);
    }
    if (bar.staff.isPercussion) {
      newNote.percussionArticulation = _Gp3To5Importer._gp5PercussionInstrumentMap.has(newNote.fret) ? _Gp3To5Importer._gp5PercussionInstrumentMap.get(newNote.fret) : newNote.fret;
      newNote.string = -1;
      newNote.fret = -1;
    }
    if (swapAccidentals) {
      const accidental = ModelUtils.computeAccidental(
        bar.keySignature,
        0 /* Default */,
        newNote.realValueWithoutHarmonic,
        false
      );
      if (accidental === 2 /* Sharp */) {
        newNote.accidentalMode = 5 /* ForceFlat */;
      } else if (accidental === 3 /* Flat */) {
        newNote.accidentalMode = 3 /* ForceSharp */;
      }
    }
    return newNote;
  }
  toDynamicValue(value2) {
    switch (value2) {
      case 1:
        return 0 /* PPP */;
      case 2:
        return 1 /* PP */;
      case 3:
        return 2 /* P */;
      case 4:
        return 3 /* MP */;
      case 5:
        return 4 /* MF */;
      case 6:
        return 5 /* F */;
      case 7:
        return 6 /* FF */;
      case 8:
        return 7 /* FFF */;
      default:
        return 5 /* F */;
    }
  }
  readNoteEffects(_track, voice, beat, note) {
    const flags = this.data.readByte();
    this.sourceField("note-effect-flags", flags);
    let flags2 = 0;
    if (this._versionNumber >= 400) {
      flags2 = this.data.readByte();
      this.sourceField("note-effect-flags2", flags2);
    }
    if ((flags & 1) !== 0) {
      this.readBend(note);
    }
    if ((flags & 16) !== 0) {
      this.readGrace(voice, note);
    }
    if ((flags2 & 4) !== 0) {
      this.readTremoloPicking(beat);
    }
    if ((flags2 & 8) !== 0) {
      this.readSlide(note);
    } else if (this._versionNumber < 400) {
      if ((flags & 4) !== 0) {
        note.slideOutType = 1 /* Shift */;
      }
    }
    if ((flags2 & 16) !== 0) {
      this.readArtificialHarmonic(note);
    }
    if ((flags2 & 32) !== 0) {
      this.readTrill(note);
    }
    note.isLetRing = (flags & 8) !== 0;
    note.isHammerPullOrigin = (flags & 2) !== 0;
    if ((flags2 & 64) !== 0) {
      note.vibrato = 1 /* Slight */;
    }
    note.isPalmMute = (flags2 & 2) !== 0;
    note.isStaccato = (flags2 & 1) !== 0;
  }
  static _bendStep = 25;
  readBend(note) {
    this.data.readByte();
    IOHelper.readInt32LE(this.data);
    const pointCount = IOHelper.readInt32LE(this.data);
    this._ensureLoopBoundary(pointCount, _Gp3To5Importer._maxBendPointCount, "note bend point count");
    if (pointCount > 0) {
      for (let i = 0; i < pointCount; i++) {
        const point = new BendPoint(0, 0);
        point.offset = IOHelper.readInt32LE(this.data);
        point.value = IOHelper.readInt32LE(this.data) / _Gp3To5Importer._bendStep | 0;
        GpBinaryHelpers.gpReadBool(this.data);
        note.addBendPoint(point);
      }
    }
  }
  readGrace(voice, note) {
    const graceBeat = new Beat();
    const graceNote = new Note();
    graceNote.string = note.string;
    graceNote.fret = IOHelper.readSInt8(this.data);
    graceBeat.duration = 32 /* ThirtySecond */;
    graceBeat.dynamics = this.toDynamicValue(IOHelper.readSInt8(this.data));
    const transition = IOHelper.readSInt8(this.data);
    switch (transition) {
      case 0:
        break;
      case 1:
        graceNote.slideOutType = 2 /* Legato */;
        graceNote.slideTarget = note;
        break;
      case 2:
        break;
      case 3:
        graceNote.isHammerPullOrigin = true;
        break;
    }
    graceNote.dynamics = graceBeat.dynamics;
    this.data.skip(1);
    if (this._versionNumber < 500) {
      graceBeat.graceType = 2 /* BeforeBeat */;
    } else {
      const flags = this.data.readByte();
      graceNote.isDead = (flags & 1) !== 0;
      graceBeat.graceType = (flags & 2) !== 0 ? 1 /* OnBeat */ : 2 /* BeforeBeat */;
    }
    voice.addGraceBeat(graceBeat);
    graceBeat.addNote(graceNote);
  }
  readTremoloPicking(beat) {
    const effect = new TremoloPickingEffect();
    beat.tremoloPicking = effect;
    effect.marks = this.data.readByte();
  }
  readSlide(note) {
    if (this._versionNumber >= 500) {
      const type = IOHelper.readSInt8(this.data);
      if ((type & 1) !== 0) {
        note.slideOutType = 1 /* Shift */;
      } else if ((type & 2) !== 0) {
        note.slideOutType = 2 /* Legato */;
      } else if ((type & 4) !== 0) {
        note.slideOutType = 4 /* OutDown */;
      } else if ((type & 8) !== 0) {
        note.slideOutType = 3 /* OutUp */;
      }
      if ((type & 16) !== 0) {
        note.slideInType = 1 /* IntoFromBelow */;
      } else if ((type & 32) !== 0) {
        note.slideInType = 2 /* IntoFromAbove */;
      }
    } else {
      const type = IOHelper.readSInt8(this.data);
      switch (type) {
        case 1:
          note.slideOutType = 1 /* Shift */;
          break;
        case 2:
          note.slideOutType = 2 /* Legato */;
          break;
        case 3:
          note.slideOutType = 4 /* OutDown */;
          break;
        case 4:
          note.slideOutType = 3 /* OutUp */;
          break;
        case -1:
          note.slideInType = 1 /* IntoFromBelow */;
          break;
        case -2:
          note.slideInType = 2 /* IntoFromAbove */;
          break;
      }
    }
  }
  readArtificialHarmonic(note) {
    const type = this.data.readByte();
    if (this._versionNumber >= 500) {
      switch (type) {
        case 1:
          note.harmonicType = 1 /* Natural */;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(note.fret);
          break;
        case 2:
          const harmonicTone = this.data.readByte();
          let harmonicKey = this.data.readByte();
          if (harmonicKey === 255) {
            harmonicKey = -1;
          }
          const harmonicOctaveOffset = this.data.readByte();
          const harmonicPitch = harmonicTone + harmonicKey;
          const playedPitch = (note.fret + note.stringTuning) % 12;
          let targetHarmonic = harmonicPitch + harmonicOctaveOffset * 12;
          if (targetHarmonic < playedPitch) {
            targetHarmonic += 12;
          }
          const deltaFrets = targetHarmonic - playedPitch;
          note.harmonicType = 2 /* Artificial */;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(deltaFrets);
          break;
        case 3:
          note.harmonicType = 4 /* Tap */;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(this.data.readByte());
          break;
        case 4:
          note.harmonicType = 3 /* Pinch */;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(12);
          break;
        case 5:
          note.harmonicType = 5 /* Semi */;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(12);
          break;
      }
    } else if (this._versionNumber >= 400) {
      switch (type) {
        case 1:
          note.harmonicType = 1 /* Natural */;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(note.fret);
          break;
        case 3:
          note.harmonicType = 4 /* Tap */;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(12);
          break;
        case 4:
          note.harmonicType = 3 /* Pinch */;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(12);
          break;
        case 5:
          note.harmonicType = 5 /* Semi */;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(12);
          break;
        case 15:
          note.harmonicType = 2 /* Artificial */;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(5);
          break;
        case 17:
          note.harmonicType = 2 /* Artificial */;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(7);
          break;
        case 22:
          note.harmonicType = 2 /* Artificial */;
          note.harmonicValue = ModelUtils.deltaFretToHarmonicValue(12);
          break;
      }
    }
  }
  readTrill(note) {
    note.trillValue = this.data.readByte() + note.stringTuning;
    switch (this.data.readByte()) {
      case 1:
        note.trillSpeed = 16 /* Sixteenth */;
        break;
      case 2:
        note.trillSpeed = 32 /* ThirtySecond */;
        break;
      case 3:
        note.trillSpeed = 64 /* SixtyFourth */;
        break;
    }
  }
};
var GpBinaryHelpers = class _GpBinaryHelpers {
  static gpReadColor(data, readAlpha = false) {
    const r = data.readByte();
    const g = data.readByte();
    const b = data.readByte();
    let a = 255;
    if (readAlpha) {
      a = data.readByte();
    } else {
      data.skip(1);
    }
    return new Color(r, g, b, a);
  }
  static gpReadBool(data) {
    return data.readByte() !== 0;
  }
  /**
   * Skips an integer (4byte) and reads a string using
   * a bytesize
   */
  static gpReadStringIntUnused(data, encoding, maxDecodingBufferSize) {
    data.skip(4);
    return _GpBinaryHelpers.gpReadString(data, data.readByte(), encoding, maxDecodingBufferSize);
  }
  /**
   * Reads an integer as size, and then the string itself
   */
  static gpReadStringInt(data, encoding, maxDecodingBufferSize) {
    return _GpBinaryHelpers.gpReadString(data, IOHelper.readInt32LE(data), encoding, maxDecodingBufferSize);
  }
  /**
   * Reads an integer as size, skips a byte and reads the string itself
   */
  static gpReadStringIntByte(data, encoding, maxDecodingBufferSize) {
    const length = IOHelper.readInt32LE(data) - 1;
    data.readByte();
    return _GpBinaryHelpers.gpReadString(data, length, encoding, maxDecodingBufferSize);
  }
  static gpReadString(data, length, encoding, maxDecodingBufferSize) {
    if (length > maxDecodingBufferSize) {
      throw new OverflowError(`Detected string exceeding maxDecodingBufferSize at offset ${data.position}`);
    }
    const b = new Uint8Array(length);
    data.read(b, 0, b.length);
    return IOHelper.toString(b, encoding);
  }
  static gpWriteString(data, s) {
    const encoded = IOHelper.stringToBytes(s);
    data.writeByte(s.length);
    data.write(encoded, 0, encoded.length);
  }
  /**
   * Reads a byte as size and the string itself.
   * Additionally it is ensured the specified amount of bytes is read.
   * @param data the data to read from.
   * @param length the amount of bytes to read
   * @param encoding The encoding to use to decode the byte into a string
   * @returns
   */
  static gpReadStringByteLength(data, length, encoding) {
    const stringLength = data.readByte();
    const fieldBytes = new Uint8Array(length);
    data.read(fieldBytes, 0, length);
    const effectiveLength = Math.min(stringLength, length);
    return IOHelper.toString(fieldBytes.subarray(0, effectiveLength), encoding);
  }
};
var MixTableChange = class {
  volume = -1;
  balance = -1;
  instrument = -1;
  tempoName = "";
  tempo = -1;
  duration = -1;
};

// third_party/alphatab/src/io/ByteBuffer.ts
var ByteBuffer = class _ByteBuffer {
  _buffer;
  length = 0;
  position = 0;
  get bytesWritten() {
    return this.position;
  }
  getBuffer() {
    return this._buffer;
  }
  static empty() {
    return _ByteBuffer.withCapacity(0);
  }
  static withCapacity(capacity) {
    const buffer = new _ByteBuffer();
    buffer._buffer = new Uint8Array(capacity);
    return buffer;
  }
  static fromBuffer(data) {
    const buffer = new _ByteBuffer();
    buffer._buffer = data;
    buffer.length = data.length;
    return buffer;
  }
  static fromString(contents) {
    const byteArray = IOHelper.stringToBytes(contents);
    return _ByteBuffer.fromBuffer(byteArray);
  }
  reset() {
    this.position = 0;
  }
  skip(offset) {
    this.position += offset;
  }
  readByte() {
    const n = this.length - this.position;
    if (n <= 0) {
      return -1;
    }
    return this._buffer[this.position++];
  }
  read(buffer, offset, count) {
    let n = this.length - this.position;
    if (n > count) {
      n = count;
    }
    if (n <= 0) {
      return 0;
    }
    buffer.set(this._buffer.subarray(this.position, this.position + n), offset);
    this.position += n;
    return n;
  }
  writeByte(value2) {
    const i = this.position + 1;
    this._ensureCapacity(i);
    this._buffer[this.position] = value2 & 255;
    if (i > this.length) {
      this.length = i;
    }
    this.position = i;
  }
  write(buffer, offset, count) {
    const i = this.position + count;
    this._ensureCapacity(i);
    const count1 = Math.min(count, buffer.length - offset);
    this._buffer.set(buffer.subarray(offset, offset + count1), this.position);
    if (i > this.length) {
      this.length = i;
    }
    this.position = i;
  }
  _ensureCapacity(value2) {
    if (value2 > this._buffer.length) {
      let newCapacity = value2;
      if (newCapacity < 256) {
        newCapacity = 256;
      }
      if (newCapacity < this._buffer.length * 2) {
        newCapacity = this._buffer.length * 2;
      }
      const newBuffer = new Uint8Array(newCapacity);
      if (this.length > 0) {
        newBuffer.set(this._buffer.subarray(0, 0 + this.length), 0);
      }
      this._buffer = newBuffer;
    }
  }
  readAll() {
    return this.toArray();
  }
  toArray() {
    const copy = new Uint8Array(this.length);
    copy.set(this._buffer.subarray(0, 0 + this.length), 0);
    return copy;
  }
  copyTo(destination) {
    destination.write(this._buffer, 0, this.length);
  }
};

// src/adapters/guitar-pro/work-budgets.ts
function jsonBytes(value2, maximum, code = "message-budget", location) {
  let bytes = 0;
  const add2 = (n) => {
    if ((bytes += n) > maximum) refuse(code, "Serialized source/report/result exceeds the explicit work budget; no partial output is admitted.", location);
  };
  const string = (s) => {
    add2(2);
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c === 34 || c === 92 || [8, 9, 10, 12, 13].includes(c)) add2(2);
      else if (c < 32) add2(6);
      else if (c < 128) add2(1);
      else if (c < 2048) add2(2);
      else if (c >= 55296 && c <= 56319 && i + 1 < s.length && s.charCodeAt(i + 1) >= 56320 && s.charCodeAt(i + 1) <= 57343) {
        add2(4);
        i++;
      } else if (c >= 55296 && c <= 57343) add2(6);
      else add2(3);
    }
  };
  const visit = (v) => {
    if (typeof v === "string") string(v);
    else if (v === null || typeof v === "boolean" || typeof v === "number") add2(typeof v === "number" && !Number.isFinite(v) ? 4 : String(v).length);
    else if (Array.isArray(v)) {
      add2(2 + Math.max(0, v.length - 1));
      for (const item of v) visit(item === void 0 ? null : item);
    } else if (v && typeof v === "object") {
      add2(2);
      let count = 0;
      for (const [key, item] of Object.entries(v)) if (item !== void 0) {
        if (count++) add2(1);
        string(key);
        add2(1);
        visit(item);
      }
    }
  };
  visit(value2);
  return bytes;
}
var BoundedFindings = class extends Array {
  #bytes = 2;
  push(...items) {
    for (const item of items) {
      const bytes = jsonBytes(item, limits.reportBytes - this.#bytes - (this.length ? 1 : 0), "report-budget", item.location);
      this.#bytes += bytes + (this.length ? 1 : 0);
      super.push(item);
    }
    return this.length;
  }
};

// src/adapters/guitar-pro/binary.ts
var headers = {
  "FICHIER GUITAR PRO v3.00": 300,
  "FICHIER GUITAR PRO v4.00": 400,
  "FICHIER GUITAR PRO v4.06": 406,
  "FICHIER GUITAR PRO L4.06": 406,
  "FICHIER GUITAR PRO v5.00": 500,
  "FICHIER GUITAR PRO v5.10": 510
};
var rhythmTypes = { 1: "whole", 2: "half", 4: "quarter", 8: "eighth", 16: "16th", 32: "32nd", 64: "64th" };
var dynamics = ["", "PPP", "PP", "P", "MP", "MF", "F", "FF", "FFF"];
function inferredPitch(midi) {
  if (midi < 12 || midi > 127) refuse("pitch-range", "Binary pitch outside the written/reference MIDI profile.");
  const [step, alter] = [
    ["C", 0],
    ["C", 1],
    ["D", 0],
    ["D", 1],
    ["E", 0],
    ["F", 0],
    ["F", 1],
    ["G", 0],
    ["G", 1],
    ["A", 0],
    ["A", 1],
    ["B", 0]
  ][midi % 12];
  return { step, alter, octave: Math.floor(midi / 12) - 1, midi, origin: "inferred" };
}
var BoundedInput = class extends ThrowingReadable {
  constructor(bytes, at) {
    super(ByteBuffer.fromBuffer(bytes));
    this.at = at;
  }
  require(count) {
    if (!Number.isSafeInteger(count) || count < 0 || count > this.length - this.position) refuse("binary-truncated", "Read/skip exceeds immutable binary input.", { ...this.at(), byteOffset: this.position });
  }
  get position() {
    return super.position;
  }
  set position(value2) {
    if (!Number.isSafeInteger(value2) || value2 < 0 || value2 > this.length) refuse("binary-truncated", "Binary reader attempted an out-of-range cursor.", { ...this.at(), byteOffset: super.position });
    super.position = value2;
  }
  readByte() {
    this.require(1);
    return super.readByte();
  }
  read(buffer, offset, count) {
    this.require(count);
    return super.read(buffer, offset, count);
  }
  skip(count) {
    this.require(count);
    super.skip(count);
  }
};
var CapturingReader = class extends Gp3To5Importer {
  constructor(bytes, version, selected, discovery = false) {
    super();
    this.bytes = bytes;
    this.version = version;
    this.selected = selected;
    this.discovery = discovery;
    this.onSourceField = (name, value2, byteOffset, byteLength) => {
      const source = { ...this.frame.source, path: `${this.frame.source.path}/${name}`, byteOffset, byteLength };
      this.frame.facts[name] = value2;
      if (this.frame.facts === this.globals || /^\/tracks\/\d$/.test(this.frame.source.path ?? "")) this.fieldLocations.set(source.path, source);
      if (!discovery) this.record({ kind: "field", source, dataBase64: bytes.subarray(byteOffset, byteOffset + byteLength).base64(), facts: { value: value2 } });
      this.guard(name, value2, source);
    };
  }
  records = [];
  tracks = /* @__PURE__ */ new Map();
  masters = [];
  beats = /* @__PURE__ */ new Map();
  notes = /* @__PURE__ */ new Map();
  mixes = /* @__PURE__ */ new Map();
  globals = {};
  fieldLocations = /* @__PURE__ */ new Map();
  frame = { source: { member: "input", path: "/header" }, facts: this.globals };
  trackOrdinal = 0;
  masterOrdinal = 0;
  totalBeats = 0;
  totalNotes = 0;
  captureBytes = 2;
  get position() {
    return this.data.position;
  }
  get location() {
    return this.frame.source;
  }
  requested(source = this.frame.source) {
    return !this.discovery && (!this.selected || source.trackId === void 0 || this.selected.has(source.trackId));
  }
  record(record) {
    if (this.records.length >= limits.binaryRecords) refuse("capture-budget", "Binary record count exceeds the source-capture budget.", record.source);
    this.captureBytes += jsonBytes(record, limits.captureBytes - this.captureBytes, "capture-budget", record.source) + (this.records.length ? 1 : 0);
    this.records.push(record);
  }
  guard(name, value2, source) {
    const reject = (message, code = "binary-feature") => refuse(code, message, source);
    if (!Number.isSafeInteger(value2)) reject("Noninteger binary field.", "binary-field");
    if (name === "bar-count" && (value2 < 1 || value2 > limits.measures)) reject("Binary measure count exceeds the profile.", "measure-budget");
    if (name === "track-count" && (value2 < 1 || value2 > limits.tracks)) reject("Binary track count exceeds the profile.", "track-scope");
    if (name === "beat-count") {
      if (value2 < 0 || value2 > limits.occurrences || (this.totalBeats += value2) > limits.occurrences) reject("Binary expanded beat count exceeds the profile.", "occurrence-budget");
    }
    if (name === "string-count" && (value2 < 1 || value2 > 7)) reject("Binary string count is outside its encoded capacity.", "tuning");
    if (name === "channel" && (value2 < 1 || value2 > 64)) reject("Unresolved MIDI channel.", "instrument");
    if (this.discovery) return;
    if (name.startsWith("lyrics-present:") && value2 && (!this.selected || this.selected.has(String(this.frame.facts["lyrics-track"])))) reject("Nonempty selected-track lyrics require an export mapping.", "lyrics");
    if (name === "navigation" && value2 !== -1) reject("Navigation jumps/targets are outside the simple-repeat profile.");
    if (["global-triplet-feel", "triplet-feel", "alternate-endings", "initial-octave"].includes(name) && value2 !== 0)
      reject("Swing/endings/global octave interpretation requires an exercised mapping.");
    if (name === "initial-tempo" && (value2 < 1 || value2 > 1e3)) reject("Initial quarter tempo outside the profile.", "tempo-rate");
    if (name === "initial-key" && (value2 < -7 || value2 > 7)) reject("Initial key outside the profile.", "key");
    if (name === "key-fifths" && (value2 < -7 || value2 > 7) || name === "key-mode" && ![0, 1].includes(value2)) reject("Encoded key outside profile.", "key");
    if (name === "hide-tempo" && ![0, 1].includes(value2)) reject("Tempo visibility requires an encoded boolean.", "boolean");
    if (name === "track-separator" && value2) reject("Unreviewed track separator.", "binary-field");
    if (name === "bar-line-break" && ![0, 1, 2].includes(value2)) reject("Unknown binary layout break.", "binary-field");
    if (name === "string-count" && (value2 < 1 || value2 > 7)) reject("Binary string count is outside its encoded capacity.", "tuning");
    if (name === "channel" && (value2 < 1 || value2 > 64)) reject("Unresolved MIDI channel.", "instrument");
    if (name === "mix-tempo" && value2 !== -1 && (value2 < 1 || value2 > 1e3)) reject("Mixer tempo outside profile.", "tempo-rate");
    if (name === "mix-duration" && value2 !== 0) reject("Global tempo ramp requires a mapping, including in an excluded track.", "automation");
    if (name === "mix-hide-tempo" && ![0, 1].includes(value2)) reject("Mixer visibility requires a boolean.", "boolean");
    if (!this.requested(source)) return;
    if (name === "track-flags" && value2 & 119) reject("Percussion/doubled strings, solo/mute or unknown track flags are outside the bass profile.");
    if (name === "string-count" && value2 < 4) reject("Selected bass requires 4\u20137 explicit strings.", "tuning");
    if (name === "capo" && value2) reject("Active capo requires a separate pitch convention.", "capo");
    if (name === "automatic-midi" && value2 & ~1) reject("Automatic let-ring/brush changes attacks or sustain.");
    if (["automatic-accent", "humanize", "sound-bank"].includes(name) && value2) reject("Active automatic accent/humanize or nonzero sound-bank requires a mapping.", "playback-profile");
    if (name === "clef-mode" && value2 !== 0 && value2 !== 12) reject("Unreviewed encoded clef mode.", "clef");
    if (name === "secondary-clef-mode" && value2 !== this.frame.facts["clef-mode"]) reject("Different primary/secondary clefs declare an unadmitted dual-staff layout.", "clef");
    if (name === "master-flags" && value2 & 16) reject("Alternate endings are outside the simple-repeat profile.", "repeat");
    if (name === "beat-flags" && value2 & 128) reject("Unknown beat flag.");
    if (name === "beat-status" && value2 !== 2) reject("Encoded empty/unknown beat status needs explicit silence semantics.");
    if (name === "duration-exponent" && (value2 < -2 || value2 > 4)) reject("Written rhythm outside whole\u201364th notes.", "rhythm");
    if (name === "tuplet" && ![3, 5, 6, 7, 9, 10, 11, 12, 13].includes(value2)) reject("Unexercised binary tuplet mapping.", "rhythm");
    if (name === "beat-flags2" && value2 & ~8207) reject("Ottava/unknown/secondary-beaming flags require a mapping.");
    if (name === "note-flags" && (value2 & ~56 || !(value2 & 32))) reject("Source note needs explicit type/fret; override/ghost/accent/fingers are unexercised.");
    if (name === "note-type" && ![1, 2, 3].includes(value2)) reject("Unknown source note type.");
    if (name === "note-fret" && this.frame.facts["note-type"] !== 2 && (value2 < 0 || value2 > 36)) reject("Fret outside the physical profile.", "physical-pitch");
    if (name === "note-dynamic" && (value2 < 1 || value2 > 8)) reject("Unknown encoded dynamic.", "dynamic");
    if (name === "note-flags2" && value2) reject("Unknown or unexercised accidental-swap note flag.");
    if (name === "note-effect-flags" && value2 & ~2) reject("Unexercised bend/slide/harmonic/mute/grace note effect.", "technique");
    if (name === "note-effect-flags2" && value2) reject("Unexercised note effect.", "technique");
    if (name.startsWith("mix-") && ["mix-instrument", "mix-volume", "mix-balance", "mix-chorus", "mix-reverb", "mix-phaser", "mix-tremolo", "mix-wah"].includes(name) && value2 !== -1) reject("Active non-tempo mixer changes require a mapping.", "automation");
    if (name === "mix-flags" && value2 & 192) reject("Unreviewed mixer wah/flag convention.", "automation");
  }
  scope(kind, coordinates, body) {
    const previous = this.frame, start = this.data.position;
    const frame = { source: { ...previous.source, ...coordinates, byteOffset: start }, facts: {} };
    this.frame = frame;
    try {
      const result = body();
      frame.source.byteLength = this.data.position - start;
      if (!this.discovery) this.record({
        kind,
        source: frame.source,
        facts: frame.facts,
        dataBase64: this.bytes.subarray(start, this.data.position).base64()
      });
      return { result, frame };
    } finally {
      this.frame = previous;
    }
  }
  readScoreInformation() {
    this.scope("metadata", { path: "/score-information" }, () => super.readScoreInformation());
  }
  readLyrics() {
    this.scope("metadata", { path: "/lyrics" }, () => super.readLyrics());
  }
  readPageSetup() {
    this.scope("metadata", { path: "/page-setup" }, () => super.readPageSetup());
  }
  readMasterBar() {
    const measure = ++this.masterOrdinal;
    const captured = this.scope("master-bar", { path: `/master-bars/${measure}`, measure }, () => super.readMasterBar());
    if (!this.discovery) this.masters.push(captured.frame);
  }
  readTrack() {
    const id = this.trackOrdinal++;
    this.tracks.set(id, this.scope("track", { path: `/tracks/${id}`, trackId: String(id) }, () => super.readTrack()).frame);
  }
  readBar(track) {
    this.scope("bar", {
      path: `/tracks/${track.index}/bars/${track.staves[0].bars.length + 1}`,
      trackId: String(track.index),
      measure: track.staves[0].bars.length + 1
    }, () => super.readBar(track));
  }
  readVoice(track, bar) {
    this.scope("voice", { path: `${this.frame.source.path}/voices/${bar.voices.length + 1}`, voice: bar.voices.length + 1 }, () => super.readVoice(track, bar));
  }
  readBeat(track, bar, voice) {
    const captured = this.scope("beat", { path: `${this.frame.source.path}/beats/${voice.beats.length + 1}`, beat: voice.beats.length + 1 }, () => super.readBeat(track, bar, voice));
    if (!this.discovery) this.beats.set(voice.beats.at(-1), captured.frame);
    const mask = captured.frame.facts["string-mask"], count = bar.staff.stringTuning.tunings.length;
    if (mask & ~((1 << count) - 1 << 7 - count)) refuse("physical-pitch", "String mask addresses absent strings.", captured.frame.source);
  }
  readNote(track, bar, voice, beat, stringIndex) {
    if (++this.totalNotes > limits.occurrences) refuse("occurrence-budget", "Expanded binary note count exceeds the profile.", this.frame.source);
    const captured = this.scope(
      "note",
      { path: `${this.frame.source.path}/strings/${stringIndex + 1}`, id: `${this.frame.source.path}/strings/${stringIndex + 1}` },
      () => super.readNote(track, bar, voice, beat, stringIndex)
    );
    captured.frame.facts["source-string"] = stringIndex + 1;
    if (!this.discovery) this.notes.set(captured.result, captured.frame);
    return captured.result;
  }
  readBeatEffects(beat) {
    if (this.requested() && (this.bytes[this.data.position] || this.version >= 400 && this.bytes[this.data.position + 1]))
      refuse("technique", "Beat-level attack/sustain effects require a mapping.", { ...this.frame.source, byteOffset: this.data.position });
    return this.scope("beat-effects", { path: `${this.frame.source.path}/effects` }, () => super.readBeatEffects(beat)).result;
  }
  readChord(beat) {
    this.scope("chord-diagram", { path: `${this.frame.source.path}/chord-diagram` }, () => super.readChord(beat));
  }
  readMixTableChange(beat) {
    const captured = this.scope("mix-table", { path: `${this.frame.source.path}/mix-table` }, () => super.readMixTableChange(beat));
    if (!this.discovery) this.mixes.set(beat, captured.frame);
  }
};
function recoverBeforeFinish(score, reader, findings) {
  const expected = [];
  let repeatOpen = false;
  for (let mi = 0; mi < score.masterBars.length; mi++) {
    const master = score.masterBars[mi], source = reader.masters[mi].source;
    if (master.isRepeatStart && repeatOpen || master.repeatCount && !repeatOpen && !master.isRepeatStart) refuse("repeat", "Simple repeats need an explicit unnested start.", source);
    if (master.isRepeatStart) repeatOpen = true;
    if (master.repeatCount) {
      if (master.repeatCount < 2 || master.repeatCount > 8) refuse("repeat", "Repeat count outside 2\u20138.", source);
      repeatOpen = false;
    }
    if (master.directions?.size || master.alternateEndings || master.isFreeTime) refuse("repeat", "Unadmitted navigation/free-time.", source);
  }
  if (repeatOpen) refuse("repeat", "Unclosed repeat.", reader.masters.at(-1).source);
  const parts = [];
  const tempos = [];
  for (const track of score.tracks) {
    const id = String(track.index), frame = reader.tracks.get(track.index);
    if (reader.selected && !reader.selected.has(id)) {
      findings.push({ disposition: "excluded-by-scope", code: "track-excluded", message: "Encoded track is excluded from requested output; original bytes and spans remain captured.", location: frame.source, fact: { trackId: id, name: track.name } });
      continue;
    }
    const staff = track.staves[0], highToLow = staff.stringTuning.tunings;
    const program = track.playbackInfo.program;
    if (track.staves.length !== 1 || staff.isPercussion || program < 24 || program > 39) refuse("instrument", "Binary admission requires an explicit fretted guitar/bass MIDI program 24\u201339.", frame.source);
    if (highToLow.length < 4 || highToLow.length > 7 || highToLow.some((pitch2, i) => pitch2 < 12 || pitch2 > 108 || i > 0 && pitch2 >= highToLow[i - 1]))
      refuse("tuning", "Expected complete descending high-to-low binary string tuning.", frame.source);
    const tuning = highToLow.slice().reverse();
    let key = { fifths: reader.globals["initial-key"], mode: "major" };
    let measureStart = q(0);
    const previousEvents = /* @__PURE__ */ new Map();
    const measures = staff.bars.map((bar, mi) => {
      const master = score.masterBars[mi], source = { ...reader.masters[mi].source, trackId: id };
      const beats = master.timeSignatureNumerator, unit = master.timeSignatureDenominator;
      if (beats < 1 || beats > 32 || unit < 1 || unit > 64 || unit & unit - 1) refuse("meter", "Binary meter outside profile.", source);
      const span = q(beats * 4, unit);
      const voices = bar.voices.map((voice, vi) => {
        let position = q(0);
        return voice.beats.map((beat) => {
          const raw = reader.beats.get(beat);
          if (!raw || beat.isEmpty) refuse("empty-voice", "Empty encoded beats need explicit silence semantics.", source);
          const dots = raw.facts["beat-flags"] & 1 ? 1 : 0;
          const denominator = 2 ** (raw.facts["duration-exponent"] + 2);
          const actual = raw.facts.tuplet;
          const normal = actual === 3 ? 2 : actual && actual <= 7 ? 4 : 8;
          const tuplet = actual ? { actual, normal } : void 0;
          const duration2 = mul(mul(q(4, denominator), q(dots ? 3 : 1, dots ? 2 : 1)), q(tuplet?.normal ?? 1, tuplet?.actual ?? 1));
          const sourceNotes = beat.notes.map((note) => {
            const rawNote = reader.notes.get(note);
            const string = rawNote.facts["source-string"], placeholder = rawNote.facts["note-fret"];
            let fret = placeholder;
            if (rawNote.facts["note-type"] === 2) {
              const previous = previousEvents.get(vi), origin = previous?.event.notes.find((n) => n.string === string);
              if (!origin || origin.kind !== "pitched" || !equal(previous.end, add(measureStart, position))) refuse("tie-conflict", "Binary tie destination needs an immediately preceding contiguous same-string pitched source origin.", rawNote.source);
              fret = origin.fret;
              findings.push({ disposition: "preserved", code: "binary-tie-fret", message: "Binary note-type2 inherits the preceding same-string effective fret; its serialized signed-byte fret is an unused placeholder, retained unchanged. This derives source encoding semantics, not a musical repair.", location: rawNote.source, fact: { rawPlaceholder: placeholder, effectiveFret: fret, origin: origin.source } });
            }
            const midi = highToLow[string - 1] + fret;
            const reference = inferredPitch(midi), written = inferredPitch(midi + 12);
            const dead = rawNote.facts["note-type"] === 3;
            const fact = {
              source: rawNote.source,
              id: rawNote.source.id,
              string,
              fret,
              kind: dead ? "dead" : "pitched",
              sounding: dead ? null : reference,
              written,
              ...dead ? { referenceSounding: reference } : {},
              tieStart: false,
              tieStop: rawNote.facts["note-type"] === 2,
              ...rawNote.facts["note-effect-flags"] & 2 ? { sourceHopoOrigin: true } : {}
            };
            return { note, fact, dynamic: rawNote.facts["note-dynamic"] };
          });
          const levels = [...new Set(sourceNotes.map((note) => note.dynamic).filter((value2) => value2 !== void 0))];
          if (levels.length > 1) refuse("dynamic", "Conflicting per-note chord dynamics cannot become one mark.", raw.source);
          const event = {
            source: raw.source,
            id: raw.source.path,
            start: position,
            duration: duration2,
            type: rhythmTypes[denominator],
            dots,
            ...tuplet ? { tuplet } : {},
            notes: sourceNotes.map((note) => note.fact),
            fullMeasureRest: !sourceNotes.length && voice.beats.length === 1 && equal(duration2, span),
            ...levels.length ? { dynamic: dynamics[levels[0]] } : {},
            ...beat.text ? { text: beat.text } : {}
          };
          const mix = reader.mixes.get(beat);
          if (mix && mix.facts["mix-tempo"] >= 0) tempos.push({ source: mix.source, measure: mi, position, rate: String(mix.facts["mix-tempo"]), reference: 2, unit: "quarter", dots: 0, quarterRate: mix.facts["mix-tempo"], visible: !mix.facts["mix-hide-tempo"] });
          for (const note of sourceNotes) expected.push({ note: note.note, fact: note.fact, event });
          previousEvents.set(vi, { event, end: add(measureStart, add(position, duration2)) });
          position = add(position, duration2);
          return event;
        });
      });
      const populated = voices.filter((voice) => voice.length);
      if (!populated.length) refuse("empty-measure", "An entirely empty binary measure needs explicit silence admission.", source);
      const totals = populated.map((voice) => voice.reduce((sum, event) => add(sum, event.duration), q(0)));
      const pickup = mi === 0 && totals[0].n * span.d < span.n * totals[0].d;
      const duration = pickup ? totals[0] : span;
      if (!totals.every((total) => equal(total, duration))) refuse("measure-duration", "Active binary voices must fill the exact common span.", source);
      const masterFields = reader.masters[mi].facts;
      if (masterFields["key-fifths"] !== void 0) key = { fifths: masterFields["key-fifths"], mode: masterFields["key-mode"] ? "minor" : "major" };
      const encodedClef = frame.facts["clef-mode"];
      const clef = encodedClef === 0 ? "G2" : encodedClef === 12 ? "F4" : program < 32 ? "G2" : highToLow.at(-1) < 35 ? "F4" : "G2";
      measureStart = add(measureStart, duration);
      return {
        source,
        time: { beats, unit },
        key: { ...key },
        clef,
        pickup,
        duration,
        voices,
        repeatStart: master.isRepeatStart,
        repeatEnd: master.repeatCount
      };
    });
    for (let vi = 0; vi < Math.max(...measures.map((measure) => measure.voices.length)); vi++) {
      const timeline = [];
      let start = q(0);
      for (const measure of measures) {
        for (const event of measure.voices[vi] ?? []) timeline.push({ event, start: add(start, event.start) });
        start = add(start, measure.duration);
      }
      for (let i = 0; i < timeline.length; i++) {
        const current = timeline[i], previous = timeline[i - 1], next = timeline[i + 1];
        for (const note of current.event.notes) {
          if (note.kind === "dead" && (note.tieStop || note.sourceHopoOrigin)) refuse("dead-relation", "Dead tie/HOPO is outside the profile.", note.source);
          if (note.tieStop) {
            const origin = previous?.event.notes.find((candidate) => candidate.string === note.string);
            if (!origin || origin.kind !== "pitched" || origin.fret !== note.fret || origin.sounding?.midi !== note.sounding?.midi || !equal(add(previous.start, previous.event.duration), current.start)) refuse("tie-conflict", "Raw binary tie destination has no matching contiguous physical origin; reader repairs are refused.", note.source);
            origin.tieStart = true;
            findings.push({ disposition: "inferred", code: "binary-tie-origin", message: "Destination-only encoded tie implies the validated contiguous same-string origin; raw destination type/fret bytes remain unchanged.", location: note.source, fact: { origin: origin.source } });
          }
          if (note.sourceHopoOrigin) {
            const target = next?.event.notes.find((candidate) => candidate.string === note.string);
            if (!target || target.kind !== "pitched" || target.fret === note.fret || !equal(add(current.start, current.event.duration), next.start) || current.event.notes.filter((candidate) => candidate.sourceHopoOrigin).length > 1)
              refuse("hopo-conflict", "Binary HOPO origin needs one contiguous same-string changed-fret destination.", note.source);
            const kind = target.fret > note.fret ? "hammer-on" : "pull-off";
            note.hopoStart = kind;
            target.hopoStop = kind;
            note.hopoNumber = target.hopoNumber = vi + 1;
            findings.push({ disposition: "inferred", code: "binary-hopo-endpoint", message: "Encoded origin-only HOPO supplies a validated next-beat endpoint and fret-direction classification; source flags remain separate.", location: note.source, fact: { destination: target.source, kind } });
          }
        }
      }
    }
    const family = program < 32 ? "guitar" : "bass", rule = `gp3-5-${family}-register/0`;
    findings.push({ disposition: "inferred", code: "binary-written-register", message: `GP3\u20135 ${family} notation convention writes one octave above physical sounding MIDI, with MusicXML octave transpose -1. This is generated versioned representation (${rule}), not encoded chromatic transpose or another actual-pitch shift; producer display fidelity remains unverified.`, location: frame.source, fact: { program, transposeOctaves: -1, rule } });
    findings.push({ disposition: "inferred", code: "binary-pitch-spelling", message: "Binary tuning/fret supplies sounding MIDI, not full spelling. Sharp-based written/reference spelling is generated; raw key and clef fields remain separate.", location: frame.source });
    if (reader.version < 500) findings.push({ disposition: "inferred", code: "binary-clef", message: "No explicit main clef field is encoded in this profile; guitar uses conventional treble, while bass uses a located low-tuning reference-clef rule. It is not source staff/hand identity.", location: frame.source, fact: { family } });
    findings.push({ disposition: "preserved", code: "binary-voice-slots", message: "Encoded voice slots, including zero-beat secondary voices, are retained without generating rests or attacks.", location: frame.source, fact: { voiceCounts: measures.map((measure) => measure.voices.map((voice) => voice.length)) } });
    parts.push({ source: frame.source, id, name: track.name, instrument: family, midiProgram: program, tuning, transposeOctaves: -1, measures });
  }
  if (!parts.length || reader.selected && [...reader.selected].some((id) => !reader.tracks.has(Number(id)))) refuse("track-selection", "Requested binary track ID is absent.", { member: "input" });
  if (parts.some((part) => !equal(part.measures[0].duration, parts[0].measures[0].duration))) refuse("pickup-span", "Selected tracks need one exact pickup span.", { member: "input" });
  for (const [beat, mix] of reader.mixes) if (reader.selected && !reader.selected.has(mix.source.trackId) && mix.facts["mix-tempo"] >= 0) {
    let position = q(0);
    for (const prior of beat.voice.beats) {
      if (prior === beat) break;
      const raw = reader.beats.get(prior), exponent = raw.facts["duration-exponent"], actual = raw.facts.tuplet;
      if (!raw || prior.isEmpty || exponent < -2 || exponent > 4 || actual && ![3, 5, 6, 7, 9, 10, 11, 12, 13].includes(actual)) refuse("tempo-source-clock", "Excluded track global tempo needs an admitted exact written prefix clock.", mix.source);
      const normal = actual === 3 ? 2 : actual && actual <= 7 ? 4 : 8;
      position = add(position, mul(mul(q(4, 2 ** (exponent + 2)), q(raw.facts["beat-flags"] & 1 ? 3 : 1, raw.facts["beat-flags"] & 1 ? 2 : 1)), q(actual ? normal : 1, actual ?? 1)));
    }
    const measure = mix.source.measure - 1, span = parts[0].measures[measure].duration;
    if (position.n * span.d >= span.n * position.d) refuse("tempo-position", "Global tempo in excluded track lies outside the selected common measure.", mix.source);
    tempos.push({ source: mix.source, measure, position, rate: String(mix.facts["mix-tempo"]), reference: 2, unit: "quarter", dots: 0, quarterRate: mix.facts["mix-tempo"], visible: !mix.facts["mix-hide-tempo"] });
    findings.push({ disposition: "preserved", code: "binary-excluded-global-tempo", message: "Global tempo is retained even though its containing track is excluded from musical output; position is reconstructed from original written prefix fields.", location: mix.source });
  }
  const tempo = reader.globals["initial-tempo"];
  const initial = {
    source: reader.records.find((record) => record.source.path === "/header/initial-tempo").source,
    measure: 0,
    position: q(0),
    rate: String(tempo),
    reference: 2,
    unit: "quarter",
    dots: 0,
    quarterRate: tempo,
    visible: !reader.globals["hide-tempo"]
  };
  const unique = /* @__PURE__ */ new Map();
  for (const change of [initial, ...tempos]) {
    const key = `${change.measure}:${change.position.n}/${change.position.d}`, previous = unique.get(key);
    if (previous && previous.rate !== change.rate) {
      if (previous !== initial) refuse("tempo-conflict", "Concurrent source tracks encode conflicting common tempo.", change.source);
    }
    if (previous && previous !== initial && previous.visible !== change.visible) refuse("tempo-conflict", "Concurrent tempo records disagree about visibility.", change.source);
    unique.set(key, change);
  }
  const neutral = { title: score.title, parts, tempos: [...unique.values()].sort((a, b) => a.measure - b.measure || a.position.n * b.position.d - b.position.n * a.position.d) };
  return { score: neutral, expected };
}
function loadBinary(input, findings, trackIds, discovery = false) {
  const bytes = Bytes.view(input);
  if (bytes.length < 31 || bytes[0] > 30) refuse("binary-header", "Expected a complete fixed-width Guitar Pro header.", { member: "input", byteOffset: 0 });
  const header = bytes.subarray(1, 1 + bytes[0]).ascii(), version = headers[header];
  if (!version) refuse("version-profile", "Only documented whole-score GP3.00/GP4.00/GP4.06/L4.06/GP5.00/GP5.10 binary headers are admitted; clipboard/unknown versions require explicit support.", { member: "input", byteOffset: 0, byteLength: 31 });
  if (trackIds && (!trackIds.length || new Set(trackIds).size !== trackIds.length || trackIds.some((id) => !/^[0-7]$/.test(id)))) refuse("track-selection", "Expected distinct zero-based encoded track ordinals0\u20137.");
  const reader = new CapturingReader(bytes, version, trackIds ? new Set(trackIds) : void 0, discovery);
  reader.init(new BoundedInput(bytes, () => reader.location), new Settings());
  let prepared;
  let rawScore;
  reader.onBeforeFinish = (score) => {
    rawScore = score;
    if (discovery) throw new DiscoveryComplete();
    prepared = recoverBeforeFinish(score, reader, findings);
  };
  Logger.logLevel = 0 /* None */;
  try {
    reader.readScore();
  } catch (error) {
    if (error instanceof DiscoveryComplete) {
    } else if (error instanceof Refusal) throw error;
    else refuse("binary-truncated", "Binary reader encountered truncated or malformed bounded input.", { member: "input" });
  }
  if (!rawScore || !discovery && !prepared) refuse("reader", "Binary reader did not provide pre-normalization source capture.");
  if (reader.position > bytes.length) refuse("binary-truncated", "Reader cursor exceeded binary input.", { member: "input", byteOffset: bytes.length });
  if (reader.position !== bytes.length) {
    const expectedPadding = version === 300 ? 4 : 0;
    const tail = bytes.subarray(reader.position);
    if (tail.length !== expectedPadding || tail.some((byte) => byte !== 0)) refuse("binary-trailing", "Unaccounted bytes follow the complete binary score.", { member: "input", byteOffset: reader.position });
    if (!discovery) reader.records.push({ kind: "serialization-padding", source: { member: "input", byteOffset: reader.position, byteLength: tail.length }, dataBase64: tail.base64(), facts: {} });
    findings.push({ disposition: "preserved", code: "binary-final-padding", message: "Reviewed zero footer/separator bytes are retained as serialization padding, not musical events.", location: { member: "input", byteOffset: reader.position, byteLength: tail.length } });
  }
  return { reader, header, version, prepared, rawScore };
}
var DiscoveryComplete = class {
};
function readBinary(input, findings, trackIds) {
  const { reader, header, version, prepared } = loadBinary(input, findings, trackIds);
  const occurrences = prepared.expected.map(({ note, fact, event }) => {
    const reference = fact.sounding ?? fact.referenceSounding;
    const sourceCount = reader.tracks.get(Number(fact.source.trackId)).facts["string-count"];
    const beforeString = sourceCount - fact.string + 1;
    if (note.fret !== fact.fret || note.string !== beforeString || note.realValue !== reference.midi || note.isDead !== (fact.kind === "dead") || note.isTieDestination !== fact.tieStop)
      refuse("reader-reconciliation", "Normalized binary reader disagrees with immutable physical/type/tie facts.", fact.source);
    return {
      source: fact.source,
      rhythmId: event.id + "/rhythm",
      noteId: fact.id,
      before: { fret: reader.notes.get(note).facts["note-fret"], string: beforeString, tieDestination: fact.tieStop },
      after: { fret: note.fret, string: note.string, tieDestination: note.isTieDestination, soundingMidi: reference.midi, playbackTicks: note.beat.playbackDuration }
    };
  });
  findings.push({ disposition: "preserved", code: "binary-source-reconciled", message: "Original numeric flags/spans are captured before normalization; exact written clocks and physical/type/tie facts reconcile with the borrowed reader. Track IDs are stable encoded ordinals, not inferred performing roles.", location: { member: "input" }, fact: { header, version, noteOccurrences: occurrences.length } });
  findings.push({ disposition: "omitted", code: "binary-metadata-playback", message: "Original metadata/page/lyrics/chord-diagram and playback setup bytes remain captured. Synth timbre, page appearance and inactive display settings are not reapplied; unknown selected musical meaning is refused.", location: { member: "input" } });
  return freeze({ score: prepared.score, occurrences, capture: { header, version, sourceEncoding: "windows-1252-with-explicit-BOM-detection", records: reader.records } });
}
function readBinaryMetadata(input, findings) {
  const { reader, header, version, rawScore } = loadBinary(input, findings, void 0, true);
  return { header, version, tracks: rawScore.tracks.map((track) => {
    const frame = reader.tracks.get(track.index), path = frame.source.path, channel = frame.facts["channel"] - 1;
    const first = reader.fieldLocations.get(path + "/tuning:0");
    return {
      sourceId: String(track.index),
      sourceLocation: frame.source,
      name: track.name,
      nameLocation: reader.fieldLocations.get(path + "/track-name-length"),
      program: reader.globals["channel-program:" + channel],
      programLocation: reader.fieldLocations.get("/header/channel-program:" + channel),
      tuning: Array.from({ length: frame.facts["string-count"] }, (_, i) => frame.facts["tuning:" + i]),
      tuningLocation: { ...first, byteLength: frame.facts["string-count"] * 4 },
      facts: frame.facts
    };
  }) };
}

// third_party/alphatab/src/io/BitReader.ts
var BitReader = class _BitReader {
  static _byteSize = 8;
  _currentByte = 0;
  _position = _BitReader._byteSize;
  _source;
  constructor(source) {
    this._source = source;
  }
  readByte() {
    return this.readBits(8);
  }
  readBytes(count) {
    const bytes = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      bytes[i] = this.readByte() & 255;
    }
    return bytes;
  }
  readBits(count) {
    let bits = 0;
    let i = count - 1;
    while (i >= 0) {
      bits = bits | this.readBit() << i;
      i--;
    }
    return bits;
  }
  readBitsReversed(count) {
    let bits = 0;
    for (let i = 0; i < count; i++) {
      bits = bits | this.readBit() << i;
    }
    return bits;
  }
  readBit() {
    if (this._position >= 8) {
      this._currentByte = this._source.readByte();
      if (this._currentByte === -1) {
        throw new EndOfReaderError();
      }
      this._position = 0;
    }
    const value2 = this._currentByte >> _BitReader._byteSize - this._position - 1 & 1;
    this._position++;
    return value2;
  }
  readAll() {
    const all = ByteBuffer.empty();
    try {
      while (true) {
        all.writeByte(this.readByte() & 255);
      }
    } catch (e) {
      if (!(e instanceof EndOfReaderError)) {
        throw e;
      }
    }
    return all.toArray();
  }
};

// third_party/alphatab/src/importer/GpxFileSystem.ts
var GpxFile = class {
  fileName = "";
  fileSize = 0;
  data = null;
};
var GpxFileSystem = class {
  static HeaderBcFs = "BCFS";
  static HeaderBcFz = "BCFZ";
  /**
   * You can set a file filter method using this setter. On parsing
   * the filestructure this function can determine based on the filename
   * whether this file will be available after loading.
   * This way we can reduce the amount of memory we store.
   */
  fileFilter;
  /**
   * Gets the list of files stored in this FileSystem.
   */
  files = [];
  /**
   * Creates a new GpxFileSystem instance
   */
  constructor() {
    this.files = [];
    this.fileFilter = (_) => {
      return true;
    };
  }
  /**
   * Load a complete FileSystem to the memory.
   * @param s the binary source to read from.
   * @returns
   */
  load(s) {
    const src = new BitReader(s);
    this._readBlock(src);
  }
  /**
   * Reads the 4 byte header as a string.
   * @param src the BitInput to read from
   * @returns a string with 4 characters representing the header.
   */
  readHeader(src) {
    return this._getString(src.readBytes(4), 0, 4);
  }
  /**
   * Decompresses the given bitinput using the GPX compression format. Only use this method
   * if you are sure the binary data is compressed using the GPX format. Otherwise unexpected
   * behavior can occure.
   * @param src the bitInput to read the data from
   * @param skipHeader true if the header should NOT be included in the result byteset, otherwise false
   * @returns the decompressed byte data. if skipHeader is set to false the BCFS header is included.
   */
  decompress(src, skipHeader = false) {
    const uncompressed = ByteBuffer.empty();
    let buffer;
    const expectedLength = this._getInteger(src.readBytes(4), 0);
    try {
      while (uncompressed.length < expectedLength) {
        const flag2 = src.readBits(1);
        if (flag2 === 1) {
          const wordSize = src.readBits(4);
          const offset = src.readBitsReversed(wordSize);
          const size = src.readBitsReversed(wordSize);
          const sourcePosition = uncompressed.length - offset;
          const toRead = Math.min(offset, size);
          buffer = uncompressed.getBuffer();
          uncompressed.write(buffer, sourcePosition, toRead);
        } else {
          const size = src.readBitsReversed(2);
          for (let i = 0; i < size; i++) {
            uncompressed.writeByte(src.readByte());
          }
        }
      }
    } catch (e) {
      if (!(e instanceof EndOfReaderError)) {
        throw e;
      }
    }
    buffer = uncompressed.getBuffer();
    const resultOffset = skipHeader ? 4 : 0;
    const resultSize = uncompressed.length - resultOffset;
    const result = new Uint8Array(resultSize);
    const count = resultSize;
    result.set(buffer.subarray(resultOffset, resultOffset + count), 0);
    return result;
  }
  /**
   * Reads a block from the given data source.
   * @param data the data source
   * @returns
   */
  _readBlock(data) {
    const header = this.readHeader(data);
    if (header === "BCFZ") {
      this._readUncompressedBlock(this.decompress(data, true));
    } else if (header === "BCFS") {
      this._readUncompressedBlock(data.readAll());
    } else {
      throw new UnsupportedFormatError("Unsupported format");
    }
  }
  /**
   * Reads an uncompressed data block into the model.
   * @param data the data store to read from.
   */
  _readUncompressedBlock(data) {
    const sectorSize = 4096;
    let offset = sectorSize;
    while (offset + 3 < data.length) {
      const entryType = this._getInteger(data, offset);
      if (entryType === 2) {
        const file = new GpxFile();
        file.fileName = this._getString(data, offset + 4, 127);
        file.fileSize = this._getInteger(data, offset + 140);
        const storeFile = !this.fileFilter || this.fileFilter(file.fileName);
        if (storeFile) {
          this.files.push(file);
        }
        const dataPointerOffset = offset + 148;
        let sector = 0;
        let sectorCount = 0;
        const fileData = storeFile ? ByteBuffer.withCapacity(file.fileSize) : null;
        while (true) {
          sector = this._getInteger(data, dataPointerOffset + 4 * sectorCount++);
          if (sector !== 0) {
            offset = sector * sectorSize;
            if (storeFile) {
              fileData.write(data, offset, sectorSize);
            }
          } else {
            break;
          }
        }
        if (storeFile) {
          file.data = new Uint8Array(Math.min(file.fileSize, fileData.length));
          const raw = fileData.toArray();
          file.data.set(raw.subarray(0, 0 + file.data.length), 0);
        }
      }
      offset += sectorSize;
    }
  }
  /**
   * Reads a zeroterminated ascii string from the given source
   * @param data the data source to read from
   * @param offset the offset to start reading from
   * @param length the max length to read
   * @returns the ascii string read from the datasource.
   */
  _getString(data, offset, length) {
    let buf = "";
    for (let i = 0; i < length; i++) {
      const code = data[offset + i] & 255;
      if (code === 0) {
        break;
      }
      buf += String.fromCharCode(code);
    }
    return buf;
  }
  /**
   * Reads an 4 byte signed integer from the given source
   * @param data the data source to read from
   * @param offset offset the offset to start reading from
   * @returns
   */
  _getInteger(data, offset) {
    return data[offset + 3] << 24 | data[offset + 2] << 16 | data[offset + 1] << 8 | data[offset];
  }
};

// src/adapters/guitar-pro/gpx.ts
function readGpx(input, captureRaw = true) {
  const b = Bytes.view(input);
  const fail = (message, byteOffset = 0) => refuse("gpx", message, { member: "container", byteOffset });
  if (b.length > limits.inputBytes || b.length < 4) fail("GPX input size outside the profile.");
  const format = b.subarray(0, 4).ascii();
  let decoded = b, literalBlocks = 0, backreferenceBlocks = 0, finalZeroPaddingBytes = 0;
  if (format === "BCFZ") {
    if (b.length < 8) fail("Truncated GPX length.");
    const size = b.readUInt32LE(4);
    if (size < 8196 || size > limits.decodedBytes || size > b.length * limits.compressionRatio)
      fail("GPX declared expansion exceeds the decoded-size/work budget.", 4);
    decoded = new Bytes(size);
    let bit = 64, written = 0, blocks = 0;
    const readBit = () => {
      if (bit >= b.length * 8) fail("Truncated GPX compressed block.", bit >> 3);
      return b[bit >> 3] >> 7 - bit++ % 8 & 1;
    };
    const readBits = (count, reversed = false) => {
      let value2 = 0;
      for (let i = 0; i < count; i++) {
        const next = readBit();
        value2 = reversed ? value2 | next << i : value2 * 2 + next;
      }
      return value2;
    };
    while (written < size) {
      if (++blocks > limits.decodedBytes) fail("GPX compressed-block work exceeds the budget.", bit >> 3);
      if (readBit()) {
        const width = readBits(4), offset = readBits(width, true), length = readBits(width, true);
        const count = Math.min(offset, length);
        if (!width || !offset || !length || offset > written || written + count > size)
          fail("Invalid, zero-progress or overlong GPX backreference.", bit >> 3);
        decoded.copy(decoded, written, written - offset, written - offset + count);
        written += count;
        backreferenceBlocks++;
      } else {
        const count = readBits(2, true);
        if (!count) fail("Invalid zero-progress GPX literal block.", bit >> 3);
        for (let i = 0; i < count; i++) {
          const value2 = readBits(8);
          if (written < size) decoded[written++] = value2;
          else {
            if (value2 || ++finalZeroPaddingBytes > 2) fail("Nonzero or excessive final GPX literal padding.", bit >> 3);
          }
        }
        literalBlocks++;
      }
    }
    if (Math.ceil(bit / 8) !== b.length) fail("Trailing GPX compressed bytes.", bit >> 3);
    while (bit < b.length * 8) if (readBit()) fail("Nonzero GPX padding bits.", bit >> 3);
  } else if (format !== "BCFS") fail("Expected BCFS or BCFZ GPX magic.");
  if (decoded.subarray(0, 4).ascii() !== "BCFS") fail("Compressed GPX must decode to BCFS.");
  const body = decoded.subarray(4), sectorSize = 4096;
  if (decoded.length > limits.decodedBytes || body.length < 8192 || body.length % sectorSize)
    fail("Truncated or oversized GPX sector storage.");
  const sectorCount = body.length / sectorSize, owned = /* @__PURE__ */ new Set([0]);
  const names = /* @__PURE__ */ new Set(), members = /* @__PURE__ */ new Map(), captures = [];
  let sector = 1, total = 0;
  let rootDirectorySectors;
  const fileDirectories = [];
  while (sector < sectorCount) {
    if (owned.has(sector)) {
      sector++;
      continue;
    }
    owned.add(sector);
    const at = sector * sectorSize, type = body.readUInt32LE(at);
    if (type === 1) {
      if (rootDirectorySectors || sector !== 1 || body[at + 4] !== 47 || body[at + 5] !== 0) fail("Only one flat GPX root directory is admitted.", at + 4);
      const size = body.readUInt32LE(at + 140), pointer = body.readUInt32LE(at + 148);
      if (!size || size % 4 || size > limits.entries * 4 || pointer <= sector || pointer >= sectorCount || body.readUInt32LE(at + 152) !== 0)
        fail("Invalid GPX root child table.", at + 144);
      owned.add(pointer);
      rootDirectorySectors = [];
      for (let i = 0; i < size / 4; i++) {
        const child2 = body.readUInt32LE(pointer * sectorSize + i * 4);
        if (child2 <= sector || child2 >= sectorCount || owned.has(child2) || rootDirectorySectors.includes(child2)) fail("Invalid or duplicate GPX root child pointer.", 4 + pointer * sectorSize + i * 4);
        rootDirectorySectors.push(child2);
      }
      sector++;
      continue;
    }
    if (type !== 2) {
      const unused = body.subarray(at, at + sectorSize);
      if (!unused.every((byte) => byte === 0) && !unused.every((byte) => byte === 255)) fail("Unreviewed GPX directory/sector type.", at + 4);
      sector++;
      continue;
    }
    if (members.size >= limits.entries) fail("GPX member count exceeds the profile.", at + 4);
    const field = body.subarray(at + 4, at + 131), end = field.indexOf(0);
    if (end < 1) fail("GPX member name lacks a bounded terminator.", at + 8);
    const name = field.subarray(0, end).ascii();
    if (field.subarray(0, end).some((byte) => byte > 127) || !/^[A-Za-z0-9_.-]{1,120}$/.test(name) || name === "." || name === ".." || names.has(name.toLowerCase()))
      fail("Unsafe, duplicate or ambiguous GPX member name.", at + 8);
    fileDirectories.push(sector);
    names.add(name.toLowerCase());
    const bytes = body.readUInt32LE(at + 140);
    total += bytes;
    if (bytes > limits.memberBytes || total > limits.decodedBytes) fail("GPX member/total decoded bytes exceed the profile.", at + 144);
    const count = Math.ceil(bytes / sectorSize);
    if (148 + (count + 1) * 4 > sectorSize) fail("GPX pointer table exceeds its directory sector.", at + 152);
    const pointers = [];
    let last = sector;
    for (let i = 0; i < count; i++) {
      const pointer = body.readUInt32LE(at + 148 + 4 * i);
      if (pointer <= last || pointer >= sectorCount || owned.has(pointer)) fail("Cyclic, overlapping or out-of-range GPX pointer.", at + 152 + 4 * i);
      for (let gap = last + 1; gap < pointer; gap++) {
        if (owned.has(gap)) continue;
        const unused = body.subarray(gap * sectorSize, (gap + 1) * sectorSize);
        if (!unused.every((byte) => byte === 0) && !unused.every((byte) => byte === 255)) fail("Unaccounted GPX sectors between data pointers.", 4 + gap * sectorSize);
        owned.add(gap);
      }
      owned.add(pointer);
      pointers.push(pointer);
      last = pointer;
    }
    if (body.readUInt32LE(at + 148 + count * 4) !== 0) fail("GPX pointer count differs from declared file length.", at + 152 + count * 4);
    const data = new Bytes(bytes);
    for (let i = 0; i < pointers.length; i++) body.copy(data, i * sectorSize, pointers[i] * sectorSize, pointers[i] * sectorSize + Math.min(sectorSize, bytes - i * sectorSize));
    members.set(name, data);
    if (captureRaw) captures.push({
      source: { member: "decoded:BCFS", byteOffset: at + 4, byteLength: sectorSize, path: name },
      name,
      declaredBytes: bytes,
      sectors: pointers,
      bytes,
      sha256: sha256(data),
      dataBase64: data.base64()
    });
    sector = last + 1;
  }
  if (rootDirectorySectors && (rootDirectorySectors.length !== fileDirectories.length || rootDirectorySectors.some((pointer) => !fileDirectories.includes(pointer)))) fail("GPX root table does not account for every payload directory.");
  if (!members.has("score.gpif") || [...members.keys()].some((name) => /score\.gpif$/i.test(name) && name !== "score.gpif"))
    fail("GPX requires one unambiguous score.gpif member.");
  const reader = new GpxFileSystem();
  reader.load(ByteBuffer.fromBuffer(decoded));
  if (reader.files.length !== members.size || reader.files.some((file) => !members.has(file.fileName) || !Bytes.view(file.data ?? new Uint8Array()).equals(members.get(file.fileName))))
    fail("Borrowed GPX filesystem differs from independently validated members.");
  const capture = freeze({
    format,
    decodedBytes: decoded.length,
    decodedSha256: captureRaw ? sha256(decoded) : "",
    literalBlocks,
    backreferenceBlocks,
    finalZeroPaddingBytes,
    rootDirectorySectors: rootDirectorySectors ?? [],
    members: captures
  });
  return { members, capture };
}

// src/adapters/guitar-pro/zip-core.ts
function scanContainer(bytes) {
  if (bytes.byteLength > limits.inputBytes) refuse("input-size", "Input exceeds the 8 MiB profile.");
  const b = Bytes.view(bytes);
  const fail = (message) => refuse("zip", message, { member: "container" });
  if (b.length < 22 || b.readUInt32LE(0) !== 67324752) fail("Expected a local ZIP container. GP3\u20136 are separate profiles.");
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (b.readUInt32LE(i) === 101010256 && i + 22 + b.readUInt16LE(i + 20) === b.length) {
      end = i;
      break;
    }
  }
  if (end < 0) fail("Missing or ambiguous ZIP end directory.");
  const count = b.readUInt16LE(end + 10), size = b.readUInt32LE(end + 12), offset = b.readUInt32LE(end + 16);
  if (b.readUInt16LE(end + 4) || b.readUInt16LE(end + 6) || b.readUInt16LE(end + 8) !== count)
    fail("Split archives are unsupported.");
  if (!count || count > limits.entries || offset + size !== end || end + 22 !== b.length)
    fail("Directory bounds, entry count or ZIP comments exceed the profile.");
  let pos = offset, total = 0;
  const entries = [];
  const names = /* @__PURE__ */ new Map(), pathSpellings = /* @__PURE__ */ new Map();
  for (let i = 0; i < count; i++) {
    if (pos + 46 > end || b.readUInt32LE(pos) !== 33639248) fail("Malformed central directory.");
    const flags = b.readUInt16LE(pos + 8), method = b.readUInt16LE(pos + 10);
    const crc = b.readUInt32LE(pos + 16), compressed = b.readUInt32LE(pos + 20), decoded = b.readUInt32LE(pos + 24);
    const nl = b.readUInt16LE(pos + 28), xl = b.readUInt16LE(pos + 30), cl = b.readUInt16LE(pos + 32);
    const start = b.readUInt32LE(pos + 42);
    if (pos + 46 + nl + xl + cl > end || flags & ~2056 || method !== 0 && method !== 8 || b.readUInt16LE(pos + 34))
      fail("Unsupported ZIP flags, method, encryption or disk.");
    if (cl) fail("ZIP member comments are outside this profile.");
    if (xl && (xl !== 9 || b.readUInt16LE(pos + 46 + nl) !== 21589 || b.readUInt16LE(pos + 48 + nl) !== 5 || ![1, 3].includes(b[pos + 50 + nl])))
      fail("Unreviewed ZIP extra fields; only the exercised central timestamp is admitted.");
    const rawName = b.subarray(pos + 46, pos + 46 + nl);
    const name = rawName.text();
    const directory = name.endsWith("/"), path = directory ? name.slice(0, -1) : name;
    if (!/^[A-Za-z0-9_.\/-]{1,120}$/.test(name) || name.startsWith("/") || path.split("/").some((p) => !p || p === "." || p === ".."))
      fail("Unsafe or ambiguous member path.");
    const folded = path.toLowerCase();
    if (names.has(folded)) fail("Duplicate or case-ambiguous member paths.");
    names.set(folded, directory);
    const components = path.split("/");
    for (let n = 1; n <= components.length; n++) {
      const spelling = components.slice(0, n).join("/"), key = spelling.toLowerCase();
      if (pathSpellings.has(key) && pathSpellings.get(key) !== spelling) fail("Case-ambiguous parent paths.");
      pathSpellings.set(key, spelling);
    }
    const unixType = b.readUInt32LE(pos + 38) >>> 16 & 61440;
    const dosDirectory = !!(b.readUInt32LE(pos + 38) & 16);
    if (unixType && unixType !== (directory ? 16384 : 32768) || dosDirectory && !directory)
      fail("ZIP file/directory type disagrees with its path; links are unsupported.");
    if (directory && (decoded || crc || method === 0 && compressed)) fail("Directories must decode to empty entries with zero CRC.");
    total += decoded;
    if (decoded > limits.memberBytes || total > limits.decodedBytes || decoded > Math.max(1, compressed) * limits.compressionRatio)
      fail("Member/total decoded size or compression work exceeds the profile.");
    if (start + 30 > offset || b.readUInt32LE(start) !== 67324752) fail("Invalid local header offset.");
    const localNl = b.readUInt16LE(start + 26), localXl = b.readUInt16LE(start + 28);
    const dataStart = start + 30 + localNl + localXl, dataEnd = dataStart + compressed;
    const descriptor = !!(flags & 8);
    let descriptorFact, memberEnd = dataEnd;
    if (descriptor) {
      const candidates = [];
      if (dataEnd + 16 <= offset && b.readUInt32LE(dataEnd) === 134695760 && b.readUInt32LE(dataEnd + 4) === crc && b.readUInt32LE(dataEnd + 8) === compressed && b.readUInt32LE(dataEnd + 12) === decoded)
        candidates.push({ signed: true, reversed: false, length: 16 });
      if (dataEnd + 12 <= offset && b.readUInt32LE(dataEnd) === crc) {
        const first = b.readUInt32LE(dataEnd + 4), second = b.readUInt32LE(dataEnd + 8);
        if (first === compressed && second === decoded) candidates.push({ signed: false, reversed: false, length: 12 });
        else if (first === decoded && second === compressed) candidates.push({ signed: false, reversed: true, length: 12 });
      }
      if (candidates.length !== 1) fail("ZIP descriptor framing/CRC/lengths are missing or ambiguous.");
      const candidate = candidates[0];
      memberEnd += candidate.length;
      descriptorFact = { member: name, byteOffset: dataEnd, byteLength: candidate.length, signed: candidate.signed, order: candidate.reversed ? "crc-decoded-compressed" : "crc-compressed-decoded", crc, compressed, decoded, dataBase64: b.subarray(dataEnd, memberEnd).base64() };
    }
    if (memberEnd > offset) fail("Member or data descriptor exceeds local area.");
    const localCrc = b.readUInt32LE(start + 14), localCompressed = b.readUInt32LE(start + 18), localDecoded = b.readUInt32LE(start + 22);
    const emptyLocal = descriptor && localCrc === 0 && localCompressed === 0 && localDecoded === 0;
    const matchingLocal = localCrc === crc && localCompressed === compressed && localDecoded === decoded;
    if (dataEnd > offset || localXl || localNl !== nl || !b.subarray(start + 30, start + 30 + nl).equals(rawName) || b.readUInt16LE(start + 6) !== flags || b.readUInt16LE(start + 8) !== method || !(emptyLocal || matchingLocal))
      fail("Local and central ZIP identity/length/CRC disagree.");
    entries.push({ name, directory, start, end: memberEnd, dataStart, compressed, decoded, crc, method, ...descriptorFact ? { descriptor: descriptorFact } : {} });
    pos += 46 + nl + xl + cl;
  }
  if (pos !== end) fail("Unaccounted central-directory content.");
  for (const [name, directory] of names) if (!directory && [...names.keys()].some((other) => other.startsWith(name + "/")))
    fail("A payload file cannot be a parent directory.");
  const spans = entries.slice().sort((a, c) => a.start - c.start);
  let next = 0;
  for (const e of spans) {
    if (e.start !== next) fail("Overlapping or unaccounted local ZIP content.");
    next = e.end;
  }
  if (next !== offset) fail("Unaccounted bytes before ZIP directory.");
  return entries;
}
function admitDescriptors(members, root, findings) {
  const descriptors = members.zipDescriptors ?? [];
  if (descriptors.some((d) => d.order === "crc-decoded-compressed")) {
    const revision = child(root, "GPRevision"), encoding = child(root, "Encoding", false);
    if (value(root, "GPVersion", false) !== "8.1.1" || revision.text.trim() !== "13007" || revision.attrs.required !== "12024" || revision.attrs.recommended !== "13000" || !encoding || value(encoding, "EncodingDescription") !== "GP8")
      refuse("zip-source-profile", "Reversed unsigned descriptor sizes require the independently observed GP8.1.1/revision13007 source encoding profile.", root.location);
  }
  for (const descriptor of descriptors) findings.push({ disposition: "preserved", code: descriptor.order === "crc-decoded-compressed" ? "zip-source-descriptor-order" : "zip-descriptor", message: descriptor.order === "crc-decoded-compressed" ? "Observed GP8.1.1 unsigned descriptor stores decoded size before compressed size. Exact original bytes/order are retained; central/local spans, CRC and actual decode lengths still agree. This serialization alias does not authenticate a producer or alter music." : "Standard signed/unsigned descriptor framing, original bytes, CRC and lengths are retained after exact container validation.", location: { member: "container", byteOffset: descriptor.byteOffset, byteLength: descriptor.byteLength }, fact: descriptor });
}
var zipFail = (message) => refuse("zip", message, { member: "container" });
function checkMember(entry, bytes) {
  if (bytes.length !== entry.decoded || crc32(bytes) !== entry.crc) zipFail(`Length/CRC failure in ${entry.name}.`);
  return Bytes.view(bytes);
}
function finishContainer(result) {
  if (!result.has("VERSION") || !result.has("Content/score.gpif") || result.get("VERSION").text() !== "7.0")
    zipFail("This profile requires VERSION=7.0 and exactly Content/score.gpif; it makes no suffix-based compatibility claim.");
  if ([...result.keys()].some((n) => /score\.gpif$/i.test(n) && n !== "Content/score.gpif")) zipFail("Ambiguous score.gpif member.");
  return result;
}

// src/adapters/guitar-pro/convert-core.ts
function convertPortable(bytes, options, readContainer) {
  const report = {
    schema: "score-converter-report/0",
    inputSha256: sha256(bytes),
    adapter: "alphatab-1.8.4-022a45c8+source-hook/1",
    profile: "gp-family-fretted/0",
    requestedScope: options.trackIds ? { trackIds: options.trackIds } : "all-tracks",
    findings: new BoundedFindings()
  };
  try {
    if (bytes.length > limits.inputBytes) throw new Refusal("input-size", "Input exceeds 8 MiB.");
    const encoding = guitarProEncoding(bytes);
    const binary = encoding === "binary", gpx = encoding === "gpx";
    let source, binarySource, gpxSource;
    let container = { facts: [], display: { hideDynamics: false, hideTempo: false } };
    let recovery;
    if (binary) {
      report.profile = "gp3-5-binary-fretted/0";
      const recovered = readBinary(bytes, report.findings, options.trackIds);
      binarySource = recovered.capture;
      recovery = recovered;
    } else {
      let members;
      if (gpx) {
        const decoded = readGpx(bytes);
        gpxSource = decoded.capture;
        members = new Map([...decoded.members].map(([name, data]) => ["Content/" + name, data]));
        report.findings.push({ disposition: "inferred", code: "gpx-reader-member-alias", message: "Flat GPX member names receive a generated Content/ prefix only in the shared reader view. GPX capture retains original names and decoded BCFS offsets; those offsets do not address compressed input bytes.", location: { member: "container" }, fact: { aliases: [...decoded.members.keys()].map((name) => ({ source: name, reader: "Content/" + name })) } });
        if (decoded.capture.finalZeroPaddingBytes) report.findings.push({ disposition: "preserved", code: "gpx-final-zero-padding", message: "The final literal atom contains at most two zero bytes beyond declared decoded length. These are validated serialization padding, retained in original input but excluded from the decoded filesystem; no missing bytes are synthesized.", location: { member: "container" }, fact: { bytes: decoded.capture.finalZeroPaddingBytes } });
      } else members = readContainer();
      const { xml, root } = parseXml(members.get("Content/score.gpif"), gpx ? "score.gpif" : "Content/score.gpif");
      if (!gpx) admitDescriptors(members, root, report.findings);
      source = root;
      const version = root.children.find((e) => e.name === "GPVersion")?.text.trim();
      const constructed = version === "7.0" && root.children.find((e) => e.name === "GPRevision")?.text.trim() === "0";
      const family = gpx && !constructed ? 6 : /^8(?:\.|$)/.test(version ?? "") ? 8 : 7;
      report.profile = constructed ? gpx ? "gpx-constructed-gpif7-fretted/0" : "constructed-gp7-fretted/0" : `gp${family}-physical-fretted/0`;
      container = captureContainer(members, !constructed || gpx, report.findings);
      const readerRoot = constructed ? root : prepareGp8(root, options.trackIds, report.findings, family);
      if (constructed && options.trackIds) throw new Refusal("track-selection", "Track selection requires a source family profile.", root.location);
      const mode = constructed ? "constructed" : "gpif-physical";
      inventory(readerRoot, report.findings, mode);
      recovery = recover(readerRoot, constructed ? xml : serialize(readerRoot), report.findings, mode);
      if (family === 8 && report.findings.filter((f) => f.code === "gpif-pitch-profile").every((f) => f.fact.convention === "scientific-physical")) report.profile = "gp8-scientific-physical/0";
    }
    for (const finding2 of report.findings.filter((f) => f.code === "source-auto-brush")) {
      const part = recovery.score.parts.find((p) => p.id === finding2.location.trackId);
      for (const measure of part.measures) {
        const events = measure.voices.flatMap((voice) => voice.filter((event) => event.notes.length)).sort((a, b) => a.start.n * b.start.d - b.start.n * a.start.d);
        let end = { n: 0, d: 1 };
        for (const event of events) {
          if (event.notes.length > 1 || event.start.n * end.d < end.n * event.start.d) throw new Refusal("auto-brush-polyphony", "Enabled source AutoBrush with overlapping notes/chords requires a playback mapping; selected logical voices cannot conceal simultaneous notes.", event.source);
          end = add(event.start, event.duration);
        }
      }
    }
    const families = new Map(recovery.score.parts.map((part) => [part.id, admittedFamily(part.instrument, part.midiProgram, part.source)]));
    if (!report.profile.includes("constructed")) {
      if ([...families.values()].every((family) => family === "guitar")) report.profile = report.profile.replace("-fretted/", "-guitar/");
      else if ([...families.values()].every((family) => family === "bass")) report.profile = report.profile.replace("-fretted/", "-bass/");
    }
    for (const part of recovery.score.parts) {
      report.findings.push({ disposition: "preserved", code: "instrument-admitted", message: "Reviewed encoded instrument identity, MIDI family, complete physical tuning and the selected source musical graph passed admission and reader reconciliation. This is conversion admission, independent of labels or metadata eligibility.", location: part.source, fact: { sourceTrackId: part.id, instrumentReference: part.instrument, midiProgram: part.midiProgram, instrumentFamily: families.get(part.id), profile: report.profile } });
      report.findings.push({ disposition: "preserved", code: "tuning-export", message: "Complete ordered source open-string MIDI tuning and string count are retained as standard staff-lines/staff-tuning on a hidden alternate TAB staff. Tuning remains sounding pitch, independent of written octave transpose.", location: part.source, fact: { tuning: part.tuning, stringCount: part.tuning.length, sourceOrder: "low-to-high", musicxmlLineOrder: "bottom-to-top" } });
      report.findings.push({ disposition: "inferred", code: "tuning-spelling", message: "Source tuning encodes MIDI values, not note spelling. MusicXML tuning step/alter/octave uses generated sharp-based reference spelling (midi-sharp-reference/0); the source MIDI values remain unchanged.", location: part.source, fact: { tuning: part.tuning, rule: "midi-sharp-reference/0" } });
      report.findings.push({ disposition: "inferred", code: "tuning-carrier-staff", message: "A nonprinting alternate TAB staff is generated only to serialize tuning and string count. It shares the ordinary staff music and is excluded from playback; no notes/rests are copied to it. It is not a source staff, performing hand or retuning instruction.", location: part.source, fact: { ordinaryStaff: 1, tuningStaff: 2, staffType: "alternate", printObject: false, printSpacing: false } });
      report.findings.push({ disposition: "preserved", code: "hidden-physical-guidance", message: "Standard MusicXML string/fret facts are retained in hidden technical notations; the score displays ordinary notes without TAB or physical numbers.", location: part.source });
    }
    const assigned = [];
    const musicxml = writeMusicXml(recovery.score, container.display, (sourceTrackId, musicxmlPartId) => assigned.push({ sourceTrackId, musicxmlPartId }), { outputBytes: limits.resultBytes });
    if (assigned.length !== recovery.score.parts.length || new Set(assigned.map((a) => a.sourceTrackId)).size !== assigned.length || new Set(assigned.map((a) => a.musicxmlPartId)).size !== assigned.length) throw new Refusal("writer-identity", "Writer did not assign one distinct identity to every admitted source part.");
    report.convertedParts = assigned.map((a) => {
      const part = recovery.score.parts.find((p) => p.id === a.sourceTrackId);
      const evidenceFindingIndices = report.findings.flatMap((f, i) => ["instrument-admitted", "gpif-pitch-profile", "binary-written-register"].includes(f.code) && (f.location.trackId ?? f.location.id) === part.id ? [i] : []);
      return { ...a, sourceLocation: part.source, admission: { instrumentFamily: families.get(part.id), profile: report.profile, evidenceFindingIndices } };
    });
    const result = {
      ok: true,
      musicxml,
      report,
      ...source ? { source } : {},
      containerSource: container.facts,
      occurrences: recovery.occurrences,
      score: recovery.score,
      inputSource: { bytes: bytes.length, sha256: report.inputSha256, dataBase64: Bytes.view(bytes).base64() },
      ...binarySource ? { binarySource } : {},
      ...gpxSource ? { gpxSource } : {}
    };
    jsonBytes(result, limits.resultBytes);
    return freeze(result);
  } catch (e) {
    delete report.convertedParts;
    const r = e instanceof Refusal ? e : new Refusal("invalid-input", "Input failed bounded conversion; no musical output was produced.");
    if (r.code === "report-budget") report.findings = [];
    report.findings.push({ disposition: "blocking", code: r.code, message: r.message, location: r.location });
    return freeze({ ok: false, report });
  }
}

// src/adapters/guitar-pro/inspect-core.ts
var finding = (code, message, location) => ({ disposition: "blocking", code, message, location });
function eligibility(program, tuning, source, profile, ref, binary = false) {
  const findings = [];
  let status = "eligible";
  if (program === void 0 || !Number.isInteger(program) || program < 0 || program > 127) {
    status = "unknown";
    findings.push(finding("instrument-unknown", "No unambiguous encoded MIDI program establishes metadata eligibility.", source));
  } else if (program < 24 || program > 39) {
    status = "ineligible";
    findings.push(finding("instrument-profile", "Observed instrument is outside the currently admitted guitar/bass program24\u201339 profile.", source));
  } else if (!binary) {
    const family = ref && observedFamily(ref);
    if (!family) {
      status = "unknown";
      findings.push(finding("instrument-unknown", "No reviewed encoded family/reference establishes metadata eligibility; labels and tuning cannot authorize one.", source));
    } else if (family === "guitar" ? program > 31 : program < 32) {
      status = "ineligible";
      findings.push(finding("instrument-profile", "Encoded family/reference and MIDI family disagree.", source));
    }
  }
  if (!tuning || tuning.stringCount < 4 || tuning.stringCount > (profile.startsWith("gp3-5") ? 7 : 8) || tuning.pitches.some((p, i) => p < 12 || p > 108 || i > 0 && p <= tuning.pitches[i - 1])) {
    if (status === "eligible") status = "ineligible";
    findings.push(finding("tuning-profile", "A complete strictly ascending4\u20138string tuning (binary4\u20137) is required for metadata eligibility.", tuning?.sourceLocation ?? source));
  }
  return { status, profile: program !== void 0 && program >= 24 && program <= 31 ? profile.replace("-bass/", "-guitar/") : profile, findings };
}
function scalar2(e) {
  if (e.children.length || Object.keys(e.attrs).length) refuse("structure", `Expected unambiguous scalar ${e.name}.`, e.location);
}
function gpifTrack(track, profile) {
  const info = { sourceId: track.attrs.id, sourceLocation: { ...track.location, trackId: track.attrs.id }, instrument: { observations: [] }, metadataEligibility: { status: "unknown", profile, findings: [] } };
  const name = child(track, "Name", false);
  if (name) {
    scalar2(name);
    if (name.text.length > 4096) refuse("metadata-size", "Source track name exceeds compact inventory bounds.", name.location);
    info.sourceName = { value: name.text, sourceLocation: name.location };
  }
  const ref = child(track, "Instrument", false);
  if (ref) {
    if (ref.children.length || ref.text.trim() || Object.keys(ref.attrs).some((key) => key !== "ref")) refuse("structure", "Ambiguous instrument reference.", ref.location);
    info.instrument.observations.push({ kind: "ref", value: ref.attrs.ref ?? "", sourceLocation: ref.location, provenance: "encoded" });
  }
  const set = child(track, "InstrumentSet", false), type = set && child(set, "Type", false);
  if (type) {
    scalar2(type);
    info.instrument.observations.push({ kind: "family", value: type.text.trim(), sourceLocation: type.location, provenance: "encoded" });
  }
  const directMidi = child(track, "GeneralMidi", false), sounds = child(track, "Sounds", false);
  const soundList = sounds ? children(sounds, "Sound") : [];
  if (directMidi && soundList.length) refuse("instrument-ambiguity", "Multiple instrument-program encodings prevent useful inventory.", track.location);
  const programNodes = directMidi ? [child(directMidi, "Program")] : soundList.map((sound) => child(child(sound, "MIDI"), "Program"));
  const programs = programNodes.map((node) => {
    scalar2(node);
    if (!/^\d{1,3}$/.test(node.text.trim()) || Number(node.text.trim()) > 127) refuse("number", "Malformed MIDI program.", node.location);
    const program2 = Number(node.text.trim());
    info.instrument.observations.push({ kind: "midi-program", value: program2, sourceLocation: node.location, provenance: "encoded" });
    return program2;
  });
  const staves = child(track, "Staves", false), properties2 = child(track, "Properties", false);
  if (staves && properties2) refuse("staff-ambiguity", "Competing direct and grouped staff encodings prevent useful inventory.", track.location);
  const propertyGroups = properties2 ? [properties2] : staves ? children(staves, "Staff").map((staff) => child(staff, "Properties", false)).filter((e) => !!e) : [];
  const tuningNodes = [];
  for (const group of propertyGroups) {
    const names = /* @__PURE__ */ new Set();
    for (const property of children(group, "Property")) {
      if (!property.attrs.name || names.has(property.attrs.name)) refuse("structure", "Ambiguous staff property identity.", property.location);
      names.add(property.attrs.name);
      if (property.attrs.name === "Tuning") tuningNodes.push(child(property, "Pitches"));
    }
  }
  if (tuningNodes.length > 1) refuse("tuning-ambiguity", "Multiple source tunings need a separately shaped inventory contract.", track.location);
  if (tuningNodes.length) {
    const node = tuningNodes[0];
    scalar2(node);
    const fields = node.text.trim().split(/\s+/);
    if (!fields.length || fields.length > 8 || fields.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 127)) refuse("tuning", "Malformed or oversized source tuning.", node.location);
    info.tuning = { pitches: fields.map(Number), order: "low-to-high", stringCount: fields.length, sourceLocation: node.location, encodedOrder: "low-to-high" };
  }
  const program = new Set(programs).size === 1 ? programs[0] : void 0;
  info.metadataEligibility = eligibility(program, info.tuning, info.sourceLocation, profile, type?.text.trim() ?? ref?.attrs.ref);
  if (soundList.length > 1) {
    info.metadataEligibility.status = "ineligible";
    info.metadataEligibility.findings.push(finding("sound-profile", "Multiple source sounds require musical sound-change admission.", sounds.location));
  }
  return info;
}
function inspectPortable(bytes, readContainer) {
  const report = { schema: "score-converter-report/0", inputSha256: sha256(bytes), adapter: "alphatab-1.8.4-022a45c8+source-hook/1", profile: "gp-family-inventory/0", requestedScope: "all-tracks", findings: new BoundedFindings() };
  try {
    if (bytes.length > limits.inputBytes) refuse("input-size", "Input exceeds8MiB.");
    const encoding = guitarProEncoding(bytes);
    let tracks;
    if (encoding === "binary") {
      const source = readBinaryMetadata(bytes, report.findings);
      report.profile = "gp3-5-binary-inventory/0";
      tracks = source.tracks.map((t) => {
        const tuning = { pitches: t.tuning.slice().reverse(), order: "low-to-high", encodedOrder: "high-to-low", stringCount: t.tuning.length, sourceLocation: t.tuningLocation };
        const info = { sourceId: t.sourceId, sourceLocation: t.sourceLocation, sourceName: { value: t.name, sourceLocation: t.nameLocation }, instrument: { observations: [{ kind: "midi-program", value: t.program, sourceLocation: t.programLocation, provenance: "derived-from-encoded-channel" }] }, tuning, metadataEligibility: eligibility(t.program, tuning, t.sourceLocation, "gp3-5-binary-bass/0", void 0, true) };
        if (t.facts["track-flags"] & 119 || t.facts.capo || t.facts["automatic-midi"] & ~1 || t.facts["automatic-accent"] || t.facts.humanize || t.facts["sound-bank"]) {
          info.metadataEligibility.status = "ineligible";
          info.metadataEligibility.findings.push(finding("track-profile", "Encoded percussion/doubled/mute/capo/automatic playback or sound-bank fields exceed selected metadata scope.", t.sourceLocation));
        }
        return info;
      });
      report.findings.push({ disposition: "preserved", code: "binary-header", message: "Encoded binary version/header is observed independently of metadata eligibility.", location: { member: "input", byteOffset: 0, byteLength: 31 }, fact: { header: source.header, version: source.version } });
    } else {
      const gpx = encoding === "gpx";
      const members = gpx ? new Map([...readGpx(bytes, false).members].map(([name, data]) => ["Content/" + name, data])) : readContainer();
      const root = parseXml(members.get("Content/score.gpif"), gpx ? "score.gpif" : "Content/score.gpif").root;
      if (!gpx) admitDescriptors(members, root, report.findings);
      const version = value(root, "GPVersion", false), constructed = version === "7.0" && value(root, "GPRevision") === "0";
      const family = gpx && !constructed ? 6 : /^8(?:\.|$)/.test(version) ? 8 : 7;
      if (!constructed) validateGpifHeader(root, family, report.findings);
      const graph = discoverGpifGraph(root);
      captureContainer(members, !constructed || gpx, [], false);
      report.profile = constructed ? "constructed-gpif-inventory/0" : `gp${family}-inventory/0`;
      tracks = graph.order.map((id) => gpifTrack(graph.tracks.get(id), constructed ? "constructed-gp7-fretted/0" : `gp${family}-physical-bass/0`));
    }
    report.findings.push({ disposition: "preserved", code: "inspection-scope", message: "Bounded container/header/definition/reference discovery succeeded. Track labels and metadata eligibility do not certify musical constructs; conversion revalidates selected source IDs. No output-part IDs or raw capture are returned.", location: { member: "input" } });
    const result = { ok: true, report, tracks };
    jsonBytes(result, limits.reportBytes);
    return freeze(result);
  } catch (error) {
    const r = error instanceof Refusal ? error : new Refusal("invalid-input", "Input failed bounded source discovery; no useful inventory is returned.");
    if (r.code === "report-budget") report.findings = [];
    report.findings.push(finding(r.code, r.message, r.location));
    return freeze({ ok: false, report });
  }
}

// src/adapters/guitar-pro/zip-webview.ts
var framing = /* @__PURE__ */ new WeakMap();
async function supportsFraming(ctor, deadline) {
  let checked = framing.get(ctor);
  if (!checked) {
    checked = (async () => {
      const valid = Uint8Array.of(51, 215, 51, 0, 0);
      try {
        const output = await inflate(ctor, valid, 3, deadline);
        if (output.length !== 3 || output[0] !== 55 || output[1] !== 46 || output[2] !== 48) return false;
        for (const negative of [valid.subarray(0, 4), Uint8Array.of(...valid, 0)]) {
          let rejected = false;
          try {
            await inflate(ctor, negative, 3, deadline);
          } catch (error) {
            if (error instanceof Refusal) throw error;
            rejected = true;
          }
          if (!rejected) return false;
        }
        return true;
      } catch (error) {
        if (error instanceof Refusal) throw error;
        return false;
      }
    })();
    framing.set(ctor, checked);
  }
  return checked;
}
function checkWork(deadline) {
  if (performance.now() >= deadline) refuse("work-budget", "Worker exceeded 5 seconds; no musical output is admitted.", { member: "container" });
}
async function inflate(ctor, payload, maximum, deadline) {
  checkWork(deadline);
  const stream = new ctor("deflate-raw"), writer = stream.writable.getWriter(), reader = stream.readable.getReader();
  const pieces = [];
  let total = 0, timer;
  const reading = (async () => {
    for (; ; ) {
      const { done, value: value2 } = await reader.read();
      checkWork(deadline);
      if (done) break;
      total += value2.byteLength;
      if (total > maximum) throw new Error("Native decoded size exceeds its retained-data bound.");
      pieces.push(value2);
    }
  })();
  const writing = (async () => {
    for (let offset = 0; offset < payload.length; offset += 16) {
      checkWork(deadline);
      await writer.write(Uint8Array.from(payload.subarray(offset, offset + 16)));
    }
    await writer.close();
  })();
  try {
    await Promise.race([Promise.all([reading, writing]), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Refusal("work-budget", "Native stream exceeded the Worker deadline.", { member: "container" })), Math.max(0, deadline - performance.now()));
    })]);
    checkWork(deadline);
    const output = new Uint8Array(total);
    let offset = 0;
    for (const piece of pieces) {
      output.set(piece, offset);
      offset += piece.byteLength;
    }
    return output;
  } catch (error) {
    await Promise.allSettled([reader.cancel(error), writer.abort(error), reading, writing]);
    throw error;
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
    writer.releaseLock();
  }
}
async function readWebViewContainer(bytes, deadline) {
  const entries = scanContainer(bytes), result = /* @__PURE__ */ new Map();
  result.zipDescriptors = entries.flatMap((entry) => entry.descriptor ? [entry.descriptor] : []);
  let retained = 0;
  for (const entry of entries) {
    checkWork(deadline);
    const payload = bytes.subarray(entry.dataStart, entry.dataStart + entry.compressed);
    let decoded;
    if (entry.method === 0) decoded = payload.slice();
    else {
      const ctor = globalThis.DecompressionStream;
      if (typeof ctor !== "function" || !await supportsFraming(ctor, deadline)) refuse("runtime-codec", "Native deflate-raw is missing or fails the bounded exact-output/truncated/trailing framing gate; no compressed input is admitted.", { member: "container" });
      try {
        decoded = await inflate(ctor, payload, Math.min(entry.decoded, limits.memberBytes, limits.decodedBytes - retained), deadline);
      } catch (error) {
        if (error instanceof Refusal) throw error;
        zipFail(`Unable to decode ${entry.name} within its bound.`);
      }
    }
    retained += decoded.byteLength;
    if (retained > limits.decodedBytes) zipFail("Actual total decoded size exceeds its bound.");
    checkWork(deadline);
    result.set(entry.name, checkMember(entry, decoded));
  }
  return finishContainer(result);
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

// src/webview/guitar-pro.worker.ts
var scope = globalThis;
var received = false;
var invalidated = false;
scope.onmessage = async ({ data }) => {
  if (received) {
    invalidated = true;
    scope.close();
    return;
  }
  received = true;
  if (!data || data.protocol !== protocol || !Number.isSafeInteger(data.requestId) || data.requestId < 1 || !["convert", "inspect"].includes(data.operation) || !(data.bytes instanceof Uint8Array) || !(data.bytes.buffer instanceof ArrayBuffer) || data.bytes.byteOffset !== 0 || data.bytes.buffer.byteLength !== data.bytes.byteLength || data.bytes.byteLength > limits.inputBytes || !/^[a-f0-9]{64}$/.test(data.inputSha256) || Object.keys(data).some((key) => !["protocol", "requestId", "operation", "inputSha256", "bytes", "trackIds"].includes(key)) || data.trackIds !== void 0 && (data.operation !== "convert" || !Array.isArray(data.trackIds) || !data.trackIds.length || data.trackIds.length > limits.tracks || data.trackIds.some((id) => typeof id !== "string" || !/^\d{1,6}$/.test(id)))) {
    scope.close();
    return;
  }
  const request = data, deadline = performance.now() + limits.workerMs;
  const digest = sha256(request.bytes);
  if (digest !== request.inputSha256) {
    scope.close();
    return;
  }
  let members, decodeError;
  if (guitarProEncoding(request.bytes) === "zip") {
    try {
      members = await readWebViewContainer(request.bytes, deadline);
    } catch (error) {
      decodeError = error;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (invalidated) return;
  const container = () => {
    if (decodeError) throw decodeError;
    return members;
  };
  let result = request.operation === "inspect" ? inspectPortable(request.bytes, container) : convertPortable(request.bytes, { trackIds: request.trackIds }, container);
  if (performance.now() >= deadline) result = hostFailure(request.operation, digest, request.trackIds, "work-budget", "Worker exceeded 5 seconds; no musical output is admitted.");
  try {
    jsonBytes(result, request.operation === "inspect" ? limits.reportBytes : limits.resultBytes);
  } catch {
    result = hostFailure(request.operation, digest, request.trackIds, "message-budget", "Worker result exceeds its public message budget; no output is admitted.");
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (!invalidated) scope.postMessage({ protocol, requestId: request.requestId, operation: request.operation, result });
  scope.close();
};
/*! For license information please see guitar-pro.worker.js.LEGAL.txt */
