/**
 * LawnchairAdaptorHelpers
 * =======================
 * Useful helpers for creating Lawnchair stores. Used as a mixin.
 *
 */
var LawnchairAdaptorHelpers = {
	// merging default properties with user defined args
	merge: function(defaultOption, userOption) {
		return (userOption == undefined || userOption == null) ? defaultOption: userOption;
	},

	// awesome shorthand callbacks as strings. this is shameless theft from dojo.
	terseToVerboseCallback: function(callback) {
		return (typeof arguments[0] == 'string') ?
		function(r, i) {
			eval(callback)
		}: callback;
	},

	// Returns current datetime for timestamps.
	now: function() {
		return new Date().getTime();
	},

	// Returns a unique identifier
	uuid: function(len, radix) {
		// based on Robert Kieffer's randomUUID.js at http://www.broofa.com
		var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
		var uuid = [];
		radix = radix || chars.length;

		if (len) {
			for (var i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
		} else {
			// rfc4122, version 4 form
			var r;

			// rfc4122 requires these characters
			uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
			uuid[14] = '4';

			// Fill in random data.  At i==19 set the high bits of clock sequence as
			// per rfc4122, sec. 4.1.5
			for (var i = 0; i < 36; i++) {
				if (!uuid[i]) {
					r = 0 | Math.random() * 16;
					uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8: r];
				}
			}
		}
		return uuid.join('');
	},

	// Serialize a JSON object as a string.
	serialize: function(obj) {
		var r = '';

		if (typeof JSON != 'undefined') {
			r = JSON.stringify(obj);
		} else {
			// Art Haedike: 21 Dec 2009
			// Pieced this together from some of the open libraries...handles recursion.  More robust.
			var t = typeof(obj);
			if (t != "object" || obj === null) {
				// simple data type
				if (t == "string") obj = '"' + obj + '"';
				r = String(obj);
			} else {
				// recurse array or object
				var n,
				v,
				json = [],
				arr = (obj && obj.constructor == Array);
				for (n in obj) {
					v = obj[n];
					t = typeof(v);
					if (t == "string") {
						v = '"' + v + '"';
					} else if (t == "object" && v !== null) {
						//recursion starts here
						v = this.serialize(v);
					}
					json.push((arr ? "": '"' + n + '":') + String(v));
				}
				r = (arr ? "[": "{") + String(json) + (arr ? "]": "}");
			}

		}

		return r;
	},

	// Deserialize JSON.
	deserialize: function(json) {
		return eval('(' + json + ')');
	}
};


/**
 * WebkitSQLiteAdaptor
 * ===================
 * Sqlite implementation for Lawnchair.
 *
 */
var WebkitSQLiteAdaptor = function(options) {
	for (var i in LawnchairAdaptorHelpers) {
		this[i] = LawnchairAdaptorHelpers[i];
	}
	this.init(options);
};


