var util = require("util");
var EventEmitter = require('events').EventEmitter;

var errors = false;
var logging = false;
var debugging = false;
var concurrency = 0;

var event = function() {
	EventEmitter.call(this);
};

util.inherits(event, EventEmitter);

event.prototype.promise = function(name, cb) {
    var self = this;

    return function() {
	var e = new event();
	e.parser = this.parser;
        var args = [];
        for (var i = 0; arguments[i] !== undefined; i++) {
            args.push(arguments[i]);
        }
	if (typeof cb.preloader === 'function')
		args = cb.preloader(args);
        e.emit('debug', 'compiled '+name+' '+args);
	
	this.on('debug', function(msg) {
		if (debugging)
			e.emit('debug', msg);
	});
	
	this.on('log', function(msg) {
		if (logging)
			e.emit('log', msg);
	});
	
	this.on('error', function(msg) {
		if (errors)
			e.emit('error', msg);
	});
	
        this.on('done', function(context) {
		throttleDone(function() {
			if (context === undefined) {
				e.emit('error', 'no context');
			}else{
				context.request = function(url, opts, cb) {
					if ((typeof opts).charAt(0) === 'f') {
						cb = opts;
						opts = undefined;
					}
					var ev = e.parser.request(url, opts);
					ev.on('log', context.log)
					ev.on('error', context.error)
					ev.on('done', function(context) {
						cb(context);
					})
				}
				context.log = function(msg) {
					if (logging)
					e.emit('log', '('+name+') '+msg)
				}
				context.debug = function(msg) {
					if (debugging)
					e.emit('debug', '('+name+') '+msg)
				}
				context.error = function(msg) {
					if (errors)
					e.emit('error', '('+name+') '+msg)
				}
				context.next = function(context) {
					concurrency++;
					if (context === undefined) {
						e.emit('done', this);
					}else{
						//context.data = Object.create(this.data);
						extend(context.data, this.data, false);
						//context.data = this.data;
						e.emit('done', context)
					}
					concurrency--;
				}
				cb.bind(context).apply(null, args);
			}
		});
        });
        return e;
    }
}
var throttleDone = function(cb) {
	//console.log('concurrency', concurrency);
	if (concurrency < 3) {
		cb();
	}else{
		setTimeout(throttleDone, concurrency * 100, cb)
	}
}

var promises = require('./promises.js');
for (p in promises) {
    event.prototype[p] = event.prototype.promise(p, promises[p]);
}

event.prototype.log = function(cb) {
	logging = true;
    this.on('log', function(msg) {
        cb(msg);
    });
    return this;
}

event.prototype.debug = function(cb) {
	debugging = true;
    this.on('debug', function(msg) {
        cb(msg);
    });
    return this;
}

event.prototype.error = function(cb) {
	errors = true;
    this.on('error', function(msg) {
        cb(msg)
    });
    return this;
}

var extend = function(obj1, obj2, replace) {
    for (i in obj2) {
        if ((replace === false && obj1[i] !== undefined) || (typeof obj2[i]).charAt(0) === 'f') continue;
        obj1[i] = obj2[i];
    }
}

module.exports = event;