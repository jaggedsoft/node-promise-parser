var parser = null;
var errors = false;
var logging = false;
var debugging = false;

function createPromise(name, cb) {
	return (function() {
		parser.queue[parser.queue.length] = [];
		this.depth = parser.queue.length++;
		this.name = name;
		
		var p = new Promise();
		this.p = p;
		
		var self = this;
		var args = [];
		for (var i = 0; arguments[i] !== undefined; i++) {
		    args.push(arguments[i]);
		}
		if (typeof cb.preloader === 'function')
			args = cb.preloader.call(this, args);
		
		this.next = function(context) {
			parser.stack++;
			if (context === undefined) {
				p.error('no context');
			}else{
				context.request = function(url, data, cb) {
					self.request('get', url, data, cb)
				}
				context.post = function(url, data, cb) {
					self.request('post', url, data, cb)
				}
				context.log = function(msg) {
					if (logging)
					self.p.log('('+name+') '+msg)
				}
				context.debug = function(msg) {
					if (debugging)
					self.p.debug('('+name+') '+msg)
				}
				context.error = function(msg) {
					if (errors)
					self.p.error('('+name+') '+msg)
				}
				context.prev = function(context) {
					self.next(context);
					parser.stack--;
					if (parser.stack == 1 && p.done) {
						parser.resources();
						p.done();
					}
				}
				context.next = function(context) {
					if (context === null || p.next === undefined) return;
					if (context === undefined) {
						p.next(this);
					}else{
						//context.data = Object.create(this.data);
						//context.data = this.data;
						extend(context.data, this.data, false);
						p.next(context)
					}
					parser.stack--;
					if (parser.stack == 1 && p.done) {
						parser.resources();
						p.done();
					}
				}
				cb.apply(context, args);
			}
		}
		if (typeof this.initialized === 'function') {
			this.initialized(this);
		}
		return p;
	})
}

var Promise = function(initialized) {
	if (typeof initialized === 'function') {
		this.initialized = initialized;
	}
};

Promise.prototype.request = function(method, url, data, cb) {
	if (cb === undefined) {
		cb = data;
		data = null;
	}
	var self = this;
	parser.request(self.depth, method, url, data, function(err, document) {
		if (err !== null) {
			self.error(err+' '+url);
		}else{
			self.log('loaded ['+method+'] '+url+' '+(data?JSON.stringify(data):''))
			cb(document);
		}
		parser.stack--;
		if (parser.stack == 1 && p.done) {
			parser.resources();
			p.done();
		}
	})
}

Promise.prototype.parse = function(data) {
	return new Promise(function(p) {
		this.next(parser.parse(data));
	});
}

Promise.prototype.get = function(url, data) {
	var self = this;
	return this.p = new Promise(function(p) {
		self.request('get', url, data, this.next)
	});
}

Promise.prototype.post = function(url, data) {
	var p = new Promise(function(p) {
		parser.post(url, data, p);
	})
	return p;
}

Promise.prototype.done = function(cb) {
	if (typeof cb === 'function') {
		this.done = cb;
	}else{
		this.p.done();
	}
	return this;
}

Promise.prototype.log = function(cb) {
	if (typeof cb === 'function') {
		logging = true;
		this.log = cb;
	}else if (logging === true) {
		this.p.log(cb);
	}
	return this;
}

Promise.prototype.debug = function(cb) {
	if (typeof cb === 'function') {
		debugging = true;
		this.debug = cb;
	}else if (debugging === true) {
		this.p.debug(cb);
	}
	return this;
}

Promise.prototype.error = function(cb) {
	if (typeof cb === 'function') {
		errors = true;
		this.error = cb;
	}else if (errors === true) {
		this.p.error(cb);
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

var promises = require('./promises.js');
for (var name in promises) {
	Promise.prototype[name] = createPromise(name, promises[name]);
}

module.exports = function(parse) {
	parser = parse;
	return Promise;
}