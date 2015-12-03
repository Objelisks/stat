var sqlite3 = require('sqlite3');
var io = require('socket.io')(8081);

var db = new sqlite3.Database('./db');

io.on('connection', function(socket) {
  console.log('new connection');
  socket.on('message', function(msg) {
    console.log('got', msg);
    switch(msg.type) {
      case "data":
        // TODO: validate args more
        if(!msg.start || !msg.end) return;

        // Sqlite automatically sanitizes args
        var statement = "SELECT date, val, tagid " +
                        "FROM day WHERE date BETWEEN $start AND $end " +
                        "ORDER BY date ASC";
        db.all(statement, { $start: msg.start, $end: msg.end }, function(err, results) {
          socket.emit('message', {'type': 'data', 'results': results});
        });
        break;
      case "tags":
        var statement = "SELECT tag, tagid FROM tag";
        db.all(statement, function(err, results) {
          socket.emit('message', {'type': 'tags', 'results': results});
        })
        break;
      case "update":
        // TODO: validate args more
        if(!msg.date) return;

        var insertStatement = "INSERT INTO day (date, tagid, val) VALUES ($date, $tagid, $val)";
        var updateStatement = "UPDATE day SET val = $val WHERE date = $date AND tagid = $tagid";
        var query = "SELECT count(*) as count FROM day WHERE date = $date";
        db.get(query, { $date: msg.date }, function(err, result) {
          if(err) console.log('ERROR', err);
          var useStatement;
          if(result.count > 0) {
            useStatement = updateStatement;
          } else {
            useStatement = insertStatement;
          }

          var statement = db.prepare(useStatement);
          msg.values.forEach(function(value) {
            statement.run({$date: msg.date, $tagid: value.tagid, $val: value.val});
          });
          statement.finalize();
        });
        break;
      default:
        break;
    }
  });
});
