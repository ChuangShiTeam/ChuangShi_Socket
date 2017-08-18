var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3001;

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname + '/public'));

var gameIsStart = false;
var onlineUserList = [];
var foregroundSocket;
var backgroundSocket;

function score() {
    if (!gameIsStart) {
        return;
    }

    var userList = [];

    for (var i = 0; i < onlineUserList.length; i++) {
        userList.push({
            name: onlineUserList[i].name,
            avatar: onlineUserList[i].avatar,
            distance: onlineUserList[i].distance
        })
    }

    if (typeof (foregroundSocket) != 'undefined') {
        foregroundSocket.emit('score', userList);
    }

    setTimeout(function(){
        score();
    }, 1000);
}

io.on('connection', function (socket) {

    socket.on('foreground', function (data, callback) {
        console.log(data);

        foregroundSocket = socket;

        callback({
            code: 200,
            data: true
        });
    });

    socket.on('background', function (data, callback) {
        console.log(data);

        backgroundSocket = socket;

        callback({
            code: 200,
            data: true
        });
    });

    socket.on('login', function (data, callback) {
        console.log(data);

        var isExit = false;
        for (var i = 0; i < onlineUserList.length; i++) {
            if (onlineUserList[i].token == data.token) {
                isExit = true;

                break;
            }
        }

        if (gameIsStart && !isExit) {
            callback({
                code: 400,
                message: "游戏已经开始了, 请参与下一轮游戏"
            });

            return;
        }

        if (data.token == 'foreground') {
            foregroundSocket = socket;
        }

        if (!isExit) {
            onlineUserList.push({
                name: data.name,
                avatar: data.avatar,
                token: data.token,
                socket: socket,
                distance: 0
            });
        }

        callback({
            code: 200,
            data: true
        });
    });

    socket.on('start', function (data, callback) {
        console.log(data);

        if(socket == backgroundSocket) {
            gameIsStart = true;

            io.sockets.emit('start', {

            });

            score();

            callback({
                code: 200,
                data: true
            });
        } else {
            callback({
                code: 400,
                message: '没有权限'
            });
        }
    });

    socket.on('stop', function (data, callback) {
        console.log(data);

        if(socket == backgroundSocket) {
            gameIsStart = false;

            onlineUserList = [];

            io.sockets.emit('stop', {

            });

            callback({
                code: 200,
                data: true
            });
        } else {
            callback({
                code: 400,
                message: '没有权限'
            });
        }
    });

    socket.on('shake', function (data, callback) {
        //console.log(data);

        var isExit = false;
        for (var i = 0; i < onlineUserList.length; i++) {
            if (onlineUserList[i].token == data.token) {
                onlineUserList[i].distance += data.distance;
                var isExit = true;

                break;
            }
        }

        if (isExit) {
            callback({
                code: 200,
                data: true
            });
        } else {
            callback({
                code: 400,
                data: '用户不存在'
            });
        }
    });

    socket.on('disconnect', function () {

    });
})
