
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Objects ---

// The ball
const ball = {
    x: 0,
    y: 0,
    radius: 8,
    color: '#ffd700',
    vx: 0,
    vy: 0,
    gravity: 0.2,
    rotation: 0,
    reset: function() {
        this.x = canvas.width / 4;
        this.y = canvas.height / 2;
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
    }
};

// A generic player/character
function createPlayer(x, y, color) {
    return {
        x: x,
        y: y,
        width: 30,
        height: 50,
        color: color,
        draw: function() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
        }
    };
}

const playerTeam = {
    receiver: createPlayer(canvas.width * 0.75, canvas.height - 20, '#ff69b4'),
    spiker: createPlayer(canvas.width * 0.6, canvas.height - 20, '#ff1493')
};

const cpuTeam = {
    receiver: createPlayer(canvas.width * 0.25, canvas.height - 20, '#4169e1'),
};


// --- Game State & Logic ---

let gameState = 'CPU_SERVE'; // CPU_SERVE, PLAYER_RECEIVE, PLAYER_SPIKE, CPU_RETURN, GAME_OVER
let playerScore = 0;
let cpuScore = 0;
let message = 'ゲーム開始！';
let messageTimeout = 0;

// --- Drawing Functions ---

function drawCourt() {
    // Floor
    ctx.fillStyle = '#f4a460'; // Wooden floor color
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    // Net
    ctx.fillStyle = '#333';
    ctx.fillRect(canvas.width / 2 - 2, canvas.height / 2, 4, canvas.height / 2 - 20);
}

function drawBall() {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
    ctx.restore();
}

function drawScores() {
    ctx.fillStyle = 'black';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`YOU: ${playerScore}`, 10, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`CPU: ${cpuScore}`, canvas.width - 10, 30);
}

function drawMessage() {
    if (messageTimeout > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 3);
    }
}


// --- Game Loop & Updates ---

function update() {
    // Ball physics
    ball.vy += ball.gravity;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.rotation += ball.vx * 0.05; // Spin based on horizontal speed

    // State-specific logic
    handleGameState();

    // Decrease message timer
    if (messageTimeout > 0) {
        messageTimeout--;
    }
}

function handleGameState() {
    // Ball hits the ground
    if (ball.y + ball.radius > canvas.height - 20) {
        ball.y = canvas.height - 20 - ball.radius; // place it on the ground
        ball.vy *= -0.6; // bounce
        ball.vx *= 0.9; // friction

        if (ball.x > canvas.width / 2) { // Fell on player's side
            cpuScore++;
            setMessage('CPUのポイント！');
            resetRound('CPU_SERVE');
        } else { // Fell on CPU's side
            playerScore++;
            setMessage('ナイス！');
            resetRound('PLAYER_SERVE_START'); // For now, CPU serves again
        }
    }

    // Ball hits the net
    if (ball.x > canvas.width / 2 - ball.radius && ball.x < canvas.width / 2 + ball.radius && ball.y > canvas.height / 2) {
        ball.vx *= -1; // Bounce off the net
        ball.x += ball.vx;
    }
    
    // Ball goes out of bounds
    if (ball.x < 0 || ball.x > canvas.width) {
         if (ball.vx > 0) { // CPU hit it out
            playerScore++;
            setMessage('アウト！');
         } else { // Player hit it out
            cpuScore++;
            setMessage('アウト！');
         }
         resetRound('CPU_SERVE');
    }
}

function setMessage(msg) {
    message = msg;
    messageTimeout = 120; // Show message for 2 seconds (60fps * 2)
}

function resetRound(nextState) {
    gameState = 'PAUSED'; // Pause briefly before next round
    setTimeout(() => {
        ball.reset();
        // For now, CPU always serves
        cpuServe();
    }, 1500);
}


function cpuServe() {
    gameState = 'CPU_SERVE';
    ball.x = canvas.width * 0.25;
    ball.y = canvas.height / 3;
    ball.vx = 3 + Math.random(); // Serve towards player
    ball.vy = 2 + Math.random();
    setMessage('相手のサーブ！');
}

function playerReceive() {
    // Check if tap is timed well
    const receiveZoneY = canvas.height * 0.75;
    if (ball.y > receiveZoneY - 30 && ball.y < receiveZoneY + 30) {
        gameState = 'PLAYER_TOSS';
        setMessage('レシーブ！');
        // Pop the ball up for the spiker (toss)
        ball.vx = -1.5; // Send it towards the spiker/net
        ball.vy = -7;   // Pop it up high
    } else {
        // Missed receive
        cpuScore++;
        setMessage('レシーブミス！');
        resetRound('CPU_SERVE');
    }
}

function playerSpike() {
    // Check if tap is timed well for a spike
    const spikeZoneX = canvas.width * 0.55;
    const spikeZoneY = canvas.height / 2;
     if (ball.x > spikeZoneX && ball.y < spikeZoneY + 30 && ball.y > spikeZoneY - 30) {
        gameState = 'CPU_RETURN';
        setMessage('スパイク！');
        // Hit the ball hard over the net
        ball.vx = -6; // Strong hit
        ball.vy = 2;  // Downward angle
     } else {
        // Missed spike
        cpuScore++;
        setMessage('スパイクミス！');
        resetRound('CPU_SERVE');
     }
}

// --- Main Loop ---

function gameLoop() {
    // Clear canvas
    ctx.fillStyle = '#87ceeb'; // Sky blue background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw elements
    drawCourt();
    playerTeam.receiver.draw();
    // playerTeam.spiker.draw(); // Spiker logic can be added later
    cpuTeam.receiver.draw();
    drawBall();
    drawScores();
    drawMessage();

    // Update state
    update();

    requestAnimationFrame(gameLoop);
}

// --- Event Listener ---

canvas.addEventListener('click', (e) => {
    if (gameState === 'PAUSED') return;

    // Determine which action to take based on ball position
    if (ball.vx > 0 && ball.x > canvas.width / 2) { // Ball is coming towards player
        playerReceive();
    } else if (ball.vx < 0 && ball.x > canvas.width / 2) { // Ball is on player side, going up for a spike
        playerSpike();
    }
});


// --- Start Game ---
setMessage('タップして開始');
setTimeout(cpuServe, 2000);
gameLoop();
