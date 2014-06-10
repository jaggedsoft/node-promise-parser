#promise-parser

Promise-based HTML/XML parser/web scraper for NodeJS.

##Features

- Fast: uses libxml C bindings
- Lightweight: no dependencies like jQuery, cheerio, or jsdom
- Clean: promise based interface- no more nested callbacks
- Flexible: supports both CSS and XPath selectors

##Example

```javascript
var pp = require('promise-parser');

// scrape all craigslist listings
pp('www.craigslist.org/about/sites') 
.find('h1 + div a').set('location').follow('@href')
.find('header + table a').set('category').follow('@href')
.find('p > a').follow('@href', { next: '.button.next' })
.set({
    'title':        'section > h2',
    'description':  '#postingbody',
    'subcategory':  'div.breadbox > span[4]',
    'time':         'time@datetime',
    'latitude':     '#map@data-latitude',
    'longitude':    '#map@data-longitude',
    'images[]':     'img@src'
})
.get(function(listing) {
    // do something with listing data
})
```

##Install

```
npm install promise-parser
```

##Usage

```javascript
new promise-parser([url or xml/html string], [opts])
```

###`opts [object]`

- opts.http [object] - HTTP options given to [needle](https://github.com/tomas/needle) instance
- opts.http.timeout [int] - Timeout in milliseconds
- opts.http.proxy [string] - Forward requests through HTTP(s) proxy
- opts.http.concurrency [int] - Number of simultaneous HTTP requests

##Promises

###.log(callback(msg))

Call `callback` when any log messages are received

###.debug(callback(msg))

Call `callback` when any debug messages are received


###.error(callback(msg))

Call `callback` when any error messages are received

###.find(selector, [opts])

Find elements based on `selector` within the current context

###.follow([selector], [opts])

Follow URLs found within the element text or `attr`

###.set([args])

Find and set values for `context.data`

```javascript

// set 'title' to current element text
pp.set('title')

// set 'title' to text of 'a.title'
pp.set('title', 'a.title')

// set multiple
pp.set({
	// set 'title' to text of 'a.title'
	'title':  'a.title',
	// set 'description' to text of 'p.description'
	'description': 'p.description',
	// set 'url' to 'a.permalink' href attribute
	'url': 'a.permalink @href',
	// set 'images[]' to the 'src' attribute of each '<img>'
	'images[]': 'img @src',
});
```
###.get(callback(data))

Get data stored in `context.data`

###.then(callback(next))

Calls `callback` from the context of the current element.
To continue, the callback must call `next([context])` at least once.
The `context` argument can optionally be a new context.


```javascript
pp.then(function(next) {
	currentContext = this;
	var links = currentContext.find('a');
	currentContext.log('found '+links.length+' links');
	links.forEach(function(newContext) {
		next(newContext);
	});
})
```

####`context`

The `this` value of `.then` callback function is set to the current context.
The context is a [libxmljs `Element`](https://github.com/polotek/libxmljs/wiki/Element) object representing the current HTML element.
In addition to all of the [libxmljs `Element`](https://github.com/polotek/libxmljs/wiki/Element) functions,
each `context` also supports these functions:

#####context.request(url, [opts], callback(context))

Loads `url` and calls `callback` with the new `context` (which will be the root element of the loaded document).


#####context.log(msg)

#####context.debug(msg)

#####context.error(msg)

#####context.data [object]

For storing data that will be inherited by the next context

##CSS helpers

These CSS helper selectors are provided to simplify complex CSS selectors and to add jQuery-like functionality.

###:contains(string)

Select elements whose contents contain `string`

###:starts-with(string)

Select elements whose contents start with `string`

###:ends-with(string)

Select elements whose contents end with `string`

###:first

Select first element  (shortcut for `:first-of-type`)

###:first(n), :limit(n)

Select first `n` elements

###:last

Select last element (shortcut for `:last-of-type`)

###:last(n)

Select last `n` elements

###:even

Select even elements

###:odd

Select odd elements

###:skip(n), skip-first(n)

Skip first `n` elements

###:skip-last(n)

Skip last `n` elements

###:range(n1, n2)

Select `n1` through `n2` elements inclusive

###.exampleSelector[n]

Select `n`th element (shortcut for `:nth-of-type`)

###@[attr]

Select `attr`

##Dependencies

- [libxmljs](https://github.com/polotek/libxmljs) - libxml C bindings
- [needle](https://github.com/tomas/needle) - Lightweight HTTP wrapper
