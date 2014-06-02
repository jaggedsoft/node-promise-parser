#promise-parser


Fast, lightweight web scraper for nodejs

##Features

- uses libxml C bindings
- supports both CSS and XPath selectors


##Example

```javascript
var pp = require('promise-parser');

new pp('craigslist.org')
.find('h1 + div a')
.set('location')
.follow('href')
.find('header + table a')
.set('category')
.follow()
.then(function(next) {
	// do something
	next(context);
})
.follow('p > a', { next: '.button.next' })
.set({
	'title': 'section > h2',
	'images': {
		attr: 'src',
		selector: 'img'
	}
})
.get(function(data) {
	// do something with data
});
```

##Usage

```javascript
new promise-parser(url, [opts])
```

###`opts [object]`

- opts.concurrency [int]
- opts.http [object] - HTTP options given to [needle](https://github.com/tomas/needle) instance
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

###.follow([attr], [opts])

Follow URLs found within the element text or `attr`

###.set([args])

Find and set values for `context.data`

###.get(callback(data))

Get data stored in `context.data`

####Examples

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
	'url': 'a.permalink @href',
	// set 'images[]' to the 'src' attribute of each '<img>'
	'images[]': 'img @src',
});
```

###.then(callback(next))

Calls `callback` from the context of the current element.
To continue, the callback must call `next([context])` at least once.
The `context` argument can optionally be a new context.

####Example


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

###:contains(string)

Select all elements whose contents contain `string`

###:starts-with(string)

Select all elements whose contents start with `string`

###:ends-with(string)

Select all elements whose contents end with `string`

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

###:range(n1, n2)

Select `n1` through `n2` elements inclusive

###.exampleSelector[n]

Select `n`th element (shortcut for `:nth-of-type`)


##Dependencies

- [libxmljs](https://github.com/polotek/libxmljs) - libxml C bindings
- [needle](https://github.com/tomas/needle) - Lightweight HTTP wrapper
