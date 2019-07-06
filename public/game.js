window.onload = () => {

    const socket = io.connect("http://localhost:3000");
    const resultDiv = document.querySelector('#results');
    const entered = document.querySelector('#entered');
    const textField = document.querySelector('#to-enter');
    const waiting_timer = document.querySelector('#waiting-timer');
    let progress = 0;
    let currText = 0;
    let currMapLength = 0;
    window.addEventListener('keypress', ev => {
        console.log(ev.keyCode);
        socket.emit('keypressed', { keycode: ev.keyCode, charNum: progress, currTextId: currText });
    })

    socket.on('start', ev => {
        console.log(ev.raceStatus);
        if (ev.raceStatus === 0) {
            const token = localStorage.getItem('jwt');
            socket.emit('choose-room', {room: 'race'});
            fetch('/game', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            }).then(res => {
                res.json().then(body => {
                    socket.emit('someone-connected', {token: token});
                    textField.innerHTML = body.currMap.map;
                    currText = body.textId;
                    currMapLength = body.currMap.map.length-1;
                })
            })
        }
        if (ev.raceStatus === 1) {
            socket.emit('choose-room', {room: 'waiting'});
            textField.style.display = "none";
            waiting_timer.style.display = "block";
            waiting_timer.innerHTML = "999999999"
        }
    })
    socket.on('correct', ev => {
        let a = textField.innerHTML.split('');
        let b = entered.innerHTML;
        b = b + a[0];
        a.splice(0, 1);
        textField.innerHTML = a.join('');
        entered.innerHTML = b;
        progress += 1;
        document.getElementById(localStorage.getItem('jwt')).value = progress;
        socket.emit('progress-change', {currProgress: progress, token: localStorage.getItem('jwt')});
        if(progress==a.length + b.length){
            socket.emit('player-finished', {token:localStorage.getItem('jwt')});
        }
    })
    socket.on('someone-progress-changed', payload=>{
        document.getElementById(payload.token).value=payload.newProgress;
    })
    socket.on('someone-new-connected', payload =>{
        const newProgBar = document.createElement('progress');
        newProgBar.value = 0;
        newProgBar.max = currMapLength;
        newProgBar.id=payload.token;
        resultDiv.appendChild(newProgBar);
    })
    socket.on('incorrect', ev => { })
}
