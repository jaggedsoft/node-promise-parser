var URL             = require('url');
var css2xpath       = require('./css2xpath.js');

var promises = {
    then: function(cb) {
        var self = this;
        cb.bind(self, function(context) { self.next(context) })();
    },
    
    /* find elements based on css or xpath selector */
    
    find: function(selector, opts) {
        this.log('searching for "'+opts.original+'" in '+this.data.url);
        var res = this.find(selector)
        if (res.length < 1) {
            this.error('no results for '+opts.original);
            return;
        }
        this.log('found '+res.length+' results for "'+opts.original+'"')
        var self = this;
        var i = 0;
        res.forEach(function(el) {
            //if (++i < 15) {
                el.data = clone(this.data)||{};
                self.next(el);
            //}
        });
    },
    
    /* follow a url found in given element(s) */
    follow: function(selector, opts) {
        var self = this;
        var res = self.find(selector);
        
        if (res === undefined || res.length === 0) {
            this.debug('no data for '+selector)
        }else{
            res.forEach(function(el) {
                var val = getContent(el);
                if (val !== null) {
                    var url = URL.resolve(self.data.url, val);
                    //self.log(url)
                    self.request(url, function(context) {self.next(context)})
                }
            });
        }
    },
    
    /* set values */

    set: function(obj, opts) {
        for (var key in obj) {
            if (obj[key] === null) {
                this.data[key] = getContent(this);
            }else{
                var selector = obj[key].selector;
                if (obj[key].type === 's') { // string
                    var el = this.get(selector);
                    if (el === undefined) {
                        this.debug('no data for '+selector)
                    }else{
                        this.data[key] = getContent(el);
                    }
                }else if (obj[key].type === 'a') { // array
                    var els = this.find(selector);
                    if (els === undefined || els.length === 0) {
                        this.debug('no data for '+selector)
                    }else{ 
                        this.data[key] = [];
                        var self = this;
                        els.forEach(function(el) {
                            self.data[key].push(getContent(el));
                        });
                        if (this.data[key].length === 0)
                            delete this.data[key];
                    }
                }
            }
            if (typeof this.data[key] === 'string')
                this.data[key] = this.data[key].trim();
            
            this.debug(key+' = '+(this.data[key])+' ('+this.data.url+')');
        }
        this.next();
    },
    
    
    get: function(cb) {
        cb(this.data);
    }
}

function getContent(context) {
    if (context.text !== undefined)
        return context.text().trim();
    else if (context.value !== undefined)
        return context.value().trim();
    return undefined;
}


/* preprocess arguments for speed */

promises.find.preloader = function(args) {
    args[1] = args[1]||{};
    args[1].original = args[0];
    args[0] = convert2xpath(args[0]);
    return args;
}

promises.set.preloader = function(args) {
    /*
        if first two args are "key" and "selector" strings
        convert them to { "key" : "selector" } object
    */
    if (typeof args[0] === 'string' && (args[1] === undefined || typeof args[1] === 'string')) {
        var obj = {};
        obj[args[0]] = args[1]||null;
        args[0] = obj;
        if (typeof args[2] === 'object')
            args[1] = args.pop();
    }
    
    /* convert selectors */
    for (var key in args[0]) {
        var val = args[0][key];
        
        var type = 's';
        if (key.substr(key.length-2, 2) === '[]') {
            delete args[0][key];
            var key = key.substr(0, key.length-2);
            type = 'a'
        }
        
        if (val) {
            args[0][key] = { type: type };
            
            /*
            var atChar = val.lastIndexOf('@');
            if (atChar !== -1) {
                args[0][key].attr = val.substr(atChar+1);
                val = val.substr(0, atChar);
            }
            */
            args[0][key].selector = convert2xpath(val);
        }
    }
    return args;
}

promises.follow.preloader = function(args) {
    var type = typeof args[0];
    if (type === 'string' || args[0] instanceof String) {
        
    }else if (type === 'object') {
        args[2] = args[0];
        args[0] = undefined;
        args[1] = undefined;
    }
    if (typeof args[1] === 'object') {
        args[2] = args[1];
        args[1] = undefined;
    }
    return args;
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

function convert2xpath(sel) {
    if (sel.charAt(0) !== '/') {
        sel = sel.replace('@', '/@')
        sel = css2xpath(sel);
    }
    return sel;
}

module.exports = promises;