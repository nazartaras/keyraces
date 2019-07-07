const path = require('path');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const jwt = require('jsonwebtoken');
const passport = require('passport');
const bodyParser = require('body-parser');
const users = require('./users.json');
const maps = require('./maps.json');

require("./passport.config.js");
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

server.listen(3000);
let status = 0;
let players = 0;
let waiters = 0;
let mapId = getRandomInt(3);
let timeStart;
let timeEnd;
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname, "login.html"));
});

app.get('/game', function (req, res) {
    res.sendFile(path.join(__dirname, "game.html"));
});
app.post('/login', function (req, res) {
    const userFromReq = req.body;
    const userInDB = users.find(user => user.login === userFromReq.login);
    if (userInDB && userInDB.password === userFromReq.password) {
        const token = jwt.sign(userFromReq, "someSecret");
        res.status(200).json({ auth: true, token });
    } else {
        res.status(401).json({ auth: false })
    }
});
app.post('/game', passport.authenticate('jwt', { session: false }), function (req, res) {
    console.log(req.headers.authorization);
    const text = maps.find(map => map.id === mapId);
    res.json({ currMap: text, textId: mapId });
});


io.on('connection', function (socket) {
    if (status === 0) {
        status = 1;
        console.log('joined race');
        const currTime = new Date;
        const textTime = maps.find(map => map.id === mapId);
        timeEnd = Date.parse(currTime) + (textTime.time * 1000);
        socket.join('race');
        socket.emit('start')
    } else if (status == 1) {
        console.log('joined waiting');
        socket.join('waiting');
        const currTime = new Date;
        let timerTime = timeEnd - Date.parse(currTime);
        socket.emit('wait');
        socket.emit('start-timer', { time: Math.ceil(timerTime / 1000), status: 3 })
        waiters += 1;
    }else if(status == 2){
        socket.join('race');
        const currTime = new Date;
        let timerTime = 10000 -  (Date.parse(currTime)-timeEnd);
        socket.emit('start-timer', { time: Math.ceil(timerTime / 1000), status: 3 })
    }
    socket.on('player-finished', payload => {
        let user = jwt.verify(payload.token, 'someSecret')
        if (user) {
        console.log(players);
        console.log("waiters" + waiters);
        players -= 1;
        socket.broadcast.to('race').emit('someone-finished-race', { token: payload.token });
        console.log('finished');
        console.log(players);
        if (players == 0) {
            socket.emit('clear-interval');
            socket.broadcast.to('race').emit('clear-interval');
            socket.broadcast.to('race').emit('race-finished');
            socket.emit('race-finished');
            mapId = getRandomInt(3);
            staus = 2;
            console.log('mapId:     ' + mapId);
            timeEnd = Date.parse(new Date);
            socket.broadcast.to('waiting').emit('transfer');
            socket.emit('start-timer', { time: 10, status: 2 });
            socket.broadcast.to('waiting').emit('start-timer', { time: 10, status: 2 });
            socket.broadcast.to('race').emit('start-timer', { time: 10, status: 2 });
        }
    }
    })
    socket.on('start-next', payload => {
        let user = jwt.verify(payload.token, 'someSecret')
        if (user) {
        timeStart = new Date;
        const textTime = maps.find(map => map.id === mapId);
        timeEnd = Date.parse(timeStart) + (textTime.time * 1000);
        status = 1
        socket.emit('start');
        }
    })
    socket.on('to-room-race', payload => {
        let user = jwt.verify(payload.token, 'someSecret')
        if (user) {
        socket.leave('waiting');
        socket.join('race');
    }
    })
    socket.on('add-player', payload => {
        players += 1;
        console.log('player-added', players)
    })
    socket.on('someone-connected', payload => {
        let user = jwt.verify(payload.token, 'someSecret')
        if (user) {
        socket.broadcast.to('race').emit('someone-new-connected', { token: payload.token });
        socket.emit('someone-new-connected', { token: payload.token});
    }
})
    socket.on('progress-change', payload => {
        let user = jwt.verify(payload.token, 'someSecret')
        if (user) {
        socket.broadcast.to('race').emit('someone-progress-changed', { token: payload.token, newProgress: payload.currProgress });
    }
    })
    socket.on('keypressed', payload => {
        let user = jwt.verify(payload.token, 'someSecret')
        if (user) {
            const text = maps.find(map => map.id === payload.currTextId);
            console.log(String.fromCharCode(payload.keycode) + "       " + text.map[payload.charNum]);
            if (String.fromCharCode(payload.keycode) === text.map[payload.charNum]) {
                socket.emit('correct', { charNum: payload.charNum });
            }
            else {
                socket.emit('incorrect', { charNum: payload.charNum });
            }
        }
    });
    socket.on('disconnect', payload => {
        players -= 1;
        socket.broadcast.to('race').emit('someone-disconnected');
        if(players==0){
            mapId = getRandomInt(3);
            staus = 2;
            console.log('mapId:     ' + mapId);
            timeEnd = Date.parse(new Date);
            socket.broadcast.to('waiting').emit('transfer');
            socket.emit('start-timer', { time: 10, status: 2 });
            socket.broadcast.to('waiting').emit('start-timer', { time: 10, status: 2 });
            socket.broadcast.to('race').emit('start-timer', { time: 10, status: 2 });
        }
    })

});





function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
