var needle	= require('/usr/lib/node_modules/needle');
var libxml	= require('libxmljs');
var events	= require('./lib/events.js');
var util        = require('util');

var css2xpath       = require('./lib/css2xpath.js');
libxml.Element.prototype.findCSS = function(sel) {
    if (sel.charAt(0) !== '/') {
        sel = sel.replace('@', '/@')
        sel = css2xpath(sel);
    }
    return this.find(sel);
}
libxml.Document.prototype.findCSS = function(sel) {
    if (sel.charAt(0) !== '/') {
        sel = sel.replace('@', '/@')
        sel = css2xpath(sel);
    }
    return this.find(sel);
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
        decode: false,
        follow: true,
        compressed: true,
        timeout: 30 * 1000,
        user_agent: 'Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
        concurrency: 10,
    }
}

var parser = function(url, opts) {
    this.base_url = url;
    this.opts = extend(opts, default_opts, false);
    this.opts.http = extend(opts.http, default_opts.http, false);
    this.requests = 0;
    this.queue = [];
    
    this.requestQueue();
    return this.request(this.base_url);
}

parser.prototype.request = function(url, opts) {
    var self = this;
    var e = new events();
    e.parser = this;
    self.queue.push([url, e]);
    return e;
}

parser.prototype.requestQueue = function() {
    var self = this;
    if (this.queue.length > 0 && this.requests < this.opts.http.concurrency) {
        var arr = this.queue.pop();
        var url = arr.shift();
        var e = arr.shift();
        self.requests++;
        needle.get(url, self.opts.http, function(err, res, data) {
            e.logging.log('loaded '+url);
            self.requests--;
            try {
                var new_context = libxml.parseHtml(data);
                new_context.data = { url: url };
                e.done(new_context);
            }catch(err) {
                console.log(err.stack);
                e.logging.error(err.stack)
            }
        });
        this.requestQueue.bind(this)();
    }else{
        setTimeout(this.requestQueue.bind(this), 50);
    }
}

function extend(obj1, obj2, replace) {
    for (i in obj2) {
        if ((replace === false && obj1[i] !== undefined) || (typeof obj2[i]).charAt(0) === 'f') continue;
        obj1[i] = obj2[i];
    }
    return obj1;
}

module.exports = parser;