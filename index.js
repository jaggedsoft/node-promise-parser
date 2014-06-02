var needle	= require('/usr/lib/node_modules/needle');
var libxml	= require('libxmljs');
var events	= require('./lib/events.js');

var default_opts = {
    concurrency: 5,
    http: {
        follow: true,
        compressed: true,
        timeout: 30 * 1000,
        user_agent: 'Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
        concurrency: 25,
    }
}

var parser = function(url, opts) {
    this.base_url = url;
    this.opts = Object.create(default_opts, opts);
    this.concurrency = 0;
    this.requests = 0;
    this.queue = [];
    
    return this.request(this.base_url);
}

parser.prototype.request = function(url, opts) {
    var self = this;
    var e = new events();
    e.parser = this;
    this.throttle(function() {
        self.queue.push(url);
        needle.get(url, self.opts.http, function(err, res, data) {
            e.emit('log', 'loaded '+url);
            self.requests--;
            try {
                var new_context = libxml.parseHtml(data);
                new_context.data = { url: url };
                e.emit('done', new_context);
            }catch(err) {
                //console.log(err.stack);
                e.emit('error', err.stack)
            }
        });
    });
    return e;
}

parser.prototype.requestThread = function() {
    setTimeout(this.requestThread, 1000 * 10);
}


parser.prototype.throttle = function(cb) {
    //console.log('request',this.requests);
    if (this.requests < this.opts.http.concurrency) {
        this.requests++;
        cb();
    }else{
        setTimeout(this.throttle.bind(this, cb), this.requests * 1000);
    }
}

module.exports = parser;