WebkitSQLiteAdaptor.prototype = {
	init:function(options) {
		var that = this;
		var merge = that.merge;
		var opts = (typeof arguments[0] == 'string') ? {table:options} : options;

		// default properties
		this.name		= merge('Lawnchair', opts.name	  	);
		this.version	= merge('1.0',       opts.version 	);
		this.table 		= merge('field',     opts.table	  	);
		this.display	= merge('shed',      opts.display 	);
		this.max		= merge(65536,       opts.max	  	);
		this.db			= merge(null,        opts.db		);

		// default sqlite callbacks
		this.onError = function(){};
		this.onData  = function(){};

		if("onError" in opts) {
			this.onError = opts.onError;
		}

		// error out on shit browsers
		if (!window.openDatabase)
			throw('Lawnchair, "This browser does not support sqlite storage."');

		// instantiate the store
		this.db = openDatabase(this.name, this.version, this.display, this.max);

		// create a default database and table if one does not exist
		this.db.transaction(function(tx) {
			tx.executeSql("SELECT COUNT(*) FROM " + that.table, [], function(){}, function(tx, error) {
				that.db.transaction(function(tx) {
					tx.executeSql("CREATE TABLE "+ that.table + " (id NVARCHAR(32) UNIQUE PRIMARY KEY, value TEXT, timestamp REAL)", [], function(){}, that.onError);
				});
			});
		});
	},
	save:function(obj, callback) {
		var that = this;
	
		var update = function(id, obj, callback) {
			that.db.transaction(function(t) {
				t.executeSql(
					"UPDATE " + that.table + " SET value=?, timestamp=? WHERE id=?",
					[that.serialize(obj), that.now(), id],
					function() {
						if (callback != undefined) {
							obj.key = id;
							callback(obj);
						}
					},
					that.onError
				);
			});
		};
		var insert = function(obj, callback) {
			that.db.transaction(function(t) {
				var id = (obj.key == undefined) ? that.uuid() : obj.key;
				delete(obj.key);
				t.executeSql(
					"INSERT INTO " + that.table + " (id, value,timestamp) VALUES (?,?,?)",
					[id, that.serialize(obj), that.now()],
					function() {
						if (callback != undefined) {
							obj.key = id;
							callback(obj);
						}
					},
					that.onError
				);
			});
		};
		if (obj.key == undefined) {
			insert(obj, callback);
		} else {
			this.get(obj.key, function(r) {
				var isUpdate = (r != null);
	
				if (isUpdate) {
					var id = obj.key;
					delete(obj.key);
					update(id, obj, callback);
				} else {
					insert(obj, callback);
				}
			});
		}
	},
	get:function(key, callback) {
		var that = this;
		this.db.transaction(function(t) {
			t.executeSql(
				"SELECT value FROM " + that.table + " WHERE id = ?",
				[key],
				function(tx, results) {
					if (results.rows.length == 0) {
						callback(null);
					} else {
						var o = that.deserialize(results.rows.item(0).value);
						o.key = key;
						callback(o);
					}
				},
				this.onError
			);
		});
	},
	all:function(callback) {
		var cb = this.terseToVerboseCallback(callback);
		var that = this;
		this.db.transaction(function(t) {
			t.executeSql("SELECT * FROM " + that.table, [], function(tx, results) {
				if (results.rows.length == 0 ) {
					cb([]);
				} else {
					var r = [];
					for (var i = 0, l = results.rows.length; i < l; i++) {
						var raw = results.rows.item(i).value;
						var obj = that.deserialize(raw);
						obj.key = results.rows.item(i).id;
						r.push(obj);
					}
					cb(r);
				}
			},
			that.onError);
		});
	},
	remove:function(keyOrObj, callback) {
		var that = this;
		this.db.transaction(function(t) {
			t.executeSql(
				"DELETE FROM " + that.table + " WHERE id = ?",
				[(typeof keyOrObj == 'string') ? keyOrObj : keyOrObj.key],
				callback || that.onData,
				that.onError
			);
		});
	},
	nuke:function(callback) {
		var that = this;
		this.db.transaction(function(tx) {
			tx.executeSql(
				"DELETE FROM " + that.table,
				[],
				callback || that.onData,
				that.onError
			);
		});
	}
};
/**
 * UserDataAdaptor
 * ===================
 * UserData implementation for Lawnchair for older IE browsers.
 *
 */
var UserDataAdaptor = function(options) {
    for (var i in LawnchairAdaptorHelpers) {
        this[i] = LawnchairAdaptorHelpers[i];
    }
    this.init(options);
};

UserDataAdaptor.prototype = {
	init:function(){
		var s = document.createElement('span');
		s.style.behavior = 'url(\'#default#userData\')';
		s.style.position = 'absolute';
		s.style.left = 10000;
		document.body.appendChild(s);
		this.storage = s.load('lawnchair');
	},
	get:function(key, callback){
		// this.storage.getAttribute(key);
		var obj = this.deserialize(this.storage[key]);
	        if (obj) {
	            obj.key = key;
	            if (callback)
	                callback(obj);
	        }
	},
	save:function(obj, callback){
		var id = obj.key || this.uuid();
	        delete obj.key;
		this.storage[id] = this.serialize(obj);
		this.storage.save('lawnchair');
		if (callback)
			callback(obj);
	},
	all:function(callback){
		var cb = this.terseToVerboseCallback(callback);
		var ca = this.storage.attributes;
		var yar = [];
		var v,o;
		// yo ho yo ho a pirates life for me
		for (var i = 0, l = ca.length; i < l; i++) {
			v = ca[i];
			o = this.deserialize(v.nodeValue);
			if (o) {
				o.key = v.nodeName;
				yar.push(o);
			}
		}
		if (cb)
			cb(yar);
	},
	remove:function(keyOrObj) {
		var key = (typeof keyOrObj == 'string') ? keyOrObj : keyOrObj.key;
		this.storage.removeAttribute(key);
		this.storage.save('lawnchair');
	}, 
	nuke:function() {
		var that = this;
		this.all(function(r){
			for (var i = 0, l = r.length; i < l; i++) {
				if (r[i].key)
					that.remove(r[i].key);
			}
		});
	}
};
/**
 * CookieAdaptor
 * ===================
 * Cookie implementation for Lawnchair for older browsers.
 *
 * Based on ppk's http://www.quirksmode.org/js/cookies.html
 *
 */
