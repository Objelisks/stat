var sqlite3 = require('sqlite3');
var db = sqlite3.Database('./db');

db.serialize(function() {
  db.run('CREATE TABLE days (date DATE, id INTEGER)');
  db.run('CREATE TABLE points (id NUMBER, val INTEGER, tag NVARCHAR(256))');
});
