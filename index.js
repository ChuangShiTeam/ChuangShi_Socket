var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3001;

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname + '/public'));

var onlineUserList = [];
var foregroundSocket;

io.on('connection', function (socket) {

    socket.on('login', function (data) {
        console.log(data);

        var isExit = false;
        for (var i = 0; i < onlineUserList.length; i++) {
            if (onlineUserList[i].token == data.token) {
                isExit = true;

                break;
            }
        }

        if (data.token == 'foreground') {
            foregroundSocket = socket;
        }

        if (!isExit) {
            onlineUserList.push({
                name: data.name,
                avatar: data.avatar,
                token: data.token,
                socket: socket
            });

            if (data.token == 'foreground' || data.token == 'background') {

            } else {
                if (typeof (foregroundSocket) != 'undefined') {
                    foregroundSocket.emit('online', {
                        name: data.name,
                        avatar: data.avatar
                    });
                }
            }
        }
    });

    socket.on('start', function (data) {
        console.log(data);

        io.sockets.emit('start', {

        });
    });

    socket.on('stop', function (data) {
        console.log(data);

        io.sockets.emit('stop', {

        });
    });

    socket.on('restart', function (data) {
        console.log(data);

        socket.broadcast.emit('restart', {

        });
    });

    socket.on('disconnect', function () {

    });
})