var CookieAdaptor = function(options) {
	for (var i in LawnchairAdaptorHelpers) {
		this[i] = LawnchairAdaptorHelpers[i];
	}
	this.init(options);
};

CookieAdaptor.prototype = {
	init:function(){
		this.createCookie = function(name, value, days) {
			if (days) {
				var date = new Date();
				date.setTime(date.getTime()+(days*24*60*60*1000));
				var expires = "; expires="+date.toGMTString();
			}
			else var expires = "";
			document.cookie = name+"="+value+expires+"; path=/";
		};
	},
	get:function(key, callback){
		var readCookie = function(name) {
			var nameEQ = name + "=";
			var ca = document.cookie.split(';');
			var len = ca.length;
			for (var i=0; i < len; i++) {
				var c = ca[i];
				while (c.charAt(0)==' ') c = c.substring(1,c.length);
				if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
			}
			return null;
		};
		var obj = this.deserialize(readCookie(key)) || null;
		if (obj) {
			obj.key = key;
		}
		if(callback) callback(obj);
	},
	save:function(obj, callback){
		var id = obj.key || this.uuid();
		delete obj.key;
		this.createCookie(id, this.serialize(obj), 365);
		if (callback)
			callback(obj);
	},
	all:function(callback){
		var cb = this.terseToVerboseCallback(callback);
		var ca = document.cookie.split(';');
		var yar = [];
		var c,k,v,o;
		// yo ho yo ho a pirates life for me
		for (var i = 0, l = ca.length; i < l; i++) {
			c = ca[i].split('=');
			k = c[0];
			v = c[1];
			o = this.deserialize(v);
			if (o) {
				o.key = k;
				yar.push(o);
			}
		}
		if (cb)
			cb(yar);
	},
	remove:function(keyOrObj, callback) {
		var key = (typeof keyOrObj == 'string') ? keyOrObj : keyOrObj.key;
		this.createCookie(key, '', -1);
		if(callback)
		  callback();
	},
	nuke:function(nuke, callback) {
		var that = this;
		this.all(function(r){
			for (var i = 0, l = r.length; i < l; i++) {
				if (r[i].key)
					that.remove(r[i].key);
			}
		}, callback);
	}
};

/**
 * Lawnchair
 * =========
 * A lightweight JSON document store.
 *
 */
var Lawnchair = function(opts) {
	this.init(opts);
}

Lawnchair.prototype = {
	
	init:function(opts) {
		var adaptors = {
			'webkit':window.WebkitSQLiteAdaptor,
			'gears':window.GearsSQLiteAdaptor,
			'dom':window.DOMStorageAdaptor,
			'cookie':window.CookieAdaptor,
			'air':window.AIRSQLiteAdaptor,
			'userdata':window.UserDataAdaptor,
			'air-async':window.AIRSQLiteAsyncAdaptor
		};
	
		this.adaptor = opts.adaptor ? new adaptors[opts.adaptor](opts) : new WebkitSQLiteAdaptor(opts);
	},
	
	// Save an object to the store. If a key is present then update. Otherwise create a new record.
	save:function(obj, callback) {this.adaptor.save(obj, callback)},
	
	// Invokes a callback on an object with the matching key.
	get:function(key, callback) {this.adaptor.get(key, callback)},

	// Returns whether a key exists to a callback.
	exists:function(callback) {this.adaptor.exists(callback)},
	
	// Returns all rows to a callback.
	all:function(callback) {this.adaptor.all(callback)},
	
	// Removes a json object from the store.
	remove:function(keyOrObj, callback) {this.adaptor.remove(keyOrObj, callback)},
	
	// Removes all documents from a store and returns self.
	nuke:function(callback) {this.adaptor.nuke(callback);return this},
	
	/**
	 * Iterator that accepts two paramters (methods or eval strings):
	 *
	 * - conditional test for a record
	 * - callback to invoke on matches
	 *
	 */
	find:function(condition, callback) {
		var is = (typeof condition == 'string') ? function(r){return eval(condition)} : condition;
		var cb = this.adaptor.terseToVerboseCallback(callback);
	
		this.each(function(record, index) {
			if (is(record)) cb(record, index); // thats hot
		});
	},


	/**
	 * Classic iterator.
	 * - Passes the record and the index as the second parameter to the callback.
	 * - Accepts a string for eval or a method to be invoked for each document in the collection.
	 */
	each:function(callback) {
		var cb = this.adaptor.terseToVerboseCallback(callback);
		this.all(function(results) {
			var l = results.length;
			for (var i = 0; i < l; i++) {
				cb(results[i], i);
			}
		});
	}
// --
};
