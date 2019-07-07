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
        restoreAll();
        console.log('start');
        const token = localStorage.getItem('jwt');
        socket.emit('add-player');
        fetch('/game', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        }).then(res => {
            res.json().then(body => {
                socket.emit('someone-connected', { token: token });
                textField.innerHTML = body.currMap.map;
                currText = body.textId;
                currMapLength = body.currMap.map.length - 1;
            })
        })

    })
    socket.on('wait', ev => {
        textField.style.display = "none";
        waiting_timer.style.display = "block";
        waiting_timer.innerHTML = "999999999"
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
        socket.emit('progress-change', { currProgress: progress, token: localStorage.getItem('jwt') });
        if (progress == a.length + b.length) {
            socket.emit('player-finished', { token: localStorage.getItem('jwt') });
        }
    })
    socket.on('someone-progress-changed', payload => {
        document.getElementById(payload.token).value = payload.newProgress;
    })
    socket.on('someone-finished-race', ev=>{
        console.log('finished');
    })
    socket.on('race-finished', payload=>{
        hideAll();
    })
    socket.on('someone-new-connected', payload => {
        const newProgBar = document.createElement('progress');
        newProgBar.value = 0;
        newProgBar.max = currMapLength;
        newProgBar.id = payload.token;
        resultDiv.appendChild(newProgBar);
    })
    socket.on('incorrect', ev => { })
    socket.on('transfer', ev => {
        console.log('emmited transfer');
        socket.emit('to-room-race');
    })
    function hideAll(){
        entered.innerHTML = '';
        textField.innerHTML='';
        entered.style.display = 'none';
        textField.style.display = 'none';

    }
    function restoreAll(){
        entered.style.display='inline-block';
        textField.style.display='inline-block';
        waiting_timer.style.display='none';
        progress = 0;
        while (resultDiv.firstChild) {
            resultDiv.removeChild(resultDiv.firstChild);
        }
    }
}
