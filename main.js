
// --- CẤU HÌNH DATA ---

// Danh sách nhân vật (Đã đổi thành Icon đầu người)
const charactersDB = [
    { id: 'ninja', name: 'Ninja Lead', emoji: '🧕', desc: 'Trùm kín mít, huyền thoại đường phố.', speedRating: 1 },
    { id: 'shipper', name: 'Anh Shipper', emoji: '🧢', desc: 'Giao hàng bất chấp nắng mưa.', speedRating: 1.1 },
    { id: 'racing', name: 'Racing Boy', emoji: '👱', desc: 'Tóc vàng lãng tử, nẹt pô inh ỏi.', speedRating: 1.3 },
    { id: 'xeom', name: 'Chú Xe Ôm', emoji: '👴', desc: 'Tay lái già dặn, thuộc mọi ngóc ngách.', speedRating: 1.05 }
];

// Cấu hình màn chơi
const levelsDB = [
    { distance: 2000, ninjaFreq: 1000 },
    { distance: 4000, ninjaFreq: 700 },
    { distance: 6000, ninjaFreq: 500 },
    { distance: 10000, ninjaFreq: 300 }
];

// --- GLOBAL VARIABLES ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// State
let gameRunning = false;
let score = 0;
let distance = 0;
let speed = 5;
let frames = 0;
let lastTime = 0;
let lives = 3; // Mạng sống
let isInvincible = false; // Bất tử tạm thời sau khi va chạm
let invincibleTimer = 0;

// Persistent Data
let unlockedChars = JSON.parse(localStorage.getItem('ninja_unlocks')) || ['ninja'];
let selectedCharId = 'ninja';
let currentLevelIndex = 0;

// Ninja Mode
let isNinjaMode = false;
let ninjaModeTimer = 0;

// Player & Objects
// Tăng tốc độ ngang (speed 7 -> 9) để mượt hơn
const player = { x: 0, y: 0, width: 50, height: 50, emoji: '🧕', speed: 9 };
let obstacles = [];
const obstaclesList = ["🐔", "🐶", "🚗", "🚲", "🚧", "🛑", "🕳️"];

// Inputs
let leftPressed = false;
let rightPressed = false;

// --- HỆ THỐNG MENU ---

function initMenu() {
    const listEl = document.getElementById('character-list');
    listEl.innerHTML = '';

    charactersDB.forEach((char, index) => {
        const isUnlocked = unlockedChars.includes(char.id);
        const isSelected = char.id === selectedCharId;

        const btn = document.createElement('div');
        btn.className = `flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer transition bg-gray-700 hover:bg-gray-600 ${isUnlocked ? '' : 'locked'} ${isSelected ? 'selected-char' : ''}`;
        btn.onclick = () => selectCharacter(char.id);

        btn.innerHTML = `
                    <div class="text-4xl mb-1 drop-shadow-lg">${char.emoji}</div>
                    <div class="text-xs font-bold text-center">${char.name}</div>
                    ${!isUnlocked ? `<div class="text-[10px] text-red-400 mt-1">Màn ${index + 1}</div>` : ''}
                `;
        listEl.appendChild(btn);
    });

    currentLevelIndex = Math.min(unlockedChars.length - 1, levelsDB.length - 1);
    if (unlockedChars.length >= charactersDB.length) {
        currentLevelIndex = Math.min(unlockedChars.length - 1, levelsDB.length - 1);
    }
}

function selectCharacter(id) {
    if (!unlockedChars.includes(id)) return;
    selectedCharId = id;

    const char = charactersDB.find(c => c.id === id);
    document.getElementById('selected-name').innerText = char.name;
    document.getElementById('selected-desc').innerText = char.desc;

    initMenu();
}

function returnToMenu() {
    gameRunning = false;
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    initMenu();
}

// --- LOGIC GAME ---

function resizeCanvas() {
    const maxWidth = 500;
    const width = Math.min(window.innerWidth, maxWidth);
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    // Reset vars
    score = 0;
    distance = 0;
    frames = 0;
    lives = 3; // Reset máu
    obstacles = [];
    leftPressed = false;
    rightPressed = false;
    isNinjaMode = false;
    isInvincible = false;

    document.getElementById('ninja-warning').classList.add('hidden');
    document.body.classList.remove('bg-red-900');
    canvas.classList.remove('ninja-mode-active');

    updateLivesUI();

    const charData = charactersDB.find(c => c.id === selectedCharId);
    player.emoji = charData.emoji;
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 120; // Cao hơn chút để nhìn rõ

    currentLevelIndex = Math.min(unlockedChars.length - 1, levelsDB.length - 1);
    let levelData = levelsDB[currentLevelIndex];

    speed = 5 * charData.speedRating;

    document.getElementById('current-level-display').innerText = currentLevelIndex + 1;

    gameRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function updateLivesUI() {
    let hearts = "";
    for (let i = 0; i < lives; i++) hearts += "❤️";
    for (let i = lives; i < 3; i++) hearts += "🖤"; // Tim đen khi mất
    document.getElementById('lives-display').innerText = hearts;
}

// --- INPUT HANDLING (Đã cải tiến cho đỡ khựng) ---

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') leftPressed = true;
    if (e.key === 'ArrowRight') rightPressed = true;
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') leftPressed = false;
    if (e.key === 'ArrowRight') rightPressed = false;
});

