import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

// הגדרות ה-Firebase שלך
const firebaseConfig = {
  apiKey: "AIzaSyBLcOg3PNwUwu3s36YmM9jl7Vs9LQUY2oo",
  authDomain: "media-quiz-39f0c.firebaseapp.com",
  projectId: "media-quiz-39f0c",
  databaseURL: "https://media-quiz-39f0c-default-rtdb.firebaseio.com/",
  storageBucket: "media-quiz-39f0c.firebasestorage.app",
  messagingSenderId: "848451369528",
  appId: "1:848451369528:web:c2696e10bff78b8256c4cd"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const QuizDataManager = {
    // טעינת זירה: בודק בענן, אם ריק - לוקח מהקובץ המקומי ומעלה לענן
    async getZiraData(ziraId, defaultStaticData) {
        try {
            const ziraRef = ref(db, `ziras/zira_${ziraId}`);
            const snapshot = await get(ziraRef);
            
            if (snapshot.exists()) {
                return snapshot.val();
            } else {
                if (defaultStaticData) {
                    await this.updateZiraData(ziraId, defaultStaticData);
                    return defaultStaticData;
                }
                return null;
            }
        } catch (error) {
            console.error("שגיאה בטעינה מהענן:", error);
            return defaultStaticData;
        }
    },

    // שמירה לענן
    async updateZiraData(ziraId, newData) {
        const ziraRef = ref(db, `ziras/zira_${ziraId}`);
        await set(ziraRef, newData);
    }
};
