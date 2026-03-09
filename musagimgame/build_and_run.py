import os
import http.server
import socketserver
import webbrowser
import sys

# --- הפרויקט המלא עם השאלות האמיתיות מכל הזירות ---
PROJECT_FILES = {
    "index.html": """<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuizComm | משחק מושגי תקשורת</title>
    <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700;900&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4 bg-[#121212]">
    <div id="app-container" class="w-full max-w-2xl flex flex-col gap-6">
        <div id="screen-welcome" class="card p-8 text-center animate-pop">
            <h1 class="text-5xl font-black mb-2 gradient-text">QuizComm</h1>
            <p class="text-gray-400 mb-8 font-light">משחק מושגי תקשורת וחברה</p>
            <div class="mb-6">
                <input type="text" id="input-username" placeholder="איך קוראים לך?" 
                       class="w-full bg-black/40 border-2 border-white/10 p-4 rounded-xl text-center text-xl focus:border-yellow-500 outline-none transition-all text-white">
            </div>
            <button onclick="GameEngine.goToSelection()" class="btn-primary w-full py-4 rounded-2xl text-xl uppercase tracking-wider">התחל תרגול</button>
        </div>

        <div id="screen-selection" class="hidden card p-8 animate-pop">
            <h2 class="text-3xl font-bold mb-6 text-center text-white">בחר זירות לתרגול</h2>
            <div id="arena-list" class="grid grid-cols-1 gap-3 mb-8"></div>
            <div class="flex flex-col gap-3">
                <button onclick="GameEngine.startGame()" class="btn-primary w-full py-4 rounded-2xl text-xl">יאללה למשחק!</button>
                <div class="flex justify-between items-center px-1">
                    <button onclick="GameEngine.selectAll(true)" class="text-yellow-500 text-sm font-medium hover:underline">בחר הכל</button>
                    <button onclick="GameEngine.selectAll(false)" class="text-gray-500 text-sm font-medium hover:underline">בטל הכל</button>
                </div>
            </div>
        </div>

        <div id="screen-game" class="hidden flex flex-col gap-4 animate-pop">
            <div class="flex justify-between items-center px-2 text-sm text-white">
                <span id="display-player" class="text-yellow-500 font-bold"></span>
                <span id="display-score" class="text-orange-500 font-bold">ניקוד: 0</span>
            </div>
            <div class="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div id="progress-bar" class="progress-bar-fill h-full w-0"></div>
            </div>
            <div class="card p-8">
                <div id="display-arena" class="text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">זירה</div>
                <h3 id="display-question" class="text-2xl font-bold mb-8 leading-tight text-white"></h3>
                <div id="options-container" class="grid gap-3"></div>
            </div>
            <div id="feedback-area" class="hidden card p-4 border-l-4 border-yellow-500 animate-pop">
                <p id="feedback-text" class="text-sm italic text-gray-300"></p>
                <button id="next-btn" class="mt-4 btn-primary px-6 py-2 rounded-lg text-sm">המשך</button>
            </div>
        </div>

        <div id="screen-results" class="hidden card p-8 text-center animate-pop">
            <h2 class="text-4xl font-black mb-4 gradient-text">כל הכבוד!</h2>
            <div class="text-6xl font-black mb-4 text-white" id="final-score-val">0</div>
            <button onclick="location.reload()" class="text-gray-500 hover:text-white transition-colors underline text-sm">נסה שוב</button>
        </div>
    </div>

    <script src="js/data/zira1.js"></script>
    <script src="js/data/zira2.js"></script>
    <script src="js/data/zira3.js"></script>
    <script src="js/data/zira4.js"></script>
    <script src="js/data/zira5.js"></script>
    <script src="js/data/zira6.js"></script>
    <script src="js/data/zira7.js"></script>
    <script src="js/data/zira8.js"></script>
    <script src="js/data/zira9.js"></script>
    <script src="js/data/ziraAl.js"></script>
    <script src="js/audio.js"></script>
    <script type="module" src="js/engine.js"></script>
</body>
</html>""",

    "js/engine.js": """const GameEngine = {
    state: { playerName: "", selectedArenas: [], currentQuestions: [], currentIndex: 0, score: 0 },
    arenaDisplayNames: {
        "זירה 1": "זירה 1: להבין ולפרש את המציאות",
        "זירה 2": "זירה 2: גלובליזציה",
        "זירה 3": "זירה 3: חדשות וצילום עיתונאי",
        "זירה 4": "זירה 4: הומור וסאטירה",
        "זירה 5": "זירה 5: תרבות דיגיטלית",
        "זירה 6": "זירה 6: תוכניות ריאליטי",
        "זירה 7": "זירה 7: קליפים מוזיקליים",
        "זירה 8": "זירה 8: ספורט ותקשורת",
        "זירה 9": "זירה 9: פרסום ואקטיביזם",
        "זירת העל": "זירת העל: דמוקרטיה ואתיקה"
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
        this.state.playerName = name;
        const fullDb = this.getDatabase();
        const arenas = [...new Set(fullDb.map(d => d.zira))].sort((a,b) => a.localeCompare(b, 'he', {numeric:true}));
        document.getElementById('arena-list').innerHTML = arenas.map(a => `
            <div class="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-yellow-500 transition-all cursor-pointer">
                <input type="checkbox" id="arena-${a}" value="${a}" class="w-4 h-4 accent-yellow-500" checked>
                <label for="arena-${a}" class="flex-grow cursor-pointer text-sm text-gray-200">${this.arenaDisplayNames[a] || a}</label>
            </div>
        `).join('');
        this.switchScreen('welcome', 'selection');
    },
    selectAll(val) { document.querySelectorAll('#arena-list input').forEach(i => i.checked = val); },
    startGame() {
        const checked = Array.from(document.querySelectorAll('#arena-list input:checked')).map(i => i.value);
        if(checked.length === 0) { alert("בחר לפחות זירה אחת"); return; }
        const fullDb = this.getDatabase();
        this.state.currentQuestions = fullDb.filter(d => checked.includes(d.zira)).sort(() => Math.random() - 0.5);
        this.state.currentIndex = 0; this.state.score = 0;
        document.getElementById('display-player').innerText = `שלום, ${this.state.playerName}`;
        this.switchScreen('selection', 'game');
        this.renderQuestion();
    },
    renderQuestion() {
        const q = this.state.currentQuestions[this.state.currentIndex];
        document.getElementById('feedback-area').classList.add('hidden');
        document.getElementById('display-arena').innerText = q.zira;
        document.getElementById('display-question').innerText = q.q;
        document.getElementById('progress-bar').style.width = `${(this.state.currentIndex / this.state.currentQuestions.length) * 100}%`;
        document.getElementById('options-container').innerHTML = q.a.map((ans, i) => `
            <button onclick="GameEngine.handleAnswer(${i})" class="option-btn text-white text-right p-3 rounded-lg bg-white/5 border border-white/10 hover:border-yellow-500 w-full mb-2">
                ${ans}
            </button>
        `).join('');
    },
    handleAnswer(idx) {
        const q = this.state.currentQuestions[this.state.currentIndex];
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(b => b.disabled = true);
        if(idx === q.correct) { buttons[idx].classList.add('correct'); this.state.score += 10; }
        else { buttons[idx].classList.add('wrong'); buttons[q.correct].classList.add('correct'); }
        document.getElementById('display-score').innerText = `ניקוד: ${this.state.score}`;
        document.getElementById('feedback-text').innerHTML = q.rationale;
        document.getElementById('feedback-area').classList.remove('hidden');
        document.getElementById('next-btn').onclick = () => {
            this.state.currentIndex++;
            if(this.state.currentIndex < this.state.currentQuestions.length) this.renderQuestion();
            else { document.getElementById('final-score-val').innerText = this.state.score; this.switchScreen('game', 'results'); }
        };
    },
    switchScreen(outId, inId) {
        document.getElementById(`screen-${outId}`).classList.add('hidden');
        document.getElementById(`screen-${inId}`).classList.remove('hidden');
    }
};
window.GameEngine = GameEngine;""",

    "css/styles.css": """:root { --primary-yellow: #FFD700; --primary-orange: #FF8C00; }
body { font-family: 'Rubik', sans-serif; }
.gradient-text { background: linear-gradient(90deg, var(--primary-yellow), var(--primary-orange)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.card { background-color: #1E1E1E; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 1.5rem; }
.btn-primary { background: linear-gradient(135deg, var(--primary-yellow), var(--primary-orange)); font-weight: 800; color: #000; }
.progress-bar-fill { background: linear-gradient(90deg, var(--primary-yellow), var(--primary-orange)); transition: width 0.5s; }
.correct { background-color: rgba(34, 197, 94, 0.2) !important; border-color: #22c55e !important; }
.wrong { background-color: rgba(239, 68, 68, 0.2) !important; border-color: #ef4444 !important; }
@keyframes pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.animate-pop { animation: pop 0.4s ease-out forwards; }""",

    "js/audio.js": "window.Sounds = { click(){}, correct(){}, wrong(){} };",

    # --- מאגרי השאלות המלאים ---
    "js/data/zira1.js": """window.DATA_ZIRA_1 = [
        { zira: "זירה 1", q: "מהו המאפיין המרכזי של המודל הלינארי לפי לאסוול?", a: ["תהליך מעגלי", "תהליך קווי וחד-כיווני", "הדגש על הנמען", "רעשים תרבותיים"], correct: 1, rationale: "המודל הלינארי רואה בתקשורת פעולה מכוונת מהמוען לנמען." },
        { zira: "זירה 1", q: "קטיעות באינטרנט בשיעור זום הן דוגמה ל:", a: ["תקשורת בינאישית", "רעש טכני", "משוב חיובי", "חוסר התאמה תרבותית"], correct: 1, rationale: "רעש הוא הפרעה פיזית המונעת מהמסר לעבור." },
        { zira: "זירה 1", q: "מהו 'מודל תרבותי-סמיוטי' (מודל פיסק)?", a: ["מודל שמתמקד רק בטכנולוגיה", "מודל ששם דגש על הפרשנות של הנמען וייצור משמעויות", "מודל כלכלי לתקשורת", "מודל העברת נתונים"], correct: 1, rationale: "מודל פיסק מתמקד בתהליך שבו הנמען מפרש את הטקסט לפי תרבותו." }
    ];""",
    "js/data/zira2.js": """window.DATA_ZIRA_2 = [
        { zira: "זירה 2", q: "מהו התהליך המכונה 'גלובליזציה'?", a: ["סגירת גבולות", "מעבר חופשי של מידע, סחורות ואנשים ללא גבולות", "מעבר לכפר", "הגדלת מיסים"], correct: 1, rationale: "גלובליזציה היא תהליך של טשטוש גבולות לאומיים." },
        { zira: "זירה 2", q: "פורמט 'האח הגדול' שמופק בישראל הוא דוגמה ל:", a: ["לוקליזציה טהורה", "גלוקליזציה - שילוב גלובלי ומקומי", "אימפריאליזם תרבותי", "הכחדה סימבולית"], correct: 1, rationale: "שילוב של המגמה הגלובלית (פורמט) והלוקאלית (תוכן מקומי)." }
    ];""",
    "js/data/zira3.js": """window.DATA_ZIRA_3 = [
        { zira: "זירה 3", q: "בצילום עיתונאי, מה מתארת ה'דנוטציה'?", a: ["רגשות הצופה", "תיאור פיזי של התמונה (צבעים, אובייקטים)", "משמעות סמויה", "דעה פוליטית"], correct: 1, rationale: "הדנוטציה היא הרמה הברורה שנקלטת בעין ומוסכמת על כולם." }
    ];""",
    "js/data/zira4.js": """window.DATA_ZIRA_4 = [
        { zira: "זירה 4", q: "מהי המטרה המרכזית של הסאטירה?", a: ["רק להצחיק", "להעביר ביקורת על תופעות חברתיות ופוליטיות", "ללמד היסטוריה", "לחזק את הממשלה"], correct: 1, rationale: "ביקורת באמצעות הומור במטרה לעורר מודעות ושינוי." }
    ];""",
    "js/data/zira5.js": """window.DATA_ZIRA_5 = [
        { zira: "זירה 5", q: "מה ההבדל המרכזי בין תקשורת מסורתית לתקשורת דיגיטלית?", a: ["במסורתית התוכן עובר רק בוידאו", "במסורתית התקשורת היא חד-כיוונית, בעוד בדיגיטלית היא רב-כיוונית ואינטראקטיבית", "בדיגיטלית אין חדשות", "במסורתית אין עורכים"], correct: 1, rationale: "התקשורת הדיגיטלית הפכה את הקהל מנמען פסיבי למשתתף פעיל שגם מייצר תוכן." }
    ];""",
    "js/data/zira6.js": """window.DATA_ZIRA_6 = [
        { zira: "זירה 6", q: "כיצד תוכנית ריאליטי 'מבנה מציאות'?", a: ["צילום ללא עריכה", "ליהוק מוקצן ועריכה מגמתית", "שימוש בשחקנים", "שידור חדשות"], correct: 1, rationale: "המציאות בריאליטי היא תוצר של הנדסת סיטואציות ועריכה." }
    ];""",
    "js/data/zira7.js": """window.DATA_ZIRA_7 = [
        { zira: "זירה 7", q: "מה ההבדל בין 'מין' ל'מגדר'?", a: ["אין הבדל", "מין מולד, מגדר הוא הבניה חברתית", "מין משתנה ומגדר קבוע", "קשור לקליפים וחדשות"], correct: 1, rationale: "המגדר הוא תוצר של ציפיות תרבותיות והוא משתנה." }
    ];""",
    "js/data/zira8.js": """window.DATA_ZIRA_8 = [
        { zira: "זירה 8", q: "מהן 'זכויות שידור' בספורט?", a: ["ספורט בחינם", "תשלום עבור בלעדיות השידור", "זכות להופיע", "חוק שידור"], correct: 1, rationale: "הבסיס הכלכלי לקשר שבין הספורט לטלוויזיה המסחרית." }
    ];""",
    "js/data/zira9.js": """window.DATA_ZIRA_9 = [
        { zira: "זירה 9", q: "מהי ההגדרה של 'אקטיביזם חברתי'?", a: ["רכישת יוקרה", "הירתמות אזרחים ופעולה לתיקון עוולות ושינוי פוליטי/חברתי", "פרסום פוליטיקאים", "תוכנית בישול"], correct: 1, rationale: "אזרחות פעילה שבה הפרט לוקח אחריות על שינוי המציאות." }
    ];""",
    "js/data/ziraAl.js": """window.DATA_ZIRA_AL = [
        { zira: "זירת העל", q: "כיצד מתבטאת 'אחריות חברתית' של התקשורת בזמן מלחמה?", a: ["תקיפת הצבא", "הימנעות מפרסום חומר הפוגע במורל הלאומי, לטובת החוסן הציבורי", "הפצת פייק ניוז", "סגירת ערוצים"], correct: 1, rationale: "אחריות חברתית היא השהיית האינטרס המסחרי והביקורתי למען המדינה." }
    ];"""
}

# --- לוגיקת הבנייה וההרצה ---
def build_project():
    print("🚀 בונה את הפרויקט המלא עם השאלות האמיתיות...")
    for filepath, content in PROJECT_FILES.items():
        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else ".", exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f: f.write(content.strip())
    print("✅ הבנייה הושלמה.")

if __name__ == "__main__":
    build_project()
    import http.server, socketserver, webbrowser
    PORT = 8000
    with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
        print(f"🌍 השרת פועל בכתובת: http://localhost:{PORT}")
        webbrowser.open(f"http://localhost:{PORT}/index.html")
        httpd.serve_forever()