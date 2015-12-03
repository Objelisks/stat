var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('./db');

var tagids = [0, 1, 2];

for (var i = 0; i < 500; i++) {
  var date = new Date(2015, 1, i);
  var dateStr = date.toISOString().split('T')[0];
  tagids.forEach(function(tagid) {
    db.run('INSERT INTO day (date, tagid, val) VALUES ($date, $tagid, $val)', {
      $date: dateStr,
      $tagid: tagid,
      $val: Math.floor(Math.random() * 100)
    });
  });
}
