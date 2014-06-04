var errors = false;
var logging = false;
var debugging = false;
var concurrency = 0;

var event = function() {
};

var promise = function(name, cb) {
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
			
		this.logging =  {
			log : function(msg) {
				if (logging)
					e.logging.log(msg);
			},
			debug : function(msg) {
				if (debugging)
					e.logging.debug(msg);
			},
			error : function(msg) {
				if (errors)
					e.logging.error(msg);
			}
		}
		
		this.done = function(context) {
			if (context === undefined) {
				e.logging.error('no context');
			}else{
				context.request = function(url, opts, cb) {
					if ((typeof opts).charAt(0) === 'f') {
						cb = opts;
						opts = undefined;
					}
					var ev = e.parser.request(url, opts);
					ev.logging = {};
					ev.logging.log = context.log;
					ev.logging.error = context.error;
					ev.logging.error = context.debug;
					ev.done = function(context) {
						cb(context);
					}
				}
				context.log = function(msg) {
					if (logging)
					e.logging.log('('+name+') '+msg)
				}
				context.debug = function(msg) {
					if (debugging)
					e.logging.debug('('+name+') '+msg)
				}
				context.error = function(msg) {
					if (errors)
					e.logging.error('('+name+') '+msg)
				}
				context.next = function(context) {
					concurrency++;
					if (context === undefined) {
						e.done(this);
					}else{
						//context.data = Object.create(this.data);
						extend(context.data, this.data, false);
						//context.data = this.data;
						e.done(context)
					}
					concurrency--;
				}
				cb.bind(context).apply(null, args);
			}
		}
		return e;
	}
}

var promises = require('./promises.js');
for (p in promises) {
    event.prototype[p] = new promise(p, promises[p]);
}

event.prototype.log = function(cb) {
	logging = true;
	this.logging = this.logging||{};
	this.logging.log = function(msg) {
	    cb(msg);
	}
	return this;
}

event.prototype.debug = function(cb) {
	debugging = true;
	this.logging = this.logging||{};
	this.logging.debug = function(msg) {
	    cb(msg);
	}
	return this;
}

event.prototype.error = function(cb) {
	errors = true;
	this.logging = this.logging||{};
	this.logging.error = function(msg) {
	    cb(msg)
	}
	return this;
}

var extend = function(obj1, obj2, replace) {
    for (i in obj2) {
        if ((replace === false && obj1[i] !== undefined) || (typeof obj2[i]).charAt(0) === 'f') continue;
        obj1[i] = obj2[i];
    }
    return obj1;
}

module.exports = event;