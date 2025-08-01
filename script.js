
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
    const setter = { id: 'setter', x: canvas.width * 0.7, y: court.y + court.height * 0.6, radius: 14, color: '#ff9500' };
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
            // Role indicator for player
            if (p.id === player.id) {
                ctx.fillStyle = 'white';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(player.role === 'receiver' ? 'R' : 'A', p.x, p.y + 4);
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

        // Player logic
        updatePlayer();
        // CPU logic
        updateCpuAi();

        // Collision checks
        handleCollisions();
        checkAutoAttack();
    }

    function updatePlayer() {
        // Player follows the ball's predicted drop location
        if (state.gameState === 'rally' && ball.y > court.netY) {
             player.role = 'receiver';
             moveTowardBall(player);
        }
        // After receive, setter moves to the ball
        if (state.gameState === 'playerToss') {
            player.role = 'attacker';
            moveTowardBall(setter);
            // Player moves to a precise attack position
            const targetAttackX = setter.x - 50; // Position slightly to the left of the setter
            const targetAttackY = setter.y + 20;
            player.x += (targetAttackX - player.x) * 0.15;
            player.y += (targetAttackY - player.y) * 0.15;
        }
    }

    function updateCpuAi() {
        if (state.gameState === 'rally' && ball.y < court.netY) {
            moveTowardBall(cpu);
        } else if (state.gameState === 'cpuToss') {
             moveTowardBall(cpuSetter);
             cpu.x += (cpu.x - cpu.x) * 0.1; // A bit of movement for cpu attacker
        }
    }

    function moveTowardBall(p) {
        if (ball.vz < 0 && ball.z > 0) { // Only move if ball is dropping
            const dropTime = (-ball.vz - Math.sqrt(ball.vz * ball.vz - 2 * ball.gravity * ball.z)) / ball.gravity;
            if (dropTime > 0) {
                const dropX = ball.x + ball.vx * dropTime;
                p.x += (dropX - p.x) * 0.12; // A bit faster reaction
                p.x = Math.max(p.radius + court.x, Math.min(p.x, court.x + court.width - p.radius));
            }
        } else { // If ball is rising, just track its X position
            p.x += (ball.x - p.x) * 0.1;
        }
    }

    function handleCollisions() {
        // Player receive
        if (checkCollision(player, ball) && state.gameState === 'rally') {
            receive(player);
        }

        // Setter toss
        if (checkCollision(setter, ball) && state.gameState === 'playerToss') {
            toss(setter, attacker); // Toss towards the attack position object
        }
        
        // CPU receive
        if (checkCollision(cpu, ball) && state.gameState === 'rally') {
            receive(cpu);
        }
        
        // CPU Setter toss
        if (checkCollision(cpuSetter, ball) && state.gameState === 'cpuToss') {
            toss(cpuSetter, cpu); // CPU itself is the attacker
        }
    }
    
    function checkAutoAttack() {
        // Automatic player attack
        if (state.gameState === 'playerAttack') {
            const dx = ball.x - player.x;
            const dy = ball.y - player.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Check if ball is close, descending, and at a hittable height
            if (dist < player.radius + 15 && ball.vz < 0 && ball.z > 35 && ball.z < 70) {
                attack(player, 'cpu');
            }
        }
        // Automatic CPU attack
        if (state.gameState === 'cpuAttack') {
            const dx = ball.x - cpu.x;
            const dy = ball.y - cpu.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < cpu.radius + 15 && ball.vz < 0 && ball.z > 35 && ball.z < 70) {
                attack(cpu, 'player');
            }
        }
    }


    function checkCollision(p, b) {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < p.radius + b.radius && b.z < p.radius * 2.5;
    }
    
    function receive(receiver) {
        console.log(receiver.id, 'received');
        const target = receiver.id === 'player' ? setter : cpuSetter;
        state.gameState = receiver.id === 'player' ? 'playerToss' : 'cpuToss';
        
        const dx = target.x - ball.x;
        const dy = target.y - ball.y;
        const angle = Math.atan2(dy, dx);
        const speed = 3.8; // Increased speed for more reliable receive
        
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        ball.vz = 8; // Pop the ball up higher for a more stable trajectory
    }

    function toss(tosser, targetAttacker) {
         console.log(tosser.id, 'tossed');
         state.gameState = tosser.id === 'setter' ? 'playerAttack' : 'cpuAttack';
         
         // Target the player's actual current position for a more dynamic toss
         const targetX = targetAttacker.x;
         const targetY = targetAttacker.y;

         const dx = targetX - ball.x;
         const dy = targetY - ball.y;
         
         const timeToTarget = 0.7; // A fixed time for the toss to reach the attacker
         
         ball.vx = dx / timeToTarget;
         ball.vy = dy / timeToTarget;
         // Calculate the required vertical velocity to reach a peak height of 80
         ball.vz = Math.sqrt(2 * -ball.gravity * (80 - ball.z));
    }

    function attack(attacker, targetSide) {
        console.log(attacker.id, 'attacked');
        state.gameState = 'rally';
        
        const targetY = targetSide === 'cpu' ? court.y + 20 : court.y + court.height - 20;
        const targetX = court.x + 15 + Math.random() * (court.width - 30); // Aim within the court

        const dx = targetX - ball.x;
        const dy = targetY - ball.y;
        
        const angle = Math.atan2(dy, dx);
        const speed = 7 + Math.random(); // Powerful hit
        
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        ball.vz = 2; // Drive the ball downwards
        
        // Reset player role after attack
        if(attacker.id === 'player') {
            player.role = 'receiver';
            // Reset position after a short delay
            setTimeout(() => {
                player.x = canvas.width / 2;
                player.y = court.y + court.height * 0.85;
            }, 300);
        }
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
    function handleUserMove(e) {
        e.preventDefault();
        if (!state.gameStarted || state.paused || player.role !== 'receiver') return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        let targetX = touch.clientX - rect.left;
        // Restrict movement to player's side
        player.x = Math.max(player.radius + court.x, Math.min(targetX, court.x + court.width - player.radius));
    }
    
    function handleUserTap(e) {
        e.preventDefault();
        if (!state.gameStarted) {
            state.gameStarted = true;
            startNewRound('cpu'); // CPU serves first
            return;
        }
        if (state.paused) return;

        // Attack is now automatic, so this function only handles starting the game.
    }

    function setupEventListeners() {
        canvas.addEventListener('touchstart', handleUserTap, { passive: false });
        canvas.addEventListener('mousedown', handleUserTap, { passive: false });
        
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
            player.role = 'receiver';
            pauseButton.textContent = '一時停止';
            startNewRound('cpu');
        });
    }

    // --- Initial Start ---
    setupEventListeners();
    gameLoop();
});
