var sqlite3 = require('sqlite3');
var io = require('socket.io')(8080);

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

        var insertStatement = "INSERT INTO day VALUES ($date, $tagid, $val)";
        var updateStatement = "UPDATE day SET day.val = $val WHERE day.date = $date AND day.tagid = $tagid";
        var query = "SELECT day.val AS Value, day.tagid as Tag FROM day WHERE day.date = $date";
        db.get(query, { $date: msg.date }, function(result) {
          var useStatement;
          if(result.length > 0) {
            useStatement = updateStatement;
          } else {
            useStatement = insertStatement;
          }

          var statement = db.prepare(useStatement);
          msg.values.forEach(function(value) {
            statement.run({date: msg.date, tagid: value.tagid, val: value.val});
          });
          statement.finalize();
        });
        break;
      default:
        break;
    }
  });
});
