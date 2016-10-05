(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],2:[function(require,module,exports){
'use strict';

// lightweight Buffer shim for pbf browser build
// based on code from github.com/feross/buffer (MIT-licensed)

module.exports = Buffer;

var ieee754 = require('ieee754');

var BufferMethods;

function Buffer(length) {
    var arr;
    if (length && length.length) {
        arr = length;
        length = arr.length;
    }
    var buf = new Uint8Array(length || 0);
    if (arr) buf.set(arr);

    buf.readUInt32LE = BufferMethods.readUInt32LE;
    buf.writeUInt32LE = BufferMethods.writeUInt32LE;
    buf.readInt32LE = BufferMethods.readInt32LE;
    buf.writeInt32LE = BufferMethods.writeInt32LE;
    buf.readFloatLE = BufferMethods.readFloatLE;
    buf.writeFloatLE = BufferMethods.writeFloatLE;
    buf.readDoubleLE = BufferMethods.readDoubleLE;
    buf.writeDoubleLE = BufferMethods.writeDoubleLE;
    buf.toString = BufferMethods.toString;
    buf.write = BufferMethods.write;
    buf.slice = BufferMethods.slice;
    buf.copy = BufferMethods.copy;

    buf._isBuffer = true;
    return buf;
}

var lastStr, lastStrEncoded;

BufferMethods = {
    readUInt32LE: function(pos) {
        return ((this[pos]) |
            (this[pos + 1] << 8) |
            (this[pos + 2] << 16)) +
            (this[pos + 3] * 0x1000000);
    },

    writeUInt32LE: function(val, pos) {
        this[pos] = val;
        this[pos + 1] = (val >>> 8);
        this[pos + 2] = (val >>> 16);
        this[pos + 3] = (val >>> 24);
    },

    readInt32LE: function(pos) {
        return ((this[pos]) |
            (this[pos + 1] << 8) |
            (this[pos + 2] << 16)) +
            (this[pos + 3] << 24);
    },

    readFloatLE:  function(pos) { return ieee754.read(this, pos, true, 23, 4); },
    readDoubleLE: function(pos) { return ieee754.read(this, pos, true, 52, 8); },

    writeFloatLE:  function(val, pos) { return ieee754.write(this, val, pos, true, 23, 4); },
    writeDoubleLE: function(val, pos) { return ieee754.write(this, val, pos, true, 52, 8); },

    toString: function(encoding, start, end) {
        var str = '',
            tmp = '';

        start = start || 0;
        end = Math.min(this.length, end || this.length);

        for (var i = start; i < end; i++) {
            var ch = this[i];
            if (ch <= 0x7F) {
                str += decodeURIComponent(tmp) + String.fromCharCode(ch);
                tmp = '';
            } else {
                tmp += '%' + ch.toString(16);
            }
        }

        str += decodeURIComponent(tmp);

        return str;
    },

    write: function(str, pos) {
        var bytes = str === lastStr ? lastStrEncoded : encodeString(str);
        for (var i = 0; i < bytes.length; i++) {
            this[pos + i] = bytes[i];
        }
    },

    slice: function(start, end) {
        return this.subarray(start, end);
    },

    copy: function(buf, pos) {
        pos = pos || 0;
        for (var i = 0; i < this.length; i++) {
            buf[pos + i] = this[i];
        }
    }
};

BufferMethods.writeInt32LE = BufferMethods.writeUInt32LE;

Buffer.byteLength = function(str) {
    lastStr = str;
    lastStrEncoded = encodeString(str);
    return lastStrEncoded.length;
};

Buffer.isBuffer = function(buf) {
    return !!(buf && buf._isBuffer);
};

function encodeString(str) {
    var length = str.length,
        bytes = [];

    for (var i = 0, c, lead; i < length; i++) {
        c = str.charCodeAt(i); // code point

        if (c > 0xD7FF && c < 0xE000) {

            if (lead) {
                if (c < 0xDC00) {
                    bytes.push(0xEF, 0xBF, 0xBD);
                    lead = c;
                    continue;

                } else {
                    c = lead - 0xD800 << 10 | c - 0xDC00 | 0x10000;
                    lead = null;
                }

            } else {
                if (c > 0xDBFF || (i + 1 === length)) bytes.push(0xEF, 0xBF, 0xBD);
                else lead = c;

                continue;
            }

        } else if (lead) {
            bytes.push(0xEF, 0xBF, 0xBD);
            lead = null;
        }

        if (c < 0x80) bytes.push(c);
        else if (c < 0x800) bytes.push(c >> 0x6 | 0xC0, c & 0x3F | 0x80);
        else if (c < 0x10000) bytes.push(c >> 0xC | 0xE0, c >> 0x6 & 0x3F | 0x80, c & 0x3F | 0x80);
        else bytes.push(c >> 0x12 | 0xF0, c >> 0xC & 0x3F | 0x80, c >> 0x6 & 0x3F | 0x80, c & 0x3F | 0x80);
    }
    return bytes;
}

},{"ieee754":1}],3:[function(require,module,exports){
(function (global){
'use strict';

module.exports = Pbf;

var Buffer = global.Buffer || require('./buffer');

function Pbf(buf) {
    this.buf = !Buffer.isBuffer(buf) ? new Buffer(buf || 0) : buf;
    this.pos = 0;
    this.length = this.buf.length;
}

Pbf.Varint  = 0; // varint: int32, int64, uint32, uint64, sint32, sint64, bool, enum
Pbf.Fixed64 = 1; // 64-bit: double, fixed64, sfixed64
Pbf.Bytes   = 2; // length-delimited: string, bytes, embedded messages, packed repeated fields
Pbf.Fixed32 = 5; // 32-bit: float, fixed32, sfixed32

var SHIFT_LEFT_32 = (1 << 16) * (1 << 16),
    SHIFT_RIGHT_32 = 1 / SHIFT_LEFT_32,
    POW_2_63 = Math.pow(2, 63);

Pbf.prototype = {

    destroy: function() {
        this.buf = null;
    },

    // === READING =================================================================

    readFields: function(readField, result, end) {
        end = end || this.length;

        while (this.pos < end) {
            var val = this.readVarint(),
                tag = val >> 3,
                startPos = this.pos;

            readField(tag, result, this);

            if (this.pos === startPos) this.skip(val);
        }
        return result;
    },

    readMessage: function(readField, result) {
        return this.readFields(readField, result, this.readVarint() + this.pos);
    },

    readFixed32: function() {
        var val = this.buf.readUInt32LE(this.pos);
        this.pos += 4;
        return val;
    },

    readSFixed32: function() {
        var val = this.buf.readInt32LE(this.pos);
        this.pos += 4;
        return val;
    },

    // 64-bit int handling is based on github.com/dpw/node-buffer-more-ints (MIT-licensed)

    readFixed64: function() {
        var val = this.buf.readUInt32LE(this.pos) + this.buf.readUInt32LE(this.pos + 4) * SHIFT_LEFT_32;
        this.pos += 8;
        return val;
    },

    readSFixed64: function() {
        var val = this.buf.readUInt32LE(this.pos) + this.buf.readInt32LE(this.pos + 4) * SHIFT_LEFT_32;
        this.pos += 8;
        return val;
    },

    readFloat: function() {
        var val = this.buf.readFloatLE(this.pos);
        this.pos += 4;
        return val;
    },

    readDouble: function() {
        var val = this.buf.readDoubleLE(this.pos);
        this.pos += 8;
        return val;
    },

    readVarint: function() {
        var buf = this.buf,
            val, b, b0, b1, b2, b3;

        b0 = buf[this.pos++]; if (b0 < 0x80) return b0;                 b0 = b0 & 0x7f;
        b1 = buf[this.pos++]; if (b1 < 0x80) return b0 | b1 << 7;       b1 = (b1 & 0x7f) << 7;
        b2 = buf[this.pos++]; if (b2 < 0x80) return b0 | b1 | b2 << 14; b2 = (b2 & 0x7f) << 14;
        b3 = buf[this.pos++]; if (b3 < 0x80) return b0 | b1 | b2 | b3 << 21;

        val = b0 | b1 | b2 | (b3 & 0x7f) << 21;

        b = buf[this.pos++]; val += (b & 0x7f) * 0x10000000;         if (b < 0x80) return val;
        b = buf[this.pos++]; val += (b & 0x7f) * 0x800000000;        if (b < 0x80) return val;
        b = buf[this.pos++]; val += (b & 0x7f) * 0x40000000000;      if (b < 0x80) return val;
        b = buf[this.pos++]; val += (b & 0x7f) * 0x2000000000000;    if (b < 0x80) return val;
        b = buf[this.pos++]; val += (b & 0x7f) * 0x100000000000000;  if (b < 0x80) return val;
        b = buf[this.pos++]; val += (b & 0x7f) * 0x8000000000000000; if (b < 0x80) return val;

        throw new Error('Expected varint not more than 10 bytes');
    },

    readVarint64: function() {
        var startPos = this.pos,
            val = this.readVarint();

        if (val < POW_2_63) return val;

        var pos = this.pos - 2;
        while (this.buf[pos] === 0xff) pos--;
        if (pos < startPos) pos = startPos;

        val = 0;
        for (var i = 0; i < pos - startPos + 1; i++) {
            var b = ~this.buf[startPos + i] & 0x7f;
            val += i < 4 ? b << i * 7 : b * Math.pow(2, i * 7);
        }

        return -val - 1;
    },

    readSVarint: function() {
        var num = this.readVarint();
        return num % 2 === 1 ? (num + 1) / -2 : num / 2; // zigzag encoding
    },

    readBoolean: function() {
        return Boolean(this.readVarint());
    },

    readString: function() {
        var end = this.readVarint() + this.pos,
            str = this.buf.toString('utf8', this.pos, end);
        this.pos = end;
        return str;
    },

    readBytes: function() {
        var end = this.readVarint() + this.pos,
            buffer = this.buf.slice(this.pos, end);
        this.pos = end;
        return buffer;
    },

    // verbose for performance reasons; doesn't affect gzipped size

    readPackedVarint: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readVarint());
        return arr;
    },
    readPackedSVarint: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readSVarint());
        return arr;
    },
    readPackedBoolean: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readBoolean());
        return arr;
    },
    readPackedFloat: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readFloat());
        return arr;
    },
    readPackedDouble: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readDouble());
        return arr;
    },
    readPackedFixed32: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readFixed32());
        return arr;
    },
    readPackedSFixed32: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readSFixed32());
        return arr;
    },
    readPackedFixed64: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readFixed64());
        return arr;
    },
    readPackedSFixed64: function() {
        var end = this.readVarint() + this.pos, arr = [];
        while (this.pos < end) arr.push(this.readSFixed64());
        return arr;
    },

    skip: function(val) {
        var type = val & 0x7;
        if (type === Pbf.Varint) while (this.buf[this.pos++] > 0x7f) {}
        else if (type === Pbf.Bytes) this.pos = this.readVarint() + this.pos;
        else if (type === Pbf.Fixed32) this.pos += 4;
        else if (type === Pbf.Fixed64) this.pos += 8;
        else throw new Error('Unimplemented type: ' + type);
    },

    // === WRITING =================================================================

    writeTag: function(tag, type) {
        this.writeVarint((tag << 3) | type);
    },

    realloc: function(min) {
        var length = this.length || 16;

        while (length < this.pos + min) length *= 2;

        if (length !== this.length) {
            var buf = new Buffer(length);
            this.buf.copy(buf);
            this.buf = buf;
            this.length = length;
        }
    },

    finish: function() {
        this.length = this.pos;
        this.pos = 0;
        return this.buf.slice(0, this.length);
    },

    writeFixed32: function(val) {
        this.realloc(4);
        this.buf.writeUInt32LE(val, this.pos);
        this.pos += 4;
    },

    writeSFixed32: function(val) {
        this.realloc(4);
        this.buf.writeInt32LE(val, this.pos);
        this.pos += 4;
    },

    writeFixed64: function(val) {
        this.realloc(8);
        this.buf.writeInt32LE(val & -1, this.pos);
        this.buf.writeUInt32LE(Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
        this.pos += 8;
    },

    writeSFixed64: function(val) {
        this.realloc(8);
        this.buf.writeInt32LE(val & -1, this.pos);
        this.buf.writeInt32LE(Math.floor(val * SHIFT_RIGHT_32), this.pos + 4);
        this.pos += 8;
    },

    writeVarint: function(val) {
        val = +val;

        if (val <= 0x7f) {
            this.realloc(1);
            this.buf[this.pos++] = val;

        } else if (val <= 0x3fff) {
            this.realloc(2);
            this.buf[this.pos++] = ((val >>> 0) & 0x7f) | 0x80;
            this.buf[this.pos++] = ((val >>> 7) & 0x7f);

        } else if (val <= 0x1fffff) {
            this.realloc(3);
            this.buf[this.pos++] = ((val >>> 0) & 0x7f) | 0x80;
            this.buf[this.pos++] = ((val >>> 7) & 0x7f) | 0x80;
            this.buf[this.pos++] = ((val >>> 14) & 0x7f);

        } else if (val <= 0xfffffff) {
            this.realloc(4);
            this.buf[this.pos++] = ((val >>> 0) & 0x7f) | 0x80;
            this.buf[this.pos++] = ((val >>> 7) & 0x7f) | 0x80;
            this.buf[this.pos++] = ((val >>> 14) & 0x7f) | 0x80;
            this.buf[this.pos++] = ((val >>> 21) & 0x7f);

        } else {
            var pos = this.pos;
            while (val >= 0x80) {
                this.realloc(1);
                this.buf[this.pos++] = (val & 0xff) | 0x80;
                val /= 0x80;
            }
            this.realloc(1);
            this.buf[this.pos++] = val | 0;
            if (this.pos - pos > 10) throw new Error('Given varint doesn\'t fit into 10 bytes');
        }
    },

    writeSVarint: function(val) {
        this.writeVarint(val < 0 ? -val * 2 - 1 : val * 2);
    },

    writeBoolean: function(val) {
        this.writeVarint(Boolean(val));
    },

    writeString: function(str) {
        str = String(str);
        var bytes = Buffer.byteLength(str);
        this.writeVarint(bytes);
        this.realloc(bytes);
        this.buf.write(str, this.pos);
        this.pos += bytes;
    },

    writeFloat: function(val) {
        this.realloc(4);
        this.buf.writeFloatLE(val, this.pos);
        this.pos += 4;
    },

    writeDouble: function(val) {
        this.realloc(8);
        this.buf.writeDoubleLE(val, this.pos);
        this.pos += 8;
    },

    writeBytes: function(buffer) {
        var len = buffer.length;
        this.writeVarint(len);
        this.realloc(len);
        for (var i = 0; i < len; i++) this.buf[this.pos++] = buffer[i];
    },

    writeRawMessage: function(fn, obj) {
        this.pos++; // reserve 1 byte for short message length

        // write the message directly to the buffer and see how much was written
        var startPos = this.pos;
        fn(obj, this);
        var len = this.pos - startPos;

        var varintLen =
            len <= 0x7f ? 1 :
            len <= 0x3fff ? 2 :
            len <= 0x1fffff ? 3 :
            len <= 0xfffffff ? 4 : Math.ceil(Math.log(len) / (Math.LN2 * 7));

        // if 1 byte isn't enough for encoding message length, shift the data to the right
        if (varintLen > 1) {
            this.realloc(varintLen - 1);
            for (var i = this.pos - 1; i >= startPos; i--) this.buf[i + varintLen - 1] = this.buf[i];
        }

        // finally, write the message length in the reserved place and restore the position
        this.pos = startPos - 1;
        this.writeVarint(len);
        this.pos += len;
    },

    writeMessage: function(tag, fn, obj) {
        this.writeTag(tag, Pbf.Bytes);
        this.writeRawMessage(fn, obj);
    },

    writePackedVarint:   function(tag, arr) { this.writeMessage(tag, writePackedVarint, arr);   },
    writePackedSVarint:  function(tag, arr) { this.writeMessage(tag, writePackedSVarint, arr);  },
    writePackedBoolean:  function(tag, arr) { this.writeMessage(tag, writePackedBoolean, arr);  },
    writePackedFloat:    function(tag, arr) { this.writeMessage(tag, writePackedFloat, arr);    },
    writePackedDouble:   function(tag, arr) { this.writeMessage(tag, writePackedDouble, arr);   },
    writePackedFixed32:  function(tag, arr) { this.writeMessage(tag, writePackedFixed32, arr);  },
    writePackedSFixed32: function(tag, arr) { this.writeMessage(tag, writePackedSFixed32, arr); },
    writePackedFixed64:  function(tag, arr) { this.writeMessage(tag, writePackedFixed64, arr);  },
    writePackedSFixed64: function(tag, arr) { this.writeMessage(tag, writePackedSFixed64, arr); },

    writeBytesField: function(tag, buffer) {
        this.writeTag(tag, Pbf.Bytes);
        this.writeBytes(buffer);
    },
    writeFixed32Field: function(tag, val) {
        this.writeTag(tag, Pbf.Fixed32);
        this.writeFixed32(val);
    },
    writeSFixed32Field: function(tag, val) {
        this.writeTag(tag, Pbf.Fixed32);
        this.writeSFixed32(val);
    },
    writeFixed64Field: function(tag, val) {
        this.writeTag(tag, Pbf.Fixed64);
        this.writeFixed64(val);
    },
    writeSFixed64Field: function(tag, val) {
        this.writeTag(tag, Pbf.Fixed64);
        this.writeSFixed64(val);
    },
    writeVarintField: function(tag, val) {
        this.writeTag(tag, Pbf.Varint);
        this.writeVarint(val);
    },
    writeSVarintField: function(tag, val) {
        this.writeTag(tag, Pbf.Varint);
        this.writeSVarint(val);
    },
    writeStringField: function(tag, str) {
        this.writeTag(tag, Pbf.Bytes);
        this.writeString(str);
    },
    writeFloatField: function(tag, val) {
        this.writeTag(tag, Pbf.Fixed32);
        this.writeFloat(val);
    },
    writeDoubleField: function(tag, val) {
        this.writeTag(tag, Pbf.Fixed64);
        this.writeDouble(val);
    },
    writeBooleanField: function(tag, val) {
        this.writeVarintField(tag, Boolean(val));
    }
};

function writePackedVarint(arr, pbf)   { for (var i = 0; i < arr.length; i++) pbf.writeVarint(arr[i]);   }
function writePackedSVarint(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeSVarint(arr[i]);  }
function writePackedFloat(arr, pbf)    { for (var i = 0; i < arr.length; i++) pbf.writeFloat(arr[i]);    }
function writePackedDouble(arr, pbf)   { for (var i = 0; i < arr.length; i++) pbf.writeDouble(arr[i]);   }
function writePackedBoolean(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeBoolean(arr[i]);  }
function writePackedFixed32(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeFixed32(arr[i]);  }
function writePackedSFixed32(arr, pbf) { for (var i = 0; i < arr.length; i++) pbf.writeSFixed32(arr[i]); }
function writePackedFixed64(arr, pbf)  { for (var i = 0; i < arr.length; i++) pbf.writeFixed64(arr[i]);  }
function writePackedSFixed64(arr, pbf) { for (var i = 0; i < arr.length; i++) pbf.writeSFixed64(arr[i]); }

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9wYmYvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gUGJmO1xuXG52YXIgQnVmZmVyID0gZ2xvYmFsLkJ1ZmZlciB8fCByZXF1aXJlKCcuL2J1ZmZlcicpO1xuXG5mdW5jdGlvbiBQYmYoYnVmKSB7XG4gICAgdGhpcy5idWYgPSAhQnVmZmVyLmlzQnVmZmVyKGJ1ZikgPyBuZXcgQnVmZmVyKGJ1ZiB8fCAwKSA6IGJ1ZjtcbiAgICB0aGlzLnBvcyA9IDA7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLmJ1Zi5sZW5ndGg7XG59XG5cblBiZi5WYXJpbnQgID0gMDsgLy8gdmFyaW50OiBpbnQzMiwgaW50NjQsIHVpbnQzMiwgdWludDY0LCBzaW50MzIsIHNpbnQ2NCwgYm9vbCwgZW51bVxuUGJmLkZpeGVkNjQgPSAxOyAvLyA2NC1iaXQ6IGRvdWJsZSwgZml4ZWQ2NCwgc2ZpeGVkNjRcblBiZi5CeXRlcyAgID0gMjsgLy8gbGVuZ3RoLWRlbGltaXRlZDogc3RyaW5nLCBieXRlcywgZW1iZWRkZWQgbWVzc2FnZXMsIHBhY2tlZCByZXBlYXRlZCBmaWVsZHNcblBiZi5GaXhlZDMyID0gNTsgLy8gMzItYml0OiBmbG9hdCwgZml4ZWQzMiwgc2ZpeGVkMzJcblxudmFyIFNISUZUX0xFRlRfMzIgPSAoMSA8PCAxNikgKiAoMSA8PCAxNiksXG4gICAgU0hJRlRfUklHSFRfMzIgPSAxIC8gU0hJRlRfTEVGVF8zMixcbiAgICBQT1dfMl82MyA9IE1hdGgucG93KDIsIDYzKTtcblxuUGJmLnByb3RvdHlwZSA9IHtcblxuICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmJ1ZiA9IG51bGw7XG4gICAgfSxcblxuICAgIC8vID09PSBSRUFESU5HID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICByZWFkRmllbGRzOiBmdW5jdGlvbihyZWFkRmllbGQsIHJlc3VsdCwgZW5kKSB7XG4gICAgICAgIGVuZCA9IGVuZCB8fCB0aGlzLmxlbmd0aDtcblxuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgIHZhciB2YWwgPSB0aGlzLnJlYWRWYXJpbnQoKSxcbiAgICAgICAgICAgICAgICB0YWcgPSB2YWwgPj4gMyxcbiAgICAgICAgICAgICAgICBzdGFydFBvcyA9IHRoaXMucG9zO1xuXG4gICAgICAgICAgICByZWFkRmllbGQodGFnLCByZXN1bHQsIHRoaXMpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5wb3MgPT09IHN0YXJ0UG9zKSB0aGlzLnNraXAodmFsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICByZWFkTWVzc2FnZTogZnVuY3Rpb24ocmVhZEZpZWxkLCByZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVhZEZpZWxkcyhyZWFkRmllbGQsIHJlc3VsdCwgdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcyk7XG4gICAgfSxcblxuICAgIHJlYWRGaXhlZDMyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbCA9IHRoaXMuYnVmLnJlYWRVSW50MzJMRSh0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIHJlYWRTRml4ZWQzMjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWwgPSB0aGlzLmJ1Zi5yZWFkSW50MzJMRSh0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIC8vIDY0LWJpdCBpbnQgaGFuZGxpbmcgaXMgYmFzZWQgb24gZ2l0aHViLmNvbS9kcHcvbm9kZS1idWZmZXItbW9yZS1pbnRzIChNSVQtbGljZW5zZWQpXG5cbiAgICByZWFkRml4ZWQ2NDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWwgPSB0aGlzLmJ1Zi5yZWFkVUludDMyTEUodGhpcy5wb3MpICsgdGhpcy5idWYucmVhZFVJbnQzMkxFKHRoaXMucG9zICsgNCkgKiBTSElGVF9MRUZUXzMyO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG5cbiAgICByZWFkU0ZpeGVkNjQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gdGhpcy5idWYucmVhZFVJbnQzMkxFKHRoaXMucG9zKSArIHRoaXMuYnVmLnJlYWRJbnQzMkxFKHRoaXMucG9zICsgNCkgKiBTSElGVF9MRUZUXzMyO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG5cbiAgICByZWFkRmxvYXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gdGhpcy5idWYucmVhZEZsb2F0TEUodGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG5cbiAgICByZWFkRG91YmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbCA9IHRoaXMuYnVmLnJlYWREb3VibGVMRSh0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIHJlYWRWYXJpbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYnVmID0gdGhpcy5idWYsXG4gICAgICAgICAgICB2YWwsIGIsIGIwLCBiMSwgYjIsIGIzO1xuXG4gICAgICAgIGIwID0gYnVmW3RoaXMucG9zKytdOyBpZiAoYjAgPCAweDgwKSByZXR1cm4gYjA7ICAgICAgICAgICAgICAgICBiMCA9IGIwICYgMHg3ZjtcbiAgICAgICAgYjEgPSBidWZbdGhpcy5wb3MrK107IGlmIChiMSA8IDB4ODApIHJldHVybiBiMCB8IGIxIDw8IDc7ICAgICAgIGIxID0gKGIxICYgMHg3ZikgPDwgNztcbiAgICAgICAgYjIgPSBidWZbdGhpcy5wb3MrK107IGlmIChiMiA8IDB4ODApIHJldHVybiBiMCB8IGIxIHwgYjIgPDwgMTQ7IGIyID0gKGIyICYgMHg3ZikgPDwgMTQ7XG4gICAgICAgIGIzID0gYnVmW3RoaXMucG9zKytdOyBpZiAoYjMgPCAweDgwKSByZXR1cm4gYjAgfCBiMSB8IGIyIHwgYjMgPDwgMjE7XG5cbiAgICAgICAgdmFsID0gYjAgfCBiMSB8IGIyIHwgKGIzICYgMHg3ZikgPDwgMjE7XG5cbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICs9IChiICYgMHg3ZikgKiAweDEwMDAwMDAwOyAgICAgICAgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICs9IChiICYgMHg3ZikgKiAweDgwMDAwMDAwMDsgICAgICAgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICs9IChiICYgMHg3ZikgKiAweDQwMDAwMDAwMDAwOyAgICAgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICs9IChiICYgMHg3ZikgKiAweDIwMDAwMDAwMDAwMDA7ICAgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICs9IChiICYgMHg3ZikgKiAweDEwMDAwMDAwMDAwMDAwMDsgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICs9IChiICYgMHg3ZikgKiAweDgwMDAwMDAwMDAwMDAwMDA7IGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIHZhcmludCBub3QgbW9yZSB0aGFuIDEwIGJ5dGVzJyk7XG4gICAgfSxcblxuICAgIHJlYWRWYXJpbnQ2NDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGFydFBvcyA9IHRoaXMucG9zLFxuICAgICAgICAgICAgdmFsID0gdGhpcy5yZWFkVmFyaW50KCk7XG5cbiAgICAgICAgaWYgKHZhbCA8IFBPV18yXzYzKSByZXR1cm4gdmFsO1xuXG4gICAgICAgIHZhciBwb3MgPSB0aGlzLnBvcyAtIDI7XG4gICAgICAgIHdoaWxlICh0aGlzLmJ1Zltwb3NdID09PSAweGZmKSBwb3MtLTtcbiAgICAgICAgaWYgKHBvcyA8IHN0YXJ0UG9zKSBwb3MgPSBzdGFydFBvcztcblxuICAgICAgICB2YWwgPSAwO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvcyAtIHN0YXJ0UG9zICsgMTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYiA9IH50aGlzLmJ1ZltzdGFydFBvcyArIGldICYgMHg3ZjtcbiAgICAgICAgICAgIHZhbCArPSBpIDwgNCA/IGIgPDwgaSAqIDcgOiBiICogTWF0aC5wb3coMiwgaSAqIDcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIC12YWwgLSAxO1xuICAgIH0sXG5cbiAgICByZWFkU1ZhcmludDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBudW0gPSB0aGlzLnJlYWRWYXJpbnQoKTtcbiAgICAgICAgcmV0dXJuIG51bSAlIDIgPT09IDEgPyAobnVtICsgMSkgLyAtMiA6IG51bSAvIDI7IC8vIHppZ3phZyBlbmNvZGluZ1xuICAgIH0sXG5cbiAgICByZWFkQm9vbGVhbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBCb29sZWFuKHRoaXMucmVhZFZhcmludCgpKTtcbiAgICB9LFxuXG4gICAgcmVhZFN0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBlbmQgPSB0aGlzLnJlYWRWYXJpbnQoKSArIHRoaXMucG9zLFxuICAgICAgICAgICAgc3RyID0gdGhpcy5idWYudG9TdHJpbmcoJ3V0ZjgnLCB0aGlzLnBvcywgZW5kKTtcbiAgICAgICAgdGhpcy5wb3MgPSBlbmQ7XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfSxcblxuICAgIHJlYWRCeXRlczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBlbmQgPSB0aGlzLnJlYWRWYXJpbnQoKSArIHRoaXMucG9zLFxuICAgICAgICAgICAgYnVmZmVyID0gdGhpcy5idWYuc2xpY2UodGhpcy5wb3MsIGVuZCk7XG4gICAgICAgIHRoaXMucG9zID0gZW5kO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH0sXG5cbiAgICAvLyB2ZXJib3NlIGZvciBwZXJmb3JtYW5jZSByZWFzb25zOyBkb2Vzbid0IGFmZmVjdCBnemlwcGVkIHNpemVcblxuICAgIHJlYWRQYWNrZWRWYXJpbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZW5kID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcywgYXJyID0gW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkVmFyaW50KCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZFNWYXJpbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZW5kID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcywgYXJyID0gW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkU1ZhcmludCgpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuICAgIHJlYWRQYWNrZWRCb29sZWFuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3MsIGFyciA9IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZEJvb2xlYW4oKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkRmxvYXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZW5kID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcywgYXJyID0gW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkRmxvYXQoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkRG91YmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3MsIGFyciA9IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZERvdWJsZSgpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuICAgIHJlYWRQYWNrZWRGaXhlZDMyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3MsIGFyciA9IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZEZpeGVkMzIoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkU0ZpeGVkMzI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZW5kID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcywgYXJyID0gW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkU0ZpeGVkMzIoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkRml4ZWQ2NDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBlbmQgPSB0aGlzLnJlYWRWYXJpbnQoKSArIHRoaXMucG9zLCBhcnIgPSBbXTtcbiAgICAgICAgd2hpbGUgKHRoaXMucG9zIDwgZW5kKSBhcnIucHVzaCh0aGlzLnJlYWRGaXhlZDY0KCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZFNGaXhlZDY0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3MsIGFyciA9IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZFNGaXhlZDY0KCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG5cbiAgICBza2lwOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdmFyIHR5cGUgPSB2YWwgJiAweDc7XG4gICAgICAgIGlmICh0eXBlID09PSBQYmYuVmFyaW50KSB3aGlsZSAodGhpcy5idWZbdGhpcy5wb3MrK10gPiAweDdmKSB7fVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBQYmYuQnl0ZXMpIHRoaXMucG9zID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcztcbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gUGJmLkZpeGVkMzIpIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFBiZi5GaXhlZDY0KSB0aGlzLnBvcyArPSA4O1xuICAgICAgICBlbHNlIHRocm93IG5ldyBFcnJvcignVW5pbXBsZW1lbnRlZCB0eXBlOiAnICsgdHlwZSk7XG4gICAgfSxcblxuICAgIC8vID09PSBXUklUSU5HID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICB3cml0ZVRhZzogZnVuY3Rpb24odGFnLCB0eXBlKSB7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnQoKHRhZyA8PCAzKSB8IHR5cGUpO1xuICAgIH0sXG5cbiAgICByZWFsbG9jOiBmdW5jdGlvbihtaW4pIHtcbiAgICAgICAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoIHx8IDE2O1xuXG4gICAgICAgIHdoaWxlIChsZW5ndGggPCB0aGlzLnBvcyArIG1pbikgbGVuZ3RoICo9IDI7XG5cbiAgICAgICAgaWYgKGxlbmd0aCAhPT0gdGhpcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciBidWYgPSBuZXcgQnVmZmVyKGxlbmd0aCk7XG4gICAgICAgICAgICB0aGlzLmJ1Zi5jb3B5KGJ1Zik7XG4gICAgICAgICAgICB0aGlzLmJ1ZiA9IGJ1ZjtcbiAgICAgICAgICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGZpbmlzaDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5wb3M7XG4gICAgICAgIHRoaXMucG9zID0gMDtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVmLnNsaWNlKDAsIHRoaXMubGVuZ3RoKTtcbiAgICB9LFxuXG4gICAgd3JpdGVGaXhlZDMyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDQpO1xuICAgICAgICB0aGlzLmJ1Zi53cml0ZVVJbnQzMkxFKHZhbCwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgIH0sXG5cbiAgICB3cml0ZVNGaXhlZDMyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDQpO1xuICAgICAgICB0aGlzLmJ1Zi53cml0ZUludDMyTEUodmFsLCB0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgfSxcblxuICAgIHdyaXRlRml4ZWQ2NDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMucmVhbGxvYyg4KTtcbiAgICAgICAgdGhpcy5idWYud3JpdGVJbnQzMkxFKHZhbCAmIC0xLCB0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMuYnVmLndyaXRlVUludDMyTEUoTWF0aC5mbG9vcih2YWwgKiBTSElGVF9SSUdIVF8zMiksIHRoaXMucG9zICsgNCk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgfSxcblxuICAgIHdyaXRlU0ZpeGVkNjQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB0aGlzLnJlYWxsb2MoOCk7XG4gICAgICAgIHRoaXMuYnVmLndyaXRlSW50MzJMRSh2YWwgJiAtMSwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLmJ1Zi53cml0ZUludDMyTEUoTWF0aC5mbG9vcih2YWwgKiBTSElGVF9SSUdIVF8zMiksIHRoaXMucG9zICsgNCk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgfSxcblxuICAgIHdyaXRlVmFyaW50OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdmFsID0gK3ZhbDtcblxuICAgICAgICBpZiAodmFsIDw9IDB4N2YpIHtcbiAgICAgICAgICAgIHRoaXMucmVhbGxvYygxKTtcbiAgICAgICAgICAgIHRoaXMuYnVmW3RoaXMucG9zKytdID0gdmFsO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodmFsIDw9IDB4M2ZmZikge1xuICAgICAgICAgICAgdGhpcy5yZWFsbG9jKDIpO1xuICAgICAgICAgICAgdGhpcy5idWZbdGhpcy5wb3MrK10gPSAoKHZhbCA+Pj4gMCkgJiAweDdmKSB8IDB4ODA7XG4gICAgICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9ICgodmFsID4+PiA3KSAmIDB4N2YpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodmFsIDw9IDB4MWZmZmZmKSB7XG4gICAgICAgICAgICB0aGlzLnJlYWxsb2MoMyk7XG4gICAgICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9ICgodmFsID4+PiAwKSAmIDB4N2YpIHwgMHg4MDtcbiAgICAgICAgICAgIHRoaXMuYnVmW3RoaXMucG9zKytdID0gKCh2YWwgPj4+IDcpICYgMHg3ZikgfCAweDgwO1xuICAgICAgICAgICAgdGhpcy5idWZbdGhpcy5wb3MrK10gPSAoKHZhbCA+Pj4gMTQpICYgMHg3Zik7XG5cbiAgICAgICAgfSBlbHNlIGlmICh2YWwgPD0gMHhmZmZmZmZmKSB7XG4gICAgICAgICAgICB0aGlzLnJlYWxsb2MoNCk7XG4gICAgICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9ICgodmFsID4+PiAwKSAmIDB4N2YpIHwgMHg4MDtcbiAgICAgICAgICAgIHRoaXMuYnVmW3RoaXMucG9zKytdID0gKCh2YWwgPj4+IDcpICYgMHg3ZikgfCAweDgwO1xuICAgICAgICAgICAgdGhpcy5idWZbdGhpcy5wb3MrK10gPSAoKHZhbCA+Pj4gMTQpICYgMHg3ZikgfCAweDgwO1xuICAgICAgICAgICAgdGhpcy5idWZbdGhpcy5wb3MrK10gPSAoKHZhbCA+Pj4gMjEpICYgMHg3Zik7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwb3MgPSB0aGlzLnBvcztcbiAgICAgICAgICAgIHdoaWxlICh2YWwgPj0gMHg4MCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVhbGxvYygxKTtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9ICh2YWwgJiAweGZmKSB8IDB4ODA7XG4gICAgICAgICAgICAgICAgdmFsIC89IDB4ODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnJlYWxsb2MoMSk7XG4gICAgICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9IHZhbCB8IDA7XG4gICAgICAgICAgICBpZiAodGhpcy5wb3MgLSBwb3MgPiAxMCkgdGhyb3cgbmV3IEVycm9yKCdHaXZlbiB2YXJpbnQgZG9lc25cXCd0IGZpdCBpbnRvIDEwIGJ5dGVzJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgd3JpdGVTVmFyaW50OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludCh2YWwgPCAwID8gLXZhbCAqIDIgLSAxIDogdmFsICogMik7XG4gICAgfSxcblxuICAgIHdyaXRlQm9vbGVhbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnQoQm9vbGVhbih2YWwpKTtcbiAgICB9LFxuXG4gICAgd3JpdGVTdHJpbmc6IGZ1bmN0aW9uKHN0cikge1xuICAgICAgICBzdHIgPSBTdHJpbmcoc3RyKTtcbiAgICAgICAgdmFyIGJ5dGVzID0gQnVmZmVyLmJ5dGVMZW5ndGgoc3RyKTtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludChieXRlcyk7XG4gICAgICAgIHRoaXMucmVhbGxvYyhieXRlcyk7XG4gICAgICAgIHRoaXMuYnVmLndyaXRlKHN0ciwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSBieXRlcztcbiAgICB9LFxuXG4gICAgd3JpdGVGbG9hdDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMucmVhbGxvYyg0KTtcbiAgICAgICAgdGhpcy5idWYud3JpdGVGbG9hdExFKHZhbCwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgIH0sXG5cbiAgICB3cml0ZURvdWJsZTogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMucmVhbGxvYyg4KTtcbiAgICAgICAgdGhpcy5idWYud3JpdGVEb3VibGVMRSh2YWwsIHRoaXMucG9zKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gODtcbiAgICB9LFxuXG4gICAgd3JpdGVCeXRlczogZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgIHZhciBsZW4gPSBidWZmZXIubGVuZ3RoO1xuICAgICAgICB0aGlzLndyaXRlVmFyaW50KGxlbik7XG4gICAgICAgIHRoaXMucmVhbGxvYyhsZW4pO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9IGJ1ZmZlcltpXTtcbiAgICB9LFxuXG4gICAgd3JpdGVSYXdNZXNzYWdlOiBmdW5jdGlvbihmbiwgb2JqKSB7XG4gICAgICAgIHRoaXMucG9zKys7IC8vIHJlc2VydmUgMSBieXRlIGZvciBzaG9ydCBtZXNzYWdlIGxlbmd0aFxuXG4gICAgICAgIC8vIHdyaXRlIHRoZSBtZXNzYWdlIGRpcmVjdGx5IHRvIHRoZSBidWZmZXIgYW5kIHNlZSBob3cgbXVjaCB3YXMgd3JpdHRlblxuICAgICAgICB2YXIgc3RhcnRQb3MgPSB0aGlzLnBvcztcbiAgICAgICAgZm4ob2JqLCB0aGlzKTtcbiAgICAgICAgdmFyIGxlbiA9IHRoaXMucG9zIC0gc3RhcnRQb3M7XG5cbiAgICAgICAgdmFyIHZhcmludExlbiA9XG4gICAgICAgICAgICBsZW4gPD0gMHg3ZiA/IDEgOlxuICAgICAgICAgICAgbGVuIDw9IDB4M2ZmZiA/IDIgOlxuICAgICAgICAgICAgbGVuIDw9IDB4MWZmZmZmID8gMyA6XG4gICAgICAgICAgICBsZW4gPD0gMHhmZmZmZmZmID8gNCA6IE1hdGguY2VpbChNYXRoLmxvZyhsZW4pIC8gKE1hdGguTE4yICogNykpO1xuXG4gICAgICAgIC8vIGlmIDEgYnl0ZSBpc24ndCBlbm91Z2ggZm9yIGVuY29kaW5nIG1lc3NhZ2UgbGVuZ3RoLCBzaGlmdCB0aGUgZGF0YSB0byB0aGUgcmlnaHRcbiAgICAgICAgaWYgKHZhcmludExlbiA+IDEpIHtcbiAgICAgICAgICAgIHRoaXMucmVhbGxvYyh2YXJpbnRMZW4gLSAxKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSB0aGlzLnBvcyAtIDE7IGkgPj0gc3RhcnRQb3M7IGktLSkgdGhpcy5idWZbaSArIHZhcmludExlbiAtIDFdID0gdGhpcy5idWZbaV07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmaW5hbGx5LCB3cml0ZSB0aGUgbWVzc2FnZSBsZW5ndGggaW4gdGhlIHJlc2VydmVkIHBsYWNlIGFuZCByZXN0b3JlIHRoZSBwb3NpdGlvblxuICAgICAgICB0aGlzLnBvcyA9IHN0YXJ0UG9zIC0gMTtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludChsZW4pO1xuICAgICAgICB0aGlzLnBvcyArPSBsZW47XG4gICAgfSxcblxuICAgIHdyaXRlTWVzc2FnZTogZnVuY3Rpb24odGFnLCBmbiwgb2JqKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlUmF3TWVzc2FnZShmbiwgb2JqKTtcbiAgICB9LFxuXG4gICAgd3JpdGVQYWNrZWRWYXJpbnQ6ICAgZnVuY3Rpb24odGFnLCBhcnIpIHsgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZFZhcmludCwgYXJyKTsgICB9LFxuICAgIHdyaXRlUGFja2VkU1ZhcmludDogIGZ1bmN0aW9uKHRhZywgYXJyKSB7IHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRTVmFyaW50LCBhcnIpOyAgfSxcbiAgICB3cml0ZVBhY2tlZEJvb2xlYW46ICBmdW5jdGlvbih0YWcsIGFycikgeyB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkQm9vbGVhbiwgYXJyKTsgIH0sXG4gICAgd3JpdGVQYWNrZWRGbG9hdDogICAgZnVuY3Rpb24odGFnLCBhcnIpIHsgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZEZsb2F0LCBhcnIpOyAgICB9LFxuICAgIHdyaXRlUGFja2VkRG91YmxlOiAgIGZ1bmN0aW9uKHRhZywgYXJyKSB7IHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWREb3VibGUsIGFycik7ICAgfSxcbiAgICB3cml0ZVBhY2tlZEZpeGVkMzI6ICBmdW5jdGlvbih0YWcsIGFycikgeyB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkRml4ZWQzMiwgYXJyKTsgIH0sXG4gICAgd3JpdGVQYWNrZWRTRml4ZWQzMjogZnVuY3Rpb24odGFnLCBhcnIpIHsgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZFNGaXhlZDMyLCBhcnIpOyB9LFxuICAgIHdyaXRlUGFja2VkRml4ZWQ2NDogIGZ1bmN0aW9uKHRhZywgYXJyKSB7IHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRGaXhlZDY0LCBhcnIpOyAgfSxcbiAgICB3cml0ZVBhY2tlZFNGaXhlZDY0OiBmdW5jdGlvbih0YWcsIGFycikgeyB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkU0ZpeGVkNjQsIGFycik7IH0sXG5cbiAgICB3cml0ZUJ5dGVzRmllbGQ6IGZ1bmN0aW9uKHRhZywgYnVmZmVyKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlQnl0ZXMoYnVmZmVyKTtcbiAgICB9LFxuICAgIHdyaXRlRml4ZWQzMkZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkMzIpO1xuICAgICAgICB0aGlzLndyaXRlRml4ZWQzMih2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTRml4ZWQzMkZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkMzIpO1xuICAgICAgICB0aGlzLndyaXRlU0ZpeGVkMzIodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlRml4ZWQ2NEZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkNjQpO1xuICAgICAgICB0aGlzLndyaXRlRml4ZWQ2NCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTRml4ZWQ2NEZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkNjQpO1xuICAgICAgICB0aGlzLndyaXRlU0ZpeGVkNjQodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlVmFyaW50RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuVmFyaW50KTtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTVmFyaW50RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuVmFyaW50KTtcbiAgICAgICAgdGhpcy53cml0ZVNWYXJpbnQodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlU3RyaW5nRmllbGQ6IGZ1bmN0aW9uKHRhZywgc3RyKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlU3RyaW5nKHN0cik7XG4gICAgfSxcbiAgICB3cml0ZUZsb2F0RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuRml4ZWQzMik7XG4gICAgICAgIHRoaXMud3JpdGVGbG9hdCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVEb3VibGVGaWVsZDogZnVuY3Rpb24odGFnLCB2YWwpIHtcbiAgICAgICAgdGhpcy53cml0ZVRhZyh0YWcsIFBiZi5GaXhlZDY0KTtcbiAgICAgICAgdGhpcy53cml0ZURvdWJsZSh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVCb29sZWFuRmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnRGaWVsZCh0YWcsIEJvb2xlYW4odmFsKSk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gd3JpdGVQYWNrZWRWYXJpbnQoYXJyLCBwYmYpICAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlVmFyaW50KGFycltpXSk7ICAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRTVmFyaW50KGFyciwgcGJmKSAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlU1ZhcmludChhcnJbaV0pOyAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRGbG9hdChhcnIsIHBiZikgICAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlRmxvYXQoYXJyW2ldKTsgICAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWREb3VibGUoYXJyLCBwYmYpICAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlRG91YmxlKGFycltpXSk7ICAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRCb29sZWFuKGFyciwgcGJmKSAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlQm9vbGVhbihhcnJbaV0pOyAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRGaXhlZDMyKGFyciwgcGJmKSAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlRml4ZWQzMihhcnJbaV0pOyAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRTRml4ZWQzMihhcnIsIHBiZikgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlU0ZpeGVkMzIoYXJyW2ldKTsgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRGaXhlZDY0KGFyciwgcGJmKSAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlRml4ZWQ2NChhcnJbaV0pOyAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRTRml4ZWQ2NChhcnIsIHBiZikgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlU0ZpeGVkNjQoYXJyW2ldKTsgfVxuIl19
},{"./buffer":2}],4:[function(require,module,exports){
'use strict';

module.exports = Point;

function Point(x, y) {
    this.x = x;
    this.y = y;
}

Point.prototype = {
    clone: function() { return new Point(this.x, this.y); },

    add:     function(p) { return this.clone()._add(p);     },
    sub:     function(p) { return this.clone()._sub(p);     },
    mult:    function(k) { return this.clone()._mult(k);    },
    div:     function(k) { return this.clone()._div(k);     },
    rotate:  function(a) { return this.clone()._rotate(a);  },
    matMult: function(m) { return this.clone()._matMult(m); },
    unit:    function() { return this.clone()._unit(); },
    perp:    function() { return this.clone()._perp(); },
    round:   function() { return this.clone()._round(); },

    mag: function() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },

    equals: function(p) {
        return this.x === p.x &&
               this.y === p.y;
    },

    dist: function(p) {
        return Math.sqrt(this.distSqr(p));
    },

    distSqr: function(p) {
        var dx = p.x - this.x,
            dy = p.y - this.y;
        return dx * dx + dy * dy;
    },

    angle: function() {
        return Math.atan2(this.y, this.x);
    },

    angleTo: function(b) {
        return Math.atan2(this.y - b.y, this.x - b.x);
    },

    angleWith: function(b) {
        return this.angleWithSep(b.x, b.y);
    },

    // Find the angle of the two vectors, solving the formula for the cross product a x b = |a||b|sin(θ) for θ.
    angleWithSep: function(x, y) {
        return Math.atan2(
            this.x * y - this.y * x,
            this.x * x + this.y * y);
    },

    _matMult: function(m) {
        var x = m[0] * this.x + m[1] * this.y,
            y = m[2] * this.x + m[3] * this.y;
        this.x = x;
        this.y = y;
        return this;
    },

    _add: function(p) {
        this.x += p.x;
        this.y += p.y;
        return this;
    },

    _sub: function(p) {
        this.x -= p.x;
        this.y -= p.y;
        return this;
    },

    _mult: function(k) {
        this.x *= k;
        this.y *= k;
        return this;
    },

    _div: function(k) {
        this.x /= k;
        this.y /= k;
        return this;
    },

    _unit: function() {
        this._div(this.mag());
        return this;
    },

    _perp: function() {
        var y = this.y;
        this.y = this.x;
        this.x = -y;
        return this;
    },

    _rotate: function(angle) {
        var cos = Math.cos(angle),
            sin = Math.sin(angle),
            x = cos * this.x - sin * this.y,
            y = sin * this.x + cos * this.y;
        this.x = x;
        this.y = y;
        return this;
    },

    _round: function() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }
};

// constructs Point from an array if necessary
Point.convert = function (a) {
    if (a instanceof Point) {
        return a;
    }
    if (Array.isArray(a)) {
        return new Point(a[0], a[1]);
    }
    return a;
};

},{}],5:[function(require,module,exports){
module.exports.VectorTile = require('./lib/vectortile.js');
module.exports.VectorTileFeature = require('./lib/vectortilefeature.js');
module.exports.VectorTileLayer = require('./lib/vectortilelayer.js');

},{"./lib/vectortile.js":6,"./lib/vectortilefeature.js":7,"./lib/vectortilelayer.js":8}],6:[function(require,module,exports){
'use strict';

var VectorTileLayer = require('./vectortilelayer');

module.exports = VectorTile;

function VectorTile(pbf, end) {
    this.layers = pbf.readFields(readTile, {}, end);
}

function readTile(tag, layers, pbf) {
    if (tag === 3) {
        var layer = new VectorTileLayer(pbf, pbf.readVarint() + pbf.pos);
        if (layer.length) layers[layer.name] = layer;
    }
}


},{"./vectortilelayer":8}],7:[function(require,module,exports){
'use strict';

var Point = require('point-geometry');

module.exports = VectorTileFeature;

function VectorTileFeature(pbf, end, extent, keys, values) {
    // Public
    this.properties = {};
    this.extent = extent;
    this.type = 0;

    // Private
    this._pbf = pbf;
    this._geometry = -1;
    this._keys = keys;
    this._values = values;

    pbf.readFields(readFeature, this, end);
}

function readFeature(tag, feature, pbf) {
    if (tag == 1) feature._id = pbf.readVarint();
    else if (tag == 2) readTag(pbf, feature);
    else if (tag == 3) feature.type = pbf.readVarint();
    else if (tag == 4) feature._geometry = pbf.pos;
}

function readTag(pbf, feature) {
    var end = pbf.readVarint() + pbf.pos;

    while (pbf.pos < end) {
        var key = feature._keys[pbf.readVarint()],
            value = feature._values[pbf.readVarint()];
        feature.properties[key] = value;
    }
}

VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];

VectorTileFeature.prototype.loadGeometry = function() {
    var pbf = this._pbf;
    pbf.pos = this._geometry;

    var end = pbf.readVarint() + pbf.pos,
        cmd = 1,
        length = 0,
        x = 0,
        y = 0,
        lines = [],
        line;

    while (pbf.pos < end) {
        if (!length) {
            var cmdLen = pbf.readVarint();
            cmd = cmdLen & 0x7;
            length = cmdLen >> 3;
        }

        length--;

        if (cmd === 1 || cmd === 2) {
            x += pbf.readSVarint();
            y += pbf.readSVarint();

            if (cmd === 1) { // moveTo
                if (line) lines.push(line);
                line = [];
            }

            line.push(new Point(x, y));

        } else if (cmd === 7) {

            // Workaround for https://github.com/mapbox/mapnik-vector-tile/issues/90
            if (line) {
                line.push(line[0].clone()); // closePolygon
            }

        } else {
            throw new Error('unknown command ' + cmd);
        }
    }

    if (line) lines.push(line);

    return lines;
};

VectorTileFeature.prototype.bbox = function() {
    var pbf = this._pbf;
    pbf.pos = this._geometry;

    var end = pbf.readVarint() + pbf.pos,
        cmd = 1,
        length = 0,
        x = 0,
        y = 0,
        x1 = Infinity,
        x2 = -Infinity,
        y1 = Infinity,
        y2 = -Infinity;

    while (pbf.pos < end) {
        if (!length) {
            var cmdLen = pbf.readVarint();
            cmd = cmdLen & 0x7;
            length = cmdLen >> 3;
        }

        length--;

        if (cmd === 1 || cmd === 2) {
            x += pbf.readSVarint();
            y += pbf.readSVarint();
            if (x < x1) x1 = x;
            if (x > x2) x2 = x;
            if (y < y1) y1 = y;
            if (y > y2) y2 = y;

        } else if (cmd !== 7) {
            throw new Error('unknown command ' + cmd);
        }
    }

    return [x1, y1, x2, y2];
};

VectorTileFeature.prototype.toGeoJSON = function(x, y, z) {
    var size = this.extent * Math.pow(2, z),
        x0 = this.extent * x,
        y0 = this.extent * y,
        coords = this.loadGeometry(),
        type = VectorTileFeature.types[this.type];

    for (var i = 0; i < coords.length; i++) {
        var line = coords[i];
        for (var j = 0; j < line.length; j++) {
            var p = line[j], y2 = 180 - (p.y + y0) * 360 / size;
            line[j] = [
                (p.x + x0) * 360 / size - 180,
                360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90
            ];
        }
    }

    if (type === 'Point' && coords.length === 1) {
        coords = coords[0][0];
    } else if (type === 'Point') {
        coords = coords[0];
        type = 'MultiPoint';
    } else if (type === 'LineString' && coords.length === 1) {
        coords = coords[0];
    } else if (type === 'LineString') {
        type = 'MultiLineString';
    }

    return {
        type: "Feature",
        geometry: {
            type: type,
            coordinates: coords
        },
        properties: this.properties
    };
};

},{"point-geometry":4}],8:[function(require,module,exports){
'use strict';

var VectorTileFeature = require('./vectortilefeature.js');

module.exports = VectorTileLayer;

function VectorTileLayer(pbf, end) {
    // Public
    this.version = 1;
    this.name = null;
    this.extent = 4096;
    this.length = 0;

    // Private
    this._pbf = pbf;
    this._keys = [];
    this._values = [];
    this._features = [];

    pbf.readFields(readLayer, this, end);

    this.length = this._features.length;
}

function readLayer(tag, layer, pbf) {
    if (tag === 15) layer.version = pbf.readVarint();
    else if (tag === 1) layer.name = pbf.readString();
    else if (tag === 5) layer.extent = pbf.readVarint();
    else if (tag === 2) layer._features.push(pbf.pos);
    else if (tag === 3) layer._keys.push(pbf.readString());
    else if (tag === 4) layer._values.push(readValueMessage(pbf));
}

function readValueMessage(pbf) {
    var value = null,
        end = pbf.readVarint() + pbf.pos;

    while (pbf.pos < end) {
        var tag = pbf.readVarint() >> 3;

        value = tag === 1 ? pbf.readString() :
            tag === 2 ? pbf.readFloat() :
            tag === 3 ? pbf.readDouble() :
            tag === 4 ? pbf.readVarint64() :
            tag === 5 ? pbf.readVarint() :
            tag === 6 ? pbf.readSVarint() :
            tag === 7 ? pbf.readBoolean() : null;
    }

    return value;
}

// return feature `i` from this layer as a `VectorTileFeature`
VectorTileLayer.prototype.feature = function(i) {
    if (i < 0 || i >= this._features.length) throw new Error('feature index out of bounds');

    this._pbf.pos = this._features[i];

    var end = this._pbf.readVarint() + this._pbf.pos;
    return new VectorTileFeature(this._pbf, end, this.extent, this._keys, this._values);
};

},{"./vectortilefeature.js":7}],9:[function(require,module,exports){
/**
 * Created by Ryan Whitley, Daniel Duarte, and Nicholas Hallahan
 *    on 6/03/14.
 */
var Util = require('./MVTUtil');
var StaticLabel = require('./StaticLabel/StaticLabel.js');

module.exports = MVTFeature;

function MVTFeature(mvtLayer, vtf, ctx, id, style) {
  if (!vtf) return null;

  // Apply all of the properties of vtf to this object.
  for (var key in vtf) {
    this[key] = vtf[key];
  }

  this.mvtLayer = mvtLayer;
  this.mvtSource = mvtLayer.mvtSource;
  this.map = mvtLayer.mvtSource.map;

  this.id = id;

  this.layerLink = this.mvtSource.layerLink;
  this.toggleEnabled = true;
  this.selected = false;

  // how much we divide the coordinate from the vector tile
  this.divisor = vtf.extent / ctx.tileSize;
  this.extent = vtf.extent;
  this.tileSize = ctx.tileSize;

  //An object to store the paths and contexts for this feature
  this.tiles = {};

  this.style = style;

  //Add to the collection
  this.addTileFeature(vtf, ctx);

  var self = this;
  this.map.on('zoomend', function() {
    self.staticLabel = null;
  });

  if (style && style.dynamicLabel && typeof style.dynamicLabel === 'function') {
    this.dynamicLabel = this.mvtSource.dynamicLabel.createFeature(this);
  }

  ajax(self);
}


function ajax(self) {
  var style = self.style;
  if (style && style.ajaxSource && typeof style.ajaxSource === 'function') {
    var ajaxEndpoint = style.ajaxSource(self);
    if (ajaxEndpoint) {
      Util.getJSON(ajaxEndpoint, function(error, response, body) {
        if (error) {
          throw ['ajaxSource AJAX Error', error];
        } else {
          ajaxCallback(self, response);
          return true;
        }
      });
    }
  }
  return false;
}

function ajaxCallback(self, response) {
  self.ajaxData = response;

  /**
   * You can attach a callback function to a feature in your app
   * that will get called whenever new ajaxData comes in. This
   * can be used to update UI that looks at data from within a feature.
   *
   * setStyle may possibly have a style with a different ajaxData source,
   * and you would potentially get new contextual data for your feature.
   *
   * TODO: This needs to be documented.
   */
  if (typeof self.ajaxDataReceived === 'function') {
    self.ajaxDataReceived(self, response);
  }

  self._setStyle(self.mvtLayer.style);
  redrawTiles(self);
}

MVTFeature.prototype._setStyle = function(styleFn) {
  this.style = styleFn(this, this.ajaxData);

  // The label gets removed, and the (re)draw,
  // that is initiated by the MVTLayer creates a new label.
  this.removeLabel();
};

MVTFeature.prototype.setStyle = function(styleFn) {
  this.ajaxData = null;
  this.style = styleFn(this, null);
  var hasAjaxSource = ajax(this);
  if (!hasAjaxSource) {
    // The label gets removed, and the (re)draw,
    // that is initiated by the MVTLayer creates a new label.
    this.removeLabel();
  }
};

MVTFeature.prototype.draw = function(canvasID) {
  //Get the info from the tiles list
  var tileInfo =  this.tiles[canvasID];

  var vtf = tileInfo.vtf;
  var ctx = tileInfo.ctx;

  //Get the actual canvas from the parent layer's _tiles object.
  var xy = canvasID.split(":").slice(1, 3).join(":");
  ctx.canvas = this.mvtLayer._tiles[xy];

//  This could be used to directly compute the style function from the layer on every draw.
//  This is much less efficient...
//  this.style = this.mvtLayer.style(this);

  if (this.selected) {
    var style = this.style.selected || this.style;
  } else {
    var style = this.style;
  }

  switch (vtf.type) {
    case 1: //Point
      this._drawPoint(ctx, vtf.coordinates, style);
      if (!this.staticLabel && typeof this.style.staticLabel === 'function') {
        if (this.style.ajaxSource && !this.ajaxData) {
          break;
        }
        this._drawStaticLabel(ctx, vtf.coordinates, style);
      }
      break;

    case 2: //LineString
      this._drawLineString(ctx, vtf.coordinates, style);
      break;

    case 3: //Polygon
      this._drawPolygon(ctx, vtf.coordinates, style);
      break;

    default:
      throw new Error('Unmanaged type: ' + vtf.type);
  }

};

MVTFeature.prototype.getPathsForTile = function(canvasID) {
  //Get the info from the parts list
  return this.tiles[canvasID].paths;
};

MVTFeature.prototype.addTileFeature = function(vtf, ctx) {
  //Store the important items in the tiles list

  //We only want to store info for tiles for the current map zoom.  If it is tile info for another zoom level, ignore it
  //Also, if there are existing tiles in the list for other zoom levels, expunge them.
  var zoom = this.map.getZoom();

  if(ctx.zoom != zoom) return;

  this.clearTileFeatures(zoom); //TODO: This iterates thru all tiles every time a new tile is added.  Figure out a better way to do this.

  this.tiles[ctx.id] = {
    ctx: ctx,
    vtf: vtf,
    paths: []
  };

};


/**
 * Clear the inner list of tile features if they don't match the given zoom.
 *
 * @param zoom
 */
MVTFeature.prototype.clearTileFeatures = function(zoom) {
  //If stored tiles exist for other zoom levels, expunge them from the list.
  for (var key in this.tiles) {
     if(key.split(":")[0] != zoom) delete this.tiles[key];
  }
};

/**
 * Redraws all of the tiles associated with a feature. Useful for
 * style change and toggling.
 *
 * @param self
 */
function redrawTiles(self) {
  //Redraw the whole tile, not just this vtf
  var tiles = self.tiles;
  var mvtLayer = self.mvtLayer;

  for (var id in tiles) {
    var tileZoom = parseInt(id.split(':')[0]);
    var mapZoom = self.map.getZoom();
    if (tileZoom === mapZoom) {
      //Redraw the tile
      mvtLayer.redrawTile(id);
    }
  }
}

MVTFeature.prototype.toggle = function() {
  if (this.selected) {
    this.deselect();
  } else {
    this.select();
  }
};

MVTFeature.prototype.select = function() {
  this.selected = true;
  this.mvtSource.featureSelected(this);
  redrawTiles(this);
  var linkedFeature = this.linkedFeature();
  if (linkedFeature && linkedFeature.staticLabel && !linkedFeature.staticLabel.selected) {
    linkedFeature.staticLabel.select();
  }
};

MVTFeature.prototype.deselect = function() {
  this.selected = false;
  this.mvtSource.featureDeselected(this);
  redrawTiles(this);
  var linkedFeature = this.linkedFeature();
  if (linkedFeature && linkedFeature.staticLabel && linkedFeature.staticLabel.selected) {
    linkedFeature.staticLabel.deselect();
  }
};

MVTFeature.prototype.on = function(eventType, callback) {
  this._eventHandlers[eventType] = callback;
};

MVTFeature.prototype._drawPoint = function(ctx, coordsArray, style) {
  if (!style) return;
  if (!ctx || !ctx.canvas) return;

  var tile = this.tiles[ctx.id];

  //Get radius
  var radius = 1;
  if (typeof style.radius === 'function') {
    radius = style.radius(ctx.zoom); //Allows for scale dependent rednering
  }
  else{
    radius = style.radius;
  }

  var p = this._tilePoint(coordsArray[0][0]);
  var c = ctx.canvas;
  var ctx2d;
  try{
    ctx2d = c.getContext('2d');
  }
  catch(e){
    console.log("_drawPoint error: " + e);
    return;
  }

  ctx2d.beginPath();
  ctx2d.fillStyle = style.color;
  ctx2d.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx2d.closePath();
  ctx2d.fill();

  if(style.lineWidth && style.strokeStyle){
    ctx2d.lineWidth = style.lineWidth;
    ctx2d.strokeStyle = style.strokeStyle;
    ctx2d.stroke();
  }

  ctx2d.restore();
  tile.paths.push([p]);
};

MVTFeature.prototype._drawLineString = function(ctx, coordsArray, style) {
  if (!style) return;
  if (!ctx || !ctx.canvas) return;

  var ctx2d = ctx.canvas.getContext('2d');
  ctx2d.strokeStyle = style.color;
  ctx2d.lineWidth = style.size;
  ctx2d.beginPath();

  var projCoords = [];
  var tile = this.tiles[ctx.id];

  for (var gidx in coordsArray) {
    var coords = coordsArray[gidx];

    for (i = 0; i < coords.length; i++) {
      var method = (i === 0 ? 'move' : 'line') + 'To';
      var proj = this._tilePoint(coords[i]);
      projCoords.push(proj);
      ctx2d[method](proj.x, proj.y);
    }
  }

  ctx2d.stroke();
  ctx2d.restore();

  tile.paths.push(projCoords);
};

MVTFeature.prototype._drawPolygon = function(ctx, coordsArray, style) {
  if (!style) return;
  if (!ctx || !ctx.canvas) return;

  var ctx2d = ctx.canvas.getContext('2d');
  var outline = style.outline;

  // color may be defined via function to make choropleth work right
  if (typeof style.color === 'function') {
    ctx2d.fillStyle = style.color(ctx2d);
  } else {
    ctx2d.fillStyle = style.color;
  }

  if (outline) {
    ctx2d.strokeStyle = outline.color;
    ctx2d.lineWidth = outline.size;
  }
  ctx2d.beginPath();

  var projCoords = [];
  var tile = this.tiles[ctx.id];

  var featureLabel = this.dynamicLabel;
  if (featureLabel) {
    featureLabel.addTilePolys(ctx, coordsArray);
  }

  for (var gidx = 0, len = coordsArray.length; gidx < len; gidx++) {
    var coords = coordsArray[gidx];

    for (var i = 0; i < coords.length; i++) {
      var coord = coords[i];
      var method = (i === 0 ? 'move' : 'line') + 'To';
      var proj = this._tilePoint(coords[i]);
      projCoords.push(proj);
      ctx2d[method](proj.x, proj.y);
    }
  }

  ctx2d.closePath();
  ctx2d.fill();
  if (outline) {
    ctx2d.stroke();
  }

  tile.paths.push(projCoords);

};

MVTFeature.prototype._drawStaticLabel = function(ctx, coordsArray, style) {
  if (!style) return;
  if (!ctx) return;

  // If the corresponding layer is not on the map, 
  // we dont want to put on a label.
  if (!this.mvtLayer._map) return;

  var vecPt = this._tilePoint(coordsArray[0][0]);

  // We're making a standard Leaflet Marker for this label.
  var p = this._project(vecPt, ctx.tile.x, ctx.tile.y, this.extent, this.tileSize); //vectile pt to merc pt
  var mercPt = L.point(p.x, p.y); // make into leaflet obj
  var latLng = this.map.unproject(mercPt); // merc pt to latlng

  this.staticLabel = new StaticLabel(this, ctx, latLng, style);
  this.mvtLayer.featureWithLabelAdded(this);
};

MVTFeature.prototype.removeLabel = function() {
  if (!this.staticLabel) return;
  this.staticLabel.remove();
  this.staticLabel = null;
};

/**
 * Projects a vector tile point to the Spherical Mercator pixel space for a given zoom level.
 *
 * @param vecPt
 * @param tileX
 * @param tileY
 * @param extent
 * @param tileSize
 */
MVTFeature.prototype._project = function(vecPt, tileX, tileY, extent, tileSize) {
  var xOffset = tileX * tileSize;
  var yOffset = tileY * tileSize;
  return {
    x: Math.floor(vecPt.x + xOffset),
    y: Math.floor(vecPt.y + yOffset)
  };
};

/**
 * Takes a coordinate from a vector tile and turns it into a Leaflet Point.
 *
 * @param ctx
 * @param coords
 * @returns {eGeomType.Point}
 * @private
 */
MVTFeature.prototype._tilePoint = function(coords) {
  return new L.Point(coords.x / this.divisor, coords.y / this.divisor);
};

MVTFeature.prototype.linkedFeature = function() {
  var linkedLayer = this.mvtLayer.linkedLayer();
  if(linkedLayer){
    var linkedFeature = linkedLayer.features[this.id];
    return linkedFeature;
  }else{
    return null;
  }
};


},{"./MVTUtil":12,"./StaticLabel/StaticLabel.js":13}],10:[function(require,module,exports){
/**
 * Created by Ryan Whitley on 5/17/14.
 */
/** Forked from https://gist.github.com/DGuidi/1716010 **/
var MVTFeature = require('./MVTFeature');
var Util = require('./MVTUtil');

module.exports = L.TileLayer.Canvas.extend({

  options: {
    debug: false,
    isHiddenLayer: false,
    getIDForLayerFeature: function() {},
    tileSize: 256,
    lineClickTolerance: 2
  },

  _featureIsClicked: {},

  _isPointInPoly: function(pt, poly) {
    if(poly && poly.length) {
      for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
        && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
        && (c = !c);
      return c;
    }
  },

  _getDistanceFromLine: function(pt, pts) {
    var min = Number.POSITIVE_INFINITY;
    if (pts && pts.length > 1) {
      pt = L.point(pt.x, pt.y);
      for (var i = 0, l = pts.length - 1; i < l; i++) {
        var test = this._projectPointOnLineSegment(pt, pts[i], pts[i + 1]);
        if (test.distance <= min) {
          min = test.distance;
        }
      }
    }
    return min;
  },

  _projectPointOnLineSegment: function(p, r0, r1) {
    var lineLength = r0.distanceTo(r1);
    if (lineLength < 1) {
        return {distance: p.distanceTo(r0), coordinate: r0};
    }
    var u = ((p.x - r0.x) * (r1.x - r0.x) + (p.y - r0.y) * (r1.y - r0.y)) / Math.pow(lineLength, 2);
    if (u < 0.0000001) {
        return {distance: p.distanceTo(r0), coordinate: r0};
    }
    if (u > 0.9999999) {
        return {distance: p.distanceTo(r1), coordinate: r1};
    }
    var a = L.point(r0.x + u * (r1.x - r0.x), r0.y + u * (r1.y - r0.y));
    return {distance: p.distanceTo(a), point: a};
  },

  initialize: function(mvtSource, options) {
    var self = this;
    self.mvtSource = mvtSource;
    L.Util.setOptions(this, options);

    this.style = options.style;
    this.name = options.name;
    this._canvasIDToFeatures = {};
    this.features = {};
    this.featuresWithLabels = [];
    this._highestCount = 0;
  },

  onAdd: function(map) {
    var self = this;
    self.map = map;
    L.TileLayer.Canvas.prototype.onAdd.call(this, map);
    map.on('layerremove', function(e) {
      // we only want to do stuff when the layerremove event is on this layer
      if (e.layer._leaflet_id === self._leaflet_id) {
        removeLabels(self);
      }
    });
  },

  drawTile: function(canvas, tilePoint, zoom) {

    var ctx = {
      canvas: canvas,
      tile: tilePoint,
      zoom: zoom,
      tileSize: this.options.tileSize
    };

    ctx.id = Util.getContextID(ctx);

    if (!this._canvasIDToFeatures[ctx.id]) {
      this._initializeFeaturesHash(ctx);
    }
    if (!this.features) {
      this.features = {};
    }

  },

  _initializeFeaturesHash: function(ctx){
    this._canvasIDToFeatures[ctx.id] = {};
    this._canvasIDToFeatures[ctx.id].features = [];
    this._canvasIDToFeatures[ctx.id].canvas = ctx.canvas;
  },

  _draw: function(ctx) {
    //Draw is handled by the parent MVTSource object
  },
  getCanvas: function(parentCtx){
    //This gets called if a vector tile feature has already been parsed.
    //We've already got the geom, just get on with the drawing.
    //Need a way to pluck a canvas element from this layer given the parent layer's id.
    //Wait for it to get loaded before proceeding.
    var tilePoint = parentCtx.tile;
    var ctx = this._tiles[tilePoint.x + ":" + tilePoint.y];

    if(ctx){
      parentCtx.canvas = ctx;
      this.redrawTile(parentCtx.id);
      return;
    }

    var self = this;

    //This is a timer that will wait for a criterion to return true.
    //If not true within the timeout duration, it will move on.
    waitFor(function () {
        ctx = self._tiles[tilePoint.x + ":" + tilePoint.y];
        if(ctx) {
          return true;
        }
      },
      function(){
        //When it finishes, do this.
        ctx = self._tiles[tilePoint.x + ":" + tilePoint.y];
        parentCtx.canvas = ctx;
        self.redrawTile(parentCtx.id);

      }, //when done, go to next flow
      2000); //The Timeout milliseconds.  After this, give up and move on

  },

  parseVectorTileLayer: function(vtl, ctx) {
    var self = this;
    var tilePoint = ctx.tile;
    var layerCtx  = { canvas: null, id: ctx.id, tile: ctx.tile, zoom: ctx.zoom, tileSize: ctx.tileSize};

    //See if we can pluck the child tile from this PBF tile layer based on the master layer's tile id.
    layerCtx.canvas = self._tiles[tilePoint.x + ":" + tilePoint.y];



    //Initialize this tile's feature storage hash, if it hasn't already been created.  Used for when filters are updated, and features are cleared to prepare for a fresh redraw.
    if (!this._canvasIDToFeatures[layerCtx.id]) {
      this._initializeFeaturesHash(layerCtx);
    }else{
      //Clear this tile's previously saved features.
      this.clearTileFeatureHash(layerCtx.id);
    }

    var features = vtl.parsedFeatures;
    for (var i = 0, len = features.length; i < len; i++) {
      var vtf = features[i]; //vector tile feature
      vtf.layer = vtl;

      /**
       * Apply filter on feature if there is one. Defined in the options object
       * of TileLayer.MVTSource.js
       */
      var filter = self.options.filter;
      if (typeof filter === 'function') {
        if ( filter(vtf, layerCtx) === false ) continue;
      }

      var getIDForLayerFeature;
      if (typeof self.options.getIDForLayerFeature === 'function') {
        getIDForLayerFeature = self.options.getIDForLayerFeature;
      } else {
        getIDForLayerFeature = Util.getIDForLayerFeature;
      }
      var uniqueID = self.options.getIDForLayerFeature(vtf) || i;
      var mvtFeature = self.features[uniqueID];

      /**
       * Use layerOrdering function to apply a zIndex property to each vtf.  This is defined in
       * TileLayer.MVTSource.js.  Used below to sort features.npm
       */
      var layerOrdering = self.options.layerOrdering;
      if (typeof layerOrdering === 'function') {
        layerOrdering(vtf, layerCtx); //Applies a custom property to the feature, which is used after we're thru iterating to sort
      }

      //Create a new MVTFeature if one doesn't already exist for this feature.
      if (!mvtFeature) {
        //Get a style for the feature - set it just once for each new MVTFeature
        var style = self.style(vtf);

        //create a new feature
        self.features[uniqueID] = mvtFeature = new MVTFeature(self, vtf, layerCtx, uniqueID, style);
        if (style && style.dynamicLabel && typeof style.dynamicLabel === 'function') {
          self.featuresWithLabels.push(mvtFeature);
        }
      } else {
        //Add the new part to the existing feature
        mvtFeature.addTileFeature(vtf, layerCtx);
      }

      //Associate & Save this feature with this tile for later
      if(layerCtx && layerCtx.id) self._canvasIDToFeatures[layerCtx.id]['features'].push(mvtFeature);

    }

    /**
     * Apply sorting (zIndex) on feature if there is a function defined in the options object
     * of TileLayer.MVTSource.js
     */
    var layerOrdering = self.options.layerOrdering;
    if (layerOrdering) {
      //We've assigned the custom zIndex property when iterating above.  Now just sort.
      self._canvasIDToFeatures[layerCtx.id].features = self._canvasIDToFeatures[layerCtx.id].features.sort(function(a, b) {
        return -(b.properties.zIndex - a.properties.zIndex)
      });
    }

    self.redrawTile(layerCtx.id);
  },

  setStyle: function(styleFn) {
    // refresh the number for the highest count value
    // this is used only for choropleth
    this._highestCount = 0;

    // lowest count should not be 0, since we want to figure out the lowest
    this._lowestCount = null;

    this.style = styleFn;
    for (var key in this.features) {
      var feat = this.features[key];
      feat.setStyle(styleFn);
    }
    var z = this.map.getZoom();
    for (var key in this._tiles) {
      var id = z + ':' + key;
      this.redrawTile(id);
    }
  },

  /**
   * As counts for choropleths come in with the ajax data,
   * we want to keep track of which value is the highest
   * to create the color ramp for the fills of polygons.
   * @param count
   */
  setHighestCount: function(count) {
    if (count > this._highestCount) {
      this._highestCount = count;
    }
  },

  /**
   * Returns the highest number of all of the counts that have come in
   * from setHighestCount. This is assumed to be set via ajax callbacks.
   * @returns {number}
   */
  getHighestCount: function() {
    return this._highestCount;
  },

  setLowestCount: function(count) {
    if (!this._lowestCount || count < this._lowestCount) {
      this._lowestCount = count;
    }
  },

  getLowestCount: function() {
    return this._lowestCount;
  },

  setCountRange: function(count) {
    this.setHighestCount(count);
    this.setLowestCount(count);
  },

  //This is the old way.  It works, but is slow for mouseover events.  Fine for click events.
  handleClickEvent: function(evt, cb) {
    //Click happened on the GroupLayer (Manager) and passed it here
    var tileID = evt.tileID.split(":").slice(1, 3).join(":");
    var zoom = evt.tileID.split(":")[0];
    var canvas = this._tiles[tileID];
    if(!canvas) {
      //break out
      cb(evt);
      return;
    }
    var x = evt.layerPoint.x - canvas._leaflet_pos.x;
    var y = evt.layerPoint.y - canvas._leaflet_pos.y;

    var tilePoint = {x: x, y: y};
    var features = this._canvasIDToFeatures[evt.tileID].features;

    var minDistance = Number.POSITIVE_INFINITY;
    var nearest = null;
    var j, paths, distance;

    for (var i = 0; i < features.length; i++) {
      var feature = features[i];
      switch (feature.type) {

        case 1: //Point - currently rendered as circular paths.  Intersect with that.

          //Find the radius of the point.
          var radius = 3;
          if (typeof feature.style.radius === 'function') {
            radius = feature.style.radius(zoom); //Allows for scale dependent rednering
          }
          else{
            radius = feature.style.radius;
          }

          paths = feature.getPathsForTile(evt.tileID);
          for (j = 0; j < paths.length; j++) {
            //Builds a circle of radius feature.style.radius (assuming circular point symbology).
            if(in_circle(paths[j][0].x, paths[j][0].y, radius, x, y)){
              nearest = feature;
              minDistance = 0;
            }
          }
          break;

        case 2: //LineString
          paths = feature.getPathsForTile(evt.tileID);
          for (j = 0; j < paths.length; j++) {
            if (feature.style) {
              var distance = this._getDistanceFromLine(tilePoint, paths[j]);
              var thickness = (feature.selected && feature.style.selected ? feature.style.selected.size : feature.style.size);
              if (distance < thickness / 2 + this.options.lineClickTolerance && distance < minDistance) {
                nearest = feature;
                minDistance = distance;
              }
            }
          }
          break;

        case 3: //Polygon
          paths = feature.getPathsForTile(evt.tileID);
          for (j = 0; j < paths.length; j++) {
            if (this._isPointInPoly(tilePoint, paths[j])) {
              nearest = feature;
              minDistance = 0; // point is inside the polygon, so distance is zero
            }
          }
          break;
      }
      if (minDistance == 0) break;
    }

    if (nearest && nearest.toggleEnabled) {
        nearest.toggle();
    }
    evt.feature = nearest;
    cb(evt);
  },

  clearTile: function(id) {
    //id is the entire zoom:x:y.  we just want x:y.
    var ca = id.split(":");
    var canvasId = ca[1] + ":" + ca[2];
    if (typeof this._tiles[canvasId] === 'undefined') {
      console.error("typeof this._tiles[canvasId] === 'undefined'");
      return;
    }
    var canvas = this._tiles[canvasId];

    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
  },

  clearTileFeatureHash: function(canvasID){
    this._canvasIDToFeatures[canvasID] = { features: []}; //Get rid of all saved features
  },

  clearLayerFeatureHash: function(){
    this.features = {};
  },

  redrawTile: function(canvasID) {
    //First, clear the canvas
    this.clearTile(canvasID);

    // If the features are not in the tile, then there is nothing to redraw.
    // This may happen if you call redraw before features have loaded and initially
    // drawn the tile.
    var featfeats = this._canvasIDToFeatures[canvasID];
    if (!featfeats) {
      return;
    }

    //Get the features for this tile, and redraw them.
    var features = featfeats.features;

    // we want to skip drawing the selected features and draw them last
    var selectedFeatures = [];

    // drawing all of the non-selected features
    for (var i = 0; i < features.length; i++) {
      var feature = features[i];
      if (feature.selected) {
        selectedFeatures.push(feature);
      } else {
        feature.draw(canvasID);
      }
    }

    // drawing the selected features last
    for (var j = 0, len2 = selectedFeatures.length; j < len2; j++) {
      var selFeat = selectedFeatures[j];
      selFeat.draw(canvasID);
    }
  },

  _resetCanvasIDToFeatures: function(canvasID, canvas) {

    this._canvasIDToFeatures[canvasID] = {};
    this._canvasIDToFeatures[canvasID].features = [];
    this._canvasIDToFeatures[canvasID].canvas = canvas;

  },

  linkedLayer: function() {
    if(this.mvtSource.layerLink) {
      var linkName = this.mvtSource.layerLink(this.name);
      return this.mvtSource.layers[linkName];
    }
    else{
      return null;
    }
  },

  featureWithLabelAdded: function(feature) {
    this.featuresWithLabels.push(feature);
  }

});


function removeLabels(self) {
  var features = self.featuresWithLabels;
  for (var i = 0, len = features.length; i < len; i++) {
    var feat = features[i];
    feat.removeLabel();
  }
  self.featuresWithLabels = [];
}

function in_circle(center_x, center_y, radius, x, y) {
  var square_dist = Math.pow((center_x - x), 2) + Math.pow((center_y - y), 2);
  return square_dist <= Math.pow(radius, 2);
}
/**
 * See https://github.com/ariya/phantomjs/blob/master/examples/waitfor.js
 *
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @param testFx javascript condition that evaluates to a boolean,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param onReady what to do when testFx condition is fulfilled,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param timeOutMillis the max amount of time to wait. If not specified, 3 sec is used.
 */
function waitFor(testFx, onReady, timeOutMillis) {
  var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000, //< Default Max Timout is 3s
    start = new Date().getTime(),
    condition = (typeof (testFx) === "string" ? eval(testFx) : testFx()), //< defensive code
    interval = setInterval(function () {
      if ((new Date().getTime() - start < maxtimeOutMillis) && !condition) {
        // If not time-out yet and condition not yet fulfilled
        condition = (typeof (testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
      } else {
        if (!condition) {
          // If condition still not fulfilled (timeout but condition is 'false')
          console.log("'waitFor()' timeout");
          clearInterval(interval); //< Stop this interval
          typeof (onReady) === "string" ? eval(onReady) : onReady('timeout'); //< Do what it's supposed to do once the condition is fulfilled
        } else {
          // Condition fulfilled (timeout and/or condition is 'true')
          console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
          clearInterval(interval); //< Stop this interval
          typeof (onReady) === "string" ? eval(onReady) : onReady('success'); //< Do what it's supposed to do once the condition is fulfilled
        }
      }
    }, 50); //< repeat check every 50ms
};
},{"./MVTFeature":9,"./MVTUtil":12}],11:[function(require,module,exports){
var VectorTile = require('vector-tile').VectorTile;
var Protobuf = require('pbf');
var Point = require('point-geometry');
var Util = require('./MVTUtil');
var MVTLayer = require('./MVTLayer');


module.exports = L.TileLayer.MVTSource = L.TileLayer.Canvas.extend({

  options: {
    debug: false,
    url: "", //URL TO Vector Tile Source,
    getIDForLayerFeature: function() {},
    tileSize: 256,
    visibleLayers: [],
    xhrHeaders: {}
  },
  layers: {}, //Keep a list of the layers contained in the PBFs
  processedTiles: {}, //Keep a list of tiles that have been processed already
  _eventHandlers: {},
  _triggerOnTilesLoadedEvent: true, //whether or not to fire the onTilesLoaded event when all of the tiles finish loading.
  _url: "", //internal URL property

  style: function(feature) {
    var style = {};

    var type = feature.type;
    switch (type) {
      case 1: //'Point'
        style.color = 'rgba(49,79,79,1)';
        style.radius = 5;
        style.selected = {
          color: 'rgba(255,255,0,0.5)',
          radius: 6
        };
        break;
      case 2: //'LineString'
        style.color = 'rgba(161,217,155,0.8)';
        style.size = 3;
        style.selected = {
          color: 'rgba(255,25,0,0.5)',
          size: 4
        };
        break;
      case 3: //'Polygon'
        style.color = 'rgba(49,79,79,1)';
        style.outline = {
          color: 'rgba(161,217,155,0.8)',
          size: 1
        };
        style.selected = {
          color: 'rgba(255,140,0,0.3)',
          outline: {
            color: 'rgba(255,140,0,1)',
            size: 2
          }
        };
        break;
    }
    return style;
  },


  initialize: function(options) {
    L.Util.setOptions(this, options);

    //a list of the layers contained in the PBFs
    this.layers = {};

    // tiles currently in the viewport
    this.activeTiles = {};

    // thats that have been loaded and drawn
    this.loadedTiles = {};

    this._url = this.options.url;

    /**
     * For some reason, Leaflet has some code that resets the
     * z index in the options object. I'm having trouble tracking
     * down exactly what does this and why, so for now, we should
     * just copy the value to this.zIndex so we can have the right
     * number when we make the subsequent MVTLayers.
     */
    this.zIndex = options.zIndex;

    if (typeof options.style === 'function') {
      this.style = options.style;
    }

    if (typeof options.ajaxSource === 'function') {
      this.ajaxSource = options.ajaxSource;
    }

    this.layerLink = options.layerLink;

    this._eventHandlers = {};

    this._tilesToProcess = 0; //store the max number of tiles to be loaded.  Later, we can use this count to count down PBF loading.
  },

  redraw: function(triggerOnTilesLoadedEvent){
    //Only set to false if it actually is passed in as 'false'
    if (triggerOnTilesLoadedEvent === false) {
      this._triggerOnTilesLoadedEvent = false;
    }

    L.TileLayer.Canvas.prototype.redraw.call(this);
  },

  onAdd: function(map) {
    var self = this;
    self.map = map;
    L.TileLayer.Canvas.prototype.onAdd.call(this, map);

    var mapOnClickCallback = function(e) {
      self._onClick(e);
    };

    map.on('click', mapOnClickCallback);

    map.on("layerremove", function(e) {
      // check to see if the layer removed is this one
      // call a method to remove the child layers (the ones that actually have something drawn on them).
      if (e.layer._leaflet_id === self._leaflet_id && e.layer.removeChildLayers) {
        e.layer.removeChildLayers(map);
        map.off('click', mapOnClickCallback);
      }
    });

    self.addChildLayers(map);

    if (typeof DynamicLabel === 'function' ) {
      this.dynamicLabel = new DynamicLabel(map, this, {});
    }

  },

  drawTile: function(canvas, tilePoint, zoom) {
    var ctx = {
      id: [zoom, tilePoint.x, tilePoint.y].join(":"),
      canvas: canvas,
      tile: tilePoint,
      zoom: zoom,
      tileSize: this.options.tileSize
    };

    //Capture the max number of the tiles to load here. this._tilesToProcess is an internal number we use to know when we've finished requesting PBFs.
    if(this._tilesToProcess < this._tilesToLoad) this._tilesToProcess = this._tilesToLoad;

    var id = ctx.id = Util.getContextID(ctx);
    this.activeTiles[id] = ctx;

    if(!this.processedTiles[ctx.zoom]) this.processedTiles[ctx.zoom] = {};

    if (this.options.debug) {
      this._drawDebugInfo(ctx);
    }
    this._draw(ctx);
  },

  setOpacity:function(opacity) {
    this._setVisibleLayersStyle('opacity',opacity);
  },

  setZIndex:function(zIndex) {
    this._setVisibleLayersStyle('zIndex',zIndex);
  },

  _setVisibleLayersStyle:function(style, value) {
    for(var key in this.layers) {
      this.layers[key]._tileContainer.style[style] = value;
    }
  },

  _drawDebugInfo: function(ctx) {
    var max = this.options.tileSize;
    var g = ctx.canvas.getContext('2d');
    g.strokeStyle = '#000000';
    g.fillStyle = '#FFFF00';
    g.strokeRect(0, 0, max, max);
    g.font = "12px Arial";
    g.fillRect(0, 0, 5, 5);
    g.fillRect(0, max - 5, 5, 5);
    g.fillRect(max - 5, 0, 5, 5);
    g.fillRect(max - 5, max - 5, 5, 5);
    g.fillRect(max / 2 - 5, max / 2 - 5, 10, 10);
    g.strokeText(ctx.zoom + ' ' + ctx.tile.x + ' ' + ctx.tile.y, max / 2 - 30, max / 2 - 10);
  },

  _draw: function(ctx) {
    var self = this;

//    //This works to skip fetching and processing tiles if they've already been processed.
//    var vectorTile = this.processedTiles[ctx.zoom][ctx.id];
//    //if we've already parsed it, don't get it again.
//    if(vectorTile){
//      console.log("Skipping fetching " + ctx.id);
//      self.checkVectorTileLayers(parseVT(vectorTile), ctx, true);
//      self.reduceTilesToProcessCount();
//      return;
//    }

    if (!this._url) return;
    var src = this.getTileUrl({ x: ctx.tile.x, y: ctx.tile.y, z: ctx.zoom });

    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      if (xhr.status == "200") {

        if(!xhr.response) return;

        var arrayBuffer = new Uint8Array(xhr.response);
        var buf = new Protobuf(arrayBuffer);
        var vt = new VectorTile(buf);
        //Check the current map layer zoom.  If fast zooming is occurring, then short circuit tiles that are for a different zoom level than we're currently on.
        if(self.map && self.map.getZoom() != ctx.zoom) {
          console.log("Fetched tile for zoom level " + ctx.zoom + ". Map is at zoom level " + self._map.getZoom());
          return;
        }
        self.checkVectorTileLayers(parseVT(vt), ctx);
        tileLoaded(self, ctx);
      }

      //either way, reduce the count of tilesToProcess tiles here
      self.reduceTilesToProcessCount();
    };

    xhr.onerror = function() {
      console.log("xhr error: " + xhr.status)
    };

    xhr.open('GET', src, true); //async is true
    var headers = self.options.xhrHeaders;
    for (var header in headers) {
      xhr.setRequestHeader(header, headers[header])
    }
    xhr.responseType = 'arraybuffer';
    xhr.send();
  },

  reduceTilesToProcessCount: function(){
    this._tilesToProcess--;
    if(!this._tilesToProcess){
      //Trigger event letting us know that all PBFs have been loaded and processed (or 404'd).
      if(this._eventHandlers["PBFLoad"]) this._eventHandlers["PBFLoad"]();
      this._pbfLoaded();
    }
  },

  checkVectorTileLayers: function(vt, ctx, parsed) {
    var self = this;

    //Check if there are specified visible layers
    if(self.options.visibleLayers && self.options.visibleLayers.length > 0){
      //only let thru the layers listed in the visibleLayers array
      for(var i=0; i < self.options.visibleLayers.length; i++){
        var layerName = self.options.visibleLayers[i];
        if(vt.layers[layerName]){
           //Proceed with parsing
          self.prepareMVTLayers(vt.layers[layerName], layerName, ctx, parsed);
        }
      }
    }else{
      //Parse all vt.layers
      for (var key in vt.layers) {
        self.prepareMVTLayers(vt.layers[key], key, ctx, parsed);
      }
    }
  },

  prepareMVTLayers: function(lyr ,key, ctx, parsed) {
    var self = this;

    if (!self.layers[key]) {
      //Create MVTLayer or MVTPointLayer for user
      self.layers[key] = self.createMVTLayer(key, lyr.parsedFeatures[0].type || null);
    }

    if (parsed) {
      //We've already parsed it.  Go get canvas and draw.
      self.layers[key].getCanvas(ctx, lyr);
    } else {
      self.layers[key].parseVectorTileLayer(lyr, ctx);
    }

  },

  createMVTLayer: function(key, type) {
    var self = this;

    var getIDForLayerFeature;
    if (typeof self.options.getIDForLayerFeature === 'function') {
      getIDForLayerFeature = self.options.getIDForLayerFeature;
    } else {
      getIDForLayerFeature = Util.getIDForLayerFeature;
    }

    var options = {
      getIDForLayerFeature: getIDForLayerFeature,
      filter: self.options.filter,
      layerOrdering: self.options.layerOrdering,
      style: self.style,
      name: key,
      asynch: true,
      minZoom: self.options.minZoom,
      maxZoom: self.options.maxZoom
    };

    if (self.options.zIndex) {
      options.zIndex = self.zIndex;
    }

    //Take the layer and create a new MVTLayer or MVTPointLayer if one doesn't exist.
    var layer = new MVTLayer(self, options).addTo(self.map);

    return layer;
  },

  getLayers: function() {
    return this.layers;
  },

  hideLayer: function(id) {
    if (this.layers[id]) {
      this._map.removeLayer(this.layers[id]);
      if(this.options.visibleLayers.indexOf("id") > -1){
        this.visibleLayers.splice(this.options.visibleLayers.indexOf("id"), 1);
      }
    }
  },

  showLayer: function(id) {
    if (this.layers[id]) {
      this._map.addLayer(this.layers[id]);
      if(this.options.visibleLayers.indexOf("id") == -1){
        this.visibleLayers.push(id);
      }
    }
    //Make sure manager layer is always in front
    this.bringToFront();
  },

  removeChildLayers: function(map){
    //Remove child layers of this group layer
    for (var key in this.layers) {
      var layer = this.layers[key];
      map.removeLayer(layer);
    }
  },

  addChildLayers: function(map) {
    var self = this;
    if(self.options.visibleLayers.length > 0){
      //only let thru the layers listed in the visibleLayers array
      for(var i=0; i < self.options.visibleLayers.length; i++){
        var layerName = self.options.visibleLayers[i];
        var layer = this.layers[layerName];
        if(layer){
          //Proceed with parsing
          map.addLayer(layer);
        }
      }
    }else{
      //Add all layers
      for (var key in this.layers) {
        var layer = this.layers[key];
        // layer is set to visible and is not already on map
        if (!layer._map) {
          map.addLayer(layer);
        }
      }
    }
  },

  bind: function(eventType, callback) {
    this._eventHandlers[eventType] = callback;
  },

  _onClick: function(evt) {
    //Here, pass the event on to the child MVTLayer and have it do the hit test and handle the result.
    var self = this;
    var onClick = self.options.onClick;
    var clickableLayers = self.options.clickableLayers;
    var layers = self.layers;

    evt.tileID =  getTileURL(evt.latlng.lat, evt.latlng.lng, this.map.getZoom());

    // We must have an array of clickable layers, otherwise, we just pass
    // the event to the public onClick callback in options.

    if(!clickableLayers){
      clickableLayers = Object.keys(self.layers);
    }

    if (clickableLayers && clickableLayers.length > 0) {
      for (var i = 0, len = clickableLayers.length; i < len; i++) {
        var key = clickableLayers[i];
        var layer = layers[key];
        if (layer) {
          layer.handleClickEvent(evt, function(evt) {
            if (typeof onClick === 'function') {
              onClick(evt);
            }
          });
        }
      }
    } else {
      if (typeof onClick === 'function') {
        onClick(evt);
      }
    }

  },

  setFilter: function(filterFunction, layerName) {
    //take in a new filter function.
    //Propagate to child layers.

    //Add filter to all child layers if no layer is specified.
    for (var key in this.layers) {
      var layer = this.layers[key];

      if (layerName){
        if(key.toLowerCase() == layerName.toLowerCase()){
          layer.options.filter = filterFunction; //Assign filter to child layer, only if name matches
          //After filter is set, the old feature hashes are invalid.  Clear them for next draw.
          layer.clearLayerFeatureHash();
          //layer.clearTileFeatureHash();
        }
      }
      else{
        layer.options.filter = filterFunction; //Assign filter to child layer
        //After filter is set, the old feature hashes are invalid.  Clear them for next draw.
        layer.clearLayerFeatureHash();
        //layer.clearTileFeatureHash();
      }
    }
  },

  /**
   * Take in a new style function and propogate to child layers.
   * If you do not set a layer name, it resets the style for all of the layers.
   * @param styleFunction
   * @param layerName
   */
  setStyle: function(styleFn, layerName) {
    for (var key in this.layers) {
      var layer = this.layers[key];
      if (layerName) {
        if(key.toLowerCase() == layerName.toLowerCase()) {
          layer.setStyle(styleFn);
        }
      } else {
        layer.setStyle(styleFn);
      }
    }
  },

  featureSelected: function(mvtFeature) {
    if (this.options.mutexToggle) {
      if (this._selectedFeature) {
        this._selectedFeature.deselect();
      }
      this._selectedFeature = mvtFeature;
    }
    if (this.options.onSelect) {
      this.options.onSelect(mvtFeature);
    }
  },

  featureDeselected: function(mvtFeature) {
    if (this.options.mutexToggle && this._selectedFeature) {
      this._selectedFeature = null;
    }
    if (this.options.onDeselect) {
      this.options.onDeselect(mvtFeature);
    }
  },

  _pbfLoaded: function() {
    //Fires when all tiles from this layer have been loaded and drawn (or 404'd).

    //Make sure manager layer is always in front
    this.bringToFront();

    //See if there is an event to execute
    var self = this;
    var onTilesLoaded = self.options.onTilesLoaded;

    if (onTilesLoaded && typeof onTilesLoaded === 'function' && this._triggerOnTilesLoadedEvent === true) {
      onTilesLoaded(this);
    }
    self._triggerOnTilesLoadedEvent = true; //reset - if redraw() is called with the optinal 'false' parameter to temporarily disable the onTilesLoaded event from firing.  This resets it back to true after a single time of firing as 'false'.
  }

});


if (typeof(Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function() {
    return this * Math.PI / 180;
  }
}

function getTileURL(lat, lon, zoom) {
  var xtile = parseInt(Math.floor( (lon + 180) / 360 * (1<<zoom) ));
  var ytile = parseInt(Math.floor( (1 - Math.log(Math.tan(lat.toRad()) + 1 / Math.cos(lat.toRad())) / Math.PI) / 2 * (1<<zoom) ));
  return "" + zoom + ":" + xtile + ":" + ytile;
}

function tileLoaded(pbfSource, ctx) {
  pbfSource.loadedTiles[ctx.id] = ctx;
}

function parseVT(vt){
  for (var key in vt.layers) {
    var lyr = vt.layers[key];
    parseVTFeatures(lyr);
  }
  return vt;
}

function parseVTFeatures(vtl){
  vtl.parsedFeatures = [];
  var features = vtl._features;
  for (var i = 0, len = features.length; i < len; i++) {
    var vtf = vtl.feature(i);
    vtf.coordinates = vtf.loadGeometry();
    vtl.parsedFeatures.push(vtf);
  }
  return vtl;
}

},{"./MVTLayer":10,"./MVTUtil":12,"pbf":3,"point-geometry":4,"vector-tile":5}],12:[function(require,module,exports){
/**
 * Created by Nicholas Hallahan <nhallahan@spatialdev.com>
 *       on 8/15/14.
 */
var Util = module.exports = {};

Util.getContextID = function(ctx) {
  return [ctx.zoom, ctx.tile.x, ctx.tile.y].join(":");
};

/**
 * Default function that gets the id for a layer feature.
 * Sometimes this needs to be done in a different way and
 * can be specified by the user in the options for L.TileLayer.MVTSource.
 *
 * @param feature
 * @returns {ctx.id|*|id|string|jsts.index.chain.MonotoneChain.id|number}
 */
Util.getIDForLayerFeature = function(feature) {
  return feature.properties.id;
};

Util.getJSON = function(url, callback) {
  var xmlhttp = typeof XMLHttpRequest !== 'undefined' ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
  xmlhttp.onreadystatechange = function() {
    var status = xmlhttp.status;
    if (xmlhttp.readyState === 4 && status >= 200 && status < 300) {
      var json = JSON.parse(xmlhttp.responseText);
      callback(null, json);
    } else {
      callback( { error: true, status: status } );
    }
  };
  xmlhttp.open("GET", url, true);
  xmlhttp.send();
};

},{}],13:[function(require,module,exports){
/**
 * Created by Nicholas Hallahan <nhallahan@spatialdev.com>
 *       on 7/31/14.
 */
var Util = require('../MVTUtil');
module.exports = StaticLabel;

function StaticLabel(mvtFeature, ctx, latLng, style) {
  var self = this;
  this.mvtFeature = mvtFeature;
  this.map = mvtFeature.map;
  this.zoom = ctx.zoom;
  this.latLng = latLng;
  this.selected = false;

  if (mvtFeature.linkedFeature) {
    var linkedFeature = mvtFeature.linkedFeature();
    if (linkedFeature && linkedFeature.selected) {
      self.selected = true;
    }
  }

  init(self, mvtFeature, ctx, latLng, style)
}

function init(self, mvtFeature, ctx, latLng, style) {
  var ajaxData = mvtFeature.ajaxData;
  var sty = self.style = style.staticLabel(mvtFeature, ajaxData);
  var icon = self.icon = L.divIcon({
    className: sty.cssClass || 'label-icon-text',
    html: sty.html,
    iconSize: sty.iconSize || [50,50]
  });

  self.marker = L.marker(latLng, {icon: icon}).addTo(self.map);

  if (self.selected) {
    self.marker._icon.classList.add(self.style.cssSelectedClass || 'label-icon-text-selected');
  }

  self.marker.on('click', function(e) {
    self.toggle();
  });

  self.map.on('zoomend', function(e) {
    var newZoom = e.target.getZoom();
    if (self.zoom !== newZoom) {
      self.map.removeLayer(self.marker);
    }
  });
}


StaticLabel.prototype.toggle = function() {
  if (this.selected) {
    this.deselect();
  } else {
    this.select();
  }
};

StaticLabel.prototype.select = function() {
  this.selected = true;
  this.marker._icon.classList.add(this.style.cssSelectedClass || 'label-icon-text-selected');
  var linkedFeature = this.mvtFeature.linkedFeature();
  if (!linkedFeature.selected) linkedFeature.select();
};

StaticLabel.prototype.deselect = function() {
  this.selected = false;
  this.marker._icon.classList.remove(this.style.cssSelectedClass || 'label-icon-text-selected');
  var linkedFeature = this.mvtFeature.linkedFeature();
  if (linkedFeature.selected) linkedFeature.deselect();
};

StaticLabel.prototype.remove = function() {
  if (!this.map || !this.marker) return;
  this.map.removeLayer(this.marker);
};

},{"../MVTUtil":12}],14:[function(require,module,exports){
/**
 * Copyright (c) 2014, Spatial Development International
 * All rights reserved.
 *
 * Source code can be found at:
 * https://github.com/SpatialServer/Leaflet.MapboxVectorTile
 *
 * @license ISC
 */

module.exports = require('./MVTSource');

},{"./MVTSource":11}]},{},[14])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9wZXIvRG9jdW1lbnRzL1Byb2plY3RzL0xlYWZsZXQuTWFwYm94VmVjdG9yVGlsZS9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi9ob21lL3Blci9Eb2N1bWVudHMvUHJvamVjdHMvTGVhZmxldC5NYXBib3hWZWN0b3JUaWxlL25vZGVfbW9kdWxlcy9wYmYvYnVmZmVyLmpzIiwiL2hvbWUvcGVyL0RvY3VtZW50cy9Qcm9qZWN0cy9MZWFmbGV0Lk1hcGJveFZlY3RvclRpbGUvbm9kZV9tb2R1bGVzL3BiZi9pbmRleC5qcyIsIi9ob21lL3Blci9Eb2N1bWVudHMvUHJvamVjdHMvTGVhZmxldC5NYXBib3hWZWN0b3JUaWxlL25vZGVfbW9kdWxlcy9wb2ludC1nZW9tZXRyeS9pbmRleC5qcyIsIi9ob21lL3Blci9Eb2N1bWVudHMvUHJvamVjdHMvTGVhZmxldC5NYXBib3hWZWN0b3JUaWxlL25vZGVfbW9kdWxlcy92ZWN0b3ItdGlsZS9pbmRleC5qcyIsIi9ob21lL3Blci9Eb2N1bWVudHMvUHJvamVjdHMvTGVhZmxldC5NYXBib3hWZWN0b3JUaWxlL25vZGVfbW9kdWxlcy92ZWN0b3ItdGlsZS9saWIvdmVjdG9ydGlsZS5qcyIsIi9ob21lL3Blci9Eb2N1bWVudHMvUHJvamVjdHMvTGVhZmxldC5NYXBib3hWZWN0b3JUaWxlL25vZGVfbW9kdWxlcy92ZWN0b3ItdGlsZS9saWIvdmVjdG9ydGlsZWZlYXR1cmUuanMiLCIvaG9tZS9wZXIvRG9jdW1lbnRzL1Byb2plY3RzL0xlYWZsZXQuTWFwYm94VmVjdG9yVGlsZS9ub2RlX21vZHVsZXMvdmVjdG9yLXRpbGUvbGliL3ZlY3RvcnRpbGVsYXllci5qcyIsIi9ob21lL3Blci9Eb2N1bWVudHMvUHJvamVjdHMvTGVhZmxldC5NYXBib3hWZWN0b3JUaWxlL3NyYy9NVlRGZWF0dXJlLmpzIiwiL2hvbWUvcGVyL0RvY3VtZW50cy9Qcm9qZWN0cy9MZWFmbGV0Lk1hcGJveFZlY3RvclRpbGUvc3JjL01WVExheWVyLmpzIiwiL2hvbWUvcGVyL0RvY3VtZW50cy9Qcm9qZWN0cy9MZWFmbGV0Lk1hcGJveFZlY3RvclRpbGUvc3JjL01WVFNvdXJjZS5qcyIsIi9ob21lL3Blci9Eb2N1bWVudHMvUHJvamVjdHMvTGVhZmxldC5NYXBib3hWZWN0b3JUaWxlL3NyYy9NVlRVdGlsLmpzIiwiL2hvbWUvcGVyL0RvY3VtZW50cy9Qcm9qZWN0cy9MZWFmbGV0Lk1hcGJveFZlY3RvclRpbGUvc3JjL1N0YXRpY0xhYmVsL1N0YXRpY0xhYmVsLmpzIiwiL2hvbWUvcGVyL0RvY3VtZW50cy9Qcm9qZWN0cy9MZWFmbGV0Lk1hcGJveFZlY3RvclRpbGUvc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3YUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gbGlnaHR3ZWlnaHQgQnVmZmVyIHNoaW0gZm9yIHBiZiBicm93c2VyIGJ1aWxkXG4vLyBiYXNlZCBvbiBjb2RlIGZyb20gZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyIChNSVQtbGljZW5zZWQpXG5cbm1vZHVsZS5leHBvcnRzID0gQnVmZmVyO1xuXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKTtcblxudmFyIEJ1ZmZlck1ldGhvZHM7XG5cbmZ1bmN0aW9uIEJ1ZmZlcihsZW5ndGgpIHtcbiAgICB2YXIgYXJyO1xuICAgIGlmIChsZW5ndGggJiYgbGVuZ3RoLmxlbmd0aCkge1xuICAgICAgICBhcnIgPSBsZW5ndGg7XG4gICAgICAgIGxlbmd0aCA9IGFyci5sZW5ndGg7XG4gICAgfVxuICAgIHZhciBidWYgPSBuZXcgVWludDhBcnJheShsZW5ndGggfHwgMCk7XG4gICAgaWYgKGFycikgYnVmLnNldChhcnIpO1xuXG4gICAgYnVmLnJlYWRVSW50MzJMRSA9IEJ1ZmZlck1ldGhvZHMucmVhZFVJbnQzMkxFO1xuICAgIGJ1Zi53cml0ZVVJbnQzMkxFID0gQnVmZmVyTWV0aG9kcy53cml0ZVVJbnQzMkxFO1xuICAgIGJ1Zi5yZWFkSW50MzJMRSA9IEJ1ZmZlck1ldGhvZHMucmVhZEludDMyTEU7XG4gICAgYnVmLndyaXRlSW50MzJMRSA9IEJ1ZmZlck1ldGhvZHMud3JpdGVJbnQzMkxFO1xuICAgIGJ1Zi5yZWFkRmxvYXRMRSA9IEJ1ZmZlck1ldGhvZHMucmVhZEZsb2F0TEU7XG4gICAgYnVmLndyaXRlRmxvYXRMRSA9IEJ1ZmZlck1ldGhvZHMud3JpdGVGbG9hdExFO1xuICAgIGJ1Zi5yZWFkRG91YmxlTEUgPSBCdWZmZXJNZXRob2RzLnJlYWREb3VibGVMRTtcbiAgICBidWYud3JpdGVEb3VibGVMRSA9IEJ1ZmZlck1ldGhvZHMud3JpdGVEb3VibGVMRTtcbiAgICBidWYudG9TdHJpbmcgPSBCdWZmZXJNZXRob2RzLnRvU3RyaW5nO1xuICAgIGJ1Zi53cml0ZSA9IEJ1ZmZlck1ldGhvZHMud3JpdGU7XG4gICAgYnVmLnNsaWNlID0gQnVmZmVyTWV0aG9kcy5zbGljZTtcbiAgICBidWYuY29weSA9IEJ1ZmZlck1ldGhvZHMuY29weTtcblxuICAgIGJ1Zi5faXNCdWZmZXIgPSB0cnVlO1xuICAgIHJldHVybiBidWY7XG59XG5cbnZhciBsYXN0U3RyLCBsYXN0U3RyRW5jb2RlZDtcblxuQnVmZmVyTWV0aG9kcyA9IHtcbiAgICByZWFkVUludDMyTEU6IGZ1bmN0aW9uKHBvcykge1xuICAgICAgICByZXR1cm4gKCh0aGlzW3Bvc10pIHxcbiAgICAgICAgICAgICh0aGlzW3BvcyArIDFdIDw8IDgpIHxcbiAgICAgICAgICAgICh0aGlzW3BvcyArIDJdIDw8IDE2KSkgK1xuICAgICAgICAgICAgKHRoaXNbcG9zICsgM10gKiAweDEwMDAwMDApO1xuICAgIH0sXG5cbiAgICB3cml0ZVVJbnQzMkxFOiBmdW5jdGlvbih2YWwsIHBvcykge1xuICAgICAgICB0aGlzW3Bvc10gPSB2YWw7XG4gICAgICAgIHRoaXNbcG9zICsgMV0gPSAodmFsID4+PiA4KTtcbiAgICAgICAgdGhpc1twb3MgKyAyXSA9ICh2YWwgPj4+IDE2KTtcbiAgICAgICAgdGhpc1twb3MgKyAzXSA9ICh2YWwgPj4+IDI0KTtcbiAgICB9LFxuXG4gICAgcmVhZEludDMyTEU6IGZ1bmN0aW9uKHBvcykge1xuICAgICAgICByZXR1cm4gKCh0aGlzW3Bvc10pIHxcbiAgICAgICAgICAgICh0aGlzW3BvcyArIDFdIDw8IDgpIHxcbiAgICAgICAgICAgICh0aGlzW3BvcyArIDJdIDw8IDE2KSkgK1xuICAgICAgICAgICAgKHRoaXNbcG9zICsgM10gPDwgMjQpO1xuICAgIH0sXG5cbiAgICByZWFkRmxvYXRMRTogIGZ1bmN0aW9uKHBvcykgeyByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIHBvcywgdHJ1ZSwgMjMsIDQpOyB9LFxuICAgIHJlYWREb3VibGVMRTogZnVuY3Rpb24ocG9zKSB7IHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgcG9zLCB0cnVlLCA1MiwgOCk7IH0sXG5cbiAgICB3cml0ZUZsb2F0TEU6ICBmdW5jdGlvbih2YWwsIHBvcykgeyByZXR1cm4gaWVlZTc1NC53cml0ZSh0aGlzLCB2YWwsIHBvcywgdHJ1ZSwgMjMsIDQpOyB9LFxuICAgIHdyaXRlRG91YmxlTEU6IGZ1bmN0aW9uKHZhbCwgcG9zKSB7IHJldHVybiBpZWVlNzU0LndyaXRlKHRoaXMsIHZhbCwgcG9zLCB0cnVlLCA1MiwgOCk7IH0sXG5cbiAgICB0b1N0cmluZzogZnVuY3Rpb24oZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgdmFyIHN0ciA9ICcnLFxuICAgICAgICAgICAgdG1wID0gJyc7XG5cbiAgICAgICAgc3RhcnQgPSBzdGFydCB8fCAwO1xuICAgICAgICBlbmQgPSBNYXRoLm1pbih0aGlzLmxlbmd0aCwgZW5kIHx8IHRoaXMubGVuZ3RoKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgICAgICAgdmFyIGNoID0gdGhpc1tpXTtcbiAgICAgICAgICAgIGlmIChjaCA8PSAweDdGKSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IGRlY29kZVVSSUNvbXBvbmVudCh0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShjaCk7XG4gICAgICAgICAgICAgICAgdG1wID0gJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRtcCArPSAnJScgKyBjaC50b1N0cmluZygxNik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzdHIgKz0gZGVjb2RlVVJJQ29tcG9uZW50KHRtcCk7XG5cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9LFxuXG4gICAgd3JpdGU6IGZ1bmN0aW9uKHN0ciwgcG9zKSB7XG4gICAgICAgIHZhciBieXRlcyA9IHN0ciA9PT0gbGFzdFN0ciA/IGxhc3RTdHJFbmNvZGVkIDogZW5jb2RlU3RyaW5nKHN0cik7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXNbcG9zICsgaV0gPSBieXRlc1tpXTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzbGljZTogZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKTtcbiAgICB9LFxuXG4gICAgY29weTogZnVuY3Rpb24oYnVmLCBwb3MpIHtcbiAgICAgICAgcG9zID0gcG9zIHx8IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYnVmW3BvcyArIGldID0gdGhpc1tpXTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkJ1ZmZlck1ldGhvZHMud3JpdGVJbnQzMkxFID0gQnVmZmVyTWV0aG9kcy53cml0ZVVJbnQzMkxFO1xuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uKHN0cikge1xuICAgIGxhc3RTdHIgPSBzdHI7XG4gICAgbGFzdFN0ckVuY29kZWQgPSBlbmNvZGVTdHJpbmcoc3RyKTtcbiAgICByZXR1cm4gbGFzdFN0ckVuY29kZWQubGVuZ3RoO1xufTtcblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24oYnVmKSB7XG4gICAgcmV0dXJuICEhKGJ1ZiAmJiBidWYuX2lzQnVmZmVyKTtcbn07XG5cbmZ1bmN0aW9uIGVuY29kZVN0cmluZyhzdHIpIHtcbiAgICB2YXIgbGVuZ3RoID0gc3RyLmxlbmd0aCxcbiAgICAgICAgYnl0ZXMgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwLCBjLCBsZWFkOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpOyAvLyBjb2RlIHBvaW50XG5cbiAgICAgICAgaWYgKGMgPiAweEQ3RkYgJiYgYyA8IDB4RTAwMCkge1xuXG4gICAgICAgICAgICBpZiAobGVhZCkge1xuICAgICAgICAgICAgICAgIGlmIChjIDwgMHhEQzAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRCk7XG4gICAgICAgICAgICAgICAgICAgIGxlYWQgPSBjO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGMgPSBsZWFkIC0gMHhEODAwIDw8IDEwIHwgYyAtIDB4REMwMCB8IDB4MTAwMDA7XG4gICAgICAgICAgICAgICAgICAgIGxlYWQgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYyA+IDB4REJGRiB8fCAoaSArIDEgPT09IGxlbmd0aCkpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRCk7XG4gICAgICAgICAgICAgICAgZWxzZSBsZWFkID0gYztcblxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAobGVhZCkge1xuICAgICAgICAgICAgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKTtcbiAgICAgICAgICAgIGxlYWQgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPCAweDgwKSBieXRlcy5wdXNoKGMpO1xuICAgICAgICBlbHNlIGlmIChjIDwgMHg4MDApIGJ5dGVzLnB1c2goYyA+PiAweDYgfCAweEMwLCBjICYgMHgzRiB8IDB4ODApO1xuICAgICAgICBlbHNlIGlmIChjIDwgMHgxMDAwMCkgYnl0ZXMucHVzaChjID4+IDB4QyB8IDB4RTAsIGMgPj4gMHg2ICYgMHgzRiB8IDB4ODAsIGMgJiAweDNGIHwgMHg4MCk7XG4gICAgICAgIGVsc2UgYnl0ZXMucHVzaChjID4+IDB4MTIgfCAweEYwLCBjID4+IDB4QyAmIDB4M0YgfCAweDgwLCBjID4+IDB4NiAmIDB4M0YgfCAweDgwLCBjICYgMHgzRiB8IDB4ODApO1xuICAgIH1cbiAgICByZXR1cm4gYnl0ZXM7XG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gUGJmO1xuXG52YXIgQnVmZmVyID0gZ2xvYmFsLkJ1ZmZlciB8fCByZXF1aXJlKCcuL2J1ZmZlcicpO1xuXG5mdW5jdGlvbiBQYmYoYnVmKSB7XG4gICAgdGhpcy5idWYgPSAhQnVmZmVyLmlzQnVmZmVyKGJ1ZikgPyBuZXcgQnVmZmVyKGJ1ZiB8fCAwKSA6IGJ1ZjtcbiAgICB0aGlzLnBvcyA9IDA7XG4gICAgdGhpcy5sZW5ndGggPSB0aGlzLmJ1Zi5sZW5ndGg7XG59XG5cblBiZi5WYXJpbnQgID0gMDsgLy8gdmFyaW50OiBpbnQzMiwgaW50NjQsIHVpbnQzMiwgdWludDY0LCBzaW50MzIsIHNpbnQ2NCwgYm9vbCwgZW51bVxuUGJmLkZpeGVkNjQgPSAxOyAvLyA2NC1iaXQ6IGRvdWJsZSwgZml4ZWQ2NCwgc2ZpeGVkNjRcblBiZi5CeXRlcyAgID0gMjsgLy8gbGVuZ3RoLWRlbGltaXRlZDogc3RyaW5nLCBieXRlcywgZW1iZWRkZWQgbWVzc2FnZXMsIHBhY2tlZCByZXBlYXRlZCBmaWVsZHNcblBiZi5GaXhlZDMyID0gNTsgLy8gMzItYml0OiBmbG9hdCwgZml4ZWQzMiwgc2ZpeGVkMzJcblxudmFyIFNISUZUX0xFRlRfMzIgPSAoMSA8PCAxNikgKiAoMSA8PCAxNiksXG4gICAgU0hJRlRfUklHSFRfMzIgPSAxIC8gU0hJRlRfTEVGVF8zMixcbiAgICBQT1dfMl82MyA9IE1hdGgucG93KDIsIDYzKTtcblxuUGJmLnByb3RvdHlwZSA9IHtcblxuICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmJ1ZiA9IG51bGw7XG4gICAgfSxcblxuICAgIC8vID09PSBSRUFESU5HID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICByZWFkRmllbGRzOiBmdW5jdGlvbihyZWFkRmllbGQsIHJlc3VsdCwgZW5kKSB7XG4gICAgICAgIGVuZCA9IGVuZCB8fCB0aGlzLmxlbmd0aDtcblxuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgIHZhciB2YWwgPSB0aGlzLnJlYWRWYXJpbnQoKSxcbiAgICAgICAgICAgICAgICB0YWcgPSB2YWwgPj4gMyxcbiAgICAgICAgICAgICAgICBzdGFydFBvcyA9IHRoaXMucG9zO1xuXG4gICAgICAgICAgICByZWFkRmllbGQodGFnLCByZXN1bHQsIHRoaXMpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5wb3MgPT09IHN0YXJ0UG9zKSB0aGlzLnNraXAodmFsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICByZWFkTWVzc2FnZTogZnVuY3Rpb24ocmVhZEZpZWxkLCByZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVhZEZpZWxkcyhyZWFkRmllbGQsIHJlc3VsdCwgdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcyk7XG4gICAgfSxcblxuICAgIHJlYWRGaXhlZDMyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbCA9IHRoaXMuYnVmLnJlYWRVSW50MzJMRSh0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIHJlYWRTRml4ZWQzMjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWwgPSB0aGlzLmJ1Zi5yZWFkSW50MzJMRSh0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIC8vIDY0LWJpdCBpbnQgaGFuZGxpbmcgaXMgYmFzZWQgb24gZ2l0aHViLmNvbS9kcHcvbm9kZS1idWZmZXItbW9yZS1pbnRzIChNSVQtbGljZW5zZWQpXG5cbiAgICByZWFkRml4ZWQ2NDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWwgPSB0aGlzLmJ1Zi5yZWFkVUludDMyTEUodGhpcy5wb3MpICsgdGhpcy5idWYucmVhZFVJbnQzMkxFKHRoaXMucG9zICsgNCkgKiBTSElGVF9MRUZUXzMyO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG5cbiAgICByZWFkU0ZpeGVkNjQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gdGhpcy5idWYucmVhZFVJbnQzMkxFKHRoaXMucG9zKSArIHRoaXMuYnVmLnJlYWRJbnQzMkxFKHRoaXMucG9zICsgNCkgKiBTSElGVF9MRUZUXzMyO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG5cbiAgICByZWFkRmxvYXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsID0gdGhpcy5idWYucmVhZEZsb2F0TEUodGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG5cbiAgICByZWFkRG91YmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbCA9IHRoaXMuYnVmLnJlYWREb3VibGVMRSh0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcblxuICAgIHJlYWRWYXJpbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYnVmID0gdGhpcy5idWYsXG4gICAgICAgICAgICB2YWwsIGIsIGIwLCBiMSwgYjIsIGIzO1xuXG4gICAgICAgIGIwID0gYnVmW3RoaXMucG9zKytdOyBpZiAoYjAgPCAweDgwKSByZXR1cm4gYjA7ICAgICAgICAgICAgICAgICBiMCA9IGIwICYgMHg3ZjtcbiAgICAgICAgYjEgPSBidWZbdGhpcy5wb3MrK107IGlmIChiMSA8IDB4ODApIHJldHVybiBiMCB8IGIxIDw8IDc7ICAgICAgIGIxID0gKGIxICYgMHg3ZikgPDwgNztcbiAgICAgICAgYjIgPSBidWZbdGhpcy5wb3MrK107IGlmIChiMiA8IDB4ODApIHJldHVybiBiMCB8IGIxIHwgYjIgPDwgMTQ7IGIyID0gKGIyICYgMHg3ZikgPDwgMTQ7XG4gICAgICAgIGIzID0gYnVmW3RoaXMucG9zKytdOyBpZiAoYjMgPCAweDgwKSByZXR1cm4gYjAgfCBiMSB8IGIyIHwgYjMgPDwgMjE7XG5cbiAgICAgICAgdmFsID0gYjAgfCBiMSB8IGIyIHwgKGIzICYgMHg3ZikgPDwgMjE7XG5cbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICs9IChiICYgMHg3ZikgKiAweDEwMDAwMDAwOyAgICAgICAgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICs9IChiICYgMHg3ZikgKiAweDgwMDAwMDAwMDsgICAgICAgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICs9IChiICYgMHg3ZikgKiAweDQwMDAwMDAwMDAwOyAgICAgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICs9IChiICYgMHg3ZikgKiAweDIwMDAwMDAwMDAwMDA7ICAgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICs9IChiICYgMHg3ZikgKiAweDEwMDAwMDAwMDAwMDAwMDsgIGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcbiAgICAgICAgYiA9IGJ1Zlt0aGlzLnBvcysrXTsgdmFsICs9IChiICYgMHg3ZikgKiAweDgwMDAwMDAwMDAwMDAwMDA7IGlmIChiIDwgMHg4MCkgcmV0dXJuIHZhbDtcblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIHZhcmludCBub3QgbW9yZSB0aGFuIDEwIGJ5dGVzJyk7XG4gICAgfSxcblxuICAgIHJlYWRWYXJpbnQ2NDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGFydFBvcyA9IHRoaXMucG9zLFxuICAgICAgICAgICAgdmFsID0gdGhpcy5yZWFkVmFyaW50KCk7XG5cbiAgICAgICAgaWYgKHZhbCA8IFBPV18yXzYzKSByZXR1cm4gdmFsO1xuXG4gICAgICAgIHZhciBwb3MgPSB0aGlzLnBvcyAtIDI7XG4gICAgICAgIHdoaWxlICh0aGlzLmJ1Zltwb3NdID09PSAweGZmKSBwb3MtLTtcbiAgICAgICAgaWYgKHBvcyA8IHN0YXJ0UG9zKSBwb3MgPSBzdGFydFBvcztcblxuICAgICAgICB2YWwgPSAwO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvcyAtIHN0YXJ0UG9zICsgMTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYiA9IH50aGlzLmJ1ZltzdGFydFBvcyArIGldICYgMHg3ZjtcbiAgICAgICAgICAgIHZhbCArPSBpIDwgNCA/IGIgPDwgaSAqIDcgOiBiICogTWF0aC5wb3coMiwgaSAqIDcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIC12YWwgLSAxO1xuICAgIH0sXG5cbiAgICByZWFkU1ZhcmludDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBudW0gPSB0aGlzLnJlYWRWYXJpbnQoKTtcbiAgICAgICAgcmV0dXJuIG51bSAlIDIgPT09IDEgPyAobnVtICsgMSkgLyAtMiA6IG51bSAvIDI7IC8vIHppZ3phZyBlbmNvZGluZ1xuICAgIH0sXG5cbiAgICByZWFkQm9vbGVhbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBCb29sZWFuKHRoaXMucmVhZFZhcmludCgpKTtcbiAgICB9LFxuXG4gICAgcmVhZFN0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBlbmQgPSB0aGlzLnJlYWRWYXJpbnQoKSArIHRoaXMucG9zLFxuICAgICAgICAgICAgc3RyID0gdGhpcy5idWYudG9TdHJpbmcoJ3V0ZjgnLCB0aGlzLnBvcywgZW5kKTtcbiAgICAgICAgdGhpcy5wb3MgPSBlbmQ7XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfSxcblxuICAgIHJlYWRCeXRlczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBlbmQgPSB0aGlzLnJlYWRWYXJpbnQoKSArIHRoaXMucG9zLFxuICAgICAgICAgICAgYnVmZmVyID0gdGhpcy5idWYuc2xpY2UodGhpcy5wb3MsIGVuZCk7XG4gICAgICAgIHRoaXMucG9zID0gZW5kO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH0sXG5cbiAgICAvLyB2ZXJib3NlIGZvciBwZXJmb3JtYW5jZSByZWFzb25zOyBkb2Vzbid0IGFmZmVjdCBnemlwcGVkIHNpemVcblxuICAgIHJlYWRQYWNrZWRWYXJpbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZW5kID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcywgYXJyID0gW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkVmFyaW50KCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZFNWYXJpbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZW5kID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcywgYXJyID0gW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkU1ZhcmludCgpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuICAgIHJlYWRQYWNrZWRCb29sZWFuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3MsIGFyciA9IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZEJvb2xlYW4oKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkRmxvYXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZW5kID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcywgYXJyID0gW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkRmxvYXQoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkRG91YmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3MsIGFyciA9IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZERvdWJsZSgpKTtcbiAgICAgICAgcmV0dXJuIGFycjtcbiAgICB9LFxuICAgIHJlYWRQYWNrZWRGaXhlZDMyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3MsIGFyciA9IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZEZpeGVkMzIoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkU0ZpeGVkMzI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZW5kID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcywgYXJyID0gW107XG4gICAgICAgIHdoaWxlICh0aGlzLnBvcyA8IGVuZCkgYXJyLnB1c2godGhpcy5yZWFkU0ZpeGVkMzIoKSk7XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfSxcbiAgICByZWFkUGFja2VkRml4ZWQ2NDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBlbmQgPSB0aGlzLnJlYWRWYXJpbnQoKSArIHRoaXMucG9zLCBhcnIgPSBbXTtcbiAgICAgICAgd2hpbGUgKHRoaXMucG9zIDwgZW5kKSBhcnIucHVzaCh0aGlzLnJlYWRGaXhlZDY0KCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG4gICAgcmVhZFBhY2tlZFNGaXhlZDY0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMucmVhZFZhcmludCgpICsgdGhpcy5wb3MsIGFyciA9IFtdO1xuICAgICAgICB3aGlsZSAodGhpcy5wb3MgPCBlbmQpIGFyci5wdXNoKHRoaXMucmVhZFNGaXhlZDY0KCkpO1xuICAgICAgICByZXR1cm4gYXJyO1xuICAgIH0sXG5cbiAgICBza2lwOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdmFyIHR5cGUgPSB2YWwgJiAweDc7XG4gICAgICAgIGlmICh0eXBlID09PSBQYmYuVmFyaW50KSB3aGlsZSAodGhpcy5idWZbdGhpcy5wb3MrK10gPiAweDdmKSB7fVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBQYmYuQnl0ZXMpIHRoaXMucG9zID0gdGhpcy5yZWFkVmFyaW50KCkgKyB0aGlzLnBvcztcbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gUGJmLkZpeGVkMzIpIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFBiZi5GaXhlZDY0KSB0aGlzLnBvcyArPSA4O1xuICAgICAgICBlbHNlIHRocm93IG5ldyBFcnJvcignVW5pbXBsZW1lbnRlZCB0eXBlOiAnICsgdHlwZSk7XG4gICAgfSxcblxuICAgIC8vID09PSBXUklUSU5HID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICB3cml0ZVRhZzogZnVuY3Rpb24odGFnLCB0eXBlKSB7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnQoKHRhZyA8PCAzKSB8IHR5cGUpO1xuICAgIH0sXG5cbiAgICByZWFsbG9jOiBmdW5jdGlvbihtaW4pIHtcbiAgICAgICAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoIHx8IDE2O1xuXG4gICAgICAgIHdoaWxlIChsZW5ndGggPCB0aGlzLnBvcyArIG1pbikgbGVuZ3RoICo9IDI7XG5cbiAgICAgICAgaWYgKGxlbmd0aCAhPT0gdGhpcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciBidWYgPSBuZXcgQnVmZmVyKGxlbmd0aCk7XG4gICAgICAgICAgICB0aGlzLmJ1Zi5jb3B5KGJ1Zik7XG4gICAgICAgICAgICB0aGlzLmJ1ZiA9IGJ1ZjtcbiAgICAgICAgICAgIHRoaXMubGVuZ3RoID0gbGVuZ3RoO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGZpbmlzaDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5wb3M7XG4gICAgICAgIHRoaXMucG9zID0gMDtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnVmLnNsaWNlKDAsIHRoaXMubGVuZ3RoKTtcbiAgICB9LFxuXG4gICAgd3JpdGVGaXhlZDMyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDQpO1xuICAgICAgICB0aGlzLmJ1Zi53cml0ZVVJbnQzMkxFKHZhbCwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgIH0sXG5cbiAgICB3cml0ZVNGaXhlZDMyOiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy5yZWFsbG9jKDQpO1xuICAgICAgICB0aGlzLmJ1Zi53cml0ZUludDMyTEUodmFsLCB0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgfSxcblxuICAgIHdyaXRlRml4ZWQ2NDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMucmVhbGxvYyg4KTtcbiAgICAgICAgdGhpcy5idWYud3JpdGVJbnQzMkxFKHZhbCAmIC0xLCB0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMuYnVmLndyaXRlVUludDMyTEUoTWF0aC5mbG9vcih2YWwgKiBTSElGVF9SSUdIVF8zMiksIHRoaXMucG9zICsgNCk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgfSxcblxuICAgIHdyaXRlU0ZpeGVkNjQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICB0aGlzLnJlYWxsb2MoOCk7XG4gICAgICAgIHRoaXMuYnVmLndyaXRlSW50MzJMRSh2YWwgJiAtMSwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLmJ1Zi53cml0ZUludDMyTEUoTWF0aC5mbG9vcih2YWwgKiBTSElGVF9SSUdIVF8zMiksIHRoaXMucG9zICsgNCk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgfSxcblxuICAgIHdyaXRlVmFyaW50OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdmFsID0gK3ZhbDtcblxuICAgICAgICBpZiAodmFsIDw9IDB4N2YpIHtcbiAgICAgICAgICAgIHRoaXMucmVhbGxvYygxKTtcbiAgICAgICAgICAgIHRoaXMuYnVmW3RoaXMucG9zKytdID0gdmFsO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodmFsIDw9IDB4M2ZmZikge1xuICAgICAgICAgICAgdGhpcy5yZWFsbG9jKDIpO1xuICAgICAgICAgICAgdGhpcy5idWZbdGhpcy5wb3MrK10gPSAoKHZhbCA+Pj4gMCkgJiAweDdmKSB8IDB4ODA7XG4gICAgICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9ICgodmFsID4+PiA3KSAmIDB4N2YpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodmFsIDw9IDB4MWZmZmZmKSB7XG4gICAgICAgICAgICB0aGlzLnJlYWxsb2MoMyk7XG4gICAgICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9ICgodmFsID4+PiAwKSAmIDB4N2YpIHwgMHg4MDtcbiAgICAgICAgICAgIHRoaXMuYnVmW3RoaXMucG9zKytdID0gKCh2YWwgPj4+IDcpICYgMHg3ZikgfCAweDgwO1xuICAgICAgICAgICAgdGhpcy5idWZbdGhpcy5wb3MrK10gPSAoKHZhbCA+Pj4gMTQpICYgMHg3Zik7XG5cbiAgICAgICAgfSBlbHNlIGlmICh2YWwgPD0gMHhmZmZmZmZmKSB7XG4gICAgICAgICAgICB0aGlzLnJlYWxsb2MoNCk7XG4gICAgICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9ICgodmFsID4+PiAwKSAmIDB4N2YpIHwgMHg4MDtcbiAgICAgICAgICAgIHRoaXMuYnVmW3RoaXMucG9zKytdID0gKCh2YWwgPj4+IDcpICYgMHg3ZikgfCAweDgwO1xuICAgICAgICAgICAgdGhpcy5idWZbdGhpcy5wb3MrK10gPSAoKHZhbCA+Pj4gMTQpICYgMHg3ZikgfCAweDgwO1xuICAgICAgICAgICAgdGhpcy5idWZbdGhpcy5wb3MrK10gPSAoKHZhbCA+Pj4gMjEpICYgMHg3Zik7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwb3MgPSB0aGlzLnBvcztcbiAgICAgICAgICAgIHdoaWxlICh2YWwgPj0gMHg4MCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVhbGxvYygxKTtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9ICh2YWwgJiAweGZmKSB8IDB4ODA7XG4gICAgICAgICAgICAgICAgdmFsIC89IDB4ODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnJlYWxsb2MoMSk7XG4gICAgICAgICAgICB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9IHZhbCB8IDA7XG4gICAgICAgICAgICBpZiAodGhpcy5wb3MgLSBwb3MgPiAxMCkgdGhyb3cgbmV3IEVycm9yKCdHaXZlbiB2YXJpbnQgZG9lc25cXCd0IGZpdCBpbnRvIDEwIGJ5dGVzJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgd3JpdGVTVmFyaW50OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludCh2YWwgPCAwID8gLXZhbCAqIDIgLSAxIDogdmFsICogMik7XG4gICAgfSxcblxuICAgIHdyaXRlQm9vbGVhbjogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnQoQm9vbGVhbih2YWwpKTtcbiAgICB9LFxuXG4gICAgd3JpdGVTdHJpbmc6IGZ1bmN0aW9uKHN0cikge1xuICAgICAgICBzdHIgPSBTdHJpbmcoc3RyKTtcbiAgICAgICAgdmFyIGJ5dGVzID0gQnVmZmVyLmJ5dGVMZW5ndGgoc3RyKTtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludChieXRlcyk7XG4gICAgICAgIHRoaXMucmVhbGxvYyhieXRlcyk7XG4gICAgICAgIHRoaXMuYnVmLndyaXRlKHN0ciwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSBieXRlcztcbiAgICB9LFxuXG4gICAgd3JpdGVGbG9hdDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMucmVhbGxvYyg0KTtcbiAgICAgICAgdGhpcy5idWYud3JpdGVGbG9hdExFKHZhbCwgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgIH0sXG5cbiAgICB3cml0ZURvdWJsZTogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIHRoaXMucmVhbGxvYyg4KTtcbiAgICAgICAgdGhpcy5idWYud3JpdGVEb3VibGVMRSh2YWwsIHRoaXMucG9zKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gODtcbiAgICB9LFxuXG4gICAgd3JpdGVCeXRlczogZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgIHZhciBsZW4gPSBidWZmZXIubGVuZ3RoO1xuICAgICAgICB0aGlzLndyaXRlVmFyaW50KGxlbik7XG4gICAgICAgIHRoaXMucmVhbGxvYyhsZW4pO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB0aGlzLmJ1Zlt0aGlzLnBvcysrXSA9IGJ1ZmZlcltpXTtcbiAgICB9LFxuXG4gICAgd3JpdGVSYXdNZXNzYWdlOiBmdW5jdGlvbihmbiwgb2JqKSB7XG4gICAgICAgIHRoaXMucG9zKys7IC8vIHJlc2VydmUgMSBieXRlIGZvciBzaG9ydCBtZXNzYWdlIGxlbmd0aFxuXG4gICAgICAgIC8vIHdyaXRlIHRoZSBtZXNzYWdlIGRpcmVjdGx5IHRvIHRoZSBidWZmZXIgYW5kIHNlZSBob3cgbXVjaCB3YXMgd3JpdHRlblxuICAgICAgICB2YXIgc3RhcnRQb3MgPSB0aGlzLnBvcztcbiAgICAgICAgZm4ob2JqLCB0aGlzKTtcbiAgICAgICAgdmFyIGxlbiA9IHRoaXMucG9zIC0gc3RhcnRQb3M7XG5cbiAgICAgICAgdmFyIHZhcmludExlbiA9XG4gICAgICAgICAgICBsZW4gPD0gMHg3ZiA/IDEgOlxuICAgICAgICAgICAgbGVuIDw9IDB4M2ZmZiA/IDIgOlxuICAgICAgICAgICAgbGVuIDw9IDB4MWZmZmZmID8gMyA6XG4gICAgICAgICAgICBsZW4gPD0gMHhmZmZmZmZmID8gNCA6IE1hdGguY2VpbChNYXRoLmxvZyhsZW4pIC8gKE1hdGguTE4yICogNykpO1xuXG4gICAgICAgIC8vIGlmIDEgYnl0ZSBpc24ndCBlbm91Z2ggZm9yIGVuY29kaW5nIG1lc3NhZ2UgbGVuZ3RoLCBzaGlmdCB0aGUgZGF0YSB0byB0aGUgcmlnaHRcbiAgICAgICAgaWYgKHZhcmludExlbiA+IDEpIHtcbiAgICAgICAgICAgIHRoaXMucmVhbGxvYyh2YXJpbnRMZW4gLSAxKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSB0aGlzLnBvcyAtIDE7IGkgPj0gc3RhcnRQb3M7IGktLSkgdGhpcy5idWZbaSArIHZhcmludExlbiAtIDFdID0gdGhpcy5idWZbaV07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmaW5hbGx5LCB3cml0ZSB0aGUgbWVzc2FnZSBsZW5ndGggaW4gdGhlIHJlc2VydmVkIHBsYWNlIGFuZCByZXN0b3JlIHRoZSBwb3NpdGlvblxuICAgICAgICB0aGlzLnBvcyA9IHN0YXJ0UG9zIC0gMTtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludChsZW4pO1xuICAgICAgICB0aGlzLnBvcyArPSBsZW47XG4gICAgfSxcblxuICAgIHdyaXRlTWVzc2FnZTogZnVuY3Rpb24odGFnLCBmbiwgb2JqKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlUmF3TWVzc2FnZShmbiwgb2JqKTtcbiAgICB9LFxuXG4gICAgd3JpdGVQYWNrZWRWYXJpbnQ6ICAgZnVuY3Rpb24odGFnLCBhcnIpIHsgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZFZhcmludCwgYXJyKTsgICB9LFxuICAgIHdyaXRlUGFja2VkU1ZhcmludDogIGZ1bmN0aW9uKHRhZywgYXJyKSB7IHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRTVmFyaW50LCBhcnIpOyAgfSxcbiAgICB3cml0ZVBhY2tlZEJvb2xlYW46ICBmdW5jdGlvbih0YWcsIGFycikgeyB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkQm9vbGVhbiwgYXJyKTsgIH0sXG4gICAgd3JpdGVQYWNrZWRGbG9hdDogICAgZnVuY3Rpb24odGFnLCBhcnIpIHsgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZEZsb2F0LCBhcnIpOyAgICB9LFxuICAgIHdyaXRlUGFja2VkRG91YmxlOiAgIGZ1bmN0aW9uKHRhZywgYXJyKSB7IHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWREb3VibGUsIGFycik7ICAgfSxcbiAgICB3cml0ZVBhY2tlZEZpeGVkMzI6ICBmdW5jdGlvbih0YWcsIGFycikgeyB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkRml4ZWQzMiwgYXJyKTsgIH0sXG4gICAgd3JpdGVQYWNrZWRTRml4ZWQzMjogZnVuY3Rpb24odGFnLCBhcnIpIHsgdGhpcy53cml0ZU1lc3NhZ2UodGFnLCB3cml0ZVBhY2tlZFNGaXhlZDMyLCBhcnIpOyB9LFxuICAgIHdyaXRlUGFja2VkRml4ZWQ2NDogIGZ1bmN0aW9uKHRhZywgYXJyKSB7IHRoaXMud3JpdGVNZXNzYWdlKHRhZywgd3JpdGVQYWNrZWRGaXhlZDY0LCBhcnIpOyAgfSxcbiAgICB3cml0ZVBhY2tlZFNGaXhlZDY0OiBmdW5jdGlvbih0YWcsIGFycikgeyB0aGlzLndyaXRlTWVzc2FnZSh0YWcsIHdyaXRlUGFja2VkU0ZpeGVkNjQsIGFycik7IH0sXG5cbiAgICB3cml0ZUJ5dGVzRmllbGQ6IGZ1bmN0aW9uKHRhZywgYnVmZmVyKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlQnl0ZXMoYnVmZmVyKTtcbiAgICB9LFxuICAgIHdyaXRlRml4ZWQzMkZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkMzIpO1xuICAgICAgICB0aGlzLndyaXRlRml4ZWQzMih2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTRml4ZWQzMkZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkMzIpO1xuICAgICAgICB0aGlzLndyaXRlU0ZpeGVkMzIodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlRml4ZWQ2NEZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkNjQpO1xuICAgICAgICB0aGlzLndyaXRlRml4ZWQ2NCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTRml4ZWQ2NEZpZWxkOiBmdW5jdGlvbih0YWcsIHZhbCkge1xuICAgICAgICB0aGlzLndyaXRlVGFnKHRhZywgUGJmLkZpeGVkNjQpO1xuICAgICAgICB0aGlzLndyaXRlU0ZpeGVkNjQodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlVmFyaW50RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuVmFyaW50KTtcbiAgICAgICAgdGhpcy53cml0ZVZhcmludCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVTVmFyaW50RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuVmFyaW50KTtcbiAgICAgICAgdGhpcy53cml0ZVNWYXJpbnQodmFsKTtcbiAgICB9LFxuICAgIHdyaXRlU3RyaW5nRmllbGQ6IGZ1bmN0aW9uKHRhZywgc3RyKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuQnl0ZXMpO1xuICAgICAgICB0aGlzLndyaXRlU3RyaW5nKHN0cik7XG4gICAgfSxcbiAgICB3cml0ZUZsb2F0RmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVUYWcodGFnLCBQYmYuRml4ZWQzMik7XG4gICAgICAgIHRoaXMud3JpdGVGbG9hdCh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVEb3VibGVGaWVsZDogZnVuY3Rpb24odGFnLCB2YWwpIHtcbiAgICAgICAgdGhpcy53cml0ZVRhZyh0YWcsIFBiZi5GaXhlZDY0KTtcbiAgICAgICAgdGhpcy53cml0ZURvdWJsZSh2YWwpO1xuICAgIH0sXG4gICAgd3JpdGVCb29sZWFuRmllbGQ6IGZ1bmN0aW9uKHRhZywgdmFsKSB7XG4gICAgICAgIHRoaXMud3JpdGVWYXJpbnRGaWVsZCh0YWcsIEJvb2xlYW4odmFsKSk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gd3JpdGVQYWNrZWRWYXJpbnQoYXJyLCBwYmYpICAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlVmFyaW50KGFycltpXSk7ICAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRTVmFyaW50KGFyciwgcGJmKSAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlU1ZhcmludChhcnJbaV0pOyAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRGbG9hdChhcnIsIHBiZikgICAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlRmxvYXQoYXJyW2ldKTsgICAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWREb3VibGUoYXJyLCBwYmYpICAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlRG91YmxlKGFycltpXSk7ICAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRCb29sZWFuKGFyciwgcGJmKSAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlQm9vbGVhbihhcnJbaV0pOyAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRGaXhlZDMyKGFyciwgcGJmKSAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlRml4ZWQzMihhcnJbaV0pOyAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRTRml4ZWQzMihhcnIsIHBiZikgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlU0ZpeGVkMzIoYXJyW2ldKTsgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRGaXhlZDY0KGFyciwgcGJmKSAgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlRml4ZWQ2NChhcnJbaV0pOyAgfVxuZnVuY3Rpb24gd3JpdGVQYWNrZWRTRml4ZWQ2NChhcnIsIHBiZikgeyBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgcGJmLndyaXRlU0ZpeGVkNjQoYXJyW2ldKTsgfVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0OnV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTl3WW1ZdmFXNWtaWGd1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWp0QlFVRkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQklpd2labWxzWlNJNkltZGxibVZ5WVhSbFpDNXFjeUlzSW5OdmRYSmpaVkp2YjNRaU9pSWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUluZFhObElITjBjbWxqZENjN1hHNWNibTF2WkhWc1pTNWxlSEJ2Y25SeklEMGdVR0ptTzF4dVhHNTJZWElnUW5WbVptVnlJRDBnWjJ4dlltRnNMa0oxWm1abGNpQjhmQ0J5WlhGMWFYSmxLQ2N1TDJKMVptWmxjaWNwTzF4dVhHNW1kVzVqZEdsdmJpQlFZbVlvWW5WbUtTQjdYRzRnSUNBZ2RHaHBjeTVpZFdZZ1BTQWhRblZtWm1WeUxtbHpRblZtWm1WeUtHSjFaaWtnUHlCdVpYY2dRblZtWm1WeUtHSjFaaUI4ZkNBd0tTQTZJR0oxWmp0Y2JpQWdJQ0IwYUdsekxuQnZjeUE5SURBN1hHNGdJQ0FnZEdocGN5NXNaVzVuZEdnZ1BTQjBhR2x6TG1KMVppNXNaVzVuZEdnN1hHNTlYRzVjYmxCaVppNVdZWEpwYm5RZ0lEMGdNRHNnTHk4Z2RtRnlhVzUwT2lCcGJuUXpNaXdnYVc1ME5qUXNJSFZwYm5Rek1pd2dkV2x1ZERZMExDQnphVzUwTXpJc0lITnBiblEyTkN3Z1ltOXZiQ3dnWlc1MWJWeHVVR0ptTGtacGVHVmtOalFnUFNBeE95QXZMeUEyTkMxaWFYUTZJR1J2ZFdKc1pTd2dabWw0WldRMk5Dd2djMlpwZUdWa05qUmNibEJpWmk1Q2VYUmxjeUFnSUQwZ01qc2dMeThnYkdWdVozUm9MV1JsYkdsdGFYUmxaRG9nYzNSeWFXNW5MQ0JpZVhSbGN5d2daVzFpWldSa1pXUWdiV1Z6YzJGblpYTXNJSEJoWTJ0bFpDQnlaWEJsWVhSbFpDQm1hV1ZzWkhOY2JsQmlaaTVHYVhobFpETXlJRDBnTlRzZ0x5OGdNekl0WW1sME9pQm1iRzloZEN3Z1ptbDRaV1F6TWl3Z2MyWnBlR1ZrTXpKY2JseHVkbUZ5SUZOSVNVWlVYMHhGUmxSZk16SWdQU0FvTVNBOFBDQXhOaWtnS2lBb01TQThQQ0F4Tmlrc1hHNGdJQ0FnVTBoSlJsUmZVa2xIU0ZSZk16SWdQU0F4SUM4Z1UwaEpSbFJmVEVWR1ZGOHpNaXhjYmlBZ0lDQlFUMWRmTWw4Mk15QTlJRTFoZEdndWNHOTNLRElzSURZektUdGNibHh1VUdKbUxuQnliM1J2ZEhsd1pTQTlJSHRjYmx4dUlDQWdJR1JsYzNSeWIzazZJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbUoxWmlBOUlHNTFiR3c3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJQzh2SUQwOVBTQlNSVUZFU1U1SElEMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlYRzVjYmlBZ0lDQnlaV0ZrUm1sbGJHUnpPaUJtZFc1amRHbHZiaWh5WldGa1JtbGxiR1FzSUhKbGMzVnNkQ3dnWlc1a0tTQjdYRzRnSUNBZ0lDQWdJR1Z1WkNBOUlHVnVaQ0I4ZkNCMGFHbHpMbXhsYm1kMGFEdGNibHh1SUNBZ0lDQWdJQ0IzYUdsc1pTQW9kR2hwY3k1d2IzTWdQQ0JsYm1RcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQjJZV3dnUFNCMGFHbHpMbkpsWVdSV1lYSnBiblFvS1N4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMFlXY2dQU0IyWVd3Z1BqNGdNeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6ZEdGeWRGQnZjeUE5SUhSb2FYTXVjRzl6TzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0J5WldGa1JtbGxiR1FvZEdGbkxDQnlaWE4xYkhRc0lIUm9hWE1wTzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RHaHBjeTV3YjNNZ1BUMDlJSE4wWVhKMFVHOXpLU0IwYUdsekxuTnJhWEFvZG1Gc0tUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjbVZ6ZFd4ME8xeHVJQ0FnSUgwc1hHNWNiaUFnSUNCeVpXRmtUV1Z6YzJGblpUb2dablZ1WTNScGIyNG9jbVZoWkVacFpXeGtMQ0J5WlhOMWJIUXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFJvYVhNdWNtVmhaRVpwWld4a2N5aHlaV0ZrUm1sbGJHUXNJSEpsYzNWc2RDd2dkR2hwY3k1eVpXRmtWbUZ5YVc1MEtDa2dLeUIwYUdsekxuQnZjeWs3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJSEpsWVdSR2FYaGxaRE15T2lCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhaaGJDQTlJSFJvYVhNdVluVm1MbkpsWVdSVlNXNTBNekpNUlNoMGFHbHpMbkJ2Y3lrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Y0c5eklDczlJRFE3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUIyWVd3N1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhKbFlXUlRSbWw0WldRek1qb2dablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQjJZV3dnUFNCMGFHbHpMbUoxWmk1eVpXRmtTVzUwTXpKTVJTaDBhR2x6TG5CdmN5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdWNHOXpJQ3M5SURRN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMllXdzdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lDOHZJRFkwTFdKcGRDQnBiblFnYUdGdVpHeHBibWNnYVhNZ1ltRnpaV1FnYjI0Z1oybDBhSFZpTG1OdmJTOWtjSGN2Ym05a1pTMWlkV1ptWlhJdGJXOXlaUzFwYm5SeklDaE5TVlF0YkdsalpXNXpaV1FwWEc1Y2JpQWdJQ0J5WldGa1JtbDRaV1EyTkRvZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCMllXd2dQU0IwYUdsekxtSjFaaTV5WldGa1ZVbHVkRE15VEVVb2RHaHBjeTV3YjNNcElDc2dkR2hwY3k1aWRXWXVjbVZoWkZWSmJuUXpNa3hGS0hSb2FYTXVjRzl6SUNzZ05Da2dLaUJUU0VsR1ZGOU1SVVpVWHpNeU8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CdmN5QXJQU0E0TzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZG1Gc08xeHVJQ0FnSUgwc1hHNWNiaUFnSUNCeVpXRmtVMFpwZUdWa05qUTZJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdkbUZzSUQwZ2RHaHBjeTVpZFdZdWNtVmhaRlZKYm5Rek1reEZLSFJvYVhNdWNHOXpLU0FySUhSb2FYTXVZblZtTG5KbFlXUkpiblF6TWt4RktIUm9hWE11Y0c5eklDc2dOQ2tnS2lCVFNFbEdWRjlNUlVaVVh6TXlPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuQnZjeUFyUFNBNE8xeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RtRnNPMXh1SUNBZ0lIMHNYRzVjYmlBZ0lDQnlaV0ZrUm14dllYUTZJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdkbUZzSUQwZ2RHaHBjeTVpZFdZdWNtVmhaRVpzYjJGMFRFVW9kR2hwY3k1d2IzTXBPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuQnZjeUFyUFNBME8xeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RtRnNPMXh1SUNBZ0lIMHNYRzVjYmlBZ0lDQnlaV0ZrUkc5MVlteGxPaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSFpoYkNBOUlIUm9hWE11WW5WbUxuSmxZV1JFYjNWaWJHVk1SU2gwYUdsekxuQnZjeWs3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjRzl6SUNzOUlEZzdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjJZV3c3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJSEpsWVdSV1lYSnBiblE2SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnWW5WbUlEMGdkR2hwY3k1aWRXWXNYRzRnSUNBZ0lDQWdJQ0FnSUNCMllXd3NJR0lzSUdJd0xDQmlNU3dnWWpJc0lHSXpPMXh1WEc0Z0lDQWdJQ0FnSUdJd0lEMGdZblZtVzNSb2FYTXVjRzl6S3l0ZE95QnBaaUFvWWpBZ1BDQXdlRGd3S1NCeVpYUjFjbTRnWWpBN0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCaU1DQTlJR0l3SUNZZ01IZzNaanRjYmlBZ0lDQWdJQ0FnWWpFZ1BTQmlkV1piZEdocGN5NXdiM01ySzEwN0lHbG1JQ2hpTVNBOElEQjRPREFwSUhKbGRIVnliaUJpTUNCOElHSXhJRHc4SURjN0lDQWdJQ0FnSUdJeElEMGdLR0l4SUNZZ01IZzNaaWtnUER3Z056dGNiaUFnSUNBZ0lDQWdZaklnUFNCaWRXWmJkR2hwY3k1d2IzTXJLMTA3SUdsbUlDaGlNaUE4SURCNE9EQXBJSEpsZEhWeWJpQmlNQ0I4SUdJeElId2dZaklnUER3Z01UUTdJR0l5SUQwZ0tHSXlJQ1lnTUhnM1ppa2dQRHdnTVRRN1hHNGdJQ0FnSUNBZ0lHSXpJRDBnWW5WbVczUm9hWE11Y0c5ekt5dGRPeUJwWmlBb1lqTWdQQ0F3ZURnd0tTQnlaWFIxY200Z1lqQWdmQ0JpTVNCOElHSXlJSHdnWWpNZ1BEd2dNakU3WEc1Y2JpQWdJQ0FnSUNBZ2RtRnNJRDBnWWpBZ2ZDQmlNU0I4SUdJeUlId2dLR0l6SUNZZ01IZzNaaWtnUER3Z01qRTdYRzVjYmlBZ0lDQWdJQ0FnWWlBOUlHSjFabHQwYUdsekxuQnZjeXNyWFRzZ2RtRnNJQ3M5SUNoaUlDWWdNSGczWmlrZ0tpQXdlREV3TURBd01EQXdPeUFnSUNBZ0lDQWdJR2xtSUNoaUlEd2dNSGc0TUNrZ2NtVjBkWEp1SUhaaGJEdGNiaUFnSUNBZ0lDQWdZaUE5SUdKMVpsdDBhR2x6TG5CdmN5c3JYVHNnZG1Gc0lDczlJQ2hpSUNZZ01IZzNaaWtnS2lBd2VEZ3dNREF3TURBd01Ec2dJQ0FnSUNBZ0lHbG1JQ2hpSUR3Z01IZzRNQ2tnY21WMGRYSnVJSFpoYkR0Y2JpQWdJQ0FnSUNBZ1lpQTlJR0oxWmx0MGFHbHpMbkJ2Y3lzclhUc2dkbUZzSUNzOUlDaGlJQ1lnTUhnM1ppa2dLaUF3ZURRd01EQXdNREF3TURBd095QWdJQ0FnSUdsbUlDaGlJRHdnTUhnNE1Da2djbVYwZFhKdUlIWmhiRHRjYmlBZ0lDQWdJQ0FnWWlBOUlHSjFabHQwYUdsekxuQnZjeXNyWFRzZ2RtRnNJQ3M5SUNoaUlDWWdNSGczWmlrZ0tpQXdlREl3TURBd01EQXdNREF3TURBN0lDQWdJR2xtSUNoaUlEd2dNSGc0TUNrZ2NtVjBkWEp1SUhaaGJEdGNiaUFnSUNBZ0lDQWdZaUE5SUdKMVpsdDBhR2x6TG5CdmN5c3JYVHNnZG1Gc0lDczlJQ2hpSUNZZ01IZzNaaWtnS2lBd2VERXdNREF3TURBd01EQXdNREF3TURzZ0lHbG1JQ2hpSUR3Z01IZzRNQ2tnY21WMGRYSnVJSFpoYkR0Y2JpQWdJQ0FnSUNBZ1lpQTlJR0oxWmx0MGFHbHpMbkJ2Y3lzclhUc2dkbUZzSUNzOUlDaGlJQ1lnTUhnM1ppa2dLaUF3ZURnd01EQXdNREF3TURBd01EQXdNREE3SUdsbUlDaGlJRHdnTUhnNE1Da2djbVYwZFhKdUlIWmhiRHRjYmx4dUlDQWdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1JYSnliM0lvSjBWNGNHVmpkR1ZrSUhaaGNtbHVkQ0J1YjNRZ2JXOXlaU0IwYUdGdUlERXdJR0o1ZEdWekp5azdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lISmxZV1JXWVhKcGJuUTJORG9nWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ6ZEdGeWRGQnZjeUE5SUhSb2FYTXVjRzl6TEZ4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZzSUQwZ2RHaHBjeTV5WldGa1ZtRnlhVzUwS0NrN1hHNWNiaUFnSUNBZ0lDQWdhV1lnS0haaGJDQThJRkJQVjE4eVh6WXpLU0J5WlhSMWNtNGdkbUZzTzF4dVhHNGdJQ0FnSUNBZ0lIWmhjaUJ3YjNNZ1BTQjBhR2x6TG5CdmN5QXRJREk3WEc0Z0lDQWdJQ0FnSUhkb2FXeGxJQ2gwYUdsekxtSjFabHR3YjNOZElEMDlQU0F3ZUdabUtTQndiM010TFR0Y2JpQWdJQ0FnSUNBZ2FXWWdLSEJ2Y3lBOElITjBZWEowVUc5ektTQndiM01nUFNCemRHRnlkRkJ2Y3p0Y2JseHVJQ0FnSUNBZ0lDQjJZV3dnUFNBd08xeHVJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSEJ2Y3lBdElITjBZWEowVUc5eklDc2dNVHNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdZaUE5SUg1MGFHbHpMbUoxWmx0emRHRnlkRkJ2Y3lBcklHbGRJQ1lnTUhnM1pqdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGJDQXJQU0JwSUR3Z05DQS9JR0lnUER3Z2FTQXFJRGNnT2lCaUlDb2dUV0YwYUM1d2IzY29NaXdnYVNBcUlEY3BPMXh1SUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUMxMllXd2dMU0F4TzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0J5WldGa1UxWmhjbWx1ZERvZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCdWRXMGdQU0IwYUdsekxuSmxZV1JXWVhKcGJuUW9LVHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzUxYlNBbElESWdQVDA5SURFZ1B5QW9iblZ0SUNzZ01Ta2dMeUF0TWlBNklHNTFiU0F2SURJN0lDOHZJSHBwWjNwaFp5QmxibU52WkdsdVoxeHVJQ0FnSUgwc1hHNWNiaUFnSUNCeVpXRmtRbTl2YkdWaGJqb2dablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJDYjI5c1pXRnVLSFJvYVhNdWNtVmhaRlpoY21sdWRDZ3BLVHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdjbVZoWkZOMGNtbHVaem9nWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJsYm1RZ1BTQjBhR2x6TG5KbFlXUldZWEpwYm5Rb0tTQXJJSFJvYVhNdWNHOXpMRnh1SUNBZ0lDQWdJQ0FnSUNBZ2MzUnlJRDBnZEdocGN5NWlkV1l1ZEc5VGRISnBibWNvSjNWMFpqZ25MQ0IwYUdsekxuQnZjeXdnWlc1a0tUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1d2IzTWdQU0JsYm1RN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCemRISTdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lISmxZV1JDZVhSbGN6b2dablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQmxibVFnUFNCMGFHbHpMbkpsWVdSV1lYSnBiblFvS1NBcklIUm9hWE11Y0c5ekxGeHVJQ0FnSUNBZ0lDQWdJQ0FnWW5WbVptVnlJRDBnZEdocGN5NWlkV1l1YzJ4cFkyVW9kR2hwY3k1d2IzTXNJR1Z1WkNrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Y0c5eklEMGdaVzVrTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWW5WbVptVnlPMXh1SUNBZ0lIMHNYRzVjYmlBZ0lDQXZMeUIyWlhKaWIzTmxJR1p2Y2lCd1pYSm1iM0p0WVc1alpTQnlaV0Z6YjI1ek95QmtiMlZ6YmlkMElHRm1abVZqZENCbmVtbHdjR1ZrSUhOcGVtVmNibHh1SUNBZ0lISmxZV1JRWVdOclpXUldZWEpwYm5RNklHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pXNWtJRDBnZEdocGN5NXlaV0ZrVm1GeWFXNTBLQ2tnS3lCMGFHbHpMbkJ2Y3l3Z1lYSnlJRDBnVzEwN1hHNGdJQ0FnSUNBZ0lIZG9hV3hsSUNoMGFHbHpMbkJ2Y3lBOElHVnVaQ2tnWVhKeUxuQjFjMmdvZEdocGN5NXlaV0ZrVm1GeWFXNTBLQ2twTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWVhKeU8xeHVJQ0FnSUgwc1hHNGdJQ0FnY21WaFpGQmhZMnRsWkZOV1lYSnBiblE2SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnWlc1a0lEMGdkR2hwY3k1eVpXRmtWbUZ5YVc1MEtDa2dLeUIwYUdsekxuQnZjeXdnWVhKeUlEMGdXMTA3WEc0Z0lDQWdJQ0FnSUhkb2FXeGxJQ2gwYUdsekxuQnZjeUE4SUdWdVpDa2dZWEp5TG5CMWMyZ29kR2hwY3k1eVpXRmtVMVpoY21sdWRDZ3BLVHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR0Z5Y2p0Y2JpQWdJQ0I5TEZ4dUlDQWdJSEpsWVdSUVlXTnJaV1JDYjI5c1pXRnVPaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR1Z1WkNBOUlIUm9hWE11Y21WaFpGWmhjbWx1ZENncElDc2dkR2hwY3k1d2IzTXNJR0Z5Y2lBOUlGdGRPMXh1SUNBZ0lDQWdJQ0IzYUdsc1pTQW9kR2hwY3k1d2IzTWdQQ0JsYm1RcElHRnljaTV3ZFhOb0tIUm9hWE11Y21WaFpFSnZiMnhsWVc0b0tTazdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQmhjbkk3WEc0Z0lDQWdmU3hjYmlBZ0lDQnlaV0ZrVUdGamEyVmtSbXh2WVhRNklHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pXNWtJRDBnZEdocGN5NXlaV0ZrVm1GeWFXNTBLQ2tnS3lCMGFHbHpMbkJ2Y3l3Z1lYSnlJRDBnVzEwN1hHNGdJQ0FnSUNBZ0lIZG9hV3hsSUNoMGFHbHpMbkJ2Y3lBOElHVnVaQ2tnWVhKeUxuQjFjMmdvZEdocGN5NXlaV0ZrUm14dllYUW9LU2s3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJoY25JN1hHNGdJQ0FnZlN4Y2JpQWdJQ0J5WldGa1VHRmphMlZrUkc5MVlteGxPaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR1Z1WkNBOUlIUm9hWE11Y21WaFpGWmhjbWx1ZENncElDc2dkR2hwY3k1d2IzTXNJR0Z5Y2lBOUlGdGRPMXh1SUNBZ0lDQWdJQ0IzYUdsc1pTQW9kR2hwY3k1d2IzTWdQQ0JsYm1RcElHRnljaTV3ZFhOb0tIUm9hWE11Y21WaFpFUnZkV0pzWlNncEtUdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHRnljanRjYmlBZ0lDQjlMRnh1SUNBZ0lISmxZV1JRWVdOclpXUkdhWGhsWkRNeU9pQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHVnVaQ0E5SUhSb2FYTXVjbVZoWkZaaGNtbHVkQ2dwSUNzZ2RHaHBjeTV3YjNNc0lHRnljaUE5SUZ0ZE8xeHVJQ0FnSUNBZ0lDQjNhR2xzWlNBb2RHaHBjeTV3YjNNZ1BDQmxibVFwSUdGeWNpNXdkWE5vS0hSb2FYTXVjbVZoWkVacGVHVmtNeklvS1NrN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCaGNuSTdYRzRnSUNBZ2ZTeGNiaUFnSUNCeVpXRmtVR0ZqYTJWa1UwWnBlR1ZrTXpJNklHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pXNWtJRDBnZEdocGN5NXlaV0ZrVm1GeWFXNTBLQ2tnS3lCMGFHbHpMbkJ2Y3l3Z1lYSnlJRDBnVzEwN1hHNGdJQ0FnSUNBZ0lIZG9hV3hsSUNoMGFHbHpMbkJ2Y3lBOElHVnVaQ2tnWVhKeUxuQjFjMmdvZEdocGN5NXlaV0ZrVTBacGVHVmtNeklvS1NrN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCaGNuSTdYRzRnSUNBZ2ZTeGNiaUFnSUNCeVpXRmtVR0ZqYTJWa1JtbDRaV1EyTkRvZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCbGJtUWdQU0IwYUdsekxuSmxZV1JXWVhKcGJuUW9LU0FySUhSb2FYTXVjRzl6TENCaGNuSWdQU0JiWFR0Y2JpQWdJQ0FnSUNBZ2QyaHBiR1VnS0hSb2FYTXVjRzl6SUR3Z1pXNWtLU0JoY25JdWNIVnphQ2gwYUdsekxuSmxZV1JHYVhobFpEWTBLQ2twTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWVhKeU8xeHVJQ0FnSUgwc1hHNGdJQ0FnY21WaFpGQmhZMnRsWkZOR2FYaGxaRFkwT2lCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUdWdVpDQTlJSFJvYVhNdWNtVmhaRlpoY21sdWRDZ3BJQ3NnZEdocGN5NXdiM01zSUdGeWNpQTlJRnRkTzF4dUlDQWdJQ0FnSUNCM2FHbHNaU0FvZEdocGN5NXdiM01nUENCbGJtUXBJR0Z5Y2k1d2RYTm9LSFJvYVhNdWNtVmhaRk5HYVhobFpEWTBLQ2twTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWVhKeU8xeHVJQ0FnSUgwc1hHNWNiaUFnSUNCemEybHdPaUJtZFc1amRHbHZiaWgyWVd3cElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhSNWNHVWdQU0IyWVd3Z0ppQXdlRGM3WEc0Z0lDQWdJQ0FnSUdsbUlDaDBlWEJsSUQwOVBTQlFZbVl1Vm1GeWFXNTBLU0IzYUdsc1pTQW9kR2hwY3k1aWRXWmJkR2hwY3k1d2IzTXJLMTBnUGlBd2VEZG1LU0I3ZlZ4dUlDQWdJQ0FnSUNCbGJITmxJR2xtSUNoMGVYQmxJRDA5UFNCUVltWXVRbmwwWlhNcElIUm9hWE11Y0c5eklEMGdkR2hwY3k1eVpXRmtWbUZ5YVc1MEtDa2dLeUIwYUdsekxuQnZjenRjYmlBZ0lDQWdJQ0FnWld4elpTQnBaaUFvZEhsd1pTQTlQVDBnVUdKbUxrWnBlR1ZrTXpJcElIUm9hWE11Y0c5eklDczlJRFE3WEc0Z0lDQWdJQ0FnSUdWc2MyVWdhV1lnS0hSNWNHVWdQVDA5SUZCaVppNUdhWGhsWkRZMEtTQjBhR2x6TG5CdmN5QXJQU0E0TzF4dUlDQWdJQ0FnSUNCbGJITmxJSFJvY205M0lHNWxkeUJGY25KdmNpZ25WVzVwYlhCc1pXMWxiblJsWkNCMGVYQmxPaUFuSUNzZ2RIbHdaU2s3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJQzh2SUQwOVBTQlhVa2xVU1U1SElEMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlYRzVjYmlBZ0lDQjNjbWwwWlZSaFp6b2dablZ1WTNScGIyNG9kR0ZuTENCMGVYQmxLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVkM0pwZEdWV1lYSnBiblFvS0hSaFp5QThQQ0F6S1NCOElIUjVjR1VwTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0J5WldGc2JHOWpPaUJtZFc1amRHbHZiaWh0YVc0cElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUd4bGJtZDBhQ0E5SUhSb2FYTXViR1Z1WjNSb0lIeDhJREUyTzF4dVhHNGdJQ0FnSUNBZ0lIZG9hV3hsSUNoc1pXNW5kR2dnUENCMGFHbHpMbkJ2Y3lBcklHMXBiaWtnYkdWdVozUm9JQ285SURJN1hHNWNiaUFnSUNBZ0lDQWdhV1lnS0d4bGJtZDBhQ0FoUFQwZ2RHaHBjeTVzWlc1bmRHZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJpZFdZZ1BTQnVaWGNnUW5WbVptVnlLR3hsYm1kMGFDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbUoxWmk1amIzQjVLR0oxWmlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxtSjFaaUE5SUdKMVpqdGNiaUFnSUNBZ0lDQWdJQ0FnSUhSb2FYTXViR1Z1WjNSb0lEMGdiR1Z1WjNSb08xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lHWnBibWx6YURvZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdWJHVnVaM1JvSUQwZ2RHaHBjeTV3YjNNN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Y0c5eklEMGdNRHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFJvYVhNdVluVm1Mbk5zYVdObEtEQXNJSFJvYVhNdWJHVnVaM1JvS1R0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnZDNKcGRHVkdhWGhsWkRNeU9pQm1kVzVqZEdsdmJpaDJZV3dwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV5WldGc2JHOWpLRFFwTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbUoxWmk1M2NtbDBaVlZKYm5Rek1reEZLSFpoYkN3Z2RHaHBjeTV3YjNNcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CdmN5QXJQU0EwTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0IzY21sMFpWTkdhWGhsWkRNeU9pQm1kVzVqZEdsdmJpaDJZV3dwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV5WldGc2JHOWpLRFFwTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbUoxWmk1M2NtbDBaVWx1ZERNeVRFVW9kbUZzTENCMGFHbHpMbkJ2Y3lrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Y0c5eklDczlJRFE3WEc0Z0lDQWdmU3hjYmx4dUlDQWdJSGR5YVhSbFJtbDRaV1EyTkRvZ1puVnVZM1JwYjI0b2RtRnNLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjbVZoYkd4dll5ZzRLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWlkV1l1ZDNKcGRHVkpiblF6TWt4RktIWmhiQ0FtSUMweExDQjBhR2x6TG5CdmN5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdVluVm1MbmR5YVhSbFZVbHVkRE15VEVVb1RXRjBhQzVtYkc5dmNpaDJZV3dnS2lCVFNFbEdWRjlTU1VkSVZGOHpNaWtzSUhSb2FYTXVjRzl6SUNzZ05DazdYRzRnSUNBZ0lDQWdJSFJvYVhNdWNHOXpJQ3M5SURnN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhkeWFYUmxVMFpwZUdWa05qUTZJR1oxYm1OMGFXOXVLSFpoYkNrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG5KbFlXeHNiMk1vT0NrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WW5WbUxuZHlhWFJsU1c1ME16Sk1SU2gyWVd3Z0ppQXRNU3dnZEdocGN5NXdiM01wTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbUoxWmk1M2NtbDBaVWx1ZERNeVRFVW9UV0YwYUM1bWJHOXZjaWgyWVd3Z0tpQlRTRWxHVkY5U1NVZElWRjh6TWlrc0lIUm9hWE11Y0c5eklDc2dOQ2s3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjRzl6SUNzOUlEZzdYRzRnSUNBZ2ZTeGNibHh1SUNBZ0lIZHlhWFJsVm1GeWFXNTBPaUJtZFc1amRHbHZiaWgyWVd3cElIdGNiaUFnSUNBZ0lDQWdkbUZzSUQwZ0szWmhiRHRjYmx4dUlDQWdJQ0FnSUNCcFppQW9kbUZzSUR3OUlEQjROMllwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhNdWNtVmhiR3h2WXlneEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVZblZtVzNSb2FYTXVjRzl6S3l0ZElEMGdkbUZzTzF4dVhHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9kbUZzSUR3OUlEQjRNMlptWmlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZEdocGN5NXlaV0ZzYkc5aktESXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTVpZFdaYmRHaHBjeTV3YjNNcksxMGdQU0FvS0haaGJDQStQajRnTUNrZ0ppQXdlRGRtS1NCOElEQjRPREE3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG1KMVpsdDBhR2x6TG5CdmN5c3JYU0E5SUNnb2RtRnNJRDQrUGlBM0tTQW1JREI0TjJZcE8xeHVYRzRnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvZG1Gc0lEdzlJREI0TVdabVptWm1LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG5KbFlXeHNiMk1vTXlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxtSjFabHQwYUdsekxuQnZjeXNyWFNBOUlDZ29kbUZzSUQ0K1BpQXdLU0FtSURCNE4yWXBJSHdnTUhnNE1EdGNiaUFnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVZblZtVzNSb2FYTXVjRzl6S3l0ZElEMGdLQ2gyWVd3Z1BqNCtJRGNwSUNZZ01IZzNaaWtnZkNBd2VEZ3dPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTVpZFdaYmRHaHBjeTV3YjNNcksxMGdQU0FvS0haaGJDQStQajRnTVRRcElDWWdNSGczWmlrN1hHNWNiaUFnSUNBZ0lDQWdmU0JsYkhObElHbG1JQ2gyWVd3Z1BEMGdNSGhtWm1abVptWm1LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG5KbFlXeHNiMk1vTkNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxtSjFabHQwYUdsekxuQnZjeXNyWFNBOUlDZ29kbUZzSUQ0K1BpQXdLU0FtSURCNE4yWXBJSHdnTUhnNE1EdGNiaUFnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVZblZtVzNSb2FYTXVjRzl6S3l0ZElEMGdLQ2gyWVd3Z1BqNCtJRGNwSUNZZ01IZzNaaWtnZkNBd2VEZ3dPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTVpZFdaYmRHaHBjeTV3YjNNcksxMGdQU0FvS0haaGJDQStQajRnTVRRcElDWWdNSGczWmlrZ2ZDQXdlRGd3TzF4dUlDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1aWRXWmJkR2hwY3k1d2IzTXJLMTBnUFNBb0tIWmhiQ0ErUGo0Z01qRXBJQ1lnTUhnM1ppazdYRzVjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ3YjNNZ1BTQjBhR2x6TG5CdmN6dGNiaUFnSUNBZ0lDQWdJQ0FnSUhkb2FXeGxJQ2gyWVd3Z1BqMGdNSGc0TUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUm9hWE11Y21WaGJHeHZZeWd4S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbUoxWmx0MGFHbHpMbkJ2Y3lzclhTQTlJQ2gyWVd3Z0ppQXdlR1ptS1NCOElEQjRPREE3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1Gc0lDODlJREI0T0RBN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG5KbFlXeHNiMk1vTVNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxtSjFabHQwYUdsekxuQnZjeXNyWFNBOUlIWmhiQ0I4SURBN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RHaHBjeTV3YjNNZ0xTQndiM01nUGlBeE1Da2dkR2h5YjNjZ2JtVjNJRVZ5Y205eUtDZEhhWFpsYmlCMllYSnBiblFnWkc5bGMyNWNYQ2QwSUdacGRDQnBiblJ2SURFd0lHSjVkR1Z6SnlrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUxGeHVYRzRnSUNBZ2QzSnBkR1ZUVm1GeWFXNTBPaUJtZFc1amRHbHZiaWgyWVd3cElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1M2NtbDBaVlpoY21sdWRDaDJZV3dnUENBd0lEOGdMWFpoYkNBcUlESWdMU0F4SURvZ2RtRnNJQ29nTWlrN1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhkeWFYUmxRbTl2YkdWaGJqb2dablZ1WTNScGIyNG9kbUZzS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11ZDNKcGRHVldZWEpwYm5Rb1FtOXZiR1ZoYmloMllXd3BLVHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdkM0pwZEdWVGRISnBibWM2SUdaMWJtTjBhVzl1S0hOMGNpa2dlMXh1SUNBZ0lDQWdJQ0J6ZEhJZ1BTQlRkSEpwYm1jb2MzUnlLVHRjYmlBZ0lDQWdJQ0FnZG1GeUlHSjVkR1Z6SUQwZ1FuVm1abVZ5TG1KNWRHVk1aVzVuZEdnb2MzUnlLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NTNjbWwwWlZaaGNtbHVkQ2hpZVhSbGN5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdWNtVmhiR3h2WXloaWVYUmxjeWs3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVZblZtTG5keWFYUmxLSE4wY2l3Z2RHaHBjeTV3YjNNcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CdmN5QXJQU0JpZVhSbGN6dGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2QzSnBkR1ZHYkc5aGREb2dablZ1WTNScGIyNG9kbUZzS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Y21WaGJHeHZZeWcwS1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVpZFdZdWQzSnBkR1ZHYkc5aGRFeEZLSFpoYkN3Z2RHaHBjeTV3YjNNcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CdmN5QXJQU0EwTzF4dUlDQWdJSDBzWEc1Y2JpQWdJQ0IzY21sMFpVUnZkV0pzWlRvZ1puVnVZM1JwYjI0b2RtRnNLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjbVZoYkd4dll5ZzRLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWlkV1l1ZDNKcGRHVkViM1ZpYkdWTVJTaDJZV3dzSUhSb2FYTXVjRzl6S1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV3YjNNZ0t6MGdPRHRjYmlBZ0lDQjlMRnh1WEc0Z0lDQWdkM0pwZEdWQ2VYUmxjem9nWm5WdVkzUnBiMjRvWW5WbVptVnlLU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnNaVzRnUFNCaWRXWm1aWEl1YkdWdVozUm9PMXh1SUNBZ0lDQWdJQ0IwYUdsekxuZHlhWFJsVm1GeWFXNTBLR3hsYmlrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Y21WaGJHeHZZeWhzWlc0cE8xeHVJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR3hsYmpzZ2FTc3JLU0IwYUdsekxtSjFabHQwYUdsekxuQnZjeXNyWFNBOUlHSjFabVpsY2x0cFhUdGNiaUFnSUNCOUxGeHVYRzRnSUNBZ2QzSnBkR1ZTWVhkTlpYTnpZV2RsT2lCbWRXNWpkR2x2YmlobWJpd2diMkpxS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Y0c5ekt5czdJQzh2SUhKbGMyVnlkbVVnTVNCaWVYUmxJR1p2Y2lCemFHOXlkQ0J0WlhOellXZGxJR3hsYm1kMGFGeHVYRzRnSUNBZ0lDQWdJQzh2SUhkeWFYUmxJSFJvWlNCdFpYTnpZV2RsSUdScGNtVmpkR3g1SUhSdklIUm9aU0JpZFdabVpYSWdZVzVrSUhObFpTQm9iM2NnYlhWamFDQjNZWE1nZDNKcGRIUmxibHh1SUNBZ0lDQWdJQ0IyWVhJZ2MzUmhjblJRYjNNZ1BTQjBhR2x6TG5CdmN6dGNiaUFnSUNBZ0lDQWdabTRvYjJKcUxDQjBhR2x6S1R0Y2JpQWdJQ0FnSUNBZ2RtRnlJR3hsYmlBOUlIUm9hWE11Y0c5eklDMGdjM1JoY25SUWIzTTdYRzVjYmlBZ0lDQWdJQ0FnZG1GeUlIWmhjbWx1ZEV4bGJpQTlYRzRnSUNBZ0lDQWdJQ0FnSUNCc1pXNGdQRDBnTUhnM1ppQS9JREVnT2x4dUlDQWdJQ0FnSUNBZ0lDQWdiR1Z1SUR3OUlEQjRNMlptWmlBL0lESWdPbHh1SUNBZ0lDQWdJQ0FnSUNBZ2JHVnVJRHc5SURCNE1XWm1abVptSUQ4Z015QTZYRzRnSUNBZ0lDQWdJQ0FnSUNCc1pXNGdQRDBnTUhobVptWm1abVptSUQ4Z05DQTZJRTFoZEdndVkyVnBiQ2hOWVhSb0xteHZaeWhzWlc0cElDOGdLRTFoZEdndVRFNHlJQ29nTnlrcE8xeHVYRzRnSUNBZ0lDQWdJQzh2SUdsbUlERWdZbmwwWlNCcGMyNG5kQ0JsYm05MVoyZ2dabTl5SUdWdVkyOWthVzVuSUcxbGMzTmhaMlVnYkdWdVozUm9MQ0J6YUdsbWRDQjBhR1VnWkdGMFlTQjBieUIwYUdVZ2NtbG5hSFJjYmlBZ0lDQWdJQ0FnYVdZZ0tIWmhjbWx1ZEV4bGJpQStJREVwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhNdWNtVmhiR3h2WXloMllYSnBiblJNWlc0Z0xTQXhLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0IwYUdsekxuQnZjeUF0SURFN0lHa2dQajBnYzNSaGNuUlFiM003SUdrdExTa2dkR2hwY3k1aWRXWmJhU0FySUhaaGNtbHVkRXhsYmlBdElERmRJRDBnZEdocGN5NWlkV1piYVYwN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0F2THlCbWFXNWhiR3g1TENCM2NtbDBaU0IwYUdVZ2JXVnpjMkZuWlNCc1pXNW5kR2dnYVc0Z2RHaGxJSEpsYzJWeWRtVmtJSEJzWVdObElHRnVaQ0J5WlhOMGIzSmxJSFJvWlNCd2IzTnBkR2x2Ymx4dUlDQWdJQ0FnSUNCMGFHbHpMbkJ2Y3lBOUlITjBZWEowVUc5eklDMGdNVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NTNjbWwwWlZaaGNtbHVkQ2hzWlc0cE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CdmN5QXJQU0JzWlc0N1hHNGdJQ0FnZlN4Y2JseHVJQ0FnSUhkeWFYUmxUV1Z6YzJGblpUb2dablZ1WTNScGIyNG9kR0ZuTENCbWJpd2diMkpxS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11ZDNKcGRHVlVZV2NvZEdGbkxDQlFZbVl1UW5sMFpYTXBPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuZHlhWFJsVW1GM1RXVnpjMkZuWlNobWJpd2diMkpxS1R0Y2JpQWdJQ0I5TEZ4dVhHNGdJQ0FnZDNKcGRHVlFZV05yWldSV1lYSnBiblE2SUNBZ1puVnVZM1JwYjI0b2RHRm5MQ0JoY25JcElIc2dkR2hwY3k1M2NtbDBaVTFsYzNOaFoyVW9kR0ZuTENCM2NtbDBaVkJoWTJ0bFpGWmhjbWx1ZEN3Z1lYSnlLVHNnSUNCOUxGeHVJQ0FnSUhkeWFYUmxVR0ZqYTJWa1UxWmhjbWx1ZERvZ0lHWjFibU4wYVc5dUtIUmhaeXdnWVhKeUtTQjdJSFJvYVhNdWQzSnBkR1ZOWlhOellXZGxLSFJoWnl3Z2QzSnBkR1ZRWVdOclpXUlRWbUZ5YVc1MExDQmhjbklwT3lBZ2ZTeGNiaUFnSUNCM2NtbDBaVkJoWTJ0bFpFSnZiMnhsWVc0NklDQm1kVzVqZEdsdmJpaDBZV2NzSUdGeWNpa2dleUIwYUdsekxuZHlhWFJsVFdWemMyRm5aU2gwWVdjc0lIZHlhWFJsVUdGamEyVmtRbTl2YkdWaGJpd2dZWEp5S1RzZ0lIMHNYRzRnSUNBZ2QzSnBkR1ZRWVdOclpXUkdiRzloZERvZ0lDQWdablZ1WTNScGIyNG9kR0ZuTENCaGNuSXBJSHNnZEdocGN5NTNjbWwwWlUxbGMzTmhaMlVvZEdGbkxDQjNjbWwwWlZCaFkydGxaRVpzYjJGMExDQmhjbklwT3lBZ0lDQjlMRnh1SUNBZ0lIZHlhWFJsVUdGamEyVmtSRzkxWW14bE9pQWdJR1oxYm1OMGFXOXVLSFJoWnl3Z1lYSnlLU0I3SUhSb2FYTXVkM0pwZEdWTlpYTnpZV2RsS0hSaFp5d2dkM0pwZEdWUVlXTnJaV1JFYjNWaWJHVXNJR0Z5Y2lrN0lDQWdmU3hjYmlBZ0lDQjNjbWwwWlZCaFkydGxaRVpwZUdWa016STZJQ0JtZFc1amRHbHZiaWgwWVdjc0lHRnljaWtnZXlCMGFHbHpMbmR5YVhSbFRXVnpjMkZuWlNoMFlXY3NJSGR5YVhSbFVHRmphMlZrUm1sNFpXUXpNaXdnWVhKeUtUc2dJSDBzWEc0Z0lDQWdkM0pwZEdWUVlXTnJaV1JUUm1sNFpXUXpNam9nWm5WdVkzUnBiMjRvZEdGbkxDQmhjbklwSUhzZ2RHaHBjeTUzY21sMFpVMWxjM05oWjJVb2RHRm5MQ0IzY21sMFpWQmhZMnRsWkZOR2FYaGxaRE15TENCaGNuSXBPeUI5TEZ4dUlDQWdJSGR5YVhSbFVHRmphMlZrUm1sNFpXUTJORG9nSUdaMWJtTjBhVzl1S0hSaFp5d2dZWEp5S1NCN0lIUm9hWE11ZDNKcGRHVk5aWE56WVdkbEtIUmhaeXdnZDNKcGRHVlFZV05yWldSR2FYaGxaRFkwTENCaGNuSXBPeUFnZlN4Y2JpQWdJQ0IzY21sMFpWQmhZMnRsWkZOR2FYaGxaRFkwT2lCbWRXNWpkR2x2YmloMFlXY3NJR0Z5Y2lrZ2V5QjBhR2x6TG5keWFYUmxUV1Z6YzJGblpTaDBZV2NzSUhkeWFYUmxVR0ZqYTJWa1UwWnBlR1ZrTmpRc0lHRnljaWs3SUgwc1hHNWNiaUFnSUNCM2NtbDBaVUo1ZEdWelJtbGxiR1E2SUdaMWJtTjBhVzl1S0hSaFp5d2dZblZtWm1WeUtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdWQzSnBkR1ZVWVdjb2RHRm5MQ0JRWW1ZdVFubDBaWE1wTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbmR5YVhSbFFubDBaWE1vWW5WbVptVnlLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lIZHlhWFJsUm1sNFpXUXpNa1pwWld4a09pQm1kVzVqZEdsdmJpaDBZV2NzSUhaaGJDa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxuZHlhWFJsVkdGbktIUmhaeXdnVUdKbUxrWnBlR1ZrTXpJcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5keWFYUmxSbWw0WldRek1paDJZV3dwTzF4dUlDQWdJSDBzWEc0Z0lDQWdkM0pwZEdWVFJtbDRaV1F6TWtacFpXeGtPaUJtZFc1amRHbHZiaWgwWVdjc0lIWmhiQ2tnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbmR5YVhSbFZHRm5LSFJoWnl3Z1VHSm1Ma1pwZUdWa016SXBPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuZHlhWFJsVTBacGVHVmtNeklvZG1Gc0tUdGNiaUFnSUNCOUxGeHVJQ0FnSUhkeWFYUmxSbWw0WldRMk5FWnBaV3hrT2lCbWRXNWpkR2x2YmloMFlXY3NJSFpoYkNrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG5keWFYUmxWR0ZuS0hSaFp5d2dVR0ptTGtacGVHVmtOalFwTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbmR5YVhSbFJtbDRaV1EyTkNoMllXd3BPMXh1SUNBZ0lIMHNYRzRnSUNBZ2QzSnBkR1ZUUm1sNFpXUTJORVpwWld4a09pQm1kVzVqZEdsdmJpaDBZV2NzSUhaaGJDa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxuZHlhWFJsVkdGbktIUmhaeXdnVUdKbUxrWnBlR1ZrTmpRcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5keWFYUmxVMFpwZUdWa05qUW9kbUZzS1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJSGR5YVhSbFZtRnlhVzUwUm1sbGJHUTZJR1oxYm1OMGFXOXVLSFJoWnl3Z2RtRnNLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVkM0pwZEdWVVlXY29kR0ZuTENCUVltWXVWbUZ5YVc1MEtUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1M2NtbDBaVlpoY21sdWRDaDJZV3dwTzF4dUlDQWdJSDBzWEc0Z0lDQWdkM0pwZEdWVFZtRnlhVzUwUm1sbGJHUTZJR1oxYm1OMGFXOXVLSFJoWnl3Z2RtRnNLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVkM0pwZEdWVVlXY29kR0ZuTENCUVltWXVWbUZ5YVc1MEtUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1M2NtbDBaVk5XWVhKcGJuUW9kbUZzS1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJSGR5YVhSbFUzUnlhVzVuUm1sbGJHUTZJR1oxYm1OMGFXOXVLSFJoWnl3Z2MzUnlLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVkM0pwZEdWVVlXY29kR0ZuTENCUVltWXVRbmwwWlhNcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5keWFYUmxVM1J5YVc1bktITjBjaWs3WEc0Z0lDQWdmU3hjYmlBZ0lDQjNjbWwwWlVac2IyRjBSbWxsYkdRNklHWjFibU4wYVc5dUtIUmhaeXdnZG1Gc0tTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdWQzSnBkR1ZVWVdjb2RHRm5MQ0JRWW1ZdVJtbDRaV1F6TWlrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11ZDNKcGRHVkdiRzloZENoMllXd3BPMXh1SUNBZ0lIMHNYRzRnSUNBZ2QzSnBkR1ZFYjNWaWJHVkdhV1ZzWkRvZ1puVnVZM1JwYjI0b2RHRm5MQ0IyWVd3cElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1M2NtbDBaVlJoWnloMFlXY3NJRkJpWmk1R2FYaGxaRFkwS1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTUzY21sMFpVUnZkV0pzWlNoMllXd3BPMXh1SUNBZ0lIMHNYRzRnSUNBZ2QzSnBkR1ZDYjI5c1pXRnVSbWxsYkdRNklHWjFibU4wYVc5dUtIUmhaeXdnZG1Gc0tTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdWQzSnBkR1ZXWVhKcGJuUkdhV1ZzWkNoMFlXY3NJRUp2YjJ4bFlXNG9kbUZzS1NrN1hHNGdJQ0FnZlZ4dWZUdGNibHh1Wm5WdVkzUnBiMjRnZDNKcGRHVlFZV05yWldSV1lYSnBiblFvWVhKeUxDQndZbVlwSUNBZ2V5Qm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR0Z5Y2k1c1pXNW5kR2c3SUdrckt5a2djR0ptTG5keWFYUmxWbUZ5YVc1MEtHRnljbHRwWFNrN0lDQWdmVnh1Wm5WdVkzUnBiMjRnZDNKcGRHVlFZV05yWldSVFZtRnlhVzUwS0dGeWNpd2djR0ptS1NBZ2V5Qm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR0Z5Y2k1c1pXNW5kR2c3SUdrckt5a2djR0ptTG5keWFYUmxVMVpoY21sdWRDaGhjbkpiYVYwcE95QWdmVnh1Wm5WdVkzUnBiMjRnZDNKcGRHVlFZV05yWldSR2JHOWhkQ2hoY25Jc0lIQmlaaWtnSUNBZ2V5Qm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR0Z5Y2k1c1pXNW5kR2c3SUdrckt5a2djR0ptTG5keWFYUmxSbXh2WVhRb1lYSnlXMmxkS1RzZ0lDQWdmVnh1Wm5WdVkzUnBiMjRnZDNKcGRHVlFZV05yWldSRWIzVmliR1VvWVhKeUxDQndZbVlwSUNBZ2V5Qm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR0Z5Y2k1c1pXNW5kR2c3SUdrckt5a2djR0ptTG5keWFYUmxSRzkxWW14bEtHRnljbHRwWFNrN0lDQWdmVnh1Wm5WdVkzUnBiMjRnZDNKcGRHVlFZV05yWldSQ2IyOXNaV0Z1S0dGeWNpd2djR0ptS1NBZ2V5Qm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR0Z5Y2k1c1pXNW5kR2c3SUdrckt5a2djR0ptTG5keWFYUmxRbTl2YkdWaGJpaGhjbkpiYVYwcE95QWdmVnh1Wm5WdVkzUnBiMjRnZDNKcGRHVlFZV05yWldSR2FYaGxaRE15S0dGeWNpd2djR0ptS1NBZ2V5Qm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR0Z5Y2k1c1pXNW5kR2c3SUdrckt5a2djR0ptTG5keWFYUmxSbWw0WldRek1paGhjbkpiYVYwcE95QWdmVnh1Wm5WdVkzUnBiMjRnZDNKcGRHVlFZV05yWldSVFJtbDRaV1F6TWloaGNuSXNJSEJpWmlrZ2V5Qm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR0Z5Y2k1c1pXNW5kR2c3SUdrckt5a2djR0ptTG5keWFYUmxVMFpwZUdWa016SW9ZWEp5VzJsZEtUc2dmVnh1Wm5WdVkzUnBiMjRnZDNKcGRHVlFZV05yWldSR2FYaGxaRFkwS0dGeWNpd2djR0ptS1NBZ2V5Qm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR0Z5Y2k1c1pXNW5kR2c3SUdrckt5a2djR0ptTG5keWFYUmxSbWw0WldRMk5DaGhjbkpiYVYwcE95QWdmVnh1Wm5WdVkzUnBiMjRnZDNKcGRHVlFZV05yWldSVFJtbDRaV1EyTkNoaGNuSXNJSEJpWmlrZ2V5Qm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR0Z5Y2k1c1pXNW5kR2c3SUdrckt5a2djR0ptTG5keWFYUmxVMFpwZUdWa05qUW9ZWEp5VzJsZEtUc2dmVnh1SWwxOSIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBQb2ludDtcblxuZnVuY3Rpb24gUG9pbnQoeCwgeSkge1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbn1cblxuUG9pbnQucHJvdG90eXBlID0ge1xuICAgIGNsb25lOiBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBQb2ludCh0aGlzLngsIHRoaXMueSk7IH0sXG5cbiAgICBhZGQ6ICAgICBmdW5jdGlvbihwKSB7IHJldHVybiB0aGlzLmNsb25lKCkuX2FkZChwKTsgICAgIH0sXG4gICAgc3ViOiAgICAgZnVuY3Rpb24ocCkgeyByZXR1cm4gdGhpcy5jbG9uZSgpLl9zdWIocCk7ICAgICB9LFxuICAgIG11bHQ6ICAgIGZ1bmN0aW9uKGspIHsgcmV0dXJuIHRoaXMuY2xvbmUoKS5fbXVsdChrKTsgICAgfSxcbiAgICBkaXY6ICAgICBmdW5jdGlvbihrKSB7IHJldHVybiB0aGlzLmNsb25lKCkuX2RpdihrKTsgICAgIH0sXG4gICAgcm90YXRlOiAgZnVuY3Rpb24oYSkgeyByZXR1cm4gdGhpcy5jbG9uZSgpLl9yb3RhdGUoYSk7ICB9LFxuICAgIG1hdE11bHQ6IGZ1bmN0aW9uKG0pIHsgcmV0dXJuIHRoaXMuY2xvbmUoKS5fbWF0TXVsdChtKTsgfSxcbiAgICB1bml0OiAgICBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuY2xvbmUoKS5fdW5pdCgpOyB9LFxuICAgIHBlcnA6ICAgIGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5jbG9uZSgpLl9wZXJwKCk7IH0sXG4gICAgcm91bmQ6ICAgZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmNsb25lKCkuX3JvdW5kKCk7IH0sXG5cbiAgICBtYWc6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSk7XG4gICAgfSxcblxuICAgIGVxdWFsczogZnVuY3Rpb24ocCkge1xuICAgICAgICByZXR1cm4gdGhpcy54ID09PSBwLnggJiZcbiAgICAgICAgICAgICAgIHRoaXMueSA9PT0gcC55O1xuICAgIH0sXG5cbiAgICBkaXN0OiBmdW5jdGlvbihwKSB7XG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kaXN0U3FyKHApKTtcbiAgICB9LFxuXG4gICAgZGlzdFNxcjogZnVuY3Rpb24ocCkge1xuICAgICAgICB2YXIgZHggPSBwLnggLSB0aGlzLngsXG4gICAgICAgICAgICBkeSA9IHAueSAtIHRoaXMueTtcbiAgICAgICAgcmV0dXJuIGR4ICogZHggKyBkeSAqIGR5O1xuICAgIH0sXG5cbiAgICBhbmdsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBNYXRoLmF0YW4yKHRoaXMueSwgdGhpcy54KTtcbiAgICB9LFxuXG4gICAgYW5nbGVUbzogZnVuY3Rpb24oYikge1xuICAgICAgICByZXR1cm4gTWF0aC5hdGFuMih0aGlzLnkgLSBiLnksIHRoaXMueCAtIGIueCk7XG4gICAgfSxcblxuICAgIGFuZ2xlV2l0aDogZnVuY3Rpb24oYikge1xuICAgICAgICByZXR1cm4gdGhpcy5hbmdsZVdpdGhTZXAoYi54LCBiLnkpO1xuICAgIH0sXG5cbiAgICAvLyBGaW5kIHRoZSBhbmdsZSBvZiB0aGUgdHdvIHZlY3RvcnMsIHNvbHZpbmcgdGhlIGZvcm11bGEgZm9yIHRoZSBjcm9zcyBwcm9kdWN0IGEgeCBiID0gfGF8fGJ8c2luKM64KSBmb3IgzrguXG4gICAgYW5nbGVXaXRoU2VwOiBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgIHJldHVybiBNYXRoLmF0YW4yKFxuICAgICAgICAgICAgdGhpcy54ICogeSAtIHRoaXMueSAqIHgsXG4gICAgICAgICAgICB0aGlzLnggKiB4ICsgdGhpcy55ICogeSk7XG4gICAgfSxcblxuICAgIF9tYXRNdWx0OiBmdW5jdGlvbihtKSB7XG4gICAgICAgIHZhciB4ID0gbVswXSAqIHRoaXMueCArIG1bMV0gKiB0aGlzLnksXG4gICAgICAgICAgICB5ID0gbVsyXSAqIHRoaXMueCArIG1bM10gKiB0aGlzLnk7XG4gICAgICAgIHRoaXMueCA9IHg7XG4gICAgICAgIHRoaXMueSA9IHk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBfYWRkOiBmdW5jdGlvbihwKSB7XG4gICAgICAgIHRoaXMueCArPSBwLng7XG4gICAgICAgIHRoaXMueSArPSBwLnk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBfc3ViOiBmdW5jdGlvbihwKSB7XG4gICAgICAgIHRoaXMueCAtPSBwLng7XG4gICAgICAgIHRoaXMueSAtPSBwLnk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBfbXVsdDogZnVuY3Rpb24oaykge1xuICAgICAgICB0aGlzLnggKj0gaztcbiAgICAgICAgdGhpcy55ICo9IGs7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBfZGl2OiBmdW5jdGlvbihrKSB7XG4gICAgICAgIHRoaXMueCAvPSBrO1xuICAgICAgICB0aGlzLnkgLz0gaztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF91bml0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5fZGl2KHRoaXMubWFnKCkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgX3BlcnA6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgeSA9IHRoaXMueTtcbiAgICAgICAgdGhpcy55ID0gdGhpcy54O1xuICAgICAgICB0aGlzLnggPSAteTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF9yb3RhdGU6IGZ1bmN0aW9uKGFuZ2xlKSB7XG4gICAgICAgIHZhciBjb3MgPSBNYXRoLmNvcyhhbmdsZSksXG4gICAgICAgICAgICBzaW4gPSBNYXRoLnNpbihhbmdsZSksXG4gICAgICAgICAgICB4ID0gY29zICogdGhpcy54IC0gc2luICogdGhpcy55LFxuICAgICAgICAgICAgeSA9IHNpbiAqIHRoaXMueCArIGNvcyAqIHRoaXMueTtcbiAgICAgICAgdGhpcy54ID0geDtcbiAgICAgICAgdGhpcy55ID0geTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF9yb3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMueCA9IE1hdGgucm91bmQodGhpcy54KTtcbiAgICAgICAgdGhpcy55ID0gTWF0aC5yb3VuZCh0aGlzLnkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59O1xuXG4vLyBjb25zdHJ1Y3RzIFBvaW50IGZyb20gYW4gYXJyYXkgaWYgbmVjZXNzYXJ5XG5Qb2ludC5jb252ZXJ0ID0gZnVuY3Rpb24gKGEpIHtcbiAgICBpZiAoYSBpbnN0YW5jZW9mIFBvaW50KSB7XG4gICAgICAgIHJldHVybiBhO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheShhKSkge1xuICAgICAgICByZXR1cm4gbmV3IFBvaW50KGFbMF0sIGFbMV0pO1xuICAgIH1cbiAgICByZXR1cm4gYTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cy5WZWN0b3JUaWxlID0gcmVxdWlyZSgnLi9saWIvdmVjdG9ydGlsZS5qcycpO1xubW9kdWxlLmV4cG9ydHMuVmVjdG9yVGlsZUZlYXR1cmUgPSByZXF1aXJlKCcuL2xpYi92ZWN0b3J0aWxlZmVhdHVyZS5qcycpO1xubW9kdWxlLmV4cG9ydHMuVmVjdG9yVGlsZUxheWVyID0gcmVxdWlyZSgnLi9saWIvdmVjdG9ydGlsZWxheWVyLmpzJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBWZWN0b3JUaWxlTGF5ZXIgPSByZXF1aXJlKCcuL3ZlY3RvcnRpbGVsYXllcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlY3RvclRpbGU7XG5cbmZ1bmN0aW9uIFZlY3RvclRpbGUocGJmLCBlbmQpIHtcbiAgICB0aGlzLmxheWVycyA9IHBiZi5yZWFkRmllbGRzKHJlYWRUaWxlLCB7fSwgZW5kKTtcbn1cblxuZnVuY3Rpb24gcmVhZFRpbGUodGFnLCBsYXllcnMsIHBiZikge1xuICAgIGlmICh0YWcgPT09IDMpIHtcbiAgICAgICAgdmFyIGxheWVyID0gbmV3IFZlY3RvclRpbGVMYXllcihwYmYsIHBiZi5yZWFkVmFyaW50KCkgKyBwYmYucG9zKTtcbiAgICAgICAgaWYgKGxheWVyLmxlbmd0aCkgbGF5ZXJzW2xheWVyLm5hbWVdID0gbGF5ZXI7XG4gICAgfVxufVxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBQb2ludCA9IHJlcXVpcmUoJ3BvaW50LWdlb21ldHJ5Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmVjdG9yVGlsZUZlYXR1cmU7XG5cbmZ1bmN0aW9uIFZlY3RvclRpbGVGZWF0dXJlKHBiZiwgZW5kLCBleHRlbnQsIGtleXMsIHZhbHVlcykge1xuICAgIC8vIFB1YmxpY1xuICAgIHRoaXMucHJvcGVydGllcyA9IHt9O1xuICAgIHRoaXMuZXh0ZW50ID0gZXh0ZW50O1xuICAgIHRoaXMudHlwZSA9IDA7XG5cbiAgICAvLyBQcml2YXRlXG4gICAgdGhpcy5fcGJmID0gcGJmO1xuICAgIHRoaXMuX2dlb21ldHJ5ID0gLTE7XG4gICAgdGhpcy5fa2V5cyA9IGtleXM7XG4gICAgdGhpcy5fdmFsdWVzID0gdmFsdWVzO1xuXG4gICAgcGJmLnJlYWRGaWVsZHMocmVhZEZlYXR1cmUsIHRoaXMsIGVuZCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRGZWF0dXJlKHRhZywgZmVhdHVyZSwgcGJmKSB7XG4gICAgaWYgKHRhZyA9PSAxKSBmZWF0dXJlLl9pZCA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgZWxzZSBpZiAodGFnID09IDIpIHJlYWRUYWcocGJmLCBmZWF0dXJlKTtcbiAgICBlbHNlIGlmICh0YWcgPT0gMykgZmVhdHVyZS50eXBlID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICBlbHNlIGlmICh0YWcgPT0gNCkgZmVhdHVyZS5fZ2VvbWV0cnkgPSBwYmYucG9zO1xufVxuXG5mdW5jdGlvbiByZWFkVGFnKHBiZiwgZmVhdHVyZSkge1xuICAgIHZhciBlbmQgPSBwYmYucmVhZFZhcmludCgpICsgcGJmLnBvcztcblxuICAgIHdoaWxlIChwYmYucG9zIDwgZW5kKSB7XG4gICAgICAgIHZhciBrZXkgPSBmZWF0dXJlLl9rZXlzW3BiZi5yZWFkVmFyaW50KCldLFxuICAgICAgICAgICAgdmFsdWUgPSBmZWF0dXJlLl92YWx1ZXNbcGJmLnJlYWRWYXJpbnQoKV07XG4gICAgICAgIGZlYXR1cmUucHJvcGVydGllc1trZXldID0gdmFsdWU7XG4gICAgfVxufVxuXG5WZWN0b3JUaWxlRmVhdHVyZS50eXBlcyA9IFsnVW5rbm93bicsICdQb2ludCcsICdMaW5lU3RyaW5nJywgJ1BvbHlnb24nXTtcblxuVmVjdG9yVGlsZUZlYXR1cmUucHJvdG90eXBlLmxvYWRHZW9tZXRyeSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYmYgPSB0aGlzLl9wYmY7XG4gICAgcGJmLnBvcyA9IHRoaXMuX2dlb21ldHJ5O1xuXG4gICAgdmFyIGVuZCA9IHBiZi5yZWFkVmFyaW50KCkgKyBwYmYucG9zLFxuICAgICAgICBjbWQgPSAxLFxuICAgICAgICBsZW5ndGggPSAwLFxuICAgICAgICB4ID0gMCxcbiAgICAgICAgeSA9IDAsXG4gICAgICAgIGxpbmVzID0gW10sXG4gICAgICAgIGxpbmU7XG5cbiAgICB3aGlsZSAocGJmLnBvcyA8IGVuZCkge1xuICAgICAgICBpZiAoIWxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIGNtZExlbiA9IHBiZi5yZWFkVmFyaW50KCk7XG4gICAgICAgICAgICBjbWQgPSBjbWRMZW4gJiAweDc7XG4gICAgICAgICAgICBsZW5ndGggPSBjbWRMZW4gPj4gMztcbiAgICAgICAgfVxuXG4gICAgICAgIGxlbmd0aC0tO1xuXG4gICAgICAgIGlmIChjbWQgPT09IDEgfHwgY21kID09PSAyKSB7XG4gICAgICAgICAgICB4ICs9IHBiZi5yZWFkU1ZhcmludCgpO1xuICAgICAgICAgICAgeSArPSBwYmYucmVhZFNWYXJpbnQoKTtcblxuICAgICAgICAgICAgaWYgKGNtZCA9PT0gMSkgeyAvLyBtb3ZlVG9cbiAgICAgICAgICAgICAgICBpZiAobGluZSkgbGluZXMucHVzaChsaW5lKTtcbiAgICAgICAgICAgICAgICBsaW5lID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxpbmUucHVzaChuZXcgUG9pbnQoeCwgeSkpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoY21kID09PSA3KSB7XG5cbiAgICAgICAgICAgIC8vIFdvcmthcm91bmQgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXBib3gvbWFwbmlrLXZlY3Rvci10aWxlL2lzc3Vlcy85MFxuICAgICAgICAgICAgaWYgKGxpbmUpIHtcbiAgICAgICAgICAgICAgICBsaW5lLnB1c2gobGluZVswXS5jbG9uZSgpKTsgLy8gY2xvc2VQb2x5Z29uXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndW5rbm93biBjb21tYW5kICcgKyBjbWQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGxpbmUpIGxpbmVzLnB1c2gobGluZSk7XG5cbiAgICByZXR1cm4gbGluZXM7XG59O1xuXG5WZWN0b3JUaWxlRmVhdHVyZS5wcm90b3R5cGUuYmJveCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYmYgPSB0aGlzLl9wYmY7XG4gICAgcGJmLnBvcyA9IHRoaXMuX2dlb21ldHJ5O1xuXG4gICAgdmFyIGVuZCA9IHBiZi5yZWFkVmFyaW50KCkgKyBwYmYucG9zLFxuICAgICAgICBjbWQgPSAxLFxuICAgICAgICBsZW5ndGggPSAwLFxuICAgICAgICB4ID0gMCxcbiAgICAgICAgeSA9IDAsXG4gICAgICAgIHgxID0gSW5maW5pdHksXG4gICAgICAgIHgyID0gLUluZmluaXR5LFxuICAgICAgICB5MSA9IEluZmluaXR5LFxuICAgICAgICB5MiA9IC1JbmZpbml0eTtcblxuICAgIHdoaWxlIChwYmYucG9zIDwgZW5kKSB7XG4gICAgICAgIGlmICghbGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgY21kTGVuID0gcGJmLnJlYWRWYXJpbnQoKTtcbiAgICAgICAgICAgIGNtZCA9IGNtZExlbiAmIDB4NztcbiAgICAgICAgICAgIGxlbmd0aCA9IGNtZExlbiA+PiAzO1xuICAgICAgICB9XG5cbiAgICAgICAgbGVuZ3RoLS07XG5cbiAgICAgICAgaWYgKGNtZCA9PT0gMSB8fCBjbWQgPT09IDIpIHtcbiAgICAgICAgICAgIHggKz0gcGJmLnJlYWRTVmFyaW50KCk7XG4gICAgICAgICAgICB5ICs9IHBiZi5yZWFkU1ZhcmludCgpO1xuICAgICAgICAgICAgaWYgKHggPCB4MSkgeDEgPSB4O1xuICAgICAgICAgICAgaWYgKHggPiB4MikgeDIgPSB4O1xuICAgICAgICAgICAgaWYgKHkgPCB5MSkgeTEgPSB5O1xuICAgICAgICAgICAgaWYgKHkgPiB5MikgeTIgPSB5O1xuXG4gICAgICAgIH0gZWxzZSBpZiAoY21kICE9PSA3KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vua25vd24gY29tbWFuZCAnICsgY21kKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBbeDEsIHkxLCB4MiwgeTJdO1xufTtcblxuVmVjdG9yVGlsZUZlYXR1cmUucHJvdG90eXBlLnRvR2VvSlNPTiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuZXh0ZW50ICogTWF0aC5wb3coMiwgeiksXG4gICAgICAgIHgwID0gdGhpcy5leHRlbnQgKiB4LFxuICAgICAgICB5MCA9IHRoaXMuZXh0ZW50ICogeSxcbiAgICAgICAgY29vcmRzID0gdGhpcy5sb2FkR2VvbWV0cnkoKSxcbiAgICAgICAgdHlwZSA9IFZlY3RvclRpbGVGZWF0dXJlLnR5cGVzW3RoaXMudHlwZV07XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvb3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbGluZSA9IGNvb3Jkc1tpXTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBsaW5lLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgcCA9IGxpbmVbal0sIHkyID0gMTgwIC0gKHAueSArIHkwKSAqIDM2MCAvIHNpemU7XG4gICAgICAgICAgICBsaW5lW2pdID0gW1xuICAgICAgICAgICAgICAgIChwLnggKyB4MCkgKiAzNjAgLyBzaXplIC0gMTgwLFxuICAgICAgICAgICAgICAgIDM2MCAvIE1hdGguUEkgKiBNYXRoLmF0YW4oTWF0aC5leHAoeTIgKiBNYXRoLlBJIC8gMTgwKSkgLSA5MFxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlID09PSAnUG9pbnQnICYmIGNvb3Jkcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgY29vcmRzID0gY29vcmRzWzBdWzBdO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ1BvaW50Jykge1xuICAgICAgICBjb29yZHMgPSBjb29yZHNbMF07XG4gICAgICAgIHR5cGUgPSAnTXVsdGlQb2ludCc7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTGluZVN0cmluZycgJiYgY29vcmRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBjb29yZHMgPSBjb29yZHNbMF07XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnTGluZVN0cmluZycpIHtcbiAgICAgICAgdHlwZSA9ICdNdWx0aUxpbmVTdHJpbmcnO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwiRmVhdHVyZVwiLFxuICAgICAgICBnZW9tZXRyeToge1xuICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgIGNvb3JkaW5hdGVzOiBjb29yZHNcbiAgICAgICAgfSxcbiAgICAgICAgcHJvcGVydGllczogdGhpcy5wcm9wZXJ0aWVzXG4gICAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBWZWN0b3JUaWxlRmVhdHVyZSA9IHJlcXVpcmUoJy4vdmVjdG9ydGlsZWZlYXR1cmUuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBWZWN0b3JUaWxlTGF5ZXI7XG5cbmZ1bmN0aW9uIFZlY3RvclRpbGVMYXllcihwYmYsIGVuZCkge1xuICAgIC8vIFB1YmxpY1xuICAgIHRoaXMudmVyc2lvbiA9IDE7XG4gICAgdGhpcy5uYW1lID0gbnVsbDtcbiAgICB0aGlzLmV4dGVudCA9IDQwOTY7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuXG4gICAgLy8gUHJpdmF0ZVxuICAgIHRoaXMuX3BiZiA9IHBiZjtcbiAgICB0aGlzLl9rZXlzID0gW107XG4gICAgdGhpcy5fdmFsdWVzID0gW107XG4gICAgdGhpcy5fZmVhdHVyZXMgPSBbXTtcblxuICAgIHBiZi5yZWFkRmllbGRzKHJlYWRMYXllciwgdGhpcywgZW5kKTtcblxuICAgIHRoaXMubGVuZ3RoID0gdGhpcy5fZmVhdHVyZXMubGVuZ3RoO1xufVxuXG5mdW5jdGlvbiByZWFkTGF5ZXIodGFnLCBsYXllciwgcGJmKSB7XG4gICAgaWYgKHRhZyA9PT0gMTUpIGxheWVyLnZlcnNpb24gPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMSkgbGF5ZXIubmFtZSA9IHBiZi5yZWFkU3RyaW5nKCk7XG4gICAgZWxzZSBpZiAodGFnID09PSA1KSBsYXllci5leHRlbnQgPSBwYmYucmVhZFZhcmludCgpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gMikgbGF5ZXIuX2ZlYXR1cmVzLnB1c2gocGJmLnBvcyk7XG4gICAgZWxzZSBpZiAodGFnID09PSAzKSBsYXllci5fa2V5cy5wdXNoKHBiZi5yZWFkU3RyaW5nKCkpO1xuICAgIGVsc2UgaWYgKHRhZyA9PT0gNCkgbGF5ZXIuX3ZhbHVlcy5wdXNoKHJlYWRWYWx1ZU1lc3NhZ2UocGJmKSk7XG59XG5cbmZ1bmN0aW9uIHJlYWRWYWx1ZU1lc3NhZ2UocGJmKSB7XG4gICAgdmFyIHZhbHVlID0gbnVsbCxcbiAgICAgICAgZW5kID0gcGJmLnJlYWRWYXJpbnQoKSArIHBiZi5wb3M7XG5cbiAgICB3aGlsZSAocGJmLnBvcyA8IGVuZCkge1xuICAgICAgICB2YXIgdGFnID0gcGJmLnJlYWRWYXJpbnQoKSA+PiAzO1xuXG4gICAgICAgIHZhbHVlID0gdGFnID09PSAxID8gcGJmLnJlYWRTdHJpbmcoKSA6XG4gICAgICAgICAgICB0YWcgPT09IDIgPyBwYmYucmVhZEZsb2F0KCkgOlxuICAgICAgICAgICAgdGFnID09PSAzID8gcGJmLnJlYWREb3VibGUoKSA6XG4gICAgICAgICAgICB0YWcgPT09IDQgPyBwYmYucmVhZFZhcmludDY0KCkgOlxuICAgICAgICAgICAgdGFnID09PSA1ID8gcGJmLnJlYWRWYXJpbnQoKSA6XG4gICAgICAgICAgICB0YWcgPT09IDYgPyBwYmYucmVhZFNWYXJpbnQoKSA6XG4gICAgICAgICAgICB0YWcgPT09IDcgPyBwYmYucmVhZEJvb2xlYW4oKSA6IG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG4vLyByZXR1cm4gZmVhdHVyZSBgaWAgZnJvbSB0aGlzIGxheWVyIGFzIGEgYFZlY3RvclRpbGVGZWF0dXJlYFxuVmVjdG9yVGlsZUxheWVyLnByb3RvdHlwZS5mZWF0dXJlID0gZnVuY3Rpb24oaSkge1xuICAgIGlmIChpIDwgMCB8fCBpID49IHRoaXMuX2ZlYXR1cmVzLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKCdmZWF0dXJlIGluZGV4IG91dCBvZiBib3VuZHMnKTtcblxuICAgIHRoaXMuX3BiZi5wb3MgPSB0aGlzLl9mZWF0dXJlc1tpXTtcblxuICAgIHZhciBlbmQgPSB0aGlzLl9wYmYucmVhZFZhcmludCgpICsgdGhpcy5fcGJmLnBvcztcbiAgICByZXR1cm4gbmV3IFZlY3RvclRpbGVGZWF0dXJlKHRoaXMuX3BiZiwgZW5kLCB0aGlzLmV4dGVudCwgdGhpcy5fa2V5cywgdGhpcy5fdmFsdWVzKTtcbn07XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgUnlhbiBXaGl0bGV5LCBEYW5pZWwgRHVhcnRlLCBhbmQgTmljaG9sYXMgSGFsbGFoYW5cbiAqICAgIG9uIDYvMDMvMTQuXG4gKi9cbnZhciBVdGlsID0gcmVxdWlyZSgnLi9NVlRVdGlsJyk7XG52YXIgU3RhdGljTGFiZWwgPSByZXF1aXJlKCcuL1N0YXRpY0xhYmVsL1N0YXRpY0xhYmVsLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gTVZURmVhdHVyZTtcblxuZnVuY3Rpb24gTVZURmVhdHVyZShtdnRMYXllciwgdnRmLCBjdHgsIGlkLCBzdHlsZSkge1xuICBpZiAoIXZ0ZikgcmV0dXJuIG51bGw7XG5cbiAgLy8gQXBwbHkgYWxsIG9mIHRoZSBwcm9wZXJ0aWVzIG9mIHZ0ZiB0byB0aGlzIG9iamVjdC5cbiAgZm9yICh2YXIga2V5IGluIHZ0Zikge1xuICAgIHRoaXNba2V5XSA9IHZ0ZltrZXldO1xuICB9XG5cbiAgdGhpcy5tdnRMYXllciA9IG12dExheWVyO1xuICB0aGlzLm12dFNvdXJjZSA9IG12dExheWVyLm12dFNvdXJjZTtcbiAgdGhpcy5tYXAgPSBtdnRMYXllci5tdnRTb3VyY2UubWFwO1xuXG4gIHRoaXMuaWQgPSBpZDtcblxuICB0aGlzLmxheWVyTGluayA9IHRoaXMubXZ0U291cmNlLmxheWVyTGluaztcbiAgdGhpcy50b2dnbGVFbmFibGVkID0gdHJ1ZTtcbiAgdGhpcy5zZWxlY3RlZCA9IGZhbHNlO1xuXG4gIC8vIGhvdyBtdWNoIHdlIGRpdmlkZSB0aGUgY29vcmRpbmF0ZSBmcm9tIHRoZSB2ZWN0b3IgdGlsZVxuICB0aGlzLmRpdmlzb3IgPSB2dGYuZXh0ZW50IC8gY3R4LnRpbGVTaXplO1xuICB0aGlzLmV4dGVudCA9IHZ0Zi5leHRlbnQ7XG4gIHRoaXMudGlsZVNpemUgPSBjdHgudGlsZVNpemU7XG5cbiAgLy9BbiBvYmplY3QgdG8gc3RvcmUgdGhlIHBhdGhzIGFuZCBjb250ZXh0cyBmb3IgdGhpcyBmZWF0dXJlXG4gIHRoaXMudGlsZXMgPSB7fTtcblxuICB0aGlzLnN0eWxlID0gc3R5bGU7XG5cbiAgLy9BZGQgdG8gdGhlIGNvbGxlY3Rpb25cbiAgdGhpcy5hZGRUaWxlRmVhdHVyZSh2dGYsIGN0eCk7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLm1hcC5vbignem9vbWVuZCcsIGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuc3RhdGljTGFiZWwgPSBudWxsO1xuICB9KTtcblxuICBpZiAoc3R5bGUgJiYgc3R5bGUuZHluYW1pY0xhYmVsICYmIHR5cGVvZiBzdHlsZS5keW5hbWljTGFiZWwgPT09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzLmR5bmFtaWNMYWJlbCA9IHRoaXMubXZ0U291cmNlLmR5bmFtaWNMYWJlbC5jcmVhdGVGZWF0dXJlKHRoaXMpO1xuICB9XG5cbiAgYWpheChzZWxmKTtcbn1cblxuXG5mdW5jdGlvbiBhamF4KHNlbGYpIHtcbiAgdmFyIHN0eWxlID0gc2VsZi5zdHlsZTtcbiAgaWYgKHN0eWxlICYmIHN0eWxlLmFqYXhTb3VyY2UgJiYgdHlwZW9mIHN0eWxlLmFqYXhTb3VyY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICB2YXIgYWpheEVuZHBvaW50ID0gc3R5bGUuYWpheFNvdXJjZShzZWxmKTtcbiAgICBpZiAoYWpheEVuZHBvaW50KSB7XG4gICAgICBVdGlsLmdldEpTT04oYWpheEVuZHBvaW50LCBmdW5jdGlvbihlcnJvciwgcmVzcG9uc2UsIGJvZHkpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgdGhyb3cgWydhamF4U291cmNlIEFKQVggRXJyb3InLCBlcnJvcl07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWpheENhbGxiYWNrKHNlbGYsIHJlc3BvbnNlKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gYWpheENhbGxiYWNrKHNlbGYsIHJlc3BvbnNlKSB7XG4gIHNlbGYuYWpheERhdGEgPSByZXNwb25zZTtcblxuICAvKipcbiAgICogWW91IGNhbiBhdHRhY2ggYSBjYWxsYmFjayBmdW5jdGlvbiB0byBhIGZlYXR1cmUgaW4geW91ciBhcHBcbiAgICogdGhhdCB3aWxsIGdldCBjYWxsZWQgd2hlbmV2ZXIgbmV3IGFqYXhEYXRhIGNvbWVzIGluLiBUaGlzXG4gICAqIGNhbiBiZSB1c2VkIHRvIHVwZGF0ZSBVSSB0aGF0IGxvb2tzIGF0IGRhdGEgZnJvbSB3aXRoaW4gYSBmZWF0dXJlLlxuICAgKlxuICAgKiBzZXRTdHlsZSBtYXkgcG9zc2libHkgaGF2ZSBhIHN0eWxlIHdpdGggYSBkaWZmZXJlbnQgYWpheERhdGEgc291cmNlLFxuICAgKiBhbmQgeW91IHdvdWxkIHBvdGVudGlhbGx5IGdldCBuZXcgY29udGV4dHVhbCBkYXRhIGZvciB5b3VyIGZlYXR1cmUuXG4gICAqXG4gICAqIFRPRE86IFRoaXMgbmVlZHMgdG8gYmUgZG9jdW1lbnRlZC5cbiAgICovXG4gIGlmICh0eXBlb2Ygc2VsZi5hamF4RGF0YVJlY2VpdmVkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgc2VsZi5hamF4RGF0YVJlY2VpdmVkKHNlbGYsIHJlc3BvbnNlKTtcbiAgfVxuXG4gIHNlbGYuX3NldFN0eWxlKHNlbGYubXZ0TGF5ZXIuc3R5bGUpO1xuICByZWRyYXdUaWxlcyhzZWxmKTtcbn1cblxuTVZURmVhdHVyZS5wcm90b3R5cGUuX3NldFN0eWxlID0gZnVuY3Rpb24oc3R5bGVGbikge1xuICB0aGlzLnN0eWxlID0gc3R5bGVGbih0aGlzLCB0aGlzLmFqYXhEYXRhKTtcblxuICAvLyBUaGUgbGFiZWwgZ2V0cyByZW1vdmVkLCBhbmQgdGhlIChyZSlkcmF3LFxuICAvLyB0aGF0IGlzIGluaXRpYXRlZCBieSB0aGUgTVZUTGF5ZXIgY3JlYXRlcyBhIG5ldyBsYWJlbC5cbiAgdGhpcy5yZW1vdmVMYWJlbCgpO1xufTtcblxuTVZURmVhdHVyZS5wcm90b3R5cGUuc2V0U3R5bGUgPSBmdW5jdGlvbihzdHlsZUZuKSB7XG4gIHRoaXMuYWpheERhdGEgPSBudWxsO1xuICB0aGlzLnN0eWxlID0gc3R5bGVGbih0aGlzLCBudWxsKTtcbiAgdmFyIGhhc0FqYXhTb3VyY2UgPSBhamF4KHRoaXMpO1xuICBpZiAoIWhhc0FqYXhTb3VyY2UpIHtcbiAgICAvLyBUaGUgbGFiZWwgZ2V0cyByZW1vdmVkLCBhbmQgdGhlIChyZSlkcmF3LFxuICAgIC8vIHRoYXQgaXMgaW5pdGlhdGVkIGJ5IHRoZSBNVlRMYXllciBjcmVhdGVzIGEgbmV3IGxhYmVsLlxuICAgIHRoaXMucmVtb3ZlTGFiZWwoKTtcbiAgfVxufTtcblxuTVZURmVhdHVyZS5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uKGNhbnZhc0lEKSB7XG4gIC8vR2V0IHRoZSBpbmZvIGZyb20gdGhlIHRpbGVzIGxpc3RcbiAgdmFyIHRpbGVJbmZvID0gIHRoaXMudGlsZXNbY2FudmFzSURdO1xuXG4gIHZhciB2dGYgPSB0aWxlSW5mby52dGY7XG4gIHZhciBjdHggPSB0aWxlSW5mby5jdHg7XG5cbiAgLy9HZXQgdGhlIGFjdHVhbCBjYW52YXMgZnJvbSB0aGUgcGFyZW50IGxheWVyJ3MgX3RpbGVzIG9iamVjdC5cbiAgdmFyIHh5ID0gY2FudmFzSUQuc3BsaXQoXCI6XCIpLnNsaWNlKDEsIDMpLmpvaW4oXCI6XCIpO1xuICBjdHguY2FudmFzID0gdGhpcy5tdnRMYXllci5fdGlsZXNbeHldO1xuXG4vLyAgVGhpcyBjb3VsZCBiZSB1c2VkIHRvIGRpcmVjdGx5IGNvbXB1dGUgdGhlIHN0eWxlIGZ1bmN0aW9uIGZyb20gdGhlIGxheWVyIG9uIGV2ZXJ5IGRyYXcuXG4vLyAgVGhpcyBpcyBtdWNoIGxlc3MgZWZmaWNpZW50Li4uXG4vLyAgdGhpcy5zdHlsZSA9IHRoaXMubXZ0TGF5ZXIuc3R5bGUodGhpcyk7XG5cbiAgaWYgKHRoaXMuc2VsZWN0ZWQpIHtcbiAgICB2YXIgc3R5bGUgPSB0aGlzLnN0eWxlLnNlbGVjdGVkIHx8IHRoaXMuc3R5bGU7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHN0eWxlID0gdGhpcy5zdHlsZTtcbiAgfVxuXG4gIHN3aXRjaCAodnRmLnR5cGUpIHtcbiAgICBjYXNlIDE6IC8vUG9pbnRcbiAgICAgIHRoaXMuX2RyYXdQb2ludChjdHgsIHZ0Zi5jb29yZGluYXRlcywgc3R5bGUpO1xuICAgICAgaWYgKCF0aGlzLnN0YXRpY0xhYmVsICYmIHR5cGVvZiB0aGlzLnN0eWxlLnN0YXRpY0xhYmVsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGlmICh0aGlzLnN0eWxlLmFqYXhTb3VyY2UgJiYgIXRoaXMuYWpheERhdGEpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9kcmF3U3RhdGljTGFiZWwoY3R4LCB2dGYuY29vcmRpbmF0ZXMsIHN0eWxlKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAyOiAvL0xpbmVTdHJpbmdcbiAgICAgIHRoaXMuX2RyYXdMaW5lU3RyaW5nKGN0eCwgdnRmLmNvb3JkaW5hdGVzLCBzdHlsZSk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgMzogLy9Qb2x5Z29uXG4gICAgICB0aGlzLl9kcmF3UG9seWdvbihjdHgsIHZ0Zi5jb29yZGluYXRlcywgc3R5bGUpO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbm1hbmFnZWQgdHlwZTogJyArIHZ0Zi50eXBlKTtcbiAgfVxuXG59O1xuXG5NVlRGZWF0dXJlLnByb3RvdHlwZS5nZXRQYXRoc0ZvclRpbGUgPSBmdW5jdGlvbihjYW52YXNJRCkge1xuICAvL0dldCB0aGUgaW5mbyBmcm9tIHRoZSBwYXJ0cyBsaXN0XG4gIHJldHVybiB0aGlzLnRpbGVzW2NhbnZhc0lEXS5wYXRocztcbn07XG5cbk1WVEZlYXR1cmUucHJvdG90eXBlLmFkZFRpbGVGZWF0dXJlID0gZnVuY3Rpb24odnRmLCBjdHgpIHtcbiAgLy9TdG9yZSB0aGUgaW1wb3J0YW50IGl0ZW1zIGluIHRoZSB0aWxlcyBsaXN0XG5cbiAgLy9XZSBvbmx5IHdhbnQgdG8gc3RvcmUgaW5mbyBmb3IgdGlsZXMgZm9yIHRoZSBjdXJyZW50IG1hcCB6b29tLiAgSWYgaXQgaXMgdGlsZSBpbmZvIGZvciBhbm90aGVyIHpvb20gbGV2ZWwsIGlnbm9yZSBpdFxuICAvL0Fsc28sIGlmIHRoZXJlIGFyZSBleGlzdGluZyB0aWxlcyBpbiB0aGUgbGlzdCBmb3Igb3RoZXIgem9vbSBsZXZlbHMsIGV4cHVuZ2UgdGhlbS5cbiAgdmFyIHpvb20gPSB0aGlzLm1hcC5nZXRab29tKCk7XG5cbiAgaWYoY3R4Lnpvb20gIT0gem9vbSkgcmV0dXJuO1xuXG4gIHRoaXMuY2xlYXJUaWxlRmVhdHVyZXMoem9vbSk7IC8vVE9ETzogVGhpcyBpdGVyYXRlcyB0aHJ1IGFsbCB0aWxlcyBldmVyeSB0aW1lIGEgbmV3IHRpbGUgaXMgYWRkZWQuICBGaWd1cmUgb3V0IGEgYmV0dGVyIHdheSB0byBkbyB0aGlzLlxuXG4gIHRoaXMudGlsZXNbY3R4LmlkXSA9IHtcbiAgICBjdHg6IGN0eCxcbiAgICB2dGY6IHZ0ZixcbiAgICBwYXRoczogW11cbiAgfTtcblxufTtcblxuXG4vKipcbiAqIENsZWFyIHRoZSBpbm5lciBsaXN0IG9mIHRpbGUgZmVhdHVyZXMgaWYgdGhleSBkb24ndCBtYXRjaCB0aGUgZ2l2ZW4gem9vbS5cbiAqXG4gKiBAcGFyYW0gem9vbVxuICovXG5NVlRGZWF0dXJlLnByb3RvdHlwZS5jbGVhclRpbGVGZWF0dXJlcyA9IGZ1bmN0aW9uKHpvb20pIHtcbiAgLy9JZiBzdG9yZWQgdGlsZXMgZXhpc3QgZm9yIG90aGVyIHpvb20gbGV2ZWxzLCBleHB1bmdlIHRoZW0gZnJvbSB0aGUgbGlzdC5cbiAgZm9yICh2YXIga2V5IGluIHRoaXMudGlsZXMpIHtcbiAgICAgaWYoa2V5LnNwbGl0KFwiOlwiKVswXSAhPSB6b29tKSBkZWxldGUgdGhpcy50aWxlc1trZXldO1xuICB9XG59O1xuXG4vKipcbiAqIFJlZHJhd3MgYWxsIG9mIHRoZSB0aWxlcyBhc3NvY2lhdGVkIHdpdGggYSBmZWF0dXJlLiBVc2VmdWwgZm9yXG4gKiBzdHlsZSBjaGFuZ2UgYW5kIHRvZ2dsaW5nLlxuICpcbiAqIEBwYXJhbSBzZWxmXG4gKi9cbmZ1bmN0aW9uIHJlZHJhd1RpbGVzKHNlbGYpIHtcbiAgLy9SZWRyYXcgdGhlIHdob2xlIHRpbGUsIG5vdCBqdXN0IHRoaXMgdnRmXG4gIHZhciB0aWxlcyA9IHNlbGYudGlsZXM7XG4gIHZhciBtdnRMYXllciA9IHNlbGYubXZ0TGF5ZXI7XG5cbiAgZm9yICh2YXIgaWQgaW4gdGlsZXMpIHtcbiAgICB2YXIgdGlsZVpvb20gPSBwYXJzZUludChpZC5zcGxpdCgnOicpWzBdKTtcbiAgICB2YXIgbWFwWm9vbSA9IHNlbGYubWFwLmdldFpvb20oKTtcbiAgICBpZiAodGlsZVpvb20gPT09IG1hcFpvb20pIHtcbiAgICAgIC8vUmVkcmF3IHRoZSB0aWxlXG4gICAgICBtdnRMYXllci5yZWRyYXdUaWxlKGlkKTtcbiAgICB9XG4gIH1cbn1cblxuTVZURmVhdHVyZS5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLnNlbGVjdGVkKSB7XG4gICAgdGhpcy5kZXNlbGVjdCgpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuc2VsZWN0KCk7XG4gIH1cbn07XG5cbk1WVEZlYXR1cmUucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnNlbGVjdGVkID0gdHJ1ZTtcbiAgdGhpcy5tdnRTb3VyY2UuZmVhdHVyZVNlbGVjdGVkKHRoaXMpO1xuICByZWRyYXdUaWxlcyh0aGlzKTtcbiAgdmFyIGxpbmtlZEZlYXR1cmUgPSB0aGlzLmxpbmtlZEZlYXR1cmUoKTtcbiAgaWYgKGxpbmtlZEZlYXR1cmUgJiYgbGlua2VkRmVhdHVyZS5zdGF0aWNMYWJlbCAmJiAhbGlua2VkRmVhdHVyZS5zdGF0aWNMYWJlbC5zZWxlY3RlZCkge1xuICAgIGxpbmtlZEZlYXR1cmUuc3RhdGljTGFiZWwuc2VsZWN0KCk7XG4gIH1cbn07XG5cbk1WVEZlYXR1cmUucHJvdG90eXBlLmRlc2VsZWN0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgdGhpcy5tdnRTb3VyY2UuZmVhdHVyZURlc2VsZWN0ZWQodGhpcyk7XG4gIHJlZHJhd1RpbGVzKHRoaXMpO1xuICB2YXIgbGlua2VkRmVhdHVyZSA9IHRoaXMubGlua2VkRmVhdHVyZSgpO1xuICBpZiAobGlua2VkRmVhdHVyZSAmJiBsaW5rZWRGZWF0dXJlLnN0YXRpY0xhYmVsICYmIGxpbmtlZEZlYXR1cmUuc3RhdGljTGFiZWwuc2VsZWN0ZWQpIHtcbiAgICBsaW5rZWRGZWF0dXJlLnN0YXRpY0xhYmVsLmRlc2VsZWN0KCk7XG4gIH1cbn07XG5cbk1WVEZlYXR1cmUucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXZlbnRUeXBlLCBjYWxsYmFjaykge1xuICB0aGlzLl9ldmVudEhhbmRsZXJzW2V2ZW50VHlwZV0gPSBjYWxsYmFjaztcbn07XG5cbk1WVEZlYXR1cmUucHJvdG90eXBlLl9kcmF3UG9pbnQgPSBmdW5jdGlvbihjdHgsIGNvb3Jkc0FycmF5LCBzdHlsZSkge1xuICBpZiAoIXN0eWxlKSByZXR1cm47XG4gIGlmICghY3R4IHx8ICFjdHguY2FudmFzKSByZXR1cm47XG5cbiAgdmFyIHRpbGUgPSB0aGlzLnRpbGVzW2N0eC5pZF07XG5cbiAgLy9HZXQgcmFkaXVzXG4gIHZhciByYWRpdXMgPSAxO1xuICBpZiAodHlwZW9mIHN0eWxlLnJhZGl1cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJhZGl1cyA9IHN0eWxlLnJhZGl1cyhjdHguem9vbSk7IC8vQWxsb3dzIGZvciBzY2FsZSBkZXBlbmRlbnQgcmVkbmVyaW5nXG4gIH1cbiAgZWxzZXtcbiAgICByYWRpdXMgPSBzdHlsZS5yYWRpdXM7XG4gIH1cblxuICB2YXIgcCA9IHRoaXMuX3RpbGVQb2ludChjb29yZHNBcnJheVswXVswXSk7XG4gIHZhciBjID0gY3R4LmNhbnZhcztcbiAgdmFyIGN0eDJkO1xuICB0cnl7XG4gICAgY3R4MmQgPSBjLmdldENvbnRleHQoJzJkJyk7XG4gIH1cbiAgY2F0Y2goZSl7XG4gICAgY29uc29sZS5sb2coXCJfZHJhd1BvaW50IGVycm9yOiBcIiArIGUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGN0eDJkLmJlZ2luUGF0aCgpO1xuICBjdHgyZC5maWxsU3R5bGUgPSBzdHlsZS5jb2xvcjtcbiAgY3R4MmQuYXJjKHAueCwgcC55LCByYWRpdXMsIDAsIE1hdGguUEkgKiAyKTtcbiAgY3R4MmQuY2xvc2VQYXRoKCk7XG4gIGN0eDJkLmZpbGwoKTtcblxuICBpZihzdHlsZS5saW5lV2lkdGggJiYgc3R5bGUuc3Ryb2tlU3R5bGUpe1xuICAgIGN0eDJkLmxpbmVXaWR0aCA9IHN0eWxlLmxpbmVXaWR0aDtcbiAgICBjdHgyZC5zdHJva2VTdHlsZSA9IHN0eWxlLnN0cm9rZVN0eWxlO1xuICAgIGN0eDJkLnN0cm9rZSgpO1xuICB9XG5cbiAgY3R4MmQucmVzdG9yZSgpO1xuICB0aWxlLnBhdGhzLnB1c2goW3BdKTtcbn07XG5cbk1WVEZlYXR1cmUucHJvdG90eXBlLl9kcmF3TGluZVN0cmluZyA9IGZ1bmN0aW9uKGN0eCwgY29vcmRzQXJyYXksIHN0eWxlKSB7XG4gIGlmICghc3R5bGUpIHJldHVybjtcbiAgaWYgKCFjdHggfHwgIWN0eC5jYW52YXMpIHJldHVybjtcblxuICB2YXIgY3R4MmQgPSBjdHguY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gIGN0eDJkLnN0cm9rZVN0eWxlID0gc3R5bGUuY29sb3I7XG4gIGN0eDJkLmxpbmVXaWR0aCA9IHN0eWxlLnNpemU7XG4gIGN0eDJkLmJlZ2luUGF0aCgpO1xuXG4gIHZhciBwcm9qQ29vcmRzID0gW107XG4gIHZhciB0aWxlID0gdGhpcy50aWxlc1tjdHguaWRdO1xuXG4gIGZvciAodmFyIGdpZHggaW4gY29vcmRzQXJyYXkpIHtcbiAgICB2YXIgY29vcmRzID0gY29vcmRzQXJyYXlbZ2lkeF07XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbWV0aG9kID0gKGkgPT09IDAgPyAnbW92ZScgOiAnbGluZScpICsgJ1RvJztcbiAgICAgIHZhciBwcm9qID0gdGhpcy5fdGlsZVBvaW50KGNvb3Jkc1tpXSk7XG4gICAgICBwcm9qQ29vcmRzLnB1c2gocHJvaik7XG4gICAgICBjdHgyZFttZXRob2RdKHByb2oueCwgcHJvai55KTtcbiAgICB9XG4gIH1cblxuICBjdHgyZC5zdHJva2UoKTtcbiAgY3R4MmQucmVzdG9yZSgpO1xuXG4gIHRpbGUucGF0aHMucHVzaChwcm9qQ29vcmRzKTtcbn07XG5cbk1WVEZlYXR1cmUucHJvdG90eXBlLl9kcmF3UG9seWdvbiA9IGZ1bmN0aW9uKGN0eCwgY29vcmRzQXJyYXksIHN0eWxlKSB7XG4gIGlmICghc3R5bGUpIHJldHVybjtcbiAgaWYgKCFjdHggfHwgIWN0eC5jYW52YXMpIHJldHVybjtcblxuICB2YXIgY3R4MmQgPSBjdHguY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gIHZhciBvdXRsaW5lID0gc3R5bGUub3V0bGluZTtcblxuICAvLyBjb2xvciBtYXkgYmUgZGVmaW5lZCB2aWEgZnVuY3Rpb24gdG8gbWFrZSBjaG9yb3BsZXRoIHdvcmsgcmlnaHRcbiAgaWYgKHR5cGVvZiBzdHlsZS5jb2xvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGN0eDJkLmZpbGxTdHlsZSA9IHN0eWxlLmNvbG9yKGN0eDJkKTtcbiAgfSBlbHNlIHtcbiAgICBjdHgyZC5maWxsU3R5bGUgPSBzdHlsZS5jb2xvcjtcbiAgfVxuXG4gIGlmIChvdXRsaW5lKSB7XG4gICAgY3R4MmQuc3Ryb2tlU3R5bGUgPSBvdXRsaW5lLmNvbG9yO1xuICAgIGN0eDJkLmxpbmVXaWR0aCA9IG91dGxpbmUuc2l6ZTtcbiAgfVxuICBjdHgyZC5iZWdpblBhdGgoKTtcblxuICB2YXIgcHJvakNvb3JkcyA9IFtdO1xuICB2YXIgdGlsZSA9IHRoaXMudGlsZXNbY3R4LmlkXTtcblxuICB2YXIgZmVhdHVyZUxhYmVsID0gdGhpcy5keW5hbWljTGFiZWw7XG4gIGlmIChmZWF0dXJlTGFiZWwpIHtcbiAgICBmZWF0dXJlTGFiZWwuYWRkVGlsZVBvbHlzKGN0eCwgY29vcmRzQXJyYXkpO1xuICB9XG5cbiAgZm9yICh2YXIgZ2lkeCA9IDAsIGxlbiA9IGNvb3Jkc0FycmF5Lmxlbmd0aDsgZ2lkeCA8IGxlbjsgZ2lkeCsrKSB7XG4gICAgdmFyIGNvb3JkcyA9IGNvb3Jkc0FycmF5W2dpZHhdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjb29yZCA9IGNvb3Jkc1tpXTtcbiAgICAgIHZhciBtZXRob2QgPSAoaSA9PT0gMCA/ICdtb3ZlJyA6ICdsaW5lJykgKyAnVG8nO1xuICAgICAgdmFyIHByb2ogPSB0aGlzLl90aWxlUG9pbnQoY29vcmRzW2ldKTtcbiAgICAgIHByb2pDb29yZHMucHVzaChwcm9qKTtcbiAgICAgIGN0eDJkW21ldGhvZF0ocHJvai54LCBwcm9qLnkpO1xuICAgIH1cbiAgfVxuXG4gIGN0eDJkLmNsb3NlUGF0aCgpO1xuICBjdHgyZC5maWxsKCk7XG4gIGlmIChvdXRsaW5lKSB7XG4gICAgY3R4MmQuc3Ryb2tlKCk7XG4gIH1cblxuICB0aWxlLnBhdGhzLnB1c2gocHJvakNvb3Jkcyk7XG5cbn07XG5cbk1WVEZlYXR1cmUucHJvdG90eXBlLl9kcmF3U3RhdGljTGFiZWwgPSBmdW5jdGlvbihjdHgsIGNvb3Jkc0FycmF5LCBzdHlsZSkge1xuICBpZiAoIXN0eWxlKSByZXR1cm47XG4gIGlmICghY3R4KSByZXR1cm47XG5cbiAgLy8gSWYgdGhlIGNvcnJlc3BvbmRpbmcgbGF5ZXIgaXMgbm90IG9uIHRoZSBtYXAsIFxuICAvLyB3ZSBkb250IHdhbnQgdG8gcHV0IG9uIGEgbGFiZWwuXG4gIGlmICghdGhpcy5tdnRMYXllci5fbWFwKSByZXR1cm47XG5cbiAgdmFyIHZlY1B0ID0gdGhpcy5fdGlsZVBvaW50KGNvb3Jkc0FycmF5WzBdWzBdKTtcblxuICAvLyBXZSdyZSBtYWtpbmcgYSBzdGFuZGFyZCBMZWFmbGV0IE1hcmtlciBmb3IgdGhpcyBsYWJlbC5cbiAgdmFyIHAgPSB0aGlzLl9wcm9qZWN0KHZlY1B0LCBjdHgudGlsZS54LCBjdHgudGlsZS55LCB0aGlzLmV4dGVudCwgdGhpcy50aWxlU2l6ZSk7IC8vdmVjdGlsZSBwdCB0byBtZXJjIHB0XG4gIHZhciBtZXJjUHQgPSBMLnBvaW50KHAueCwgcC55KTsgLy8gbWFrZSBpbnRvIGxlYWZsZXQgb2JqXG4gIHZhciBsYXRMbmcgPSB0aGlzLm1hcC51bnByb2plY3QobWVyY1B0KTsgLy8gbWVyYyBwdCB0byBsYXRsbmdcblxuICB0aGlzLnN0YXRpY0xhYmVsID0gbmV3IFN0YXRpY0xhYmVsKHRoaXMsIGN0eCwgbGF0TG5nLCBzdHlsZSk7XG4gIHRoaXMubXZ0TGF5ZXIuZmVhdHVyZVdpdGhMYWJlbEFkZGVkKHRoaXMpO1xufTtcblxuTVZURmVhdHVyZS5wcm90b3R5cGUucmVtb3ZlTGFiZWwgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLnN0YXRpY0xhYmVsKSByZXR1cm47XG4gIHRoaXMuc3RhdGljTGFiZWwucmVtb3ZlKCk7XG4gIHRoaXMuc3RhdGljTGFiZWwgPSBudWxsO1xufTtcblxuLyoqXG4gKiBQcm9qZWN0cyBhIHZlY3RvciB0aWxlIHBvaW50IHRvIHRoZSBTcGhlcmljYWwgTWVyY2F0b3IgcGl4ZWwgc3BhY2UgZm9yIGEgZ2l2ZW4gem9vbSBsZXZlbC5cbiAqXG4gKiBAcGFyYW0gdmVjUHRcbiAqIEBwYXJhbSB0aWxlWFxuICogQHBhcmFtIHRpbGVZXG4gKiBAcGFyYW0gZXh0ZW50XG4gKiBAcGFyYW0gdGlsZVNpemVcbiAqL1xuTVZURmVhdHVyZS5wcm90b3R5cGUuX3Byb2plY3QgPSBmdW5jdGlvbih2ZWNQdCwgdGlsZVgsIHRpbGVZLCBleHRlbnQsIHRpbGVTaXplKSB7XG4gIHZhciB4T2Zmc2V0ID0gdGlsZVggKiB0aWxlU2l6ZTtcbiAgdmFyIHlPZmZzZXQgPSB0aWxlWSAqIHRpbGVTaXplO1xuICByZXR1cm4ge1xuICAgIHg6IE1hdGguZmxvb3IodmVjUHQueCArIHhPZmZzZXQpLFxuICAgIHk6IE1hdGguZmxvb3IodmVjUHQueSArIHlPZmZzZXQpXG4gIH07XG59O1xuXG4vKipcbiAqIFRha2VzIGEgY29vcmRpbmF0ZSBmcm9tIGEgdmVjdG9yIHRpbGUgYW5kIHR1cm5zIGl0IGludG8gYSBMZWFmbGV0IFBvaW50LlxuICpcbiAqIEBwYXJhbSBjdHhcbiAqIEBwYXJhbSBjb29yZHNcbiAqIEByZXR1cm5zIHtlR2VvbVR5cGUuUG9pbnR9XG4gKiBAcHJpdmF0ZVxuICovXG5NVlRGZWF0dXJlLnByb3RvdHlwZS5fdGlsZVBvaW50ID0gZnVuY3Rpb24oY29vcmRzKSB7XG4gIHJldHVybiBuZXcgTC5Qb2ludChjb29yZHMueCAvIHRoaXMuZGl2aXNvciwgY29vcmRzLnkgLyB0aGlzLmRpdmlzb3IpO1xufTtcblxuTVZURmVhdHVyZS5wcm90b3R5cGUubGlua2VkRmVhdHVyZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbGlua2VkTGF5ZXIgPSB0aGlzLm12dExheWVyLmxpbmtlZExheWVyKCk7XG4gIGlmKGxpbmtlZExheWVyKXtcbiAgICB2YXIgbGlua2VkRmVhdHVyZSA9IGxpbmtlZExheWVyLmZlYXR1cmVzW3RoaXMuaWRdO1xuICAgIHJldHVybiBsaW5rZWRGZWF0dXJlO1xuICB9ZWxzZXtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufTtcblxuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IFJ5YW4gV2hpdGxleSBvbiA1LzE3LzE0LlxuICovXG4vKiogRm9ya2VkIGZyb20gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vREd1aWRpLzE3MTYwMTAgKiovXG52YXIgTVZURmVhdHVyZSA9IHJlcXVpcmUoJy4vTVZURmVhdHVyZScpO1xudmFyIFV0aWwgPSByZXF1aXJlKCcuL01WVFV0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBMLlRpbGVMYXllci5DYW52YXMuZXh0ZW5kKHtcblxuICBvcHRpb25zOiB7XG4gICAgZGVidWc6IGZhbHNlLFxuICAgIGlzSGlkZGVuTGF5ZXI6IGZhbHNlLFxuICAgIGdldElERm9yTGF5ZXJGZWF0dXJlOiBmdW5jdGlvbigpIHt9LFxuICAgIHRpbGVTaXplOiAyNTYsXG4gICAgbGluZUNsaWNrVG9sZXJhbmNlOiAyXG4gIH0sXG5cbiAgX2ZlYXR1cmVJc0NsaWNrZWQ6IHt9LFxuXG4gIF9pc1BvaW50SW5Qb2x5OiBmdW5jdGlvbihwdCwgcG9seSkge1xuICAgIGlmKHBvbHkgJiYgcG9seS5sZW5ndGgpIHtcbiAgICAgIGZvciAodmFyIGMgPSBmYWxzZSwgaSA9IC0xLCBsID0gcG9seS5sZW5ndGgsIGogPSBsIC0gMTsgKytpIDwgbDsgaiA9IGkpXG4gICAgICAgICgocG9seVtpXS55IDw9IHB0LnkgJiYgcHQueSA8IHBvbHlbal0ueSkgfHwgKHBvbHlbal0ueSA8PSBwdC55ICYmIHB0LnkgPCBwb2x5W2ldLnkpKVxuICAgICAgICAmJiAocHQueCA8IChwb2x5W2pdLnggLSBwb2x5W2ldLngpICogKHB0LnkgLSBwb2x5W2ldLnkpIC8gKHBvbHlbal0ueSAtIHBvbHlbaV0ueSkgKyBwb2x5W2ldLngpXG4gICAgICAgICYmIChjID0gIWMpO1xuICAgICAgcmV0dXJuIGM7XG4gICAgfVxuICB9LFxuXG4gIF9nZXREaXN0YW5jZUZyb21MaW5lOiBmdW5jdGlvbihwdCwgcHRzKSB7XG4gICAgdmFyIG1pbiA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgICBpZiAocHRzICYmIHB0cy5sZW5ndGggPiAxKSB7XG4gICAgICBwdCA9IEwucG9pbnQocHQueCwgcHQueSk7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHB0cy5sZW5ndGggLSAxOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciB0ZXN0ID0gdGhpcy5fcHJvamVjdFBvaW50T25MaW5lU2VnbWVudChwdCwgcHRzW2ldLCBwdHNbaSArIDFdKTtcbiAgICAgICAgaWYgKHRlc3QuZGlzdGFuY2UgPD0gbWluKSB7XG4gICAgICAgICAgbWluID0gdGVzdC5kaXN0YW5jZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWluO1xuICB9LFxuXG4gIF9wcm9qZWN0UG9pbnRPbkxpbmVTZWdtZW50OiBmdW5jdGlvbihwLCByMCwgcjEpIHtcbiAgICB2YXIgbGluZUxlbmd0aCA9IHIwLmRpc3RhbmNlVG8ocjEpO1xuICAgIGlmIChsaW5lTGVuZ3RoIDwgMSkge1xuICAgICAgICByZXR1cm4ge2Rpc3RhbmNlOiBwLmRpc3RhbmNlVG8ocjApLCBjb29yZGluYXRlOiByMH07XG4gICAgfVxuICAgIHZhciB1ID0gKChwLnggLSByMC54KSAqIChyMS54IC0gcjAueCkgKyAocC55IC0gcjAueSkgKiAocjEueSAtIHIwLnkpKSAvIE1hdGgucG93KGxpbmVMZW5ndGgsIDIpO1xuICAgIGlmICh1IDwgMC4wMDAwMDAxKSB7XG4gICAgICAgIHJldHVybiB7ZGlzdGFuY2U6IHAuZGlzdGFuY2VUbyhyMCksIGNvb3JkaW5hdGU6IHIwfTtcbiAgICB9XG4gICAgaWYgKHUgPiAwLjk5OTk5OTkpIHtcbiAgICAgICAgcmV0dXJuIHtkaXN0YW5jZTogcC5kaXN0YW5jZVRvKHIxKSwgY29vcmRpbmF0ZTogcjF9O1xuICAgIH1cbiAgICB2YXIgYSA9IEwucG9pbnQocjAueCArIHUgKiAocjEueCAtIHIwLngpLCByMC55ICsgdSAqIChyMS55IC0gcjAueSkpO1xuICAgIHJldHVybiB7ZGlzdGFuY2U6IHAuZGlzdGFuY2VUbyhhKSwgcG9pbnQ6IGF9O1xuICB9LFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKG12dFNvdXJjZSwgb3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLm12dFNvdXJjZSA9IG12dFNvdXJjZTtcbiAgICBMLlV0aWwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcblxuICAgIHRoaXMuc3R5bGUgPSBvcHRpb25zLnN0eWxlO1xuICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZTtcbiAgICB0aGlzLl9jYW52YXNJRFRvRmVhdHVyZXMgPSB7fTtcbiAgICB0aGlzLmZlYXR1cmVzID0ge307XG4gICAgdGhpcy5mZWF0dXJlc1dpdGhMYWJlbHMgPSBbXTtcbiAgICB0aGlzLl9oaWdoZXN0Q291bnQgPSAwO1xuICB9LFxuXG4gIG9uQWRkOiBmdW5jdGlvbihtYXApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5tYXAgPSBtYXA7XG4gICAgTC5UaWxlTGF5ZXIuQ2FudmFzLnByb3RvdHlwZS5vbkFkZC5jYWxsKHRoaXMsIG1hcCk7XG4gICAgbWFwLm9uKCdsYXllcnJlbW92ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIC8vIHdlIG9ubHkgd2FudCB0byBkbyBzdHVmZiB3aGVuIHRoZSBsYXllcnJlbW92ZSBldmVudCBpcyBvbiB0aGlzIGxheWVyXG4gICAgICBpZiAoZS5sYXllci5fbGVhZmxldF9pZCA9PT0gc2VsZi5fbGVhZmxldF9pZCkge1xuICAgICAgICByZW1vdmVMYWJlbHMoc2VsZik7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgZHJhd1RpbGU6IGZ1bmN0aW9uKGNhbnZhcywgdGlsZVBvaW50LCB6b29tKSB7XG5cbiAgICB2YXIgY3R4ID0ge1xuICAgICAgY2FudmFzOiBjYW52YXMsXG4gICAgICB0aWxlOiB0aWxlUG9pbnQsXG4gICAgICB6b29tOiB6b29tLFxuICAgICAgdGlsZVNpemU6IHRoaXMub3B0aW9ucy50aWxlU2l6ZVxuICAgIH07XG5cbiAgICBjdHguaWQgPSBVdGlsLmdldENvbnRleHRJRChjdHgpO1xuXG4gICAgaWYgKCF0aGlzLl9jYW52YXNJRFRvRmVhdHVyZXNbY3R4LmlkXSkge1xuICAgICAgdGhpcy5faW5pdGlhbGl6ZUZlYXR1cmVzSGFzaChjdHgpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZmVhdHVyZXMpIHtcbiAgICAgIHRoaXMuZmVhdHVyZXMgPSB7fTtcbiAgICB9XG5cbiAgfSxcblxuICBfaW5pdGlhbGl6ZUZlYXR1cmVzSGFzaDogZnVuY3Rpb24oY3R4KXtcbiAgICB0aGlzLl9jYW52YXNJRFRvRmVhdHVyZXNbY3R4LmlkXSA9IHt9O1xuICAgIHRoaXMuX2NhbnZhc0lEVG9GZWF0dXJlc1tjdHguaWRdLmZlYXR1cmVzID0gW107XG4gICAgdGhpcy5fY2FudmFzSURUb0ZlYXR1cmVzW2N0eC5pZF0uY2FudmFzID0gY3R4LmNhbnZhcztcbiAgfSxcblxuICBfZHJhdzogZnVuY3Rpb24oY3R4KSB7XG4gICAgLy9EcmF3IGlzIGhhbmRsZWQgYnkgdGhlIHBhcmVudCBNVlRTb3VyY2Ugb2JqZWN0XG4gIH0sXG4gIGdldENhbnZhczogZnVuY3Rpb24ocGFyZW50Q3R4KXtcbiAgICAvL1RoaXMgZ2V0cyBjYWxsZWQgaWYgYSB2ZWN0b3IgdGlsZSBmZWF0dXJlIGhhcyBhbHJlYWR5IGJlZW4gcGFyc2VkLlxuICAgIC8vV2UndmUgYWxyZWFkeSBnb3QgdGhlIGdlb20sIGp1c3QgZ2V0IG9uIHdpdGggdGhlIGRyYXdpbmcuXG4gICAgLy9OZWVkIGEgd2F5IHRvIHBsdWNrIGEgY2FudmFzIGVsZW1lbnQgZnJvbSB0aGlzIGxheWVyIGdpdmVuIHRoZSBwYXJlbnQgbGF5ZXIncyBpZC5cbiAgICAvL1dhaXQgZm9yIGl0IHRvIGdldCBsb2FkZWQgYmVmb3JlIHByb2NlZWRpbmcuXG4gICAgdmFyIHRpbGVQb2ludCA9IHBhcmVudEN0eC50aWxlO1xuICAgIHZhciBjdHggPSB0aGlzLl90aWxlc1t0aWxlUG9pbnQueCArIFwiOlwiICsgdGlsZVBvaW50LnldO1xuXG4gICAgaWYoY3R4KXtcbiAgICAgIHBhcmVudEN0eC5jYW52YXMgPSBjdHg7XG4gICAgICB0aGlzLnJlZHJhd1RpbGUocGFyZW50Q3R4LmlkKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvL1RoaXMgaXMgYSB0aW1lciB0aGF0IHdpbGwgd2FpdCBmb3IgYSBjcml0ZXJpb24gdG8gcmV0dXJuIHRydWUuXG4gICAgLy9JZiBub3QgdHJ1ZSB3aXRoaW4gdGhlIHRpbWVvdXQgZHVyYXRpb24sIGl0IHdpbGwgbW92ZSBvbi5cbiAgICB3YWl0Rm9yKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY3R4ID0gc2VsZi5fdGlsZXNbdGlsZVBvaW50LnggKyBcIjpcIiArIHRpbGVQb2ludC55XTtcbiAgICAgICAgaWYoY3R4KSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbigpe1xuICAgICAgICAvL1doZW4gaXQgZmluaXNoZXMsIGRvIHRoaXMuXG4gICAgICAgIGN0eCA9IHNlbGYuX3RpbGVzW3RpbGVQb2ludC54ICsgXCI6XCIgKyB0aWxlUG9pbnQueV07XG4gICAgICAgIHBhcmVudEN0eC5jYW52YXMgPSBjdHg7XG4gICAgICAgIHNlbGYucmVkcmF3VGlsZShwYXJlbnRDdHguaWQpO1xuXG4gICAgICB9LCAvL3doZW4gZG9uZSwgZ28gdG8gbmV4dCBmbG93XG4gICAgICAyMDAwKTsgLy9UaGUgVGltZW91dCBtaWxsaXNlY29uZHMuICBBZnRlciB0aGlzLCBnaXZlIHVwIGFuZCBtb3ZlIG9uXG5cbiAgfSxcblxuICBwYXJzZVZlY3RvclRpbGVMYXllcjogZnVuY3Rpb24odnRsLCBjdHgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHRpbGVQb2ludCA9IGN0eC50aWxlO1xuICAgIHZhciBsYXllckN0eCAgPSB7IGNhbnZhczogbnVsbCwgaWQ6IGN0eC5pZCwgdGlsZTogY3R4LnRpbGUsIHpvb206IGN0eC56b29tLCB0aWxlU2l6ZTogY3R4LnRpbGVTaXplfTtcblxuICAgIC8vU2VlIGlmIHdlIGNhbiBwbHVjayB0aGUgY2hpbGQgdGlsZSBmcm9tIHRoaXMgUEJGIHRpbGUgbGF5ZXIgYmFzZWQgb24gdGhlIG1hc3RlciBsYXllcidzIHRpbGUgaWQuXG4gICAgbGF5ZXJDdHguY2FudmFzID0gc2VsZi5fdGlsZXNbdGlsZVBvaW50LnggKyBcIjpcIiArIHRpbGVQb2ludC55XTtcblxuXG5cbiAgICAvL0luaXRpYWxpemUgdGhpcyB0aWxlJ3MgZmVhdHVyZSBzdG9yYWdlIGhhc2gsIGlmIGl0IGhhc24ndCBhbHJlYWR5IGJlZW4gY3JlYXRlZC4gIFVzZWQgZm9yIHdoZW4gZmlsdGVycyBhcmUgdXBkYXRlZCwgYW5kIGZlYXR1cmVzIGFyZSBjbGVhcmVkIHRvIHByZXBhcmUgZm9yIGEgZnJlc2ggcmVkcmF3LlxuICAgIGlmICghdGhpcy5fY2FudmFzSURUb0ZlYXR1cmVzW2xheWVyQ3R4LmlkXSkge1xuICAgICAgdGhpcy5faW5pdGlhbGl6ZUZlYXR1cmVzSGFzaChsYXllckN0eCk7XG4gICAgfWVsc2V7XG4gICAgICAvL0NsZWFyIHRoaXMgdGlsZSdzIHByZXZpb3VzbHkgc2F2ZWQgZmVhdHVyZXMuXG4gICAgICB0aGlzLmNsZWFyVGlsZUZlYXR1cmVIYXNoKGxheWVyQ3R4LmlkKTtcbiAgICB9XG5cbiAgICB2YXIgZmVhdHVyZXMgPSB2dGwucGFyc2VkRmVhdHVyZXM7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGZlYXR1cmVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgdnRmID0gZmVhdHVyZXNbaV07IC8vdmVjdG9yIHRpbGUgZmVhdHVyZVxuICAgICAgdnRmLmxheWVyID0gdnRsO1xuXG4gICAgICAvKipcbiAgICAgICAqIEFwcGx5IGZpbHRlciBvbiBmZWF0dXJlIGlmIHRoZXJlIGlzIG9uZS4gRGVmaW5lZCBpbiB0aGUgb3B0aW9ucyBvYmplY3RcbiAgICAgICAqIG9mIFRpbGVMYXllci5NVlRTb3VyY2UuanNcbiAgICAgICAqL1xuICAgICAgdmFyIGZpbHRlciA9IHNlbGYub3B0aW9ucy5maWx0ZXI7XG4gICAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBpZiAoIGZpbHRlcih2dGYsIGxheWVyQ3R4KSA9PT0gZmFsc2UgKSBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGdldElERm9yTGF5ZXJGZWF0dXJlO1xuICAgICAgaWYgKHR5cGVvZiBzZWxmLm9wdGlvbnMuZ2V0SURGb3JMYXllckZlYXR1cmUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZ2V0SURGb3JMYXllckZlYXR1cmUgPSBzZWxmLm9wdGlvbnMuZ2V0SURGb3JMYXllckZlYXR1cmU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBnZXRJREZvckxheWVyRmVhdHVyZSA9IFV0aWwuZ2V0SURGb3JMYXllckZlYXR1cmU7XG4gICAgICB9XG4gICAgICB2YXIgdW5pcXVlSUQgPSBzZWxmLm9wdGlvbnMuZ2V0SURGb3JMYXllckZlYXR1cmUodnRmKSB8fCBpO1xuICAgICAgdmFyIG12dEZlYXR1cmUgPSBzZWxmLmZlYXR1cmVzW3VuaXF1ZUlEXTtcblxuICAgICAgLyoqXG4gICAgICAgKiBVc2UgbGF5ZXJPcmRlcmluZyBmdW5jdGlvbiB0byBhcHBseSBhIHpJbmRleCBwcm9wZXJ0eSB0byBlYWNoIHZ0Zi4gIFRoaXMgaXMgZGVmaW5lZCBpblxuICAgICAgICogVGlsZUxheWVyLk1WVFNvdXJjZS5qcy4gIFVzZWQgYmVsb3cgdG8gc29ydCBmZWF0dXJlcy5ucG1cbiAgICAgICAqL1xuICAgICAgdmFyIGxheWVyT3JkZXJpbmcgPSBzZWxmLm9wdGlvbnMubGF5ZXJPcmRlcmluZztcbiAgICAgIGlmICh0eXBlb2YgbGF5ZXJPcmRlcmluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBsYXllck9yZGVyaW5nKHZ0ZiwgbGF5ZXJDdHgpOyAvL0FwcGxpZXMgYSBjdXN0b20gcHJvcGVydHkgdG8gdGhlIGZlYXR1cmUsIHdoaWNoIGlzIHVzZWQgYWZ0ZXIgd2UncmUgdGhydSBpdGVyYXRpbmcgdG8gc29ydFxuICAgICAgfVxuXG4gICAgICAvL0NyZWF0ZSBhIG5ldyBNVlRGZWF0dXJlIGlmIG9uZSBkb2Vzbid0IGFscmVhZHkgZXhpc3QgZm9yIHRoaXMgZmVhdHVyZS5cbiAgICAgIGlmICghbXZ0RmVhdHVyZSkge1xuICAgICAgICAvL0dldCBhIHN0eWxlIGZvciB0aGUgZmVhdHVyZSAtIHNldCBpdCBqdXN0IG9uY2UgZm9yIGVhY2ggbmV3IE1WVEZlYXR1cmVcbiAgICAgICAgdmFyIHN0eWxlID0gc2VsZi5zdHlsZSh2dGYpO1xuXG4gICAgICAgIC8vY3JlYXRlIGEgbmV3IGZlYXR1cmVcbiAgICAgICAgc2VsZi5mZWF0dXJlc1t1bmlxdWVJRF0gPSBtdnRGZWF0dXJlID0gbmV3IE1WVEZlYXR1cmUoc2VsZiwgdnRmLCBsYXllckN0eCwgdW5pcXVlSUQsIHN0eWxlKTtcbiAgICAgICAgaWYgKHN0eWxlICYmIHN0eWxlLmR5bmFtaWNMYWJlbCAmJiB0eXBlb2Ygc3R5bGUuZHluYW1pY0xhYmVsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgc2VsZi5mZWF0dXJlc1dpdGhMYWJlbHMucHVzaChtdnRGZWF0dXJlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy9BZGQgdGhlIG5ldyBwYXJ0IHRvIHRoZSBleGlzdGluZyBmZWF0dXJlXG4gICAgICAgIG12dEZlYXR1cmUuYWRkVGlsZUZlYXR1cmUodnRmLCBsYXllckN0eCk7XG4gICAgICB9XG5cbiAgICAgIC8vQXNzb2NpYXRlICYgU2F2ZSB0aGlzIGZlYXR1cmUgd2l0aCB0aGlzIHRpbGUgZm9yIGxhdGVyXG4gICAgICBpZihsYXllckN0eCAmJiBsYXllckN0eC5pZCkgc2VsZi5fY2FudmFzSURUb0ZlYXR1cmVzW2xheWVyQ3R4LmlkXVsnZmVhdHVyZXMnXS5wdXNoKG12dEZlYXR1cmUpO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgc29ydGluZyAoekluZGV4KSBvbiBmZWF0dXJlIGlmIHRoZXJlIGlzIGEgZnVuY3Rpb24gZGVmaW5lZCBpbiB0aGUgb3B0aW9ucyBvYmplY3RcbiAgICAgKiBvZiBUaWxlTGF5ZXIuTVZUU291cmNlLmpzXG4gICAgICovXG4gICAgdmFyIGxheWVyT3JkZXJpbmcgPSBzZWxmLm9wdGlvbnMubGF5ZXJPcmRlcmluZztcbiAgICBpZiAobGF5ZXJPcmRlcmluZykge1xuICAgICAgLy9XZSd2ZSBhc3NpZ25lZCB0aGUgY3VzdG9tIHpJbmRleCBwcm9wZXJ0eSB3aGVuIGl0ZXJhdGluZyBhYm92ZS4gIE5vdyBqdXN0IHNvcnQuXG4gICAgICBzZWxmLl9jYW52YXNJRFRvRmVhdHVyZXNbbGF5ZXJDdHguaWRdLmZlYXR1cmVzID0gc2VsZi5fY2FudmFzSURUb0ZlYXR1cmVzW2xheWVyQ3R4LmlkXS5mZWF0dXJlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIC0oYi5wcm9wZXJ0aWVzLnpJbmRleCAtIGEucHJvcGVydGllcy56SW5kZXgpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBzZWxmLnJlZHJhd1RpbGUobGF5ZXJDdHguaWQpO1xuICB9LFxuXG4gIHNldFN0eWxlOiBmdW5jdGlvbihzdHlsZUZuKSB7XG4gICAgLy8gcmVmcmVzaCB0aGUgbnVtYmVyIGZvciB0aGUgaGlnaGVzdCBjb3VudCB2YWx1ZVxuICAgIC8vIHRoaXMgaXMgdXNlZCBvbmx5IGZvciBjaG9yb3BsZXRoXG4gICAgdGhpcy5faGlnaGVzdENvdW50ID0gMDtcblxuICAgIC8vIGxvd2VzdCBjb3VudCBzaG91bGQgbm90IGJlIDAsIHNpbmNlIHdlIHdhbnQgdG8gZmlndXJlIG91dCB0aGUgbG93ZXN0XG4gICAgdGhpcy5fbG93ZXN0Q291bnQgPSBudWxsO1xuXG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlRm47XG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMuZmVhdHVyZXMpIHtcbiAgICAgIHZhciBmZWF0ID0gdGhpcy5mZWF0dXJlc1trZXldO1xuICAgICAgZmVhdC5zZXRTdHlsZShzdHlsZUZuKTtcbiAgICB9XG4gICAgdmFyIHogPSB0aGlzLm1hcC5nZXRab29tKCk7XG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMuX3RpbGVzKSB7XG4gICAgICB2YXIgaWQgPSB6ICsgJzonICsga2V5O1xuICAgICAgdGhpcy5yZWRyYXdUaWxlKGlkKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFzIGNvdW50cyBmb3IgY2hvcm9wbGV0aHMgY29tZSBpbiB3aXRoIHRoZSBhamF4IGRhdGEsXG4gICAqIHdlIHdhbnQgdG8ga2VlcCB0cmFjayBvZiB3aGljaCB2YWx1ZSBpcyB0aGUgaGlnaGVzdFxuICAgKiB0byBjcmVhdGUgdGhlIGNvbG9yIHJhbXAgZm9yIHRoZSBmaWxscyBvZiBwb2x5Z29ucy5cbiAgICogQHBhcmFtIGNvdW50XG4gICAqL1xuICBzZXRIaWdoZXN0Q291bnQ6IGZ1bmN0aW9uKGNvdW50KSB7XG4gICAgaWYgKGNvdW50ID4gdGhpcy5faGlnaGVzdENvdW50KSB7XG4gICAgICB0aGlzLl9oaWdoZXN0Q291bnQgPSBjb3VudDtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGhpZ2hlc3QgbnVtYmVyIG9mIGFsbCBvZiB0aGUgY291bnRzIHRoYXQgaGF2ZSBjb21lIGluXG4gICAqIGZyb20gc2V0SGlnaGVzdENvdW50LiBUaGlzIGlzIGFzc3VtZWQgdG8gYmUgc2V0IHZpYSBhamF4IGNhbGxiYWNrcy5cbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG4gIGdldEhpZ2hlc3RDb3VudDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hpZ2hlc3RDb3VudDtcbiAgfSxcblxuICBzZXRMb3dlc3RDb3VudDogZnVuY3Rpb24oY291bnQpIHtcbiAgICBpZiAoIXRoaXMuX2xvd2VzdENvdW50IHx8IGNvdW50IDwgdGhpcy5fbG93ZXN0Q291bnQpIHtcbiAgICAgIHRoaXMuX2xvd2VzdENvdW50ID0gY291bnQ7XG4gICAgfVxuICB9LFxuXG4gIGdldExvd2VzdENvdW50OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fbG93ZXN0Q291bnQ7XG4gIH0sXG5cbiAgc2V0Q291bnRSYW5nZTogZnVuY3Rpb24oY291bnQpIHtcbiAgICB0aGlzLnNldEhpZ2hlc3RDb3VudChjb3VudCk7XG4gICAgdGhpcy5zZXRMb3dlc3RDb3VudChjb3VudCk7XG4gIH0sXG5cbiAgLy9UaGlzIGlzIHRoZSBvbGQgd2F5LiAgSXQgd29ya3MsIGJ1dCBpcyBzbG93IGZvciBtb3VzZW92ZXIgZXZlbnRzLiAgRmluZSBmb3IgY2xpY2sgZXZlbnRzLlxuICBoYW5kbGVDbGlja0V2ZW50OiBmdW5jdGlvbihldnQsIGNiKSB7XG4gICAgLy9DbGljayBoYXBwZW5lZCBvbiB0aGUgR3JvdXBMYXllciAoTWFuYWdlcikgYW5kIHBhc3NlZCBpdCBoZXJlXG4gICAgdmFyIHRpbGVJRCA9IGV2dC50aWxlSUQuc3BsaXQoXCI6XCIpLnNsaWNlKDEsIDMpLmpvaW4oXCI6XCIpO1xuICAgIHZhciB6b29tID0gZXZ0LnRpbGVJRC5zcGxpdChcIjpcIilbMF07XG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX3RpbGVzW3RpbGVJRF07XG4gICAgaWYoIWNhbnZhcykge1xuICAgICAgLy9icmVhayBvdXRcbiAgICAgIGNiKGV2dCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB4ID0gZXZ0LmxheWVyUG9pbnQueCAtIGNhbnZhcy5fbGVhZmxldF9wb3MueDtcbiAgICB2YXIgeSA9IGV2dC5sYXllclBvaW50LnkgLSBjYW52YXMuX2xlYWZsZXRfcG9zLnk7XG5cbiAgICB2YXIgdGlsZVBvaW50ID0ge3g6IHgsIHk6IHl9O1xuICAgIHZhciBmZWF0dXJlcyA9IHRoaXMuX2NhbnZhc0lEVG9GZWF0dXJlc1tldnQudGlsZUlEXS5mZWF0dXJlcztcblxuICAgIHZhciBtaW5EaXN0YW5jZSA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgICB2YXIgbmVhcmVzdCA9IG51bGw7XG4gICAgdmFyIGosIHBhdGhzLCBkaXN0YW5jZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBmZWF0dXJlID0gZmVhdHVyZXNbaV07XG4gICAgICBzd2l0Y2ggKGZlYXR1cmUudHlwZSkge1xuXG4gICAgICAgIGNhc2UgMTogLy9Qb2ludCAtIGN1cnJlbnRseSByZW5kZXJlZCBhcyBjaXJjdWxhciBwYXRocy4gIEludGVyc2VjdCB3aXRoIHRoYXQuXG5cbiAgICAgICAgICAvL0ZpbmQgdGhlIHJhZGl1cyBvZiB0aGUgcG9pbnQuXG4gICAgICAgICAgdmFyIHJhZGl1cyA9IDM7XG4gICAgICAgICAgaWYgKHR5cGVvZiBmZWF0dXJlLnN0eWxlLnJhZGl1cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmFkaXVzID0gZmVhdHVyZS5zdHlsZS5yYWRpdXMoem9vbSk7IC8vQWxsb3dzIGZvciBzY2FsZSBkZXBlbmRlbnQgcmVkbmVyaW5nXG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICByYWRpdXMgPSBmZWF0dXJlLnN0eWxlLnJhZGl1cztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwYXRocyA9IGZlYXR1cmUuZ2V0UGF0aHNGb3JUaWxlKGV2dC50aWxlSUQpO1xuICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBwYXRocy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgLy9CdWlsZHMgYSBjaXJjbGUgb2YgcmFkaXVzIGZlYXR1cmUuc3R5bGUucmFkaXVzIChhc3N1bWluZyBjaXJjdWxhciBwb2ludCBzeW1ib2xvZ3kpLlxuICAgICAgICAgICAgaWYoaW5fY2lyY2xlKHBhdGhzW2pdWzBdLngsIHBhdGhzW2pdWzBdLnksIHJhZGl1cywgeCwgeSkpe1xuICAgICAgICAgICAgICBuZWFyZXN0ID0gZmVhdHVyZTtcbiAgICAgICAgICAgICAgbWluRGlzdGFuY2UgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIDI6IC8vTGluZVN0cmluZ1xuICAgICAgICAgIHBhdGhzID0gZmVhdHVyZS5nZXRQYXRoc0ZvclRpbGUoZXZ0LnRpbGVJRCk7XG4gICAgICAgICAgZm9yIChqID0gMDsgaiA8IHBhdGhzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBpZiAoZmVhdHVyZS5zdHlsZSkge1xuICAgICAgICAgICAgICB2YXIgZGlzdGFuY2UgPSB0aGlzLl9nZXREaXN0YW5jZUZyb21MaW5lKHRpbGVQb2ludCwgcGF0aHNbal0pO1xuICAgICAgICAgICAgICB2YXIgdGhpY2tuZXNzID0gKGZlYXR1cmUuc2VsZWN0ZWQgJiYgZmVhdHVyZS5zdHlsZS5zZWxlY3RlZCA/IGZlYXR1cmUuc3R5bGUuc2VsZWN0ZWQuc2l6ZSA6IGZlYXR1cmUuc3R5bGUuc2l6ZSk7XG4gICAgICAgICAgICAgIGlmIChkaXN0YW5jZSA8IHRoaWNrbmVzcyAvIDIgKyB0aGlzLm9wdGlvbnMubGluZUNsaWNrVG9sZXJhbmNlICYmIGRpc3RhbmNlIDwgbWluRGlzdGFuY2UpIHtcbiAgICAgICAgICAgICAgICBuZWFyZXN0ID0gZmVhdHVyZTtcbiAgICAgICAgICAgICAgICBtaW5EaXN0YW5jZSA9IGRpc3RhbmNlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgMzogLy9Qb2x5Z29uXG4gICAgICAgICAgcGF0aHMgPSBmZWF0dXJlLmdldFBhdGhzRm9yVGlsZShldnQudGlsZUlEKTtcbiAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgcGF0aHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc1BvaW50SW5Qb2x5KHRpbGVQb2ludCwgcGF0aHNbal0pKSB7XG4gICAgICAgICAgICAgIG5lYXJlc3QgPSBmZWF0dXJlO1xuICAgICAgICAgICAgICBtaW5EaXN0YW5jZSA9IDA7IC8vIHBvaW50IGlzIGluc2lkZSB0aGUgcG9seWdvbiwgc28gZGlzdGFuY2UgaXMgemVyb1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChtaW5EaXN0YW5jZSA9PSAwKSBicmVhaztcbiAgICB9XG5cbiAgICBpZiAobmVhcmVzdCAmJiBuZWFyZXN0LnRvZ2dsZUVuYWJsZWQpIHtcbiAgICAgICAgbmVhcmVzdC50b2dnbGUoKTtcbiAgICB9XG4gICAgZXZ0LmZlYXR1cmUgPSBuZWFyZXN0O1xuICAgIGNiKGV2dCk7XG4gIH0sXG5cbiAgY2xlYXJUaWxlOiBmdW5jdGlvbihpZCkge1xuICAgIC8vaWQgaXMgdGhlIGVudGlyZSB6b29tOng6eS4gIHdlIGp1c3Qgd2FudCB4OnkuXG4gICAgdmFyIGNhID0gaWQuc3BsaXQoXCI6XCIpO1xuICAgIHZhciBjYW52YXNJZCA9IGNhWzFdICsgXCI6XCIgKyBjYVsyXTtcbiAgICBpZiAodHlwZW9mIHRoaXMuX3RpbGVzW2NhbnZhc0lkXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJ0eXBlb2YgdGhpcy5fdGlsZXNbY2FudmFzSWRdID09PSAndW5kZWZpbmVkJ1wiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuX3RpbGVzW2NhbnZhc0lkXTtcblxuICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgfSxcblxuICBjbGVhclRpbGVGZWF0dXJlSGFzaDogZnVuY3Rpb24oY2FudmFzSUQpe1xuICAgIHRoaXMuX2NhbnZhc0lEVG9GZWF0dXJlc1tjYW52YXNJRF0gPSB7IGZlYXR1cmVzOiBbXX07IC8vR2V0IHJpZCBvZiBhbGwgc2F2ZWQgZmVhdHVyZXNcbiAgfSxcblxuICBjbGVhckxheWVyRmVhdHVyZUhhc2g6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5mZWF0dXJlcyA9IHt9O1xuICB9LFxuXG4gIHJlZHJhd1RpbGU6IGZ1bmN0aW9uKGNhbnZhc0lEKSB7XG4gICAgLy9GaXJzdCwgY2xlYXIgdGhlIGNhbnZhc1xuICAgIHRoaXMuY2xlYXJUaWxlKGNhbnZhc0lEKTtcblxuICAgIC8vIElmIHRoZSBmZWF0dXJlcyBhcmUgbm90IGluIHRoZSB0aWxlLCB0aGVuIHRoZXJlIGlzIG5vdGhpbmcgdG8gcmVkcmF3LlxuICAgIC8vIFRoaXMgbWF5IGhhcHBlbiBpZiB5b3UgY2FsbCByZWRyYXcgYmVmb3JlIGZlYXR1cmVzIGhhdmUgbG9hZGVkIGFuZCBpbml0aWFsbHlcbiAgICAvLyBkcmF3biB0aGUgdGlsZS5cbiAgICB2YXIgZmVhdGZlYXRzID0gdGhpcy5fY2FudmFzSURUb0ZlYXR1cmVzW2NhbnZhc0lEXTtcbiAgICBpZiAoIWZlYXRmZWF0cykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vR2V0IHRoZSBmZWF0dXJlcyBmb3IgdGhpcyB0aWxlLCBhbmQgcmVkcmF3IHRoZW0uXG4gICAgdmFyIGZlYXR1cmVzID0gZmVhdGZlYXRzLmZlYXR1cmVzO1xuXG4gICAgLy8gd2Ugd2FudCB0byBza2lwIGRyYXdpbmcgdGhlIHNlbGVjdGVkIGZlYXR1cmVzIGFuZCBkcmF3IHRoZW0gbGFzdFxuICAgIHZhciBzZWxlY3RlZEZlYXR1cmVzID0gW107XG5cbiAgICAvLyBkcmF3aW5nIGFsbCBvZiB0aGUgbm9uLXNlbGVjdGVkIGZlYXR1cmVzXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGZlYXR1cmUgPSBmZWF0dXJlc1tpXTtcbiAgICAgIGlmIChmZWF0dXJlLnNlbGVjdGVkKSB7XG4gICAgICAgIHNlbGVjdGVkRmVhdHVyZXMucHVzaChmZWF0dXJlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZlYXR1cmUuZHJhdyhjYW52YXNJRCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZHJhd2luZyB0aGUgc2VsZWN0ZWQgZmVhdHVyZXMgbGFzdFxuICAgIGZvciAodmFyIGogPSAwLCBsZW4yID0gc2VsZWN0ZWRGZWF0dXJlcy5sZW5ndGg7IGogPCBsZW4yOyBqKyspIHtcbiAgICAgIHZhciBzZWxGZWF0ID0gc2VsZWN0ZWRGZWF0dXJlc1tqXTtcbiAgICAgIHNlbEZlYXQuZHJhdyhjYW52YXNJRCk7XG4gICAgfVxuICB9LFxuXG4gIF9yZXNldENhbnZhc0lEVG9GZWF0dXJlczogZnVuY3Rpb24oY2FudmFzSUQsIGNhbnZhcykge1xuXG4gICAgdGhpcy5fY2FudmFzSURUb0ZlYXR1cmVzW2NhbnZhc0lEXSA9IHt9O1xuICAgIHRoaXMuX2NhbnZhc0lEVG9GZWF0dXJlc1tjYW52YXNJRF0uZmVhdHVyZXMgPSBbXTtcbiAgICB0aGlzLl9jYW52YXNJRFRvRmVhdHVyZXNbY2FudmFzSURdLmNhbnZhcyA9IGNhbnZhcztcblxuICB9LFxuXG4gIGxpbmtlZExheWVyOiBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLm12dFNvdXJjZS5sYXllckxpbmspIHtcbiAgICAgIHZhciBsaW5rTmFtZSA9IHRoaXMubXZ0U291cmNlLmxheWVyTGluayh0aGlzLm5hbWUpO1xuICAgICAgcmV0dXJuIHRoaXMubXZ0U291cmNlLmxheWVyc1tsaW5rTmFtZV07XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH0sXG5cbiAgZmVhdHVyZVdpdGhMYWJlbEFkZGVkOiBmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgdGhpcy5mZWF0dXJlc1dpdGhMYWJlbHMucHVzaChmZWF0dXJlKTtcbiAgfVxuXG59KTtcblxuXG5mdW5jdGlvbiByZW1vdmVMYWJlbHMoc2VsZikge1xuICB2YXIgZmVhdHVyZXMgPSBzZWxmLmZlYXR1cmVzV2l0aExhYmVscztcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGZlYXR1cmVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgdmFyIGZlYXQgPSBmZWF0dXJlc1tpXTtcbiAgICBmZWF0LnJlbW92ZUxhYmVsKCk7XG4gIH1cbiAgc2VsZi5mZWF0dXJlc1dpdGhMYWJlbHMgPSBbXTtcbn1cblxuZnVuY3Rpb24gaW5fY2lyY2xlKGNlbnRlcl94LCBjZW50ZXJfeSwgcmFkaXVzLCB4LCB5KSB7XG4gIHZhciBzcXVhcmVfZGlzdCA9IE1hdGgucG93KChjZW50ZXJfeCAtIHgpLCAyKSArIE1hdGgucG93KChjZW50ZXJfeSAtIHkpLCAyKTtcbiAgcmV0dXJuIHNxdWFyZV9kaXN0IDw9IE1hdGgucG93KHJhZGl1cywgMik7XG59XG4vKipcbiAqIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYXJpeWEvcGhhbnRvbWpzL2Jsb2IvbWFzdGVyL2V4YW1wbGVzL3dhaXRmb3IuanNcbiAqXG4gKiBXYWl0IHVudGlsIHRoZSB0ZXN0IGNvbmRpdGlvbiBpcyB0cnVlIG9yIGEgdGltZW91dCBvY2N1cnMuIFVzZWZ1bCBmb3Igd2FpdGluZ1xuICogb24gYSBzZXJ2ZXIgcmVzcG9uc2Ugb3IgZm9yIGEgdWkgY2hhbmdlIChmYWRlSW4sIGV0Yy4pIHRvIG9jY3VyLlxuICpcbiAqIEBwYXJhbSB0ZXN0RnggamF2YXNjcmlwdCBjb25kaXRpb24gdGhhdCBldmFsdWF0ZXMgdG8gYSBib29sZWFuLFxuICogaXQgY2FuIGJlIHBhc3NlZCBpbiBhcyBhIHN0cmluZyAoZS5nLjogXCIxID09IDFcIiBvciBcIiQoJyNiYXInKS5pcygnOnZpc2libGUnKVwiIG9yXG4gKiBhcyBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHBhcmFtIG9uUmVhZHkgd2hhdCB0byBkbyB3aGVuIHRlc3RGeCBjb25kaXRpb24gaXMgZnVsZmlsbGVkLFxuICogaXQgY2FuIGJlIHBhc3NlZCBpbiBhcyBhIHN0cmluZyAoZS5nLjogXCIxID09IDFcIiBvciBcIiQoJyNiYXInKS5pcygnOnZpc2libGUnKVwiIG9yXG4gKiBhcyBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHBhcmFtIHRpbWVPdXRNaWxsaXMgdGhlIG1heCBhbW91bnQgb2YgdGltZSB0byB3YWl0LiBJZiBub3Qgc3BlY2lmaWVkLCAzIHNlYyBpcyB1c2VkLlxuICovXG5mdW5jdGlvbiB3YWl0Rm9yKHRlc3RGeCwgb25SZWFkeSwgdGltZU91dE1pbGxpcykge1xuICB2YXIgbWF4dGltZU91dE1pbGxpcyA9IHRpbWVPdXRNaWxsaXMgPyB0aW1lT3V0TWlsbGlzIDogMzAwMCwgLy88IERlZmF1bHQgTWF4IFRpbW91dCBpcyAzc1xuICAgIHN0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgY29uZGl0aW9uID0gKHR5cGVvZiAodGVzdEZ4KSA9PT0gXCJzdHJpbmdcIiA/IGV2YWwodGVzdEZ4KSA6IHRlc3RGeCgpKSwgLy88IGRlZmVuc2l2ZSBjb2RlXG4gICAgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnQgPCBtYXh0aW1lT3V0TWlsbGlzKSAmJiAhY29uZGl0aW9uKSB7XG4gICAgICAgIC8vIElmIG5vdCB0aW1lLW91dCB5ZXQgYW5kIGNvbmRpdGlvbiBub3QgeWV0IGZ1bGZpbGxlZFxuICAgICAgICBjb25kaXRpb24gPSAodHlwZW9mICh0ZXN0RngpID09PSBcInN0cmluZ1wiID8gZXZhbCh0ZXN0RngpIDogdGVzdEZ4KCkpOyAvLzwgZGVmZW5zaXZlIGNvZGVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghY29uZGl0aW9uKSB7XG4gICAgICAgICAgLy8gSWYgY29uZGl0aW9uIHN0aWxsIG5vdCBmdWxmaWxsZWQgKHRpbWVvdXQgYnV0IGNvbmRpdGlvbiBpcyAnZmFsc2UnKVxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiJ3dhaXRGb3IoKScgdGltZW91dFwiKTtcbiAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTsgLy88IFN0b3AgdGhpcyBpbnRlcnZhbFxuICAgICAgICAgIHR5cGVvZiAob25SZWFkeSkgPT09IFwic3RyaW5nXCIgPyBldmFsKG9uUmVhZHkpIDogb25SZWFkeSgndGltZW91dCcpOyAvLzwgRG8gd2hhdCBpdCdzIHN1cHBvc2VkIHRvIGRvIG9uY2UgdGhlIGNvbmRpdGlvbiBpcyBmdWxmaWxsZWRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBDb25kaXRpb24gZnVsZmlsbGVkICh0aW1lb3V0IGFuZC9vciBjb25kaXRpb24gaXMgJ3RydWUnKVxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiJ3dhaXRGb3IoKScgZmluaXNoZWQgaW4gXCIgKyAobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydCkgKyBcIm1zLlwiKTtcbiAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTsgLy88IFN0b3AgdGhpcyBpbnRlcnZhbFxuICAgICAgICAgIHR5cGVvZiAob25SZWFkeSkgPT09IFwic3RyaW5nXCIgPyBldmFsKG9uUmVhZHkpIDogb25SZWFkeSgnc3VjY2VzcycpOyAvLzwgRG8gd2hhdCBpdCdzIHN1cHBvc2VkIHRvIGRvIG9uY2UgdGhlIGNvbmRpdGlvbiBpcyBmdWxmaWxsZWRcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sIDUwKTsgLy88IHJlcGVhdCBjaGVjayBldmVyeSA1MG1zXG59OyIsInZhciBWZWN0b3JUaWxlID0gcmVxdWlyZSgndmVjdG9yLXRpbGUnKS5WZWN0b3JUaWxlO1xudmFyIFByb3RvYnVmID0gcmVxdWlyZSgncGJmJyk7XG52YXIgUG9pbnQgPSByZXF1aXJlKCdwb2ludC1nZW9tZXRyeScpO1xudmFyIFV0aWwgPSByZXF1aXJlKCcuL01WVFV0aWwnKTtcbnZhciBNVlRMYXllciA9IHJlcXVpcmUoJy4vTVZUTGF5ZXInKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEwuVGlsZUxheWVyLk1WVFNvdXJjZSA9IEwuVGlsZUxheWVyLkNhbnZhcy5leHRlbmQoe1xuXG4gIG9wdGlvbnM6IHtcbiAgICBkZWJ1ZzogZmFsc2UsXG4gICAgdXJsOiBcIlwiLCAvL1VSTCBUTyBWZWN0b3IgVGlsZSBTb3VyY2UsXG4gICAgZ2V0SURGb3JMYXllckZlYXR1cmU6IGZ1bmN0aW9uKCkge30sXG4gICAgdGlsZVNpemU6IDI1NixcbiAgICB2aXNpYmxlTGF5ZXJzOiBbXSxcbiAgICB4aHJIZWFkZXJzOiB7fVxuICB9LFxuICBsYXllcnM6IHt9LCAvL0tlZXAgYSBsaXN0IG9mIHRoZSBsYXllcnMgY29udGFpbmVkIGluIHRoZSBQQkZzXG4gIHByb2Nlc3NlZFRpbGVzOiB7fSwgLy9LZWVwIGEgbGlzdCBvZiB0aWxlcyB0aGF0IGhhdmUgYmVlbiBwcm9jZXNzZWQgYWxyZWFkeVxuICBfZXZlbnRIYW5kbGVyczoge30sXG4gIF90cmlnZ2VyT25UaWxlc0xvYWRlZEV2ZW50OiB0cnVlLCAvL3doZXRoZXIgb3Igbm90IHRvIGZpcmUgdGhlIG9uVGlsZXNMb2FkZWQgZXZlbnQgd2hlbiBhbGwgb2YgdGhlIHRpbGVzIGZpbmlzaCBsb2FkaW5nLlxuICBfdXJsOiBcIlwiLCAvL2ludGVybmFsIFVSTCBwcm9wZXJ0eVxuXG4gIHN0eWxlOiBmdW5jdGlvbihmZWF0dXJlKSB7XG4gICAgdmFyIHN0eWxlID0ge307XG5cbiAgICB2YXIgdHlwZSA9IGZlYXR1cmUudHlwZTtcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgMTogLy8nUG9pbnQnXG4gICAgICAgIHN0eWxlLmNvbG9yID0gJ3JnYmEoNDksNzksNzksMSknO1xuICAgICAgICBzdHlsZS5yYWRpdXMgPSA1O1xuICAgICAgICBzdHlsZS5zZWxlY3RlZCA9IHtcbiAgICAgICAgICBjb2xvcjogJ3JnYmEoMjU1LDI1NSwwLDAuNSknLFxuICAgICAgICAgIHJhZGl1czogNlxuICAgICAgICB9O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjogLy8nTGluZVN0cmluZydcbiAgICAgICAgc3R5bGUuY29sb3IgPSAncmdiYSgxNjEsMjE3LDE1NSwwLjgpJztcbiAgICAgICAgc3R5bGUuc2l6ZSA9IDM7XG4gICAgICAgIHN0eWxlLnNlbGVjdGVkID0ge1xuICAgICAgICAgIGNvbG9yOiAncmdiYSgyNTUsMjUsMCwwLjUpJyxcbiAgICAgICAgICBzaXplOiA0XG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOiAvLydQb2x5Z29uJ1xuICAgICAgICBzdHlsZS5jb2xvciA9ICdyZ2JhKDQ5LDc5LDc5LDEpJztcbiAgICAgICAgc3R5bGUub3V0bGluZSA9IHtcbiAgICAgICAgICBjb2xvcjogJ3JnYmEoMTYxLDIxNywxNTUsMC44KScsXG4gICAgICAgICAgc2l6ZTogMVxuICAgICAgICB9O1xuICAgICAgICBzdHlsZS5zZWxlY3RlZCA9IHtcbiAgICAgICAgICBjb2xvcjogJ3JnYmEoMjU1LDE0MCwwLDAuMyknLFxuICAgICAgICAgIG91dGxpbmU6IHtcbiAgICAgICAgICAgIGNvbG9yOiAncmdiYSgyNTUsMTQwLDAsMSknLFxuICAgICAgICAgICAgc2l6ZTogMlxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiBzdHlsZTtcbiAgfSxcblxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBMLlV0aWwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcblxuICAgIC8vYSBsaXN0IG9mIHRoZSBsYXllcnMgY29udGFpbmVkIGluIHRoZSBQQkZzXG4gICAgdGhpcy5sYXllcnMgPSB7fTtcblxuICAgIC8vIHRpbGVzIGN1cnJlbnRseSBpbiB0aGUgdmlld3BvcnRcbiAgICB0aGlzLmFjdGl2ZVRpbGVzID0ge307XG5cbiAgICAvLyB0aGF0cyB0aGF0IGhhdmUgYmVlbiBsb2FkZWQgYW5kIGRyYXduXG4gICAgdGhpcy5sb2FkZWRUaWxlcyA9IHt9O1xuXG4gICAgdGhpcy5fdXJsID0gdGhpcy5vcHRpb25zLnVybDtcblxuICAgIC8qKlxuICAgICAqIEZvciBzb21lIHJlYXNvbiwgTGVhZmxldCBoYXMgc29tZSBjb2RlIHRoYXQgcmVzZXRzIHRoZVxuICAgICAqIHogaW5kZXggaW4gdGhlIG9wdGlvbnMgb2JqZWN0LiBJJ20gaGF2aW5nIHRyb3VibGUgdHJhY2tpbmdcbiAgICAgKiBkb3duIGV4YWN0bHkgd2hhdCBkb2VzIHRoaXMgYW5kIHdoeSwgc28gZm9yIG5vdywgd2Ugc2hvdWxkXG4gICAgICoganVzdCBjb3B5IHRoZSB2YWx1ZSB0byB0aGlzLnpJbmRleCBzbyB3ZSBjYW4gaGF2ZSB0aGUgcmlnaHRcbiAgICAgKiBudW1iZXIgd2hlbiB3ZSBtYWtlIHRoZSBzdWJzZXF1ZW50IE1WVExheWVycy5cbiAgICAgKi9cbiAgICB0aGlzLnpJbmRleCA9IG9wdGlvbnMuekluZGV4O1xuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLnN0eWxlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLnN0eWxlID0gb3B0aW9ucy5zdHlsZTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuYWpheFNvdXJjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5hamF4U291cmNlID0gb3B0aW9ucy5hamF4U291cmNlO1xuICAgIH1cblxuICAgIHRoaXMubGF5ZXJMaW5rID0gb3B0aW9ucy5sYXllckxpbms7XG5cbiAgICB0aGlzLl9ldmVudEhhbmRsZXJzID0ge307XG5cbiAgICB0aGlzLl90aWxlc1RvUHJvY2VzcyA9IDA7IC8vc3RvcmUgdGhlIG1heCBudW1iZXIgb2YgdGlsZXMgdG8gYmUgbG9hZGVkLiAgTGF0ZXIsIHdlIGNhbiB1c2UgdGhpcyBjb3VudCB0byBjb3VudCBkb3duIFBCRiBsb2FkaW5nLlxuICB9LFxuXG4gIHJlZHJhdzogZnVuY3Rpb24odHJpZ2dlck9uVGlsZXNMb2FkZWRFdmVudCl7XG4gICAgLy9Pbmx5IHNldCB0byBmYWxzZSBpZiBpdCBhY3R1YWxseSBpcyBwYXNzZWQgaW4gYXMgJ2ZhbHNlJ1xuICAgIGlmICh0cmlnZ2VyT25UaWxlc0xvYWRlZEV2ZW50ID09PSBmYWxzZSkge1xuICAgICAgdGhpcy5fdHJpZ2dlck9uVGlsZXNMb2FkZWRFdmVudCA9IGZhbHNlO1xuICAgIH1cblxuICAgIEwuVGlsZUxheWVyLkNhbnZhcy5wcm90b3R5cGUucmVkcmF3LmNhbGwodGhpcyk7XG4gIH0sXG5cbiAgb25BZGQ6IGZ1bmN0aW9uKG1hcCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLm1hcCA9IG1hcDtcbiAgICBMLlRpbGVMYXllci5DYW52YXMucHJvdG90eXBlLm9uQWRkLmNhbGwodGhpcywgbWFwKTtcblxuICAgIHZhciBtYXBPbkNsaWNrQ2FsbGJhY2sgPSBmdW5jdGlvbihlKSB7XG4gICAgICBzZWxmLl9vbkNsaWNrKGUpO1xuICAgIH07XG5cbiAgICBtYXAub24oJ2NsaWNrJywgbWFwT25DbGlja0NhbGxiYWNrKTtcblxuICAgIG1hcC5vbihcImxheWVycmVtb3ZlXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIC8vIGNoZWNrIHRvIHNlZSBpZiB0aGUgbGF5ZXIgcmVtb3ZlZCBpcyB0aGlzIG9uZVxuICAgICAgLy8gY2FsbCBhIG1ldGhvZCB0byByZW1vdmUgdGhlIGNoaWxkIGxheWVycyAodGhlIG9uZXMgdGhhdCBhY3R1YWxseSBoYXZlIHNvbWV0aGluZyBkcmF3biBvbiB0aGVtKS5cbiAgICAgIGlmIChlLmxheWVyLl9sZWFmbGV0X2lkID09PSBzZWxmLl9sZWFmbGV0X2lkICYmIGUubGF5ZXIucmVtb3ZlQ2hpbGRMYXllcnMpIHtcbiAgICAgICAgZS5sYXllci5yZW1vdmVDaGlsZExheWVycyhtYXApO1xuICAgICAgICBtYXAub2ZmKCdjbGljaycsIG1hcE9uQ2xpY2tDYWxsYmFjayk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBzZWxmLmFkZENoaWxkTGF5ZXJzKG1hcCk7XG5cbiAgICBpZiAodHlwZW9mIER5bmFtaWNMYWJlbCA9PT0gJ2Z1bmN0aW9uJyApIHtcbiAgICAgIHRoaXMuZHluYW1pY0xhYmVsID0gbmV3IER5bmFtaWNMYWJlbChtYXAsIHRoaXMsIHt9KTtcbiAgICB9XG5cbiAgfSxcblxuICBkcmF3VGlsZTogZnVuY3Rpb24oY2FudmFzLCB0aWxlUG9pbnQsIHpvb20pIHtcbiAgICB2YXIgY3R4ID0ge1xuICAgICAgaWQ6IFt6b29tLCB0aWxlUG9pbnQueCwgdGlsZVBvaW50LnldLmpvaW4oXCI6XCIpLFxuICAgICAgY2FudmFzOiBjYW52YXMsXG4gICAgICB0aWxlOiB0aWxlUG9pbnQsXG4gICAgICB6b29tOiB6b29tLFxuICAgICAgdGlsZVNpemU6IHRoaXMub3B0aW9ucy50aWxlU2l6ZVxuICAgIH07XG5cbiAgICAvL0NhcHR1cmUgdGhlIG1heCBudW1iZXIgb2YgdGhlIHRpbGVzIHRvIGxvYWQgaGVyZS4gdGhpcy5fdGlsZXNUb1Byb2Nlc3MgaXMgYW4gaW50ZXJuYWwgbnVtYmVyIHdlIHVzZSB0byBrbm93IHdoZW4gd2UndmUgZmluaXNoZWQgcmVxdWVzdGluZyBQQkZzLlxuICAgIGlmKHRoaXMuX3RpbGVzVG9Qcm9jZXNzIDwgdGhpcy5fdGlsZXNUb0xvYWQpIHRoaXMuX3RpbGVzVG9Qcm9jZXNzID0gdGhpcy5fdGlsZXNUb0xvYWQ7XG5cbiAgICB2YXIgaWQgPSBjdHguaWQgPSBVdGlsLmdldENvbnRleHRJRChjdHgpO1xuICAgIHRoaXMuYWN0aXZlVGlsZXNbaWRdID0gY3R4O1xuXG4gICAgaWYoIXRoaXMucHJvY2Vzc2VkVGlsZXNbY3R4Lnpvb21dKSB0aGlzLnByb2Nlc3NlZFRpbGVzW2N0eC56b29tXSA9IHt9O1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWJ1Zykge1xuICAgICAgdGhpcy5fZHJhd0RlYnVnSW5mbyhjdHgpO1xuICAgIH1cbiAgICB0aGlzLl9kcmF3KGN0eCk7XG4gIH0sXG5cbiAgc2V0T3BhY2l0eTpmdW5jdGlvbihvcGFjaXR5KSB7XG4gICAgdGhpcy5fc2V0VmlzaWJsZUxheWVyc1N0eWxlKCdvcGFjaXR5JyxvcGFjaXR5KTtcbiAgfSxcblxuICBzZXRaSW5kZXg6ZnVuY3Rpb24oekluZGV4KSB7XG4gICAgdGhpcy5fc2V0VmlzaWJsZUxheWVyc1N0eWxlKCd6SW5kZXgnLHpJbmRleCk7XG4gIH0sXG5cbiAgX3NldFZpc2libGVMYXllcnNTdHlsZTpmdW5jdGlvbihzdHlsZSwgdmFsdWUpIHtcbiAgICBmb3IodmFyIGtleSBpbiB0aGlzLmxheWVycykge1xuICAgICAgdGhpcy5sYXllcnNba2V5XS5fdGlsZUNvbnRhaW5lci5zdHlsZVtzdHlsZV0gPSB2YWx1ZTtcbiAgICB9XG4gIH0sXG5cbiAgX2RyYXdEZWJ1Z0luZm86IGZ1bmN0aW9uKGN0eCkge1xuICAgIHZhciBtYXggPSB0aGlzLm9wdGlvbnMudGlsZVNpemU7XG4gICAgdmFyIGcgPSBjdHguY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgZy5zdHJva2VTdHlsZSA9ICcjMDAwMDAwJztcbiAgICBnLmZpbGxTdHlsZSA9ICcjRkZGRjAwJztcbiAgICBnLnN0cm9rZVJlY3QoMCwgMCwgbWF4LCBtYXgpO1xuICAgIGcuZm9udCA9IFwiMTJweCBBcmlhbFwiO1xuICAgIGcuZmlsbFJlY3QoMCwgMCwgNSwgNSk7XG4gICAgZy5maWxsUmVjdCgwLCBtYXggLSA1LCA1LCA1KTtcbiAgICBnLmZpbGxSZWN0KG1heCAtIDUsIDAsIDUsIDUpO1xuICAgIGcuZmlsbFJlY3QobWF4IC0gNSwgbWF4IC0gNSwgNSwgNSk7XG4gICAgZy5maWxsUmVjdChtYXggLyAyIC0gNSwgbWF4IC8gMiAtIDUsIDEwLCAxMCk7XG4gICAgZy5zdHJva2VUZXh0KGN0eC56b29tICsgJyAnICsgY3R4LnRpbGUueCArICcgJyArIGN0eC50aWxlLnksIG1heCAvIDIgLSAzMCwgbWF4IC8gMiAtIDEwKTtcbiAgfSxcblxuICBfZHJhdzogZnVuY3Rpb24oY3R4KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4vLyAgICAvL1RoaXMgd29ya3MgdG8gc2tpcCBmZXRjaGluZyBhbmQgcHJvY2Vzc2luZyB0aWxlcyBpZiB0aGV5J3ZlIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQuXG4vLyAgICB2YXIgdmVjdG9yVGlsZSA9IHRoaXMucHJvY2Vzc2VkVGlsZXNbY3R4Lnpvb21dW2N0eC5pZF07XG4vLyAgICAvL2lmIHdlJ3ZlIGFscmVhZHkgcGFyc2VkIGl0LCBkb24ndCBnZXQgaXQgYWdhaW4uXG4vLyAgICBpZih2ZWN0b3JUaWxlKXtcbi8vICAgICAgY29uc29sZS5sb2coXCJTa2lwcGluZyBmZXRjaGluZyBcIiArIGN0eC5pZCk7XG4vLyAgICAgIHNlbGYuY2hlY2tWZWN0b3JUaWxlTGF5ZXJzKHBhcnNlVlQodmVjdG9yVGlsZSksIGN0eCwgdHJ1ZSk7XG4vLyAgICAgIHNlbGYucmVkdWNlVGlsZXNUb1Byb2Nlc3NDb3VudCgpO1xuLy8gICAgICByZXR1cm47XG4vLyAgICB9XG5cbiAgICBpZiAoIXRoaXMuX3VybCkgcmV0dXJuO1xuICAgIHZhciBzcmMgPSB0aGlzLmdldFRpbGVVcmwoeyB4OiBjdHgudGlsZS54LCB5OiBjdHgudGlsZS55LCB6OiBjdHguem9vbSB9KTtcblxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoeGhyLnN0YXR1cyA9PSBcIjIwMFwiKSB7XG5cbiAgICAgICAgaWYoIXhoci5yZXNwb25zZSkgcmV0dXJuO1xuXG4gICAgICAgIHZhciBhcnJheUJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KHhoci5yZXNwb25zZSk7XG4gICAgICAgIHZhciBidWYgPSBuZXcgUHJvdG9idWYoYXJyYXlCdWZmZXIpO1xuICAgICAgICB2YXIgdnQgPSBuZXcgVmVjdG9yVGlsZShidWYpO1xuICAgICAgICAvL0NoZWNrIHRoZSBjdXJyZW50IG1hcCBsYXllciB6b29tLiAgSWYgZmFzdCB6b29taW5nIGlzIG9jY3VycmluZywgdGhlbiBzaG9ydCBjaXJjdWl0IHRpbGVzIHRoYXQgYXJlIGZvciBhIGRpZmZlcmVudCB6b29tIGxldmVsIHRoYW4gd2UncmUgY3VycmVudGx5IG9uLlxuICAgICAgICBpZihzZWxmLm1hcCAmJiBzZWxmLm1hcC5nZXRab29tKCkgIT0gY3R4Lnpvb20pIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkZldGNoZWQgdGlsZSBmb3Igem9vbSBsZXZlbCBcIiArIGN0eC56b29tICsgXCIuIE1hcCBpcyBhdCB6b29tIGxldmVsIFwiICsgc2VsZi5fbWFwLmdldFpvb20oKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHNlbGYuY2hlY2tWZWN0b3JUaWxlTGF5ZXJzKHBhcnNlVlQodnQpLCBjdHgpO1xuICAgICAgICB0aWxlTG9hZGVkKHNlbGYsIGN0eCk7XG4gICAgICB9XG5cbiAgICAgIC8vZWl0aGVyIHdheSwgcmVkdWNlIHRoZSBjb3VudCBvZiB0aWxlc1RvUHJvY2VzcyB0aWxlcyBoZXJlXG4gICAgICBzZWxmLnJlZHVjZVRpbGVzVG9Qcm9jZXNzQ291bnQoKTtcbiAgICB9O1xuXG4gICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwieGhyIGVycm9yOiBcIiArIHhoci5zdGF0dXMpXG4gICAgfTtcblxuICAgIHhoci5vcGVuKCdHRVQnLCBzcmMsIHRydWUpOyAvL2FzeW5jIGlzIHRydWVcbiAgICB2YXIgaGVhZGVycyA9IHNlbGYub3B0aW9ucy54aHJIZWFkZXJzO1xuICAgIGZvciAodmFyIGhlYWRlciBpbiBoZWFkZXJzKSB7XG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXIsIGhlYWRlcnNbaGVhZGVyXSlcbiAgICB9XG4gICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgeGhyLnNlbmQoKTtcbiAgfSxcblxuICByZWR1Y2VUaWxlc1RvUHJvY2Vzc0NvdW50OiBmdW5jdGlvbigpe1xuICAgIHRoaXMuX3RpbGVzVG9Qcm9jZXNzLS07XG4gICAgaWYoIXRoaXMuX3RpbGVzVG9Qcm9jZXNzKXtcbiAgICAgIC8vVHJpZ2dlciBldmVudCBsZXR0aW5nIHVzIGtub3cgdGhhdCBhbGwgUEJGcyBoYXZlIGJlZW4gbG9hZGVkIGFuZCBwcm9jZXNzZWQgKG9yIDQwNCdkKS5cbiAgICAgIGlmKHRoaXMuX2V2ZW50SGFuZGxlcnNbXCJQQkZMb2FkXCJdKSB0aGlzLl9ldmVudEhhbmRsZXJzW1wiUEJGTG9hZFwiXSgpO1xuICAgICAgdGhpcy5fcGJmTG9hZGVkKCk7XG4gICAgfVxuICB9LFxuXG4gIGNoZWNrVmVjdG9yVGlsZUxheWVyczogZnVuY3Rpb24odnQsIGN0eCwgcGFyc2VkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy9DaGVjayBpZiB0aGVyZSBhcmUgc3BlY2lmaWVkIHZpc2libGUgbGF5ZXJzXG4gICAgaWYoc2VsZi5vcHRpb25zLnZpc2libGVMYXllcnMgJiYgc2VsZi5vcHRpb25zLnZpc2libGVMYXllcnMubGVuZ3RoID4gMCl7XG4gICAgICAvL29ubHkgbGV0IHRocnUgdGhlIGxheWVycyBsaXN0ZWQgaW4gdGhlIHZpc2libGVMYXllcnMgYXJyYXlcbiAgICAgIGZvcih2YXIgaT0wOyBpIDwgc2VsZi5vcHRpb25zLnZpc2libGVMYXllcnMubGVuZ3RoOyBpKyspe1xuICAgICAgICB2YXIgbGF5ZXJOYW1lID0gc2VsZi5vcHRpb25zLnZpc2libGVMYXllcnNbaV07XG4gICAgICAgIGlmKHZ0LmxheWVyc1tsYXllck5hbWVdKXtcbiAgICAgICAgICAgLy9Qcm9jZWVkIHdpdGggcGFyc2luZ1xuICAgICAgICAgIHNlbGYucHJlcGFyZU1WVExheWVycyh2dC5sYXllcnNbbGF5ZXJOYW1lXSwgbGF5ZXJOYW1lLCBjdHgsIHBhcnNlZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9ZWxzZXtcbiAgICAgIC8vUGFyc2UgYWxsIHZ0LmxheWVyc1xuICAgICAgZm9yICh2YXIga2V5IGluIHZ0LmxheWVycykge1xuICAgICAgICBzZWxmLnByZXBhcmVNVlRMYXllcnModnQubGF5ZXJzW2tleV0sIGtleSwgY3R4LCBwYXJzZWQpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBwcmVwYXJlTVZUTGF5ZXJzOiBmdW5jdGlvbihseXIgLGtleSwgY3R4LCBwYXJzZWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoIXNlbGYubGF5ZXJzW2tleV0pIHtcbiAgICAgIC8vQ3JlYXRlIE1WVExheWVyIG9yIE1WVFBvaW50TGF5ZXIgZm9yIHVzZXJcbiAgICAgIHNlbGYubGF5ZXJzW2tleV0gPSBzZWxmLmNyZWF0ZU1WVExheWVyKGtleSwgbHlyLnBhcnNlZEZlYXR1cmVzWzBdLnR5cGUgfHwgbnVsbCk7XG4gICAgfVxuXG4gICAgaWYgKHBhcnNlZCkge1xuICAgICAgLy9XZSd2ZSBhbHJlYWR5IHBhcnNlZCBpdC4gIEdvIGdldCBjYW52YXMgYW5kIGRyYXcuXG4gICAgICBzZWxmLmxheWVyc1trZXldLmdldENhbnZhcyhjdHgsIGx5cik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYubGF5ZXJzW2tleV0ucGFyc2VWZWN0b3JUaWxlTGF5ZXIobHlyLCBjdHgpO1xuICAgIH1cblxuICB9LFxuXG4gIGNyZWF0ZU1WVExheWVyOiBmdW5jdGlvbihrZXksIHR5cGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgZ2V0SURGb3JMYXllckZlYXR1cmU7XG4gICAgaWYgKHR5cGVvZiBzZWxmLm9wdGlvbnMuZ2V0SURGb3JMYXllckZlYXR1cmUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGdldElERm9yTGF5ZXJGZWF0dXJlID0gc2VsZi5vcHRpb25zLmdldElERm9yTGF5ZXJGZWF0dXJlO1xuICAgIH0gZWxzZSB7XG4gICAgICBnZXRJREZvckxheWVyRmVhdHVyZSA9IFV0aWwuZ2V0SURGb3JMYXllckZlYXR1cmU7XG4gICAgfVxuXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICBnZXRJREZvckxheWVyRmVhdHVyZTogZ2V0SURGb3JMYXllckZlYXR1cmUsXG4gICAgICBmaWx0ZXI6IHNlbGYub3B0aW9ucy5maWx0ZXIsXG4gICAgICBsYXllck9yZGVyaW5nOiBzZWxmLm9wdGlvbnMubGF5ZXJPcmRlcmluZyxcbiAgICAgIHN0eWxlOiBzZWxmLnN0eWxlLFxuICAgICAgbmFtZToga2V5LFxuICAgICAgYXN5bmNoOiB0cnVlLFxuICAgICAgbWluWm9vbTogc2VsZi5vcHRpb25zLm1pblpvb20sXG4gICAgICBtYXhab29tOiBzZWxmLm9wdGlvbnMubWF4Wm9vbVxuICAgIH07XG5cbiAgICBpZiAoc2VsZi5vcHRpb25zLnpJbmRleCkge1xuICAgICAgb3B0aW9ucy56SW5kZXggPSBzZWxmLnpJbmRleDtcbiAgICB9XG5cbiAgICAvL1Rha2UgdGhlIGxheWVyIGFuZCBjcmVhdGUgYSBuZXcgTVZUTGF5ZXIgb3IgTVZUUG9pbnRMYXllciBpZiBvbmUgZG9lc24ndCBleGlzdC5cbiAgICB2YXIgbGF5ZXIgPSBuZXcgTVZUTGF5ZXIoc2VsZiwgb3B0aW9ucykuYWRkVG8oc2VsZi5tYXApO1xuXG4gICAgcmV0dXJuIGxheWVyO1xuICB9LFxuXG4gIGdldExheWVyczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubGF5ZXJzO1xuICB9LFxuXG4gIGhpZGVMYXllcjogZnVuY3Rpb24oaWQpIHtcbiAgICBpZiAodGhpcy5sYXllcnNbaWRdKSB7XG4gICAgICB0aGlzLl9tYXAucmVtb3ZlTGF5ZXIodGhpcy5sYXllcnNbaWRdKTtcbiAgICAgIGlmKHRoaXMub3B0aW9ucy52aXNpYmxlTGF5ZXJzLmluZGV4T2YoXCJpZFwiKSA+IC0xKXtcbiAgICAgICAgdGhpcy52aXNpYmxlTGF5ZXJzLnNwbGljZSh0aGlzLm9wdGlvbnMudmlzaWJsZUxheWVycy5pbmRleE9mKFwiaWRcIiksIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBzaG93TGF5ZXI6IGZ1bmN0aW9uKGlkKSB7XG4gICAgaWYgKHRoaXMubGF5ZXJzW2lkXSkge1xuICAgICAgdGhpcy5fbWFwLmFkZExheWVyKHRoaXMubGF5ZXJzW2lkXSk7XG4gICAgICBpZih0aGlzLm9wdGlvbnMudmlzaWJsZUxheWVycy5pbmRleE9mKFwiaWRcIikgPT0gLTEpe1xuICAgICAgICB0aGlzLnZpc2libGVMYXllcnMucHVzaChpZCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vTWFrZSBzdXJlIG1hbmFnZXIgbGF5ZXIgaXMgYWx3YXlzIGluIGZyb250XG4gICAgdGhpcy5icmluZ1RvRnJvbnQoKTtcbiAgfSxcblxuICByZW1vdmVDaGlsZExheWVyczogZnVuY3Rpb24obWFwKXtcbiAgICAvL1JlbW92ZSBjaGlsZCBsYXllcnMgb2YgdGhpcyBncm91cCBsYXllclxuICAgIGZvciAodmFyIGtleSBpbiB0aGlzLmxheWVycykge1xuICAgICAgdmFyIGxheWVyID0gdGhpcy5sYXllcnNba2V5XTtcbiAgICAgIG1hcC5yZW1vdmVMYXllcihsYXllcik7XG4gICAgfVxuICB9LFxuXG4gIGFkZENoaWxkTGF5ZXJzOiBmdW5jdGlvbihtYXApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYoc2VsZi5vcHRpb25zLnZpc2libGVMYXllcnMubGVuZ3RoID4gMCl7XG4gICAgICAvL29ubHkgbGV0IHRocnUgdGhlIGxheWVycyBsaXN0ZWQgaW4gdGhlIHZpc2libGVMYXllcnMgYXJyYXlcbiAgICAgIGZvcih2YXIgaT0wOyBpIDwgc2VsZi5vcHRpb25zLnZpc2libGVMYXllcnMubGVuZ3RoOyBpKyspe1xuICAgICAgICB2YXIgbGF5ZXJOYW1lID0gc2VsZi5vcHRpb25zLnZpc2libGVMYXllcnNbaV07XG4gICAgICAgIHZhciBsYXllciA9IHRoaXMubGF5ZXJzW2xheWVyTmFtZV07XG4gICAgICAgIGlmKGxheWVyKXtcbiAgICAgICAgICAvL1Byb2NlZWQgd2l0aCBwYXJzaW5nXG4gICAgICAgICAgbWFwLmFkZExheWVyKGxheWVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgLy9BZGQgYWxsIGxheWVyc1xuICAgICAgZm9yICh2YXIga2V5IGluIHRoaXMubGF5ZXJzKSB7XG4gICAgICAgIHZhciBsYXllciA9IHRoaXMubGF5ZXJzW2tleV07XG4gICAgICAgIC8vIGxheWVyIGlzIHNldCB0byB2aXNpYmxlIGFuZCBpcyBub3QgYWxyZWFkeSBvbiBtYXBcbiAgICAgICAgaWYgKCFsYXllci5fbWFwKSB7XG4gICAgICAgICAgbWFwLmFkZExheWVyKGxheWVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBiaW5kOiBmdW5jdGlvbihldmVudFR5cGUsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fZXZlbnRIYW5kbGVyc1tldmVudFR5cGVdID0gY2FsbGJhY2s7XG4gIH0sXG5cbiAgX29uQ2xpY2s6IGZ1bmN0aW9uKGV2dCkge1xuICAgIC8vSGVyZSwgcGFzcyB0aGUgZXZlbnQgb24gdG8gdGhlIGNoaWxkIE1WVExheWVyIGFuZCBoYXZlIGl0IGRvIHRoZSBoaXQgdGVzdCBhbmQgaGFuZGxlIHRoZSByZXN1bHQuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBvbkNsaWNrID0gc2VsZi5vcHRpb25zLm9uQ2xpY2s7XG4gICAgdmFyIGNsaWNrYWJsZUxheWVycyA9IHNlbGYub3B0aW9ucy5jbGlja2FibGVMYXllcnM7XG4gICAgdmFyIGxheWVycyA9IHNlbGYubGF5ZXJzO1xuXG4gICAgZXZ0LnRpbGVJRCA9ICBnZXRUaWxlVVJMKGV2dC5sYXRsbmcubGF0LCBldnQubGF0bG5nLmxuZywgdGhpcy5tYXAuZ2V0Wm9vbSgpKTtcblxuICAgIC8vIFdlIG11c3QgaGF2ZSBhbiBhcnJheSBvZiBjbGlja2FibGUgbGF5ZXJzLCBvdGhlcndpc2UsIHdlIGp1c3QgcGFzc1xuICAgIC8vIHRoZSBldmVudCB0byB0aGUgcHVibGljIG9uQ2xpY2sgY2FsbGJhY2sgaW4gb3B0aW9ucy5cblxuICAgIGlmKCFjbGlja2FibGVMYXllcnMpe1xuICAgICAgY2xpY2thYmxlTGF5ZXJzID0gT2JqZWN0LmtleXMoc2VsZi5sYXllcnMpO1xuICAgIH1cblxuICAgIGlmIChjbGlja2FibGVMYXllcnMgJiYgY2xpY2thYmxlTGF5ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjbGlja2FibGVMYXllcnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGtleSA9IGNsaWNrYWJsZUxheWVyc1tpXTtcbiAgICAgICAgdmFyIGxheWVyID0gbGF5ZXJzW2tleV07XG4gICAgICAgIGlmIChsYXllcikge1xuICAgICAgICAgIGxheWVyLmhhbmRsZUNsaWNrRXZlbnQoZXZ0LCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb25DbGljayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICBvbkNsaWNrKGV2dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBvbkNsaWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9uQ2xpY2soZXZ0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgfSxcblxuICBzZXRGaWx0ZXI6IGZ1bmN0aW9uKGZpbHRlckZ1bmN0aW9uLCBsYXllck5hbWUpIHtcbiAgICAvL3Rha2UgaW4gYSBuZXcgZmlsdGVyIGZ1bmN0aW9uLlxuICAgIC8vUHJvcGFnYXRlIHRvIGNoaWxkIGxheWVycy5cblxuICAgIC8vQWRkIGZpbHRlciB0byBhbGwgY2hpbGQgbGF5ZXJzIGlmIG5vIGxheWVyIGlzIHNwZWNpZmllZC5cbiAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5sYXllcnMpIHtcbiAgICAgIHZhciBsYXllciA9IHRoaXMubGF5ZXJzW2tleV07XG5cbiAgICAgIGlmIChsYXllck5hbWUpe1xuICAgICAgICBpZihrZXkudG9Mb3dlckNhc2UoKSA9PSBsYXllck5hbWUudG9Mb3dlckNhc2UoKSl7XG4gICAgICAgICAgbGF5ZXIub3B0aW9ucy5maWx0ZXIgPSBmaWx0ZXJGdW5jdGlvbjsgLy9Bc3NpZ24gZmlsdGVyIHRvIGNoaWxkIGxheWVyLCBvbmx5IGlmIG5hbWUgbWF0Y2hlc1xuICAgICAgICAgIC8vQWZ0ZXIgZmlsdGVyIGlzIHNldCwgdGhlIG9sZCBmZWF0dXJlIGhhc2hlcyBhcmUgaW52YWxpZC4gIENsZWFyIHRoZW0gZm9yIG5leHQgZHJhdy5cbiAgICAgICAgICBsYXllci5jbGVhckxheWVyRmVhdHVyZUhhc2goKTtcbiAgICAgICAgICAvL2xheWVyLmNsZWFyVGlsZUZlYXR1cmVIYXNoKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2V7XG4gICAgICAgIGxheWVyLm9wdGlvbnMuZmlsdGVyID0gZmlsdGVyRnVuY3Rpb247IC8vQXNzaWduIGZpbHRlciB0byBjaGlsZCBsYXllclxuICAgICAgICAvL0FmdGVyIGZpbHRlciBpcyBzZXQsIHRoZSBvbGQgZmVhdHVyZSBoYXNoZXMgYXJlIGludmFsaWQuICBDbGVhciB0aGVtIGZvciBuZXh0IGRyYXcuXG4gICAgICAgIGxheWVyLmNsZWFyTGF5ZXJGZWF0dXJlSGFzaCgpO1xuICAgICAgICAvL2xheWVyLmNsZWFyVGlsZUZlYXR1cmVIYXNoKCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBUYWtlIGluIGEgbmV3IHN0eWxlIGZ1bmN0aW9uIGFuZCBwcm9wb2dhdGUgdG8gY2hpbGQgbGF5ZXJzLlxuICAgKiBJZiB5b3UgZG8gbm90IHNldCBhIGxheWVyIG5hbWUsIGl0IHJlc2V0cyB0aGUgc3R5bGUgZm9yIGFsbCBvZiB0aGUgbGF5ZXJzLlxuICAgKiBAcGFyYW0gc3R5bGVGdW5jdGlvblxuICAgKiBAcGFyYW0gbGF5ZXJOYW1lXG4gICAqL1xuICBzZXRTdHlsZTogZnVuY3Rpb24oc3R5bGVGbiwgbGF5ZXJOYW1lKSB7XG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMubGF5ZXJzKSB7XG4gICAgICB2YXIgbGF5ZXIgPSB0aGlzLmxheWVyc1trZXldO1xuICAgICAgaWYgKGxheWVyTmFtZSkge1xuICAgICAgICBpZihrZXkudG9Mb3dlckNhc2UoKSA9PSBsYXllck5hbWUudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgIGxheWVyLnNldFN0eWxlKHN0eWxlRm4pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYXllci5zZXRTdHlsZShzdHlsZUZuKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZmVhdHVyZVNlbGVjdGVkOiBmdW5jdGlvbihtdnRGZWF0dXJlKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5tdXRleFRvZ2dsZSkge1xuICAgICAgaWYgKHRoaXMuX3NlbGVjdGVkRmVhdHVyZSkge1xuICAgICAgICB0aGlzLl9zZWxlY3RlZEZlYXR1cmUuZGVzZWxlY3QoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3NlbGVjdGVkRmVhdHVyZSA9IG12dEZlYXR1cmU7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMub25TZWxlY3QpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5vblNlbGVjdChtdnRGZWF0dXJlKTtcbiAgICB9XG4gIH0sXG5cbiAgZmVhdHVyZURlc2VsZWN0ZWQ6IGZ1bmN0aW9uKG12dEZlYXR1cmUpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLm11dGV4VG9nZ2xlICYmIHRoaXMuX3NlbGVjdGVkRmVhdHVyZSkge1xuICAgICAgdGhpcy5fc2VsZWN0ZWRGZWF0dXJlID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vbkRlc2VsZWN0KSB7XG4gICAgICB0aGlzLm9wdGlvbnMub25EZXNlbGVjdChtdnRGZWF0dXJlKTtcbiAgICB9XG4gIH0sXG5cbiAgX3BiZkxvYWRlZDogZnVuY3Rpb24oKSB7XG4gICAgLy9GaXJlcyB3aGVuIGFsbCB0aWxlcyBmcm9tIHRoaXMgbGF5ZXIgaGF2ZSBiZWVuIGxvYWRlZCBhbmQgZHJhd24gKG9yIDQwNCdkKS5cblxuICAgIC8vTWFrZSBzdXJlIG1hbmFnZXIgbGF5ZXIgaXMgYWx3YXlzIGluIGZyb250XG4gICAgdGhpcy5icmluZ1RvRnJvbnQoKTtcblxuICAgIC8vU2VlIGlmIHRoZXJlIGlzIGFuIGV2ZW50IHRvIGV4ZWN1dGVcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG9uVGlsZXNMb2FkZWQgPSBzZWxmLm9wdGlvbnMub25UaWxlc0xvYWRlZDtcblxuICAgIGlmIChvblRpbGVzTG9hZGVkICYmIHR5cGVvZiBvblRpbGVzTG9hZGVkID09PSAnZnVuY3Rpb24nICYmIHRoaXMuX3RyaWdnZXJPblRpbGVzTG9hZGVkRXZlbnQgPT09IHRydWUpIHtcbiAgICAgIG9uVGlsZXNMb2FkZWQodGhpcyk7XG4gICAgfVxuICAgIHNlbGYuX3RyaWdnZXJPblRpbGVzTG9hZGVkRXZlbnQgPSB0cnVlOyAvL3Jlc2V0IC0gaWYgcmVkcmF3KCkgaXMgY2FsbGVkIHdpdGggdGhlIG9wdGluYWwgJ2ZhbHNlJyBwYXJhbWV0ZXIgdG8gdGVtcG9yYXJpbHkgZGlzYWJsZSB0aGUgb25UaWxlc0xvYWRlZCBldmVudCBmcm9tIGZpcmluZy4gIFRoaXMgcmVzZXRzIGl0IGJhY2sgdG8gdHJ1ZSBhZnRlciBhIHNpbmdsZSB0aW1lIG9mIGZpcmluZyBhcyAnZmFsc2UnLlxuICB9XG5cbn0pO1xuXG5cbmlmICh0eXBlb2YoTnVtYmVyLnByb3RvdHlwZS50b1JhZCkgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgTnVtYmVyLnByb3RvdHlwZS50b1JhZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzICogTWF0aC5QSSAvIDE4MDtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRUaWxlVVJMKGxhdCwgbG9uLCB6b29tKSB7XG4gIHZhciB4dGlsZSA9IHBhcnNlSW50KE1hdGguZmxvb3IoIChsb24gKyAxODApIC8gMzYwICogKDE8PHpvb20pICkpO1xuICB2YXIgeXRpbGUgPSBwYXJzZUludChNYXRoLmZsb29yKCAoMSAtIE1hdGgubG9nKE1hdGgudGFuKGxhdC50b1JhZCgpKSArIDEgLyBNYXRoLmNvcyhsYXQudG9SYWQoKSkpIC8gTWF0aC5QSSkgLyAyICogKDE8PHpvb20pICkpO1xuICByZXR1cm4gXCJcIiArIHpvb20gKyBcIjpcIiArIHh0aWxlICsgXCI6XCIgKyB5dGlsZTtcbn1cblxuZnVuY3Rpb24gdGlsZUxvYWRlZChwYmZTb3VyY2UsIGN0eCkge1xuICBwYmZTb3VyY2UubG9hZGVkVGlsZXNbY3R4LmlkXSA9IGN0eDtcbn1cblxuZnVuY3Rpb24gcGFyc2VWVCh2dCl7XG4gIGZvciAodmFyIGtleSBpbiB2dC5sYXllcnMpIHtcbiAgICB2YXIgbHlyID0gdnQubGF5ZXJzW2tleV07XG4gICAgcGFyc2VWVEZlYXR1cmVzKGx5cik7XG4gIH1cbiAgcmV0dXJuIHZ0O1xufVxuXG5mdW5jdGlvbiBwYXJzZVZURmVhdHVyZXModnRsKXtcbiAgdnRsLnBhcnNlZEZlYXR1cmVzID0gW107XG4gIHZhciBmZWF0dXJlcyA9IHZ0bC5fZmVhdHVyZXM7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBmZWF0dXJlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIHZhciB2dGYgPSB2dGwuZmVhdHVyZShpKTtcbiAgICB2dGYuY29vcmRpbmF0ZXMgPSB2dGYubG9hZEdlb21ldHJ5KCk7XG4gICAgdnRsLnBhcnNlZEZlYXR1cmVzLnB1c2godnRmKTtcbiAgfVxuICByZXR1cm4gdnRsO1xufVxuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IE5pY2hvbGFzIEhhbGxhaGFuIDxuaGFsbGFoYW5Ac3BhdGlhbGRldi5jb20+XG4gKiAgICAgICBvbiA4LzE1LzE0LlxuICovXG52YXIgVXRpbCA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cblV0aWwuZ2V0Q29udGV4dElEID0gZnVuY3Rpb24oY3R4KSB7XG4gIHJldHVybiBbY3R4Lnpvb20sIGN0eC50aWxlLngsIGN0eC50aWxlLnldLmpvaW4oXCI6XCIpO1xufTtcblxuLyoqXG4gKiBEZWZhdWx0IGZ1bmN0aW9uIHRoYXQgZ2V0cyB0aGUgaWQgZm9yIGEgbGF5ZXIgZmVhdHVyZS5cbiAqIFNvbWV0aW1lcyB0aGlzIG5lZWRzIHRvIGJlIGRvbmUgaW4gYSBkaWZmZXJlbnQgd2F5IGFuZFxuICogY2FuIGJlIHNwZWNpZmllZCBieSB0aGUgdXNlciBpbiB0aGUgb3B0aW9ucyBmb3IgTC5UaWxlTGF5ZXIuTVZUU291cmNlLlxuICpcbiAqIEBwYXJhbSBmZWF0dXJlXG4gKiBAcmV0dXJucyB7Y3R4LmlkfCp8aWR8c3RyaW5nfGpzdHMuaW5kZXguY2hhaW4uTW9ub3RvbmVDaGFpbi5pZHxudW1iZXJ9XG4gKi9cblV0aWwuZ2V0SURGb3JMYXllckZlYXR1cmUgPSBmdW5jdGlvbihmZWF0dXJlKSB7XG4gIHJldHVybiBmZWF0dXJlLnByb3BlcnRpZXMuaWQ7XG59O1xuXG5VdGlsLmdldEpTT04gPSBmdW5jdGlvbih1cmwsIGNhbGxiYWNrKSB7XG4gIHZhciB4bWxodHRwID0gdHlwZW9mIFhNTEh0dHBSZXF1ZXN0ICE9PSAndW5kZWZpbmVkJyA/IG5ldyBYTUxIdHRwUmVxdWVzdCgpIDogbmV3IEFjdGl2ZVhPYmplY3QoJ01pY3Jvc29mdC5YTUxIVFRQJyk7XG4gIHhtbGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN0YXR1cyA9IHhtbGh0dHAuc3RhdHVzO1xuICAgIGlmICh4bWxodHRwLnJlYWR5U3RhdGUgPT09IDQgJiYgc3RhdHVzID49IDIwMCAmJiBzdGF0dXMgPCAzMDApIHtcbiAgICAgIHZhciBqc29uID0gSlNPTi5wYXJzZSh4bWxodHRwLnJlc3BvbnNlVGV4dCk7XG4gICAgICBjYWxsYmFjayhudWxsLCBqc29uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2soIHsgZXJyb3I6IHRydWUsIHN0YXR1czogc3RhdHVzIH0gKTtcbiAgICB9XG4gIH07XG4gIHhtbGh0dHAub3BlbihcIkdFVFwiLCB1cmwsIHRydWUpO1xuICB4bWxodHRwLnNlbmQoKTtcbn07XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgTmljaG9sYXMgSGFsbGFoYW4gPG5oYWxsYWhhbkBzcGF0aWFsZGV2LmNvbT5cbiAqICAgICAgIG9uIDcvMzEvMTQuXG4gKi9cbnZhciBVdGlsID0gcmVxdWlyZSgnLi4vTVZUVXRpbCcpO1xubW9kdWxlLmV4cG9ydHMgPSBTdGF0aWNMYWJlbDtcblxuZnVuY3Rpb24gU3RhdGljTGFiZWwobXZ0RmVhdHVyZSwgY3R4LCBsYXRMbmcsIHN0eWxlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5tdnRGZWF0dXJlID0gbXZ0RmVhdHVyZTtcbiAgdGhpcy5tYXAgPSBtdnRGZWF0dXJlLm1hcDtcbiAgdGhpcy56b29tID0gY3R4Lnpvb207XG4gIHRoaXMubGF0TG5nID0gbGF0TG5nO1xuICB0aGlzLnNlbGVjdGVkID0gZmFsc2U7XG5cbiAgaWYgKG12dEZlYXR1cmUubGlua2VkRmVhdHVyZSkge1xuICAgIHZhciBsaW5rZWRGZWF0dXJlID0gbXZ0RmVhdHVyZS5saW5rZWRGZWF0dXJlKCk7XG4gICAgaWYgKGxpbmtlZEZlYXR1cmUgJiYgbGlua2VkRmVhdHVyZS5zZWxlY3RlZCkge1xuICAgICAgc2VsZi5zZWxlY3RlZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgaW5pdChzZWxmLCBtdnRGZWF0dXJlLCBjdHgsIGxhdExuZywgc3R5bGUpXG59XG5cbmZ1bmN0aW9uIGluaXQoc2VsZiwgbXZ0RmVhdHVyZSwgY3R4LCBsYXRMbmcsIHN0eWxlKSB7XG4gIHZhciBhamF4RGF0YSA9IG12dEZlYXR1cmUuYWpheERhdGE7XG4gIHZhciBzdHkgPSBzZWxmLnN0eWxlID0gc3R5bGUuc3RhdGljTGFiZWwobXZ0RmVhdHVyZSwgYWpheERhdGEpO1xuICB2YXIgaWNvbiA9IHNlbGYuaWNvbiA9IEwuZGl2SWNvbih7XG4gICAgY2xhc3NOYW1lOiBzdHkuY3NzQ2xhc3MgfHwgJ2xhYmVsLWljb24tdGV4dCcsXG4gICAgaHRtbDogc3R5Lmh0bWwsXG4gICAgaWNvblNpemU6IHN0eS5pY29uU2l6ZSB8fCBbNTAsNTBdXG4gIH0pO1xuXG4gIHNlbGYubWFya2VyID0gTC5tYXJrZXIobGF0TG5nLCB7aWNvbjogaWNvbn0pLmFkZFRvKHNlbGYubWFwKTtcblxuICBpZiAoc2VsZi5zZWxlY3RlZCkge1xuICAgIHNlbGYubWFya2VyLl9pY29uLmNsYXNzTGlzdC5hZGQoc2VsZi5zdHlsZS5jc3NTZWxlY3RlZENsYXNzIHx8ICdsYWJlbC1pY29uLXRleHQtc2VsZWN0ZWQnKTtcbiAgfVxuXG4gIHNlbGYubWFya2VyLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICBzZWxmLnRvZ2dsZSgpO1xuICB9KTtcblxuICBzZWxmLm1hcC5vbignem9vbWVuZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgbmV3Wm9vbSA9IGUudGFyZ2V0LmdldFpvb20oKTtcbiAgICBpZiAoc2VsZi56b29tICE9PSBuZXdab29tKSB7XG4gICAgICBzZWxmLm1hcC5yZW1vdmVMYXllcihzZWxmLm1hcmtlcik7XG4gICAgfVxuICB9KTtcbn1cblxuXG5TdGF0aWNMYWJlbC5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLnNlbGVjdGVkKSB7XG4gICAgdGhpcy5kZXNlbGVjdCgpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuc2VsZWN0KCk7XG4gIH1cbn07XG5cblN0YXRpY0xhYmVsLnByb3RvdHlwZS5zZWxlY3QgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5zZWxlY3RlZCA9IHRydWU7XG4gIHRoaXMubWFya2VyLl9pY29uLmNsYXNzTGlzdC5hZGQodGhpcy5zdHlsZS5jc3NTZWxlY3RlZENsYXNzIHx8ICdsYWJlbC1pY29uLXRleHQtc2VsZWN0ZWQnKTtcbiAgdmFyIGxpbmtlZEZlYXR1cmUgPSB0aGlzLm12dEZlYXR1cmUubGlua2VkRmVhdHVyZSgpO1xuICBpZiAoIWxpbmtlZEZlYXR1cmUuc2VsZWN0ZWQpIGxpbmtlZEZlYXR1cmUuc2VsZWN0KCk7XG59O1xuXG5TdGF0aWNMYWJlbC5wcm90b3R5cGUuZGVzZWxlY3QgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5zZWxlY3RlZCA9IGZhbHNlO1xuICB0aGlzLm1hcmtlci5faWNvbi5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuc3R5bGUuY3NzU2VsZWN0ZWRDbGFzcyB8fCAnbGFiZWwtaWNvbi10ZXh0LXNlbGVjdGVkJyk7XG4gIHZhciBsaW5rZWRGZWF0dXJlID0gdGhpcy5tdnRGZWF0dXJlLmxpbmtlZEZlYXR1cmUoKTtcbiAgaWYgKGxpbmtlZEZlYXR1cmUuc2VsZWN0ZWQpIGxpbmtlZEZlYXR1cmUuZGVzZWxlY3QoKTtcbn07XG5cblN0YXRpY0xhYmVsLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLm1hcCB8fCAhdGhpcy5tYXJrZXIpIHJldHVybjtcbiAgdGhpcy5tYXAucmVtb3ZlTGF5ZXIodGhpcy5tYXJrZXIpO1xufTtcbiIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBTcGF0aWFsIERldmVsb3BtZW50IEludGVybmF0aW9uYWxcbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogU291cmNlIGNvZGUgY2FuIGJlIGZvdW5kIGF0OlxuICogaHR0cHM6Ly9naXRodWIuY29tL1NwYXRpYWxTZXJ2ZXIvTGVhZmxldC5NYXBib3hWZWN0b3JUaWxlXG4gKlxuICogQGxpY2Vuc2UgSVNDXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL01WVFNvdXJjZScpO1xuIl19
