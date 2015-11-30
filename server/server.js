var sqlite3 = require('sqlite3');
var io = require('socket.io')(8080);

var db = new sqlite3.Database('./db');

io.on('connection', function(socket) {
  console.log('new connection');
  socket.on('message', function(msg) {
    console.log('got', msg);
    switch(msg.type) {
      case "get":
        // TODO: validate args more
        if(!msg.start || !msg.end) return;

        // Sqlite automatically sanitizes args
        var statement = "SELECT day.date AS date, day.val AS value, tag.tag AS tag " +
                        "FROM day JOIN tag ON day.tagid = tag.tagid " +
                        "WHERE day.date BETWEEN $start AND $end";
        db.all(statement, { $start: msg.start, $end: msg.end }, function(err, results) {
          console.log('results', results);
          socket.emit('message', {'type': 'results', 'results':results});
        });
        break;
      case "update":
        // TODO: validate args more
        if(!msg.date) return;

        var insertStatement = "INSERT INTO day VALUES (?)";
        var updateStatement = "UPDATE day SET day.val = ? WHERE day.date = ? AND day.tagid = ?";
        var query = "SELECT day.val AS Value, day.tagid as Tag FROM day WHERE day.date = $date";
        db.get(query, { $date: msg.date }, function(result) {
          if(result.length > 0) {
            var update = db.prepare(updateStatement);
            msg.values.forEach(function(value) {
              update.run(value);
            });
            update.finalize();
          } else {
            var insert = db.prepare(insertStatement);
            msg.values.forEach(function(value) {
              insert.run(value);
            });
            insert.finalize();
          }
        });
        break;
      default:
        break;
    }
  });
});
