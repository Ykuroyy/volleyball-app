    const restartButton = document.getElementById('restart-button');

    // Game state
    let playerScore = 0;
    let cpuScore = 0;
    let paused = false;
    let gameOver = false;
    let gameStarted = false; // To show instructions

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
        vx: 0, // velocity x
        vy: 0, // velocity y
        vz: 0, // velocity z (for height)
        gravity: -0.15, // Slower gravity
        color: 'white'
    };

    // Player properties
    const player = {
        x: canvas.width / 2,
        y: court.y + court.height * 0.75,
        radius: 15,
        color: '#ff3b30' // Player color
    };

    // CPU properties
    const cpu = {
        x: canvas.width / 2,
        y: court.y + court.height * 0.25,
        radius: 15,
        color: '#007aff' // CPU color
    };

    function drawCourt() {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        // Outer lines
        ctx.strokeRect(court.x, court.y, court.width, court.height);
        // Net
        ctx.beginPath();
        ctx.moveTo(court.x, court.netY);
        ctx.lineTo(court.x + court.width, court.netY);
        ctx.stroke();
    }

    function drawPlayer() {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
    }

    function drawCpu() {
        ctx.beginPath();
        ctx.arc(cpu.x, cpu.y, cpu.radius, 0, Math.PI * 2);
        ctx.fillStyle = cpu.color;
        ctx.fill();
    }

    function drawBall() {
        // Draw shadow first
        const shadowRadius = ball.radius * (1 + ball.z / 100);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, shadowRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y - ball.z, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.strokeStyle = '#ccc';
        ctx.stroke();
    }
    
    function drawInstructions() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('左右にスワイプして', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText('ボールを打ち返そう！', canvas.width / 2, canvas.height / 2 + 10);
        ctx.font = '16px sans-serif';
        ctx.fillText('(タップでスタート)', canvas.width / 2, canvas.height / 2 + 50);
    }

    function update() {
        if (paused || gameOver || !gameStarted) return;

        // Ball physics
        ball.vz += ball.gravity;
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.z += ball.vz;

        // Ball hits the ground
        if (ball.z < 0) {
            ball.z = 0;
            ball.vz *= -0.7; // Bounce

            if (ball.y > court.netY) { // Player's side
                pointScored('cpu');
            } else { // CPU's side
                pointScored('player');
            }
        }

        // Ball collision with walls
        if (ball.x - ball.radius < court.x || ball.x + ball.radius > court.x + court.width) {
            ball.vx *= -1;
        }
        if (ball.y - ball.radius < court.y || ball.y + ball.radius > court.y + court.height) {
            pointScored(ball.y > court.netY ? 'cpu' : 'player');
        }

        // Ball hits net
        if (ball.y > court.netY - 5 && ball.y < court.netY + 5 && ball.z < 40) { // Net is a bit higher
            ball.vy *= -1;
            ball.y += ball.vy;
        }

        // Player collision with ball
        handleCollision(player);

        // CPU AI
        updateCpuAi();
        handleCollision(cpu);

        // Render everything
        render();

        requestAnimationFrame(update);
    }
    
    function handleCollision(p) {
        const dx = ball.x - p.x;
        const dy = ball.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < p.radius + ball.radius && ball.z < 30) {
            // Hit the ball
            const angle = Math.atan2(dy, dx);
            const speed = 3.5; // Slower ball speed
            ball.vx = Math.cos(angle) * speed;
            ball.vy = Math.sin(angle) * speed;
            ball.vz = 6; // Lower pop up
        }
    }

    function updateCpuAi() {
        // Simple AI: move towards the ball's x position
        const targetX = ball.x;
        cpu.x += (targetX - cpu.x) * 0.07; // Slower CPU reaction

        // Clamp CPU position
        cpu.x = Math.max(cpu.radius + court.x, Math.min(cpu.x, court.x + court.width - cpu.radius));
    }

    function pointScored(winner) {
        if (winner === 'player') {
            playerScore++;
            playerScoreEl.textContent = playerScore;
            resetBall('cpu');
        } else {
            cpuScore++;
            cpuScoreEl.textContent = cpuScore;
            resetBall('player');
        }
        // Check for game over can be added here
    }

    function resetBall(server) {
        ball.z = 80;
        ball.vz = 0;
        ball.vx = (Math.random() - 0.5) * 3; // Slower serve speed

        if (server === 'player') {
            ball.x = player.x;
            ball.y = player.y - player.radius - 10;
            ball.vy = -4; // Slower serve forward
        } else {
            ball.x = cpu.x;
            ball.y = cpu.y + cpu.radius + 10;
            ball.vy = 4; // Slower serve forward
        }
    }

    function render() {
        // Clear canvas
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawCourt();
        drawPlayer();
        drawCpu();
        drawBall();
        
        if (!gameStarted) {
            drawInstructions();
        }

        if (paused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '30px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('一時停止中', canvas.width / 2, canvas.height / 2);
        }
    }

    // --- Event Listeners ---
    function handleTouchMove(e) {
        e.preventDefault();
        if (!gameStarted) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const touchX = touch.clientX - rect.left;
        
        // Update player position based on touch
        player.x = touchX;

        // Clamp player position to their side of the court
        player.x = Math.max(player.radius + court.x, Math.min(player.x, court.x + court.width - player.radius));
    }
    
    function handleCanvasClick() {
        if (!gameStarted) {
            gameStarted = true;
            resetBall('player');
            update();
        }
    }

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('mousemove', (e) => {
        // Also allow mouse control for desktop
        if (e.buttons === 1 && gameStarted) { // if left mouse button is held down
            const rect = canvas.getBoundingClientRect();
            player.x = e.clientX - rect.left;
            player.x = Math.max(player.radius + court.x, Math.min(player.x, court.x + court.width - player.radius));
        }
    });

    pauseButton.addEventListener('click', () => {
        if (!gameStarted) return;
        paused = !paused;
        pauseButton.textContent = paused ? '再開' : '一時停止';
        if (!paused) {
            update(); // Resume game loop
        }
    });

    restartButton.addEventListener('click', () => {
        playerScore = 0;
        cpuScore = 0;
        playerScoreEl.textContent = playerScore;
        cpuScoreEl.textContent = cpuScore;
        paused = false;
        gameOver = false;
        gameStarted = true; // Go directly into the game
        pauseButton.textContent = '一時停止';
        resetBall('player');
        if (!paused) {
             update();
        }
    });

    // --- Initial Start ---
    render();
    drawInstructions();
});