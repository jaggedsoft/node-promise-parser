var URL         = require('url');
var needle	= require('/usr/lib/node_modules/needle');
var libxml	= require('libxmljs');
var util        = require('util');
var css2xpath   = require('./lib/css2xpath.js');

libxml.Document.prototype.findXPath = libxml.Document.prototype.find;
libxml.Element.prototype.findXPath = libxml.Element.prototype.find;

libxml.Document.prototype.find,
libxml.Element.prototype.find = function(sel, from_root) {
    if (sel.charAt(0) !== '/') {
        sel = sel.replace('@', '/@')
        sel = css2xpath('//'+sel);
        if (!from_root)
            sel = this.path()+sel;
    }
    return this.findXPath(sel)||[];
}


libxml.Element.prototype.content = function() {
    if (this.text !== undefined)
        return this.text().trim();
    else if (this.value !== undefined)
        return this.value().trim();
    return undefined;
}

var default_opts = {
    http: {
        decode: true,
        follow: true,
        compressed: true,
        timeout: 30 * 1000,
        user_agent: 'Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
        concurrency: 5,
        tries: 3
    }
}

needle.defaults(default_opts.http);

var Parser = function(opts) {
    opts = opts||{};
    this.lastStack = 0;
    this.stack = 0;
    this.opts = extend(opts, default_opts, false);
    this.opts.http = extend(opts.http, default_opts.http, false);
    this.requestCount = 0;
    this.requests = 0;
    this.queue = {
        length:0,
    };
    return;
}

Parser.prototype.parse = function(data) {
    if (data.substr(0,2) === '<?')
        return libxml.parseXml(data);
    else
        return libxml.parseHtml(data);
}

Parser.prototype.get = function(depth, url, data, cb) {
    if (cb === undefined)
        cb = data;
    this.request(depth, 'get', url, data, cb);
}

Parser.prototype.post = function(depth, url, data, cb) {
    if (cb === undefined)
        cb = data;
    this.request(depth, 'post', url, data, cb);
}

Parser.prototype.request = function(depth, method, url, data, cb) {
    this.stack++;
    this.queue[depth||0].push([0, method, url, data, cb]);
    this.requestQueue();
}

Parser.prototype.requestQueue = function() {
    var self = this;
    if (this.requests < this.opts.http.concurrency) {
        var arr = this.nextQueue();
        if (arr === false)
            return;
        var tries = arr.shift()+1;
        var method = arr.shift();
        var url = arr.shift();
        //if (this.queue.length > 0)
        //    url = URL.resolve(this.queue[this.queue.length-1], url);
        var data = arr.shift();
        var cb = arr.shift();
        self.requests++;
        self.requestCount++;
        needle.request(method, url, data, function(err, res, data) {
            try {
                if (err !== null)
                    throw(err);
                self.requests--;
                var document = null;
                if (res.headers['content-type'].indexOf('xml') !== -1)
                    document = libxml.parseXml(data);
                else
                    document = libxml.parseHtml(data);
                document.data = { url: url };
                cb(null, document);
            }catch(err) {
                if (tries < self.opts.http.tries) {
                    self.queue[self.queue.length-1].push([tries, method, url, data, cb])
                }
                cb('Error: ['+method+'] '+url+' tries: '+tries+' - '+err.stack, null);
            }
            self.requestQueue();
            self.resources();
        });
    }
}

Parser.prototype.nextQueue = function() {
    for (var i = this.queue.length;i--;) {
        if (this.queue[i].length !== 0) {
            return this.queue[i].pop();
        }
    }
    return false;
}

Parser.prototype.parse = function(data, opts) {
    return libxml.parseHtml(data)
}

Parser.prototype.resources = function() {
    if (Math.abs(this.lastStack-this.stack) < 15) return;
    var mem = process.memoryUsage();
    this.p.debug('(process) stack: '+this.stack+', RAM: '+toMB(mem.rss)+', requests: '+this.requestCount+', heap: '+toMB(mem.heapUsed)+' / '+toMB(mem.heapTotal));
    this.lastStack = this.stack;
}

function toMB(size) {
    return (size/1024/1024).toFixed(2)+'Mb';
}

function extend(obj1, obj2, replace) {
    for (i in obj2) {
        if ((replace === false && obj1[i] !== undefined) || (typeof obj2[i]).charAt(0) === 'f') continue;
        obj1[i] = obj2[i];
    }
    return obj1;
}

module.exports = function(opts) {
    var parser = new Parser(opts);
    var Promise = require('./lib/promise.js')(parser);
    parser.p = new Promise();
    return parser.p;
}