// Touch Controls: Thêm touchmove để mượt hơn
canvas.addEventListener('touchstart', handleTouch, { passive: false });
canvas.addEventListener('touchmove', handleTouch, { passive: false });

function handleTouch(e) {
    e.preventDefault();
    // Lấy vị trí touch đầu tiên
    const touchX = e.touches[0].clientX;
    const rect = canvas.getBoundingClientRect();

    // Chuyển đổi tọa độ màn hình sang tọa độ canvas
    const scaleX = canvas.width / rect.width;
    const canvasTouchX = (touchX - rect.left) * scaleX;

    const middle = canvas.width / 2;

    // Logic đơn giản: Touch bên trái thì sang trái, phải thì sang phải
    // Reset trước
    leftPressed = false;
    rightPressed = false;

    if (canvasTouchX < middle) {
        leftPressed = true;
    } else {
        rightPressed = true;
    }
}

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    // Nếu nhấc hết ngón tay thì dừng
    if (e.touches.length === 0) {
        leftPressed = false;
        rightPressed = false;
    }
});

// Loop
function gameLoop(timestamp) {
    if (!gameRunning) return;

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    frames++;
    score++;
    distance += speed * 0.1;

    // Xử lý bất tử
    if (isInvincible) {
        invincibleTimer--;
        if (invincibleTimer <= 0) isInvincible = false;
    }

    const currentLevelData = levelsDB[currentLevelIndex];
    const maxDist = currentLevelData.distance;

    // Check Win
    if (distance >= maxDist) {
        levelComplete();
        return;
    }

    // Update UI
    const percent = Math.min((distance / maxDist) * 100, 100);
    document.getElementById('progress-bar').style.width = `${percent}%`;
    document.getElementById('score').innerText = Math.floor(score / 10);

    // Tăng tốc
    if (frames % 600 === 0) speed += 0.2;

    // Ninja Mode
    if (frames % currentLevelData.ninjaFreq === 0 && !isNinjaMode) {
        activateNinjaMode();
    }
    if (isNinjaMode) {
        ninjaModeTimer--;
        if (ninjaModeTimer <= 0) deactivateNinjaMode();
    }

    // Spawn Obstacles & Hearts
    if (frames % 50 === 0) {
        let obs = new Obstacle();
        obstacles.push(obs);
    }

    // Background Scroll
    canvas.style.backgroundPositionY = (frames * speed) + "px";

    // Player Movement
    handlePlayerMovement();

    // Draw Player
    ctx.save();
    // Hiệu ứng nhấp nháy khi bị thương
    if (isInvincible && Math.floor(frames / 5) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }

    // Nghiêng người
    if ((isNinjaMode ? rightPressed : leftPressed) && player.x > 0) ctx.rotate(-0.1);
    if ((isNinjaMode ? leftPressed : rightPressed) && player.x < canvas.width) ctx.rotate(0.1);

    ctx.font = "60px Arial";
    ctx.textAlign = "left";
    // Vẽ thân xe (giả lập) bên dưới đầu
    ctx.fillText("🛵", player.x, player.y + 60);
    // Vẽ đầu nhân vật
    ctx.fillText(player.emoji, player.x + 5, player.y + 20);

    ctx.restore();

    // Obstacles Loop
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.update();
        obs.draw();

        // Collision Detection
        // Thu nhỏ hitbox một chút cho dễ thở
        if (
            player.x < obs.x + obs.size - 15 &&
            player.x + player.width > obs.x + 15 &&
            player.y < obs.y + obs.size - 15 &&
            player.y + player.height > obs.y + 15
        ) {
            if (obs.type === 'powerup') {
                // Ăn Trà Sữa
                score += 500;
                obstacles.splice(i, 1);
                i--;
            } else if (obs.type === 'heart') {
                // Ăn Tim (Hồi máu)
                if (lives < 3) {
                    lives++;
                    updateLivesUI();
                } else {
                    score += 1000; // Full máu thì cộng điểm
                }
                obstacles.splice(i, 1);
                i--;
            } else {
                // Tông trúng chướng ngại vật
                if (!isInvincible) {
                    handleCollision(obs.emoji);
                    // Xóa vật cản đó luôn để không bị trừ máu tiếp
                    obstacles.splice(i, 1);
                    i--;
                }
            }
        }

        // Remove off-screen
        if (obs.y > canvas.height) {
            obstacles.splice(i, 1);
            i--;
        }
    }

    requestAnimationFrame(gameLoop);
}

