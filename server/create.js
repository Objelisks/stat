var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('./db');

// schema
db.serialize(function() {
  db.run('CREATE TABLE day (date DATE, tagid INTEGER, val INTEGER, PRIMARY KEY (date, tagid))');
  db.run('CREATE TABLE tag (tagid NUMBER, tag NVARCHAR(256), PRIMARY KEY (tagid))');
});

/*

day
-----
date    val   tagid

tag
-----
tagid   tag

*/
