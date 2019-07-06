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
let mapId = getRandomInt(3);
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
        const token = jwt.sign(userFromReq, "someSecret", { expiresIn: '24h' });
        res.status(200).json({ auth: true, token });
    } else {
        res.status(401).json({ auth: false })
    }
});
app.post('/game', function (req, res) {
    console.log(req.headers.authorization)
    
    const text = maps.find(map => map.id === mapId);
    res.json({ currMap: text, textId: mapId });
});


io.on('connection', function (socket) {
    socket.emit('start', { raceStatus: status });
    socket.on('choose-room', payload => {
        socket.join(payload.room);
        players = io.sockets.adapter.rooms['race'].length;
    })
    socket.on('player-finished', payload => {
        players -= 1;
        socket.broadcast.to('race').emit('someone-finished-race', { token: payload.token });
        if (players == 0) {
            socket.broadcast.to('race').emit('race-finished');
            status = 0;
            mapId = getRandomInt(3);
            socket.broadcast.to('race').emit('start', {raceStatus: 0});
            socket.emit('start', {raceStatus: 0});
        }
    })
    socket.on('someone-connected', payload => {
        socket.broadcast.to('race').emit('someone-new-connected', {token: payload.token});
        socket.emit('someone-new-connected', {token: payload.token});
    })
    socket.on('progress-change', payload => {
        socket.broadcast.to('race').emit('someone-progress-changed', { token: payload.token, newProgress: payload.currProgress });
    })
    socket.on('keypressed', payload => {
        status = 1;
        const text = maps.find(map => map.id === payload.currTextId);
        console.log(String.fromCharCode(payload.keycode) + "       " + text.map[payload.charNum]);
        if (String.fromCharCode(payload.keycode) === text.map[payload.charNum]) {
            socket.emit('correct', { charNum: payload.charNum });
        }
        else {
            socket.emit('incorrect', { charNum: payload.charNum });
        }
    });

});




function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}