function handlePlayerMovement() {
    let moveLeft = leftPressed;
    let moveRight = rightPressed;

    if (isNinjaMode) {
        moveLeft = rightPressed;
        moveRight = leftPressed;
    }

    if (moveLeft && player.x > -20) { // Cho phép lấn lề một xíu
        player.x -= player.speed;
    } else if (moveRight && player.x < canvas.width - player.width + 20) {
        player.x += player.speed;
    }
}

class Obstacle {
    constructor() {
        this.size = 40 + Math.random() * 20;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;

        const rand = Math.random();

        // 5% cơ hội ra Tim, 10% ra Trà Sữa, còn lại là Chướng ngại vật
        if (rand < 0.05) {
            this.type = 'heart';
            this.emoji = "💖";
            this.isPowerup = true;
        } else if (rand < 0.15) {
            this.type = 'powerup';
            this.emoji = "🧋";
            this.isPowerup = true;
        } else {
            this.type = 'obstacle';
            this.emoji = obstaclesList[Math.floor(Math.random() * obstaclesList.length)];
            this.isPowerup = false;
        }

        this.horizontalMove = !this.isPowerup && Math.random() < 0.3;
        this.dx = this.horizontalMove ? (Math.random() < 0.5 ? -2 : 2) : 0;
    }
    update() {
        this.y += speed;
        this.x += this.dx;
        if (this.x <= 0 || this.x + this.size >= canvas.width) this.dx *= -1;
    }
    draw() {
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = "center";
        // Tim thì vẽ thêm hiệu ứng bóng
        if (this.type === 'heart') {
            ctx.shadowColor = "red";
            ctx.shadowBlur = 10;
        } else {
            ctx.shadowBlur = 0;
        }
        ctx.fillText(this.emoji, this.x + this.size / 2, this.y + this.size / 1.2);
        ctx.shadowBlur = 0; // Reset
    }
}

// --- EVENTS & LOGIC MỚI ---

function handleCollision(cause) {
    lives--;
    updateLivesUI();

    // Kích hoạt bất tử
    isInvincible = true;
    invincibleTimer = 90; // 1.5 giây (60fps)

    // Rung màn hình nhẹ
    canvas.style.transform = "translate(5px, 0)";
    setTimeout(() => canvas.style.transform = "none", 50);

    if (lives <= 0) {
        gameOver(cause);
    }
}

function activateNinjaMode() {
    isNinjaMode = true;
    ninjaModeTimer = 300;
    document.getElementById('ninja-warning').classList.remove('hidden');
    document.body.classList.add('bg-red-900');
    canvas.classList.add('ninja-mode-active');
}

function deactivateNinjaMode() {
    isNinjaMode = false;
    document.getElementById('ninja-warning').classList.add('hidden');
    document.body.classList.remove('bg-red-900');
    canvas.classList.remove('ninja-mode-active');
}

function gameOver(cause) {
    gameRunning = false;
    deactivateNinjaMode();
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    let reasonText = "Bạn đã hết mạng bởi " + cause;
    document.getElementById('final-reason').innerText = reasonText;
}

function levelComplete() {
    gameRunning = false;
    deactivateNinjaMode();

    const nextCharIndex = currentLevelIndex + 1;
    let justUnlocked = false;
    let unlockedName = "";
    let unlockedEmoji = "";

    if (nextCharIndex < charactersDB.length) {
        const charToUnlock = charactersDB[nextCharIndex];
        if (!unlockedChars.includes(charToUnlock.id)) {
            unlockedChars.push(charToUnlock.id);
            localStorage.setItem('ninja_unlocks', JSON.stringify(unlockedChars));
            justUnlocked = true;
            unlockedName = charToUnlock.name;
            unlockedEmoji = charToUnlock.emoji;
        }
    }

    document.getElementById('hud').classList.add('hidden');
    const vicScreen = document.getElementById('victory-screen');
    vicScreen.classList.remove('hidden');

    const unlockMsg = document.getElementById('unlock-message');
    if (justUnlocked) {
        unlockMsg.classList.remove('hidden');
        document.getElementById('new-char-name').innerText = unlockedName;
        document.getElementById('new-char-icon').innerText = unlockedEmoji;
    } else {
        unlockMsg.classList.add('hidden');
    }
}

initMenu();
