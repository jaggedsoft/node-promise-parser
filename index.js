var needle	= require('/usr/lib/node_modules/needle');
var libxml	= require('libxmljs');
var events	= require('./lib/events.js');

var default_opts = {
    concurrency: 5,
    http: {
        decode: false,
        follow: true,
        compressed: true,
        timeout: 30 * 1000,
        user_agent: 'Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
        concurrency: 2,
    }
}

var parser = function(url, opts) {
    this.base_url = url;
    this.opts = Object.create(default_opts, opts);
    this.concurrency = 0;
    this.requests = 0;
    this.queue = [];
    
    this.requestThread();
    return this.request(this.base_url);
}

parser.prototype.request = function(url, opts) {
    var self = this;
    var e = new events();
    e.parser = this;
    self.queue.push([url, e]);
    return e;
}

parser.prototype.requestThread = function() {
    var self = this;
    if (this.queue.length > 0 && this.requests < this.opts.http.concurrency) {
        var arr = this.queue.pop();
        var url = arr.shift();
        var e = arr.shift();
        console.log(url);
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
        this.requestThread.bind(this)();
    }else{
        setTimeout(this.requestThread.bind(this), 10);
    }
}

module.exports = parser;