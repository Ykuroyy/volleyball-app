const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = 'start'; // 'start', 'playing', 'serving', 'result'
let servePower = 0;
let message = '';

// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 30,
    height: 50,
    color: '#ff69b4'
};

// Ball
const ball = {
    startX: canvas.width / 2,
    startY: canvas.height - 75,
    x: canvas.width / 2,
    y: canvas.height - 75,
    radius: 10,
    color: '#ffd700',
    vx: 0, // velocity x
    vy: 0  // velocity y
};

// Power gauge
const powerGauge = {
    x: 20,
    y: canvas.height / 2 - 100,
    width: 20,
    height: 200,
    power: 0,
    direction: 1
};

function resetBall() {
    ball.x = ball.startX;
    ball.y = ball.startY;
    ball.vx = 0;
    ball.vy = 0;
}

function drawCourt() {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x - player.width / 2, player.y - player.height, player.width, player.height);
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
}

function drawPowerGauge() {
    ctx.strokeStyle = '#333';
    ctx.strokeRect(powerGauge.x, powerGauge.y, powerGauge.width, powerGauge.height);
    const powerHeight = (powerGauge.power / 100) * powerGauge.height;
    ctx.fillStyle = 'green';
    ctx.fillRect(powerGauge.x, powerGauge.y + powerGauge.height - powerHeight, powerGauge.width, powerHeight);
}

function updatePowerGauge() {
    powerGauge.power += 2 * powerGauge.direction;
    if (powerGauge.power > 100 || powerGauge.power < 0) {
        powerGauge.direction *= -1;
        powerGauge.power = Math.max(0, Math.min(100, powerGauge.power));
    }
}

function updateBallPosition() {
    ball.x += ball.vx;
    ball.y += ball.vy;
    // Add some gravity
    if (gameState === 'serving') {
        ball.vy += 0.1;
    }

    // Check for result
    if (ball.y > canvas.height / 2 && ball.vy > 0) { // After crossing the net
        if (ball.x > 0 && ball.x < canvas.width && ball.y < canvas.height) {
            // Still in the air on opponent side
        } else {
            // Ball is out or hit the ground
            gameState = 'result';
            if (ball.y < canvas.height / 2) { // Landed on own side
                 message = 'ミス！';
            } else if (ball.x < 0 || ball.x > canvas.width || ball.y > canvas.height) {
                message = 'アウト！';
            } else { // Landed in opponent court
                message = 'ナイスサーブ！';
            }
        }
    }
}

function drawMessage() {
    ctx.fillStyle = 'black';
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 60);
    ctx.font = '16px sans-serif';
    ctx.fillText('タップしてもう一度', canvas.width / 2, canvas.height / 2 - 30);
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCourt();
    drawPlayer();

    if (gameState === 'start') {
        ctx.fillStyle = 'black';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('タップしてサーブ練習開始！', canvas.width / 2, canvas.height / 2 - 40);
        drawBall();
    } else if (gameState === 'playing') {
        updatePowerGauge();
        drawPowerGauge();
        drawBall();
    } else if (gameState === 'serving') {
        updateBallPosition();
        drawBall();
    } else if (gameState === 'result') {
        drawBall();
        drawMessage();
    }

    requestAnimationFrame(gameLoop);
}

function serve() {
    servePower = powerGauge.power;
    gameState = 'serving';
    // Simple physics
    ball.vx = (Math.random() - 0.5) * 2; // a little random side movement
    ball.vy = -servePower / 10; // upward velocity based on power
}

canvas.addEventListener('click', () => {
    if (gameState === 'start') {
        gameState = 'playing';
    } else if (gameState === 'playing') {
        serve();
    } else if (gameState === 'result') {
        gameState = 'start';
        resetBall();
    }
});

gameLoop();