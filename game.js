class Snake {
    constructor(game) {
        this.game = game;
        this.reset();
    }

    reset() {
        this.body = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.speed = 200;
        this.firstMove = false;
    }

    update() {
        if (!this.firstMove) {
            return;
        }

        this.direction = this.nextDirection;
        const head = { x: this.body[0].x, y: this.body[0].y };

        switch (this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // 检查碰撞
        if (this.checkCollision(head)) {
            this.game.gameOver();
            return;
        }

        this.body.unshift(head);

        // 检查是否吃到食物
        if (head.x === this.game.food.x && head.y === this.game.food.y) {
            // 根据难度增加分数
            this.game.score += 10 * this.game.currentDifficulty.scoreMultiplier;
            this.game.updateScore();
            this.game.generateFood();
            
            // 根据难度增加长度
            for (let i = 1; i < this.game.currentDifficulty.growthRate; i++) {
                this.body.push({ ...this.body[this.body.length - 1] });
            }
            
            this.increaseSpeed();
        } else {
            this.body.pop();
        }
    }

    checkCollision(head) {
        // 检查墙壁碰撞
        if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
            return true;
        }

        // 检查自身碰撞
        return this.body.some(segment => segment.x === head.x && segment.y === head.y);
    }

    increaseSpeed() {
        // 根据难度调整速度增加的幅度
        const speedIncrease = {
            easy: 4,     // 简单模式每次加快2ms
            normal: 8,   // 中等模式每次加快4ms
            hard: 12      // 困难模式每次加快6ms
        };

        // 获取当前难度
        const currentLevel = Object.keys(this.game.difficulties).find(
            key => this.game.difficulties[key] === this.game.currentDifficulty
        );

        // 计算新速度
        const decrease = speedIncrease[currentLevel];
        this.speed = Math.max(50, this.speed - decrease); // 最快不超过50ms
    }

    draw(ctx) {
        this.body.forEach((segment, index) => {
            if (index === 0) {
                // 蛇头
                const headX = segment.x * 20 + 10;
                const headY = segment.y * 20 + 10;
                
                // 蛇头主体
                this.ctx.fillStyle = '#00acc1';
                this.ctx.beginPath();
                this.ctx.arc(headX, headY, 9, 0, Math.PI * 2);
                this.ctx.fill();

                // 眼睛
                this.ctx.fillStyle = 'white';
                const eyeOffset = 3;
                let eyeX1, eyeX2, eyeY1, eyeY2;
                
                switch(this.direction) {
                    case 'right':
                        eyeX1 = eyeX2 = headX + 3;
                        eyeY1 = headY - 3;
                        eyeY2 = headY + 3;
                        break;
                    case 'left':
                        eyeX1 = eyeX2 = headX - 3;
                        eyeY1 = headY - 3;
                        eyeY2 = headY + 3;
                        break;
                    case 'up':
                        eyeX1 = headX - 3;
                        eyeX2 = headX + 3;
                        eyeY1 = eyeY2 = headY - 3;
                        break;
                    case 'down':
                        eyeX1 = headX - 3;
                        eyeX2 = headX + 3;
                        eyeY1 = eyeY2 = headY + 3;
                        break;
                }
                
                this.ctx.beginPath();
                this.ctx.arc(eyeX1, eyeY1, 2, 0, Math.PI * 2);
                this.ctx.arc(eyeX2, eyeY2, 2, 0, Math.PI * 2);
                this.ctx.fill();

                // 瞳孔
                this.ctx.fillStyle = '#006064';
                this.ctx.beginPath();
                this.ctx.arc(eyeX1, eyeY1, 1, 0, Math.PI * 2);
                this.ctx.arc(eyeX2, eyeY2, 1, 0, Math.PI * 2);
                this.ctx.fill();

            } else {
                // 蛇身
                this.ctx.fillStyle = `hsl(${187 + index * 2}, 100%, ${60 - index * 1}%)`;
                this.ctx.beginPath();
                this.ctx.roundRect(
                    segment.x * 20 + 1,
                    segment.y * 20 + 1,
                    18,
                    18,
                    5
                );
                this.ctx.fill();
            }
        });
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 30; // 每个格子的大小
        this.gridCount = 20; // 网格数量
        this.snake = new Snake(this);
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        this.startTime = 0;
        this.gameTime = 0;
        this.isRunning = false;
        this.isPaused = false;

        // 难度设置
        this.difficulties = {
            easy: {
                name: '简单',
                growthRate: 1,    // 每次吃到食物增长1格
                bombCount: 1,     // 1个炸弹
                bombTime: 15000,  // 炸弹存在15秒
                warningTime: 5000,// 警告时间5秒
                scoreMultiplier: 1,// 分数倍率
                initialSpeed: 200  // 初始速度（毫秒）
            },
            normal: {
                name: '中等',
                growthRate: 2,    // 每次吃到食物增长2格
                bombCount: 2,     // 2个炸弹
                bombTime: 10000,  // 炸弹存在10秒
                warningTime: 3000,// 警告时间3秒
                scoreMultiplier: 1.5,
                initialSpeed: 150  // 中等速度
            },
            hard: {
                name: '困难',
                growthRate: 3,    // 每次吃到食物增长3格
                bombCount: 3,     // 3个炸弹
                bombTime: 7000,   // 炸弹存在7秒
                warningTime: 2000,// 警告时间2秒
                scoreMultiplier: 2,
                initialSpeed: 100  // 快速
            }
        };
        this.currentDifficulty = this.difficulties.easy;

        // 炸弹相关属性
        this.bombs = [];
        this.bombTimers = [];

        // 最高分系统
        this.scores = {
            easy: this.loadScores('easy'),
            normal: this.loadScores('normal'),
            hard: this.loadScores('hard')
        };

        // 手柄支持
        this.gamepadIndex = null;
        this.gamepadConnected = false;
        this.lastGamepadButtonStates = {};
        this.gamepadThreshold = 0.5; // 摇杆灵敏度阈值

        this.setupEventListeners();
        this.setupGamepadSupport();
        this.showMainMenu();

        // 加载蛇头图片
        this.snakeHeadImg = new Image();
        this.snakeHeadImg.src = 'head.jpg'; // 修改为.jpg格式
        this.snakeHeadImg.onload = () => {
            console.log('蛇头图片加载完成');
        };
        this.snakeHeadImg.onerror = () => {
            console.error('蛇头图片加载失败');
        };
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        
        // 主菜单按钮
        document.getElementById('start-btn').onclick = () => this.startGame();
        document.getElementById('difficulty-btn').onclick = () => this.showDifficultyMenu();
        document.getElementById('highscore-btn').onclick = () => this.showHighScores();
        
        // 难度选择按钮
        document.getElementById('easy-btn').onclick = () => this.setDifficulty('easy');
        document.getElementById('normal-btn').onclick = () => this.setDifficulty('normal');
        document.getElementById('hard-btn').onclick = () => this.setDifficulty('hard');
        document.getElementById('back-to-main').onclick = () => this.showMainMenu();
        
        // 暂停菜单按钮
        document.getElementById('resume-btn').onclick = () => this.resumeGame();
        document.getElementById('restart-btn').onclick = () => this.startGame();
        document.getElementById('menu-btn').onclick = () => this.showMainMenu();
        
        // 游戏结束按钮
        document.getElementById('retry-btn').onclick = () => this.startGame();
        document.getElementById('back-menu-btn').onclick = () => this.showMainMenu();

        // 最高分菜单事件
        document.getElementById('highscore-back').onclick = () => this.showMainMenu();
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => this.showDifficultyScores(btn.dataset.difficulty);
        });
    }

    setDifficulty(level) {
        // 更新按钮状态
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${level}-btn`).classList.add('active');

        // 设置难度
        this.currentDifficulty = this.difficulties[level];

        // 更新描述
        const description = `${this.currentDifficulty.name}模式：蛇身增长${this.currentDifficulty.growthRate}格，${this.currentDifficulty.bombCount}个炸弹`;
        document.getElementById('difficulty-description').textContent = description;
    }

    showDifficultyMenu() {
        this.hideAllMenus();
        document.getElementById('difficulty-menu').classList.add('active');
    }

    startGame() {
        this.hideAllMenus();
        this.snake.reset();
        // 设置初始速度
        this.snake.speed = this.currentDifficulty.initialSpeed;
        this.score = 0;
        this.updateScore();
        this.generateFood();
        this.clearAllBombs();
        this.generateBombs();
        this.isRunning = true;
        this.isPaused = false;
        this.gameTime = 0;
        document.getElementById('time').textContent = this.formatTime(this.gameTime);
        this.startTime = null;
        this.gameLoop();
    }

    clearAllBombs() {
        this.bombs = [];
        this.bombTimers.forEach(timer => clearTimeout(timer));
        this.bombTimers = [];
    }

    generateBombs() {
        for (let i = 0; i < this.currentDifficulty.bombCount; i++) {
            this.generateBomb();
        }
    }

    generateBomb() {
        let newBomb;
        do {
            newBomb = {
                x: Math.floor(Math.random() * this.gridCount),
                y: Math.floor(Math.random() * this.gridCount),
                blinking: false,
                blinkStart: null
            };
        } while (
            this.snake.body.some(segment => segment.x === newBomb.x && segment.y === newBomb.y) ||
            (this.food.x === newBomb.x && this.food.y === newBomb.y) ||
            Math.abs(newBomb.x - this.snake.body[0].x) < 3 ||
            Math.abs(newBomb.y - this.snake.body[0].y) < 3 ||
            this.bombs.some(bomb => bomb.x === newBomb.x && bomb.y === newBomb.y)
        );

        this.bombs.push(newBomb);

        // 设置炸弹消失和警告定时器
        const bombIndex = this.bombs.length - 1;
        const warningTimer = setTimeout(() => {
            this.bombs[bombIndex].blinking = true;
            this.bombs[bombIndex].blinkStart = Date.now();
        }, this.currentDifficulty.bombTime - this.currentDifficulty.warningTime);

        const disappearTimer = setTimeout(() => {
            this.bombs = this.bombs.filter((_, index) => index !== bombIndex);
            this.generateBomb();
        }, this.currentDifficulty.bombTime);

        this.bombTimers.push(warningTimer, disappearTimer);
    }

    gameLoop() {
        if (!this.isRunning) return;
        if (this.isPaused) {
            requestAnimationFrame(() => this.gameLoop());
            return;
        }

        this.update();
        this.draw();
        setTimeout(() => {
            requestAnimationFrame(() => this.gameLoop());
        }, this.snake.speed);
    }

    update() {
        // 只有在蛇开始移动后才开始计时
        if (this.snake.firstMove) {
            if (!this.startTime) {
                this.startTime = Date.now();
            }
            this.gameTime = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById('time').textContent = this.formatTime(this.gameTime);
        }

        this.snake.update();

        // 检查炸弹碰撞
        const head = this.snake.body[0];
        if (this.bombs.some(bomb => bomb.x === head.x && bomb.y === head.y)) {
            this.gameOver();
            return;
        }
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格
        this.ctx.strokeStyle = 'rgba(0, 172, 193, 0.2)';
        for (let i = 0; i <= this.gridCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.gridSize, 0);
            this.ctx.lineTo(i * this.gridSize, this.canvas.height);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.gridSize);
            this.ctx.lineTo(this.canvas.width, i * this.gridSize);
            this.ctx.stroke();
        }

        // 绘制食物
        const foodX = this.food.x * this.gridSize + this.gridSize/2;
        const foodY = this.food.y * this.gridSize + this.gridSize/2;
        
        // 食物光晕效果
        const gradient = this.ctx.createRadialGradient(
            foodX, foodY, 2,
            foodX, foodY, this.gridSize/2
        );
        gradient.addColorStop(0, '#f44336');
        gradient.addColorStop(1, 'rgba(244, 67, 54, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(foodX, foodY, this.gridSize/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 食物核心
        this.ctx.fillStyle = '#f44336';
        this.ctx.beginPath();
        this.ctx.arc(foodX, foodY, this.gridSize/4, 0, Math.PI * 2);
        this.ctx.fill();

        // 绘制所有炸弹
        this.bombs.forEach(bomb => {
            if (!bomb.blinking || (bomb.blinking && Math.floor((Date.now() - bomb.blinkStart) / 200) % 2 === 0)) {
                const bombX = bomb.x * this.gridSize + this.gridSize/2;
                const bombY = bomb.y * this.gridSize + this.gridSize/2;

                // 炸弹主体
                this.ctx.fillStyle = '#424242';
                this.ctx.beginPath();
                this.ctx.arc(bombX, bombY, this.gridSize/2 - 2, 0, Math.PI * 2);
                this.ctx.fill();

                // 炸弹高光
                this.ctx.fillStyle = '#757575';
                this.ctx.beginPath();
                this.ctx.arc(bombX - this.gridSize/6, bombY - this.gridSize/6, this.gridSize/6, 0, Math.PI * 2);
                this.ctx.fill();

                // 引信底座
                this.ctx.fillStyle = '#9e9e9e';
                this.ctx.beginPath();
                this.ctx.arc(bombX, bombY - this.gridSize/3, this.gridSize/10, 0, Math.PI * 2);
                this.ctx.fill();

                // 引信
                this.ctx.strokeStyle = '#ffa000';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(bombX, bombY - this.gridSize/3);
                this.ctx.quadraticCurveTo(
                    bombX + this.gridSize/5, bombY - this.gridSize/2,
                    bombX + this.gridSize/3, bombY - this.gridSize/2.5
                );
                this.ctx.stroke();

                // 如果在闪烁状态，添加警告光晕
                if (bomb.blinking) {
                    const warningGradient = this.ctx.createRadialGradient(
                        bombX, bombY, this.gridSize/2,
                        bombX, bombY, this.gridSize
                    );
                    warningGradient.addColorStop(0, 'rgba(244, 67, 54, 0.5)');
                    warningGradient.addColorStop(1, 'rgba(244, 67, 54, 0)');
                    
                    this.ctx.fillStyle = warningGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(bombX, bombY, this.gridSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        });

        // 绘制蛇
        this.snake.body.forEach((segment, index) => {
            if (index === 0) {
                // 蛇头
                const headX = segment.x * this.gridSize;
                const headY = segment.y * this.gridSize;
                
                // 保存当前上下文状态
                this.ctx.save();
                
                // 移动到蛇头中心点
                this.ctx.translate(headX + this.gridSize/2, headY + this.gridSize/2);
                
                // 根据蛇的方向旋转
                let rotation = 0;
                switch(this.snake.direction) {
                    case 'right': rotation = 0; break;
                    case 'down': rotation = Math.PI/2; break;
                    case 'left': rotation = Math.PI; break;
                    case 'up': rotation = -Math.PI/2; break;
                }
                this.ctx.rotate(rotation);
                
                // 绘制图片，使其居中
                const size = this.gridSize * 1.2; // 稍微大一点以便更好地显示
                if (this.snakeHeadImg.complete) { // 确保图片已加载
                    this.ctx.drawImage(
                        this.snakeHeadImg,
                        -size/2,
                        -size/2,
                        size,
                        size
                    );
                }
                
                // 恢复上下文状态
                this.ctx.restore();

            } else {
                // 蛇身
                this.ctx.fillStyle = `hsl(${187 + index * 2}, 100%, ${60 - index * 1}%)`;
                this.ctx.beginPath();
                this.ctx.roundRect(
                    segment.x * this.gridSize + 1,
                    segment.y * this.gridSize + 1,
                    this.gridSize - 2,
                    this.gridSize - 2,
                    this.gridSize/6
                );
                this.ctx.fill();
            }
        });
    }

    gameOver() {
        this.isRunning = false;
        this.clearAllBombs();
        
        // 保存分数
        const difficultyLevel = Object.keys(this.difficulties).find(
            key => this.difficulties[key] === this.currentDifficulty
        );
        this.saveScore(this.score, difficultyLevel);

        // 更新显示
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('survivalTime').textContent = this.formatTime(this.gameTime);
        document.getElementById('game-over').classList.add('active');
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseMenu = document.getElementById('pause-menu');
        if (this.isPaused) {
            pauseMenu.classList.add('active');
        } else {
            pauseMenu.classList.remove('active');
        }
    }

    resumeGame() {
        this.isPaused = false;
        document.getElementById('pause-menu').classList.remove('active');
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showMainMenu() {
        this.hideAllMenus();
        this.isRunning = false;
        document.getElementById('main-menu').classList.add('active');
    }

    hideAllMenus() {
        document.querySelectorAll('.menu').forEach(menu => {
            menu.classList.remove('active');
        });
    }

    generateFood() {
        do {
            this.food = {
                x: Math.floor(Math.random() * this.gridCount),
                y: Math.floor(Math.random() * this.gridCount)
            };
        } while (
            this.snake.body.some(segment => segment.x === this.food.x && segment.y === this.food.y) ||
            this.bombs.some(bomb => bomb.x === this.food.x && bomb.y === this.food.y)
        );
    }

    handleKeyPress(event) {
        if (!this.isRunning) return;

        const key = event.key.toLowerCase();
        
        // 暂停控制
        if (key === ' ' || key === 'escape') {
            this.togglePause();
            return;
        }

        if (this.isPaused) return;

        // 方向控制
        const directions = {
            'arrowup': 'up',
            'arrowdown': 'down',
            'arrowleft': 'left',
            'arrowright': 'right',
            'w': 'up',
            's': 'down',
            'a': 'left',
            'd': 'right'
        };

        if (directions[key]) {
            this.handleDirectionChange(directions[key]);
        }
    }

    showHighScores() {
        this.hideAllMenus();
        document.getElementById('highscore-menu').classList.add('active');
        this.showDifficultyScores('easy'); // 默认显示简单难度的分数
    }

    showDifficultyScores(difficulty) {
        // 更新标签状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
        });

        const scores = this.scores[difficulty];
        const topScore = scores.length > 0 ? scores[0].score : 0;

        // 更新最高分显示
        document.getElementById('top-score-value').textContent = topScore;

        // 更新历史记录列表
        const scoreList = document.getElementById('score-list');
        scoreList.innerHTML = '';

        if (scores.length === 0) {
            const noScore = document.createElement('div');
            noScore.className = 'score-item no-record';
            noScore.textContent = '暂无记录';
            scoreList.appendChild(noScore);
        } else {
            scores.forEach((score, index) => {
                const scoreItem = document.createElement('div');
                scoreItem.className = 'score-item';
                scoreItem.innerHTML = `
                    <span class="score">${score.score} 分</span>
                    <span class="time">${score.time}</span>
                    <span class="date">${score.date}</span>
                `;
                scoreList.appendChild(scoreItem);
            });
        }
    }

    loadScores(difficulty) {
        const scores = localStorage.getItem(`snakeScores_${difficulty}`);
        return scores ? JSON.parse(scores) : [];
    }

    saveScore(score, difficulty) {
        const scoreData = {
            score: score,
            date: new Date().toLocaleDateString(),
            time: this.formatTime(this.gameTime)
        };

        this.scores[difficulty].push(scoreData);
        this.scores[difficulty].sort((a, b) => b.score - a.score);
        this.scores[difficulty] = this.scores[difficulty].slice(0, 10); // 只保留前10个最高分

        localStorage.setItem(`snakeScores_${difficulty}`, JSON.stringify(this.scores[difficulty]));
        
        // 更新最高分
        if (score > this.highScore) {
            this.highScore = score;
            localStorage.setItem('snakeHighScore', this.highScore);
        }
    }

    setupGamepadSupport() {
        // 监听手柄连接
        window.addEventListener("gamepadconnected", (e) => {
            this.gamepadIndex = e.gamepad.index;
            this.gamepadConnected = true;
            this.updateGamepadIndicator(true);
            console.log("手柄已连接：", e.gamepad);
        });

        // 监听手柄断开
        window.addEventListener("gamepaddisconnected", (e) => {
            if (this.gamepadIndex === e.gamepad.index) {
                this.gamepadIndex = null;
                this.gamepadConnected = false;
                this.updateGamepadIndicator(false);
                console.log("手柄已断开");
            }
        });

        // 定期检查手柄状态
        setInterval(() => {
            if (this.isRunning && !this.isPaused) {
                this.handleGamepadInput();
            }
        }, 50); // 每50ms检查一次手柄输入
    }

    updateGamepadIndicator(connected) {
        const indicator = document.getElementById('gamepad-indicator');
        indicator.textContent = connected ? '已连接' : '未连接';
        indicator.className = connected ? 'connected' : 'disconnected';
    }

    handleGamepadInput() {
        if (this.gamepadIndex === null) return;

        const gamepad = navigator.getGamepads()[this.gamepadIndex];
        if (!gamepad) return;

        // 检查摇杆输入
        const axes = gamepad.axes;
        if (Math.abs(axes[0]) > this.gamepadThreshold || Math.abs(axes[1]) > this.gamepadThreshold) {
            // 水平方向
            if (Math.abs(axes[0]) > Math.abs(axes[1])) {
                if (axes[0] > this.gamepadThreshold) {
                    this.handleDirectionChange('right');
                } else if (axes[0] < -this.gamepadThreshold) {
                    this.handleDirectionChange('left');
                }
            }
            // 垂直方向
            else {
                if (axes[1] > this.gamepadThreshold) {
                    this.handleDirectionChange('down');
                } else if (axes[1] < -this.gamepadThreshold) {
                    this.handleDirectionChange('up');
                }
            }
        }

        // 检查按钮输入
        const buttons = gamepad.buttons;
        
        // 方向键
        if (buttons[12].pressed) this.handleDirectionChange('up');    // 上
        if (buttons[13].pressed) this.handleDirectionChange('down');  // 下
        if (buttons[14].pressed) this.handleDirectionChange('left');  // 左
        if (buttons[15].pressed) this.handleDirectionChange('right'); // 右

        // Start按钮（暂停/继续）
        if (this.isButtonNewlyPressed(9, buttons)) {
            this.togglePause();
        }

        // Select按钮（重新开始）
        if (this.isButtonNewlyPressed(8, buttons)) {
            this.startGame();
        }

        // 更新按钮状态
        for (let i = 0; i < buttons.length; i++) {
            this.lastGamepadButtonStates[i] = buttons[i].pressed;
        }
    }

    isButtonNewlyPressed(buttonIndex, buttons) {
        const isPressed = buttons[buttonIndex].pressed;
        const wasPressed = this.lastGamepadButtonStates[buttonIndex];
        return isPressed && !wasPressed;
    }

    handleDirectionChange(newDirection) {
        if (!this.snake.firstMove) {
            this.snake.firstMove = true;
        }

        const currentDirection = this.snake.direction;
        if (
            (newDirection === 'up' && currentDirection !== 'down') ||
            (newDirection === 'down' && currentDirection !== 'up') ||
            (newDirection === 'left' && currentDirection !== 'right') ||
            (newDirection === 'right' && currentDirection !== 'left')
        ) {
            this.snake.nextDirection = newDirection;
        }
    }
}

// 启动游戏
window.onload = () => {
    new Game();
}; 