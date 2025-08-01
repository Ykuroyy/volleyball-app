
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
        gameStarted: false,
        gameState: 'serve' // 'serve', 'rally', 'playerToss', 'playerAttack', 'cpuToss', 'cpuAttack'
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

    // Player, Setter, Attacker properties
    const player = { id: 'player', x: canvas.width / 2, y: court.y + court.height * 0.85, radius: 15, color: '#ff3b30', role: 'receiver' };
    const setter = { id: 'setter', x: canvas.width * 0.7, y: court.y + court.height * 0.55, radius: 14, color: '#ff9500' };
    const attacker = { id: 'attacker', x: canvas.width * 0.3, y: court.y + court.height * 0.6, radius: 16, color: '#ff2d55' };

    const cpu = { id: 'cpu', x: canvas.width / 2, y: court.y + court.height * 0.25, radius: 15, color: '#007aff' };
    const cpuSetter = { id: 'cpuSetter', x: canvas.width * 0.7, y: court.y + court.height * 0.4, radius: 14, color: '#5856d6' };


    // --- Drawing Functions ---
    function drawCourt() {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(court.x, court.y, court.width, court.height);
        // Net
        ctx.beginPath();
        ctx.moveTo(court.x, court.netY);
        ctx.lineTo(court.x + court.width, court.netY);
        ctx.strokeStyle = '#aaa';
        ctx.stroke();
        // Net posts
        for(let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(court.x + (i * court.width/10), court.netY);
            ctx.lineTo(court.x + (i * court.width/10), court.netY - 30);
            ctx.stroke();
        }
    }

    function drawTeam() {
        [player, setter, attacker, cpu, cpuSetter].forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';

            // Role indicator
            if (p.id === 'player') {
                ctx.fillText(player.role === 'receiver' ? 'R' : 'A', p.x, p.y + 4);
            } else if (p.id === 'setter') {
                ctx.fillText('S', p.x, p.y + 4);
            } else if (p.id === 'attacker') {
                ctx.fillText('A', p.x, p.y + 4);
            }
        });
    }

    function drawBall() {
        // Shadow
        const shadowRadius = ball.radius * (1 + ball.z / 100);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, shadowRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
        // Ball
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
            ctx.fillText('タップしてゲーム開始', canvas.width / 2, canvas.height / 2);
        } else if (state.paused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '30px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('一時停止中', canvas.width / 2, canvas.height / 2);
        }
    }
    
    function drawTargetIndicator() {
        if (ball.vz < 0 && ball.z > 0) {
            const dropTime = (-ball.vz - Math.sqrt(ball.vz * ball.vz - 2 * ball.gravity * ball.z)) / ball.gravity;
            const dropX = ball.x + ball.vx * dropTime;
            const dropY = ball.y + ball.vy * dropTime;

            if (dropY > court.netY) { // Only show on player's side
                ctx.beginPath();
                ctx.arc(dropX, dropY, 10, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }


    let draggedPlayer = null;

    // --- Game Logic ---
    function update() {
        if (state.paused || !state.gameStarted || state.roundOver) return;

        // Ball physics
        ball.vz += ball.gravity;
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.z += ball.vz;

        // Ball hits ground
        if (ball.z < 0) {
            ball.z = 0;
            pointScored(ball.y > court.netY ? 'cpu' : 'player');
        }

        // Ball out of bounds (sideways)
        if (ball.x < court.x || ball.x > court.x + court.width) {
            pointScored(ball.y > court.netY ? 'cpu' : 'player');
        }
        // Ball out of bounds (long)
        if (ball.y < court.y || ball.y > court.y + court.height) {
            pointScored(ball.y > court.netY ? 'cpu' : 'player');
        }
        
        // Net collision
        if (Math.abs(ball.y - court.netY) < 5 && ball.z < 40) {
            ball.vy *= -0.5; // Dampen bounce off net
            ball.vx *= 0.8;
            ball.y += ball.vy;
        }

        // CPU logic
        updateCpuAi();

        // Collision checks
        handleCollisions();
    }

    

    function handleCollisions() {
        // Player team collisions
        const playerTeam = [player, setter, attacker];
        playerTeam.forEach(p => {
            if (checkCollision(p, ball)) {
                if (p.id === 'player') receive(p);
                else if (p.id === 'setter') toss(p, attacker);
                else if (p.id === 'attacker') attack(p, 'cpu');
            }
        });

        // CPU team collisions (still automatic)
        if (checkCollision(cpu, ball) && state.gameState === 'rally') {
            receive(cpu);
        }
        if (checkCollision(cpuSetter, ball) && state.gameState === 'cpuToss') {
            toss(cpuSetter, cpu);
        }
        if (state.gameState === 'cpuAttack') {
            const dx = ball.x - cpu.x;
            const dy = ball.y - cpu.y;
            if (Math.sqrt(dx*dx+dy*dy) < cpu.radius + 15 && ball.vz < 0 && ball.z < 70) {
                attack(cpu, 'player');
            }
        }
    }
    
    function attack(p, targetSide) {
        console.log(p.id, 'attacked');
        state.gameState = 'rally';
        
        const targetY = targetSide === 'cpu' ? court.y + 20 : court.y + court.height - 20;
        const targetX = court.x + 15 + Math.random() * (court.width - 30);

        const dx = targetX - ball.x;
        const dy = targetY - ball.y;
        
        const angle = Math.atan2(dy, dx);
        const speed = 8 + Math.random() * 2; // More powerful attack
        
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        ball.vz = 3; // Drive the ball downwards
    }


    function pointScored(winner) {
        if (state.roundOver) return;
        state.roundOver = true;

        if (winner === 'player') {
            state.playerScore++;
            playerScoreEl.textContent = state.playerScore;
        } else {
            state.cpuScore++;
            cpuScoreEl.textContent = state.cpuScore;
        }

        setTimeout(() => startNewRound(winner), 1000);
    }

    function startNewRound(lastWinner) {
        state.roundOver = false;
        state.gameState = 'serve';
        resetBall(lastWinner === 'player' ? 'cpu' : 'player');
    }

    function resetBall(server) {
        ball.z = 50;
        ball.vz = 0;
        
        if (server === 'player') {
            ball.x = player.x;
            ball.y = player.y - 20;
            ball.vx = (Math.random() - 0.5) * 2;
            ball.vy = -5; // Serve velocity
            state.gameState = 'rally';
        } else {
            ball.x = cpu.x;
            ball.y = cpu.y + 20;
            ball.vx = (Math.random() - 0.5) * 2;
            ball.vy = 5; // Serve velocity
            state.gameState = 'rally';
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
        drawTeam();
        drawBall();
        drawTargetIndicator();
        drawOverlay();
    }

    // --- Event Listeners ---
    function handleTouchStart(e) {
        e.preventDefault();
        if (!state.gameStarted) {
            state.gameStarted = true;
            startNewRound('cpu');
            return;
        }
        if (state.paused) return;

        const touch = e.touches ? e.touches[0] : e;
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        // Find which player is being touched
        const team = [player, setter, attacker];
        for (const p of team) {
            const dx = touchX - p.x;
            const dy = touchY - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < p.radius + 20) { // Generous touch area
                draggedPlayer = p;
                break;
            }
        }
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (!draggedPlayer || state.paused) return;

        const touch = e.touches ? e.touches[0] : e;
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        // Move the dragged player
        draggedPlayer.x = touchX;
        draggedPlayer.y = touchY;

        // Clamp position to their side of the court
        draggedPlayer.x = Math.max(draggedPlayer.radius + court.x, Math.min(draggedPlayer.x, court.x + court.width - draggedPlayer.radius));
        draggedPlayer.y = Math.max(court.netY + draggedPlayer.radius, Math.min(draggedPlayer.y, court.y + court.height - draggedPlayer.radius));
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        draggedPlayer = null;
    }

    function setupEventListeners() {
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        canvas.addEventListener('mousedown', handleTouchStart, { passive: false });
        canvas.addEventListener('mousemove', handleTouchMove, { passive: false });
        canvas.addEventListener('mouseup', handleTouchEnd, { passive: false });
        canvas.addEventListener('mouseleave', handleTouchEnd, { passive: false });

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
            player.role = 'receiver';
            pauseButton.textContent = '一時停止';
            startNewRound('cpu');
        });
    }

    // --- Initial Start ---
    setupEventListeners();
    gameLoop();
});
