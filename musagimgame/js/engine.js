import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyCte4D5lS6eHAZbNvcKHY0I07yr2llh-HI", authDomain: "webpages-4aacb.firebaseapp.com", projectId: "webpages-4aacb", storageBucket: "webpages-4aacb.firebasestorage.app", messagingSenderId: "421209892208", appId: "1:421209892208:web:8ee30714c40b5084579bb5" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
signInAnonymously(auth);

const GameEngine = {
    state: {
        playerName: "", schoolName: "", gameMode: null, difficulty: "easy",
        roundsPlayed: 0, currentQuestions: [], currentIndex: 0, score: 0,
        timerInterval: null, selectedArenas: []
    },

    arenaDisplayNames: {
        "זירה 1": "זירה 1 – להבין ולפרש את המציאות", "זירה 2": "זירה 2 – גלובליזציה",
        "זירה 3": "זירה 3 – חדשות וצילום עיתונאי", "זירה 4": "זירה 4 – הומור וסאטירה",
        "זירה 5": "זירה 5 – תרבות דיגיטלית", "זירה 6": "זירה 6 – תוכניות ריאליטי",
        "זירה 7": "זירה 7 – קליפים", "זירה 8": "זירה 8 – תקשורת וספורט",
        "זירה 9": "זירה 9 – פרסומות", "זירת העל": "זירת העל"
    },

    arenaConfig: {
        "זירה 1": "arena-color-1", "זירה 2": "arena-color-2", "זירה 3": "arena-color-3",
        "זירה 4": "arena-color-4", "זירה 5": "arena-color-5", "זירה 6": "arena-color-6",
        "זירה 7": "arena-color-7", "זירה 8": "arena-color-8", "זירה 9": "arena-color-9",
        "זירת העל": "arena-color-AL"
    },

    setGameMode(mode) {
        this.state.gameMode = mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active-mode'));
        event.currentTarget.classList.add('active-mode');
        
        const btn = document.getElementById('main-action-btn');
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
        
        if (mode === 'levels') {
            document.getElementById('difficulty-selector').classList.remove('hidden');
            btn.innerText = "התחל משחק!";
        } else {
            document.getElementById('difficulty-selector').classList.add('hidden');
            btn.innerText = "בחר זירות ומושגים";
        }
        if (window.Sounds) Sounds.click();
    },

    setDifficulty(val) {
        this.state.difficulty = val;
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.remove('active-diff');
            if(btn.dataset.val === val) btn.classList.add('active-diff');
        });
        const map = { 'easy': 5, 'medium': 12, 'hard': 25, 'v-hard': 45 };
        document.getElementById('difficulty-desc').innerText = `רמת קושי: ${map[val]} שאלות רנדומליות`;
        if (window.Sounds) Sounds.click();
    },

    handleMainAction() {
        this.state.playerName = document.getElementById('input-username').value.trim();
        this.state.schoolName = document.getElementById('input-school').value.trim();
        if(!this.state.playerName || !this.state.schoolName) { alert("נא להזין שם ובית ספר"); return; }
        
        if (this.state.gameMode === 'manual') {
            this.goToSelection();
        } else {
            this.initCountdown();
        }
    },

    getDatabase() {
        const dbList = [];
        for (let i = 1; i <= 9; i++) { if (window[`DATA_ZIRA_${i}`]) dbList.push(...window[`DATA_ZIRA_${i}`]); }
        if (window.DATA_ZIRA_AL) dbList.push(...window.DATA_ZIRA_AL);
        return dbList;
    },

    goToSelection() {
        if (window.Sounds) Sounds.click();
        const arenas = [...new Set(this.getDatabase().map(d => d.zira))].sort();
        document.getElementById('arena-list').innerHTML = arenas.map(a => `
            <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <input type="checkbox" id="arena-${a}" value="${a}" class="w-5 h-5 accent-blue-500">
                <label for="arena-${a}" class="flex-grow cursor-pointer text-sm text-white">${this.arenaDisplayNames[a] || a}</label>
            </div>`).join('');
        this.switchScreen('welcome', 'selection');
    },

    goToConceptSelection() {
        const checked = Array.from(document.querySelectorAll('#arena-list input:checked')).map(i => i.value);
        if(checked.length === 0) { alert("בחר לפחות זירה אחת"); return; }
        this.state.selectedArenas = checked;
        if (window.Sounds) Sounds.click();
        
        const pool = this.getDatabase().filter(q => checked.includes(q.zira));
        const conceptsMap = {};
        pool.forEach(q => { const cName = q.concept || "כללי"; if(!conceptsMap[cName]) conceptsMap[cName] = q.zira; });
        
        document.getElementById('concept-list').innerHTML = Object.keys(conceptsMap).sort().map(cName => `
            <div class="flex items-center gap-2 p-2 rounded-lg ${this.arenaConfig[conceptsMap[cName]] || ''}">
                <input type="checkbox" id="concept-${cName}" value="${cName}" class="w-4 h-4" checked>
                <label for="concept-${cName}" class="flex-grow cursor-pointer text-xs font-bold text-white">${cName}</label>
            </div>`).join('');

        document.getElementById('step-1-arenas').classList.add('hidden');
        document.getElementById('step-2-concepts').classList.remove('hidden');
    },

    initCountdown() {
        if (window.Sounds) Sounds.click();
        const fromScreen = this.state.gameMode === 'levels' ? 'welcome' : 'selection';
        this.switchScreen(fromScreen, 'none');
        
        const overlay = document.getElementById('countdown-overlay');
        const text = document.getElementById('countdown-text');
        overlay.classList.remove('hidden');
        
        let count = 3;
        const messages = ["3", "2", "1", "צא!"];
        text.innerText = messages[0];
        
        const itv = setInterval(() => {
            count--;
            if(count >= 0) {
                text.innerText = messages[3 - count];
            } else {
                clearInterval(itv);
                overlay.classList.add('hidden');
                this.startGame();
            }
        }, 800);
    },

    startGame() {
        const db = this.getDatabase();
        let pool = [];
        let limitCount = 10;

        if (this.state.gameMode === 'levels') {
            pool = db;
            const map = { 'easy': 5, 'medium': 12, 'hard': 25, 'v-hard': 45 };
            limitCount = map[this.state.difficulty];
        } else {
            const checkedConcepts = Array.from(document.querySelectorAll('#concept-list input:checked')).map(i => i.value);
            pool = db.filter(q => this.state.selectedArenas.includes(q.zira) && checkedConcepts.includes(q.concept || "כללי"));
            limitCount = pool.length;
        }

        this.state.currentQuestions = pool.sort(() => Math.random() - 0.5).slice(0, limitCount);
        this.state.currentIndex = 0; this.state.score = 0; this.state.roundsPlayed++;

        document.getElementById('display-player').innerText = this.state.playerName;
        document.getElementById('display-school').innerText = this.state.schoolName;
        this.switchScreen('none', 'game');
        this.renderQuestion();
    },

    renderQuestion() {
        const q = this.state.currentQuestions[this.state.currentIndex];
        document.getElementById('feedback-area').classList.add('hidden');
        document.getElementById('display-arena').innerText = `${q.zira} | ${q.concept || ''}`;
        document.getElementById('display-question').innerText = q.q;
        
        // ערבוב רנדומלי של התשובות
        const shuffled = q.a.map((ans, i) => ({ ans, i })).sort(() => Math.random() - 0.5);
        document.getElementById('options-container').innerHTML = shuffled.map(item => `
            <button onclick="window.GameEngine.handleAnswer(${item.i})" class="option-btn text-white text-right p-4 rounded-xl w-full font-medium">
                ${item.ans}
            </button>`).join('');
        this.startTimer();
    },

    startTimer() {
        clearInterval(this.state.timerInterval);
        let timeLeft = 60;
        document.getElementById('display-timer').innerText = `60s`;
        this.state.timerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('display-timer').innerText = `${timeLeft}s`;
            if (timeLeft <= 0) { clearInterval(this.state.timerInterval); this.handleAnswer(-1); }
        }, 1000);
    },

    handleAnswer(idx) {
        clearInterval(this.state.timerInterval);
        const q = this.state.currentQuestions[this.state.currentIndex];
        const buttons = document.querySelectorAll('.option-btn');
        const pointsPerQ = 100 / this.state.currentQuestions.length;

        buttons.forEach(b => {
            b.disabled = true;
            const bIdx = parseInt(b.getAttribute('onclick').match(/-?\d+/)[0]);
            if (bIdx === q.correct) b.classList.add('correct');
            if (idx !== -1 && bIdx === idx && idx !== q.correct) b.classList.add('wrong');
        });

        if(idx === q.correct) { 
            this.state.score += pointsPerQ; 
            if (window.Sounds) Sounds.correct();
            confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
        } else {
            if (window.Sounds) Sounds.wrong();
        }

        document.getElementById('display-score').innerText = Math.round(this.state.score);
        document.getElementById('feedback-text').innerHTML = `<strong>הסבר:</strong> ${q.rationale}`;
        document.getElementById('feedback-area').classList.remove('hidden');
        document.getElementById('next-btn').onclick = () => {
            if (window.Sounds) Sounds.click();
            this.state.currentIndex++;
            if(this.state.currentIndex < this.state.currentQuestions.length) this.renderQuestion();
            else this.finishGame();
        };
    },

    async finishGame() {
        if (window.Sounds) Sounds.gameOver();
        const final = Math.round(this.state.score);
        this.switchScreen('game', 'results');
        
        document.getElementById('final-score-val').innerText = final;
        document.getElementById('res-name').innerText = this.state.playerName;
        document.getElementById('res-school').innerText = this.state.schoolName;
        document.getElementById('res-diff').innerText = this.state.gameMode === 'levels' ? this.state.difficulty : "בחירה ידנית";
        document.getElementById('res-rounds').innerText = this.state.roundsPlayed;

        try {
            await setDoc(doc(db, "results", `${Date.now()}-${this.state.playerName}`), {
                name: this.state.playerName, school: this.state.schoolName, 
                score: final, difficulty: this.state.difficulty, mode: this.state.gameMode,
                rounds: this.state.roundsPlayed, timestamp: new Date()
            });
        } catch(e) { console.error(e); }
    },

    async showLeaderboard() {
        if (window.Sounds) Sounds.click();
        this.switchScreen('welcome', 'data-view');
        document.getElementById('data-title').innerText = "🏆 לוח תוצאות (טופ 10)";
        document.getElementById('data-content').innerHTML = "טוען...";
        const qSnap = await getDocs(query(collection(db, "results"), orderBy("score", "desc"), limit(10)));
        let h = `<table class="w-full text-sm text-right"><tr><th>שם</th><th>ציון</th><th>בי"ס</th></tr>`;
        qSnap.forEach(d => {
            const data = d.data();
            h += `<tr class="border-b border-white/5"><td>${data.name}</td><td class="text-green-400 font-bold">${data.score}</td><td>${data.school}</td></tr>`;
        });
        document.getElementById('data-content').innerHTML = h + `</table>`;
    },

    showAdmin() {
        if (window.Sounds) Sounds.click();
        const p = prompt("קוד מורה:");
        if (p === "1234") this.showFullData();
    },

    async showFullData() {
        this.switchScreen('welcome', 'data-view');
        document.getElementById('data-title').innerText = "📊 ניהול: דו\"ח מלא";
        const qSnap = await getDocs(query(collection(db, "results"), orderBy("timestamp", "desc")));
        let h = `<table class="w-full text-[10px] text-right"><tr><th>תאריך</th><th>שם</th><th>בי"ס</th><th>ציון</th></tr>`;
        qSnap.forEach(d => {
            const data = d.data();
            const date = data.timestamp?.toDate().toLocaleDateString('he-IL') || "";
            h += `<tr class="border-b border-white/5"><td>${date}</td><td>${data.name}</td><td>${data.school}</td><td class="font-bold">${data.score}</td></tr>`;
        });
        document.getElementById('data-content').innerHTML = h + `</table>`;
    },

    switchScreen(out, inId) {
        if(out !== 'none') document.getElementById(`screen-${out}`).classList.add('hidden');
        if(inId !== 'none') document.getElementById(`screen-${inId}`).classList.remove('hidden');
    },
    
    backToArenas() {
        document.getElementById('step-2-concepts').classList.add('hidden');
        document.getElementById('step-1-arenas').classList.remove('hidden');
    }
};

window.GameEngine = GameEngine;
