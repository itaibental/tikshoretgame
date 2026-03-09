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
        playerName: "", schoolName: "", difficulty: 1, roundsPlayed: 0,
        currentQuestions: [], currentIndex: 0, score: 0, timerInterval: null, selectedArenas: []
    },

    arenaConfig: {
        "זירה 1": "arena-color-1", "זירה 2": "arena-color-2", "זירה 3": "arena-color-3",
        "זירה 4": "arena-color-4", "זירה 5": "arena-color-5", "זירה 6": "arena-color-6",
        "זירה 7": "arena-color-7", "זירה 8": "arena-color-8", "זירה 9": "arena-color-9",
        "זירת העל": "arena-color-AL"
    },

    setDifficulty(val) {
        this.state.difficulty = val;
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.remove('active-diff');
            if(parseInt(btn.dataset.val) === val) btn.classList.add('active-diff');
        });
        const difficultyMap = { 1: 5, 2: 10, 3: 15, 4: 25, 5: 40 };
        document.getElementById('difficulty-desc').innerText = `רמה ${val}: ${difficultyMap[val]} שאלות לסיבוב`;
    },

    getDatabase() {
        const dbList = [];
        for (let i = 1; i <= 9; i++) { if (window[`DATA_ZIRA_${i}`]) dbList.push(...window[`DATA_ZIRA_${i}`]); }
        if (window.DATA_ZIRA_AL) dbList.push(...window.DATA_ZIRA_AL);
        return dbList;
    },

    goToSelection() {
        this.state.playerName = document.getElementById('input-username').value.trim();
        this.state.schoolName = document.getElementById('input-school').value.trim();
        if(!this.state.playerName || !this.state.schoolName) { alert("נא להזין שם ובית ספר"); return; }
        
        const arenas = [...new Set(this.getDatabase().map(d => d.zira))].sort();
        document.getElementById('arena-list').innerHTML = arenas.map(a => `
            <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <input type="checkbox" id="arena-${a}" value="${a}" class="w-5 h-5 accent-blue-500">
                <label for="arena-${a}" class="flex-grow cursor-pointer text-sm text-white">${a}</label>
            </div>`).join('');
        this.switchScreen('welcome', 'selection');
    },

    goToConceptSelection() {
        const checked = Array.from(document.querySelectorAll('#arena-list input:checked')).map(i => i.value);
        if(checked.length === 0) { alert("בחר לפחות זירה אחת"); return; }
        this.state.selectedArenas = checked;

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

    startGame() {
        const checkedConcepts = Array.from(document.querySelectorAll('#concept-list input:checked')).map(i => i.value);
        if(checkedConcepts.length === 0) { alert("בחר לפחות מושג אחד"); return; }

        const difficultyMap = { 1: 5, 2: 10, 3: 15, 4: 25, 5: 40 };
        const limitCount = difficultyMap[this.state.difficulty];

        const pool = this.getDatabase().filter(q => 
            this.state.selectedArenas.includes(q.zira) && checkedConcepts.includes(q.concept || "כללי")
        );

        this.state.currentQuestions = pool.sort(() => Math.random() - 0.5).slice(0, limitCount);
        this.state.currentIndex = 0; this.state.score = 0; this.state.roundsPlayed++;

        document.getElementById('display-player').innerText = this.state.playerName;
        document.getElementById('display-school').innerText = this.state.schoolName;
        
        this.switchScreen('selection', 'game');
        this.renderQuestion();
    },

    renderQuestion() {
        const q = this.state.currentQuestions[this.state.currentIndex];
        document.getElementById('feedback-area').classList.add('hidden');
        document.getElementById('display-arena').innerText = `${q.zira} | ${q.concept || ''}`;
        document.getElementById('display-question').innerText = q.q;
        
        const shuffled = q.a.map((ans, i) => ({ ans, i })).sort(() => Math.random() - 0.5);
        document.getElementById('options-container').innerHTML = shuffled.map(item => `
            <button onclick="window.GameEngine.handleAnswer(${item.i})" class="option-btn text-white text-right p-4 rounded-xl bg-white/5 w-full">
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
            confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
        }

        document.getElementById('display-score').innerText = Math.round(this.state.score);
        document.getElementById('feedback-text').innerHTML = `<strong>הסבר:</strong> ${q.rationale}`;
        document.getElementById('feedback-area').classList.remove('hidden');
        document.getElementById('next-btn').onclick = () => {
            this.state.currentIndex++;
            if(this.state.currentIndex < this.state.currentQuestions.length) this.renderQuestion();
            else this.finishGame();
        };
    },

    async finishGame() {
        const final = Math.round(this.state.score);
        this.switchScreen('game', 'results');
        document.getElementById('final-score-val').innerText = final;
        document.getElementById('res-name').innerText = this.state.playerName;
        document.getElementById('res-school').innerText = this.state.schoolName;
        document.getElementById('res-difficulty').innerText = this.state.difficulty;
        document.getElementById('res-rounds').innerText = this.state.roundsPlayed;

        try {
            await setDoc(doc(db, "results", `${Date.now()}-${this.state.playerName}`), {
                name: this.state.playerName, school: this.state.schoolName, 
                score: final, difficulty: this.state.difficulty, rounds: this.state.roundsPlayed, timestamp: new Date()
            });
        } catch(e) { console.error(e); }
    },

    async showLeaderboard() {
        this.switchScreen('welcome', 'data-view');
        document.getElementById('data-title').innerText = "לוח תוצאות (טופ 20)";
        document.getElementById('data-content').innerHTML = "טוען...";
        const q = query(collection(db, "results"), orderBy("score", "desc"), limit(20));
        const snap = await getDocs(q);
        let html = `<table class="w-full text-sm text-right"><tr><th class="p-2">שם</th><th class="p-2 text-center">ניקוד</th><th class="p-2">בי"ס</th></tr>`;
        snap.forEach(doc => {
            const d = doc.data();
            html += `<tr class="border-b border-white/5"><td class="p-2">${d.name}</td><td class="p-2 text-center font-bold text-green-400">${d.score}</td><td class="p-2 text-xs">${d.school}</td></tr>`;
        });
        document.getElementById('data-content').innerHTML = html + "</table>";
    },

    showAdmin() {
        const pass = prompt("נא להזין קוד מורה:");
        if(pass === "1234") {
            this.showFullData();
        } else { alert("קוד שגוי"); }
    },

    async showFullData() {
        this.switchScreen('welcome', 'data-view');
        document.getElementById('data-title').innerText = "דו\"ח ציונים מלא";
        const snap = await getDocs(query(collection(db, "results"), orderBy("timestamp", "desc")));
        let html = `<table class="w-full text-xs text-right"><tr><th class="p-1">שם</th><th class="p-1">ציון</th><th class="p-1">רמה</th><th class="p-1">בי\"ס</th></tr>`;
        snap.forEach(doc => {
            const d = doc.data();
            html += `<tr class="border-b border-white/5"><td class="p-1">${d.name}</td><td class="p-1">${d.score}</td><td class="p-1">${d.difficulty}</td><td class="p-1">${d.school}</td></tr>`;
        });
        document.getElementById('data-content').innerHTML = html + "</table>";
    },

    switchScreen(out, inId) {
        document.getElementById(`screen-${out}`).classList.add('hidden');
        document.getElementById(`screen-${inId}`).classList.remove('hidden');
    },

    backToArenas() {
        document.getElementById('step-2-concepts').classList.add('hidden');
        document.getElementById('step-1-arenas').classList.remove('hidden');
    }
};

window.GameEngine = GameEngine;
