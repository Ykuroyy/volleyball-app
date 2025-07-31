document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // DOM Elements
    const playerScoreEl = document.getElementById('player-score');
    const cpuScoreEl = document.getElementById('cpu-score');
    const pauseButton = document.getElementById('pause-button');
    const restartButton = document.getElementById('restart-button');

    // Game state
    let state = {
        playerScore: 0,
        cpuScore: 0,
        paused: false,
        roundOver: false,
        gameStarted: false
    };

    // Court dimensions
    const court = {
        x: 10,
        y: 10,
        width: canvas.width - 20,
        height: canvas.height - 20,
        netY: canvas.height / 2
    };

    // Ball properties
    const ball = {
        x: canvas.width / 2,
        y: canvas.height * 0.75,
        z: 0, // Height off the ground
        radius: 8,
        vx: 0, vy: 0, vz: 0,
        gravity: -0.15,
        color: 'white'
    };

    // Player & CPU properties
    const player = { x: canvas.width / 2, y: court.y + court.height * 0.75, radius: 15, color: '#ff3b30' };
    const cpu = { x: canvas.width / 2, y: court.y + court.height * 0.25, radius: 15, color: '#007aff' };

    // --- Drawing Functions ---
    function drawCourt() {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(court.x, court.y, court.width, court.height);
        ctx.beginPath();
        ctx.moveTo(court.x, court.netY);
        ctx.lineTo(court.x + court.width, court.netY);
        ctx.stroke();
    }

    function drawPlayers() {
        [player, cpu].forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
    }

    function drawBall() {
        const shadowRadius = ball.radius * (1 + ball.z / 100);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, shadowRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ball.x, ball.y - ball.z, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.strokeStyle = '#ccc';
        ctx.stroke();
    }

    function drawOverlay() {
        if (!state.gameStarted) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('左右にスワイプして', canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillText('ボールを打ち返そう！', canvas.width / 2, canvas.height / 2 + 10);
            ctx.font = '16px sans-serif';
            ctx.fillText('(タップでスタート)', canvas.width / 2, canvas.height / 2 + 50);
        } else if (state.paused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '30px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('一時停止中', canvas.width / 2, canvas.height / 2);
        }
    }

    // --- Game Logic ---
    function update() {
        if (state.paused || !state.gameStarted || state.roundOver) return;

        ball.vz += ball.gravity;
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.z += ball.vz;

        if (ball.z < 0) {
            ball.z = 0;
            ball.vz *= -0.7;
            pointScored(ball.y > court.netY ? 'cpu' : 'player');
        }

        if (ball.x - ball.radius < court.x || ball.x + ball.radius > court.x + court.width) {
            ball.vx *= -1;
        }
        if (ball.y - ball.radius < court.y || ball.y + ball.radius > court.y + court.height) {
            pointScored(ball.y > court.netY ? 'cpu' : 'player');
        }

        if (ball.y > court.netY - 5 && ball.y < court.netY + 5 && ball.z < 40) {
            ball.vy *= -1;
            ball.y += ball.vy;
        }

        handleCollision(player);
        updateCpuAi();
        handleCollision(cpu);
    }

    function handleCollision(p) {
        const dx = ball.x - p.x;
        const dy = ball.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < p.radius + ball.radius && ball.z < 30) {
            const angle = Math.atan2(dy, dx);
            const speed = 3.5;
            ball.vx = Math.cos(angle) * speed;
            ball.vy = Math.sin(angle) * speed;
            ball.vz = 6;
        }
    }

    function updateCpuAi() {
        const targetX = ball.x;
        cpu.x += (targetX - cpu.x) * 0.07;
        cpu.x = Math.max(cpu.radius + court.x, Math.min(cpu.x, court.x + court.width - cpu.radius));
    }

    function pointScored(winner) {
        if (state.roundOver) return; // Prevent multiple scores per round
        state.roundOver = true;

        if (winner === 'player') {
            state.playerScore++;
            playerScoreEl.textContent = state.playerScore;
        } else {
            state.cpuScore++;
            cpuScoreEl.textContent = state.cpuScore;
        }

        setTimeout(() => startNewRound(winner), 1500);
    }

    function startNewRound(lastWinner) {
        resetBall(lastWinner === 'player' ? 'cpu' : 'player');
        state.roundOver = false;
    }

    function resetBall(server) {
        ball.z = 80;
        ball.vz = 0;
        ball.vx = (Math.random() - 0.5) * 3;

        if (server === 'player') {
            ball.x = player.x;
            ball.y = player.y - player.radius - 10;
            ball.vy = -4;
        } else {
            ball.x = cpu.x;
            ball.y = cpu.y + cpu.radius + 10;
            ball.vy = 4;
        }
    }

    // --- Main Loop ---
    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }

    function render() {
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawCourt();
        drawPlayers();
        drawBall();
        drawOverlay();
    }

    // --- Event Listeners ---
    function handleUserMove(e) {
        e.preventDefault();
        if (!state.gameStarted || state.paused) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        player.x = touch.clientX - rect.left;
        player.x = Math.max(player.radius + court.x, Math.min(player.x, court.x + court.width - player.radius));
    }

    function handleCanvasClick() {
        if (!state.gameStarted) {
            state.gameStarted = true;
            startNewRound('cpu'); // CPU serves first
        }
    }
    
    function setupEventListeners() {
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('touchmove', handleUserMove, { passive: false });
        canvas.addEventListener('mousemove', (e) => { if (e.buttons === 1) handleUserMove(e); });

        pauseButton.addEventListener('click', () => {
            if (!state.gameStarted) return;
            state.paused = !state.paused;
            pauseButton.textContent = state.paused ? '再開' : '一時停止';
        });

        restartButton.addEventListener('click', () => {
            state.playerScore = 0;
            state.cpuScore = 0;
            playerScoreEl.textContent = 0;
            cpuScoreEl.textContent = 0;
            state.paused = false;
            state.roundOver = false;
            state.gameStarted = true;
            pauseButton.textContent = '一時停止';
            startNewRound('cpu');
        });
    }

    // --- Initial Start ---
    setupEventListeners();
    gameLoop();
});