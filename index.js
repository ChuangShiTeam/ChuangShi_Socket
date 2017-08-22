var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 2999;

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname + '/public'));

var isGameWait = false;
var isGameStart = false;
var isGameStop = false;
var onlineUserList = [];
var foregroundSocket;
var backgroundSocket;

function score() {
    var userList = [];

    for (var i = 0; i < onlineUserList.length; i++) {
        userList.push({
            token: onlineUserList[i].token,
            distance: onlineUserList[i].distance
        })
    }

    if (typeof (foregroundSocket) != 'undefined') {
        foregroundSocket.emit('score', {
            code: 200,
            data: userList
        });
    }

    if (isGameStart) {
        setTimeout(function () {
            score();
        }, 500);
    }
}

function stop() {
    isGameWait = false;
    isGameStart = false;
    isGameStop = true;

    io.sockets.emit('stop', {});
}

io.on('connection', function (socket) {

    socket.on('http', function (data, callback) {
        console.log(data);

        io.sockets.emit('http', data);

        callback({
            code: 200,
            data: true
        });
    });

    socket.on('foreground', function (data, callback) {
        console.log(data);

        foregroundSocket = socket;

        callback({
            code: 200,
            data: {
                isGameWait: isGameWait,
                isGameStart: isGameStart,
                isGameStop: isGameStop
            }
        });
    });

    socket.on('background', function (data, callback) {
        console.log(data);

        backgroundSocket = socket;

        callback({
            code: 200,
            data: {
                isGameWait: isGameWait,
                isGameStart: isGameStart,
                isGameStop: isGameStop
            }
        });
    });

    socket.on('login', function (data, callback) {
        console.log(data);

        if (isGameStop) {
            callback({
                code: 400,
                message: "游戏还没有开始",
                data: {
                    isGameWait: isGameWait,
                    isGameStart: isGameStart,
                    isGameStop: isGameStop
                }
            });

            return;
        }

        var isExit = false;
        for (var i = 0; i < onlineUserList.length; i++) {
            if (onlineUserList[i].token == data.token) {
                isExit = true;

                break;
            }
        }

        if (!isExit) {

            if (!isGameWait) {
                callback({
                    code: 400,
                    message: "游戏还没有开始",
                    data: {
                        isGameWait: isGameWait,
                        isGameStart: isGameStart,
                        isGameStop: isGameStop
                    }
                });

                return;
            }

            if (isGameStart) {
                callback({
                    code: 400,
                    message: "游戏已经开始了, 请参与下一轮游戏",
                    data: {
                        isGameWait: isGameWait,
                        isGameStart: isGameStart,
                        isGameStop: isGameStop
                    }
                });

                return;
            }
        }

        socket.token = data.token;

        if (!isExit) {
            onlineUserList.push({
                name: data.name,
                avatar: data.avatar,
                token: data.token,
                socket: socket,
                distance: 0
            });
        }

        if (typeof (foregroundSocket) != 'undefined') {

            foregroundSocket.emit('online', {
                code: 200,
                data: {
                    name: data.name,
                    avatar: data.avatar,
                    token: data.token
                }
            });
        }

        callback({
            code: 200,
            data: {
                isGameWait: isGameWait,
                isGameStart: isGameStart,
                isGameStop: isGameStop
            }
        });
    });

    socket.on('init', function (data, callback) {
        console.log(data);

        if (isGameWait) {
            callback({
                code: 400,
                message: '游戏还在等待'
            });

            return;
        }

        if (isGameStart) {
            callback({
                code: 400,
                message: '游戏还没有结束'
            });

            return;
        }

        if (socket == backgroundSocket) {
            isGameWait = false;
            isGameStart = false;
            isGameStop = false;

            io.sockets.emit('init', {});

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

    socket.on('wait', function (data, callback) {
        console.log(data);

        if (isGameStart) {
            callback({
                code: 400,
                message: '游戏还没有结束'
            });

            return;
        }

        if (socket == backgroundSocket) {
            isGameWait = true;
            isGameStart = false;
            isGameStop = false;

            onlineUserList = [];

            io.sockets.emit('wait', {});

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

    socket.on('start', function (data, callback) {
        console.log(data);

        if (!isGameWait) {
            callback({
                code: 400,
                message: '游戏还没有等待'
            });

            return;
        }

        if (socket == backgroundSocket) {
            isGameWait = false;
            isGameStart = true;
            isGameStop = false;

            io.sockets.emit('start', {});

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

        if (socket == backgroundSocket) {
            stop();

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
        console.log(data);

        var isExit = false;
        var distance = 0;
        for (var i = 0; i < onlineUserList.length; i++) {
            if (onlineUserList[i].token == data.token) {
                distance = onlineUserList[i].distance + data.distance;

                onlineUserList[i].distance = distance;

                isExit = true;

                break;
            }
        }

        if (distance >= 5000) {
            stop();

            score();

            callback({
                code: 200,
                data: true
            });

            return;
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
        console.log('disconnect')
        console.log(socket.token)
        if (typeof (foregroundSocket) != 'undefined' && typeof (socket.token) != 'undefined') {
            foregroundSocket.emit('offline', {
                code: 200,
                data: {
                    token: socket.token
                }
            });
        }
    });
})
