import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCte4D5lS6eHAZbNvcKHY0I07yr2llh-HI",
    authDomain: "webpages-4aacb.firebaseapp.com",
    projectId: "webpages-4aacb",
    storageBucket: "webpages-4aacb.firebasestorage.app",
    messagingSenderId: "421209892208",
    appId: "1:421209892208:web:8ee30714c40b5084579bb5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'quiz-comm-2026';
let currentUser = null;

signInAnonymously(auth).catch(e => console.error(e));
onAuthStateChanged(auth, user => { if(user) currentUser = user; });

const GameEngine = {
    state: { 
        playerName: "", 
        currentQuestions: [], 
        currentIndex: 0, 
        score: 0, 
        timerInterval: null,
        selectedArenas: [] 
    },
    
    arenaDisplayNames: {
        "זירה 1": "זירה 1: להבין ולפרש את המציאות", "זירה 2": "זירה 2: גלובליזציה",
        "זירה 3": "זירה 3: חדשות וצילום עיתונאי", "זירה 4": "זירה 4: הומור וסאטירה",
        "זירה 5": "זירה 5: תרבות דיגיטלית", "זירה 6": "זירה 6: תוכניות ריאליטי",
        "זירה 7": "זירה 7: קליפים מוזיקליים", "זירה 8": "זירה 8: ספורט ותקשורת",
        "זירה 9": "זירה 9: פרסום ואקטיביזם", "זירת העל": "זירת העל: דמוקרטיה ואתיקה"
    },

    getDatabase() {
        const dbList = [];
        for (let i = 1; i <= 9; i++) { if (window[`DATA_ZIRA_${i}`]) dbList.push(...window[`DATA_ZIRA_${i}`]); }
        if (window.DATA_ZIRA_AL) dbList.push(...window.DATA_ZIRA_AL);
        return dbList;
    },

    goToSelection() {
        const name = document.getElementById('input-username').value.trim();
        if(!name) { alert("נא להזין שם"); return; }
        if (window.Sounds) Sounds.click();
        this.state.playerName = name;
        const arenas = [...new Set(this.getDatabase().map(d => d.zira))].sort((a,b) => a.localeCompare(b, 'he', {numeric:true}));
        document.getElementById('arena-list').innerHTML = arenas.map(a => `
            <div class="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <input type="checkbox" id="arena-${a}" value="${a}" class="w-4 h-4 accent-yellow-500">
                <label for="arena-${a}" class="flex-grow text-sm text-gray-200 cursor-pointer">${this.arenaDisplayNames[a] || a}</label>
            </div>
        `).join('');
        this.switchScreen('welcome', 'selection');
        // איפוס תצוגת השלבים
        document.getElementById('step-1-arenas').classList.remove('hidden');
        document.getElementById('step-2-concepts').classList.add('hidden');
    },

    selectAllArenas(val) { if(window.Sounds) Sounds.click(); document.querySelectorAll('#arena-list input').forEach(i => i.checked = val); },

    goToConceptSelection() {
        const checked = Array.from(document.querySelectorAll('#arena-list input:checked')).map(i => i.value);
        if(checked.length === 0) { alert("נא לבחור לפחות זירה אחת"); return; }
        if (window.Sounds) Sounds.click();
        
        this.state.selectedArenas = checked;
        
        // שליפת כל המושגים מהזירות שנבחרו
        const pool = this.getDatabase().filter(q => checked.includes(q.zira));
        const concepts = [...new Set(pool.map(q => q.concept || "כללי"))].sort();

        document.getElementById('concept-list').innerHTML = concepts.map(c => `
            <div class="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
                <input type="checkbox" id="concept-${c}" value="${c}" class="w-4 h-4 accent-cyan-500" checked>
                <label for="concept-${c}" class="flex-grow text-xs text-gray-200 cursor-pointer">${c}</label>
            </div>
        `).join('');

        document.getElementById('step-1-arenas').classList.add('hidden');
        document.getElementById('step-2-concepts').classList.remove('hidden');
    },

    backToArenas() {
        if (window.Sounds) Sounds.click();
        document.getElementById('step-2-concepts').classList.add('hidden');
        document.getElementById('step-1-arenas').classList.remove('hidden');
    },

    startGame() {
        const checkedConcepts = Array.from(document.querySelectorAll('#concept-list input:checked')).map(i => i.value);
        if(checkedConcepts.length === 0) { alert("נא לבחור לפחות מושג אחד"); return; }
        if(window.Sounds) Sounds.click();

        const limit = parseInt(document.getElementById('input-question-count').value) || 10;
        
        // סינון שאלות שתואמות גם לזירות וגם למושגים שנבחרו
        const pool = this.getDatabase().filter(q => 
            this.state.selectedArenas.includes(q.zira) && 
            checkedConcepts.includes(q.concept || "כללי")
        );

        if(pool.length === 0) { alert("לא נמצאו שאלות למושגים שנבחרו"); return; }

        this.state.currentQuestions = pool.sort(() => Math.random() - 0.5).slice(0, limit);
        this.state.currentIndex = 0; 
        this.state.score = 0;
        
        document.getElementById('display-player').innerText = `שלום, ${this.state.playerName}`;
        this.switchScreen('selection', 'game');
        this.renderQuestion();
    },

    startTimer() {
        clearInterval(this.state.timerInterval);
        let timeLeft = 60;
        const display = document.getElementById('display-timer');
        display.innerText = `${timeLeft}s`;
        display.classList.remove('timer-low');
        this.state.timerInterval = setInterval(() => {
            timeLeft--;
            display.innerText = `${timeLeft}s`;
            if (timeLeft <= 5 && timeLeft > 0 && window.Sounds) Sounds.tick();
            if (timeLeft <= 10) display.classList.add('timer-low');
            if (timeLeft <= 0) { clearInterval(this.state.timerInterval); this.handleAnswer(-1); }
        }, 1000);
    },

    renderQuestion() {
        const q = this.state.currentQuestions[this.state.currentIndex];
        document.getElementById('feedback-area').classList.add('hidden');
        document.getElementById('display-arena').innerText = `${q.zira} | ${q.concept || ''}`;
        document.getElementById('display-question').innerText = q.q;
        document.getElementById('progress-bar').style.width = `${(this.state.currentIndex / this.state.currentQuestions.length) * 100}%`;
        const shuffled = q.a.map((ans, i) => ({ ans, i })).sort(() => Math.random() - 0.5);
        document.getElementById('options-container').innerHTML = shuffled.map(item => `
            <button onclick="GameEngine.handleAnswer(${item.i})" class="option-btn text-white text-right p-3 rounded-lg bg-white/5 border border-white/10 w-full mb-2">
                ${item.ans}
            </button>
        `).join('');
        this.startTimer();
    },

    handleAnswer(idx) {
        clearInterval(this.state.timerInterval);
        const q = this.state.currentQuestions[this.state.currentIndex];
        const buttons = document.querySelectorAll('.option-btn');
        const pointsPerQ = 100 / this.state.currentQuestions.length;
        buttons.forEach(b => {
            b.disabled = true;
            const bIdx = parseInt(b.getAttribute('onclick').match(/\d+/)[0]);
            if (bIdx === q.correct) b.classList.add('correct');
            if (idx !== -1 && bIdx === idx && idx !== q.correct) b.classList.add('wrong');
        });
        if(idx === q.correct) { 
            if(window.Sounds) Sounds.correct(); 
            this.state.score += pointsPerQ; 
            confetti({ particleCount: 40, spread: 40, origin: { x: 0.5, y: 0.6 }, colors: ['#FFD700', '#FF8C00'] });
        } else { if(window.Sounds) Sounds.wrong(); }
        document.getElementById('display-score').innerText = `ניקוד: ${Math.round(this.state.score)}`;
        document.getElementById('feedback-text').innerHTML = idx === -1 ? "<b>נגמר הזמן!</b><br>" + q.rationale : q.rationale;
        document.getElementById('feedback-area').classList.remove('hidden');
        document.getElementById('next-btn').onclick = () => {
            if(window.Sounds) Sounds.click();
            this.state.currentIndex++;
            if(this.state.currentIndex < this.state.currentQuestions.length) this.renderQuestion();
            else this.finishGame();
        };
    },

    async finishGame() {
        const finalScore = Math.round(this.state.score);
        if(window.Sounds) Sounds.gameOver();
        if (finalScore >= 70) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#FFD700', '#FF8C00', '#ffffff'] });
        this.switchScreen('game', 'results');
        document.getElementById('final-score-val').innerText = finalScore;
        if (currentUser) {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', currentUser.uid), {
                name: this.state.playerName, score: finalScore, timestamp: Date.now()
            });
        }
    },

    async showLeaderboard(from) {
        if(window.Sounds) Sounds.click();
        this.switchScreen(from, 'leaderboard');
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '<p class="text-center text-gray-500">טוען...</p>';
        const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard'));
        const scores = []; snap.forEach(d => scores.push(d.data()));
        scores.sort((a,b) => b.score - a.score);
        list.innerHTML = scores.slice(0, 10).map((s, i) => `
            <div class="flex justify-between p-4 rounded-xl bg-white/5 mb-2">
                <span class="text-white">${['🥇','🥈','🥉'][i] || i+1+'.'} ${s.name}</span>
                <span class="text-yellow-500 font-bold">${s.score}</span>
            </div>
        `).join('');
    },

    async openTeacherArea() {
        const pass = prompt("הכנס סיסמת מורה:");
        if (pass === "1234") { this.switchScreen('welcome', 'teacher'); this.loadTeacherResults(); }
    },

    async loadTeacherResults() {
        const list = document.getElementById('teacher-results-list');
        list.innerHTML = '<tr><td colspan="4" class="text-center p-4">טוען...</td></tr>';
        const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard'));
        const results = []; snap.forEach(d => results.push({ ...d.data(), id: d.id }));
        results.sort((a,b) => b.timestamp - a.timestamp);
        list.innerHTML = results.map(r => `
            <tr class="border-b border-white/5"><td class="px-4 py-2">${r.name}</td><td class="px-4 py-2 text-yellow-500 font-bold">${r.score}</td>
            <td class="px-4 py-2 text-xs text-gray-500">${new Date(r.timestamp).toLocaleDateString('he-IL')}</td>
            <td class="px-4 py-2"><button onclick="GameEngine.deleteResult('${r.id}')" class="text-red-500">מחק</button></td></tr>
        `).join('');
    },

    async deleteResult(id) { if(confirm("למחוק?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', id)); this.loadTeacherResults(); } },
    switchScreen(outId, inId) { document.getElementById(`screen-${outId}`).classList.add('hidden'); document.getElementById(`screen-${inId}`).classList.remove('hidden'); }
};
window.GameEngine = GameEngine;
