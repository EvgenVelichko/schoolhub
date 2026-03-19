'use server';

/**
 * @fileOverview Удосконалений синхронізатор NZ.UA Mobile API v2.
 * Тепер автоматично додає "Фізику" 2-м уроком по п'ятницях, якщо її немає.
 */

const API_BASE = 'https://api-mobile.nz.ua/v2';
const USER_AGENT = 'NZ.UA/3.2.1 (Android 14; Pixel 8 Build/UP1A.231005.007)';

const HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Accept-Language': 'uk-UA,uk;q=0.9',
};

function safeExtractText(val: any): string {
  if (!val) return "";
  if (Array.isArray(val)) {
    return val
      .filter(item => item !== null && item !== undefined)
      .map(item => {
        if (typeof item === 'object') return JSON.stringify(item);
        return String(item).trim();
      })
      .filter(Boolean)
      .join("; ");
  }
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val).trim();
}

export async function syncWithNzPortal(login: string, pass: string) {
  try {
    const loginRes = await fetch(`${API_BASE}/user/login`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ 
        username: login, 
        password: pass, 
        exponentPushToken: "" 
      }),
      cache: 'no-store'
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.access_token) {
      throw new Error(loginData.error_message || 'Невірний логін або пароль nz.ua');
    }

    const authHeaders = { 
      ...HEADERS, 
      'Authorization': `Bearer ${loginData.access_token}` 
    };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); 
    
    let startYear = currentYear;
    if (currentMonth < 8) { 
      startYear = currentYear - 1;
    }
    
    const start = `${startYear}-09-01`;
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 7);
    const end = futureDate.toISOString().split('T')[0];

    const diaryRes = await fetch(`${API_BASE}/schedule/diary`, { 
      method: 'POST', 
      headers: authHeaders, 
      body: JSON.stringify({ start_date: start, end_date: end }), 
      cache: 'no-store' 
    });

    if (!diaryRes.ok) throw new Error('Помилка отримання даних щоденника');
    const diary = await diaryRes.json();

    const grades: any[] = [];
    const lessons: any[] = [];
    const datesProcessed = new Set<string>();

    if (diary.dates) {
      diary.dates.forEach((day: any) => {
        const dateStr = day.date;
        datesProcessed.add(dateStr);
        (day.calls || []).forEach((call: any) => {
          const order = parseInt(call.call_number || call.number || 0);
          (call.subjects || []).forEach((subject: any) => {
            let homeworkParts: string[] = [];
            
            const fieldNames = ['homework', 'hometask', 'task', 'description', 'comment'];
            fieldNames.forEach(field => {
              if (subject[field]) homeworkParts.push(safeExtractText(subject[field]));
            });

            const lessonData = subject.lesson;
            if (lessonData) {
              const lessonsList = Array.isArray(lessonData) ? lessonData : [lessonData];
              lessonsList.forEach((l: any) => {
                fieldNames.forEach(field => {
                  if (l[field]) homeworkParts.push(safeExtractText(l[field]));
                });

                const mark = l.mark || (l.marks && l.marks[0]);
                const score = mark?.value || mark?.mark || mark;
                if (score && (typeof score === 'string' || typeof score === 'number')) {
                  grades.push({ 
                    subject: subject.subject_name, 
                    score: score.toString(), 
                    date: dateStr, 
                    type: l.type_name || "Урок", 
                    timestamp: new Date(dateStr).getTime() 
                  });
                }
              });
            }

            const homework = Array.from(new Set(homeworkParts))
              .filter(Boolean)
              .join("; ");

            lessons.push({
              subject: subject.subject_name,
              time: call.call_time_start || call.time_start || "--:--",
              timeEnd: call.call_time_end || call.time_end || "--:--",
              room: subject.room_name || "---",
              teacher: subject.teacher_name || "Вчитель",
              homework: homework.trim(),
              date: dateStr,
              order
            });
          });
        });
      });

      // Вручну додаємо Фізику по п'ятницях 2-м уроком, якщо її немає
      datesProcessed.forEach(d => {
        const dObj = new Date(d);
        if (dObj.getDay() === 5) { // П'ятниця
          const hasPhysicsOnTwo = lessons.some(l => l.date === d && l.order === 2);
          if (!hasPhysicsOnTwo) {
            lessons.push({
              subject: "Фізика",
              time: "09:15",
              timeEnd: "10:00",
              room: "302",
              teacher: "Вчитель фізики",
              homework: "Опрацювати параграф (додано вручну)",
              date: d,
              order: 2
            });
          }
        }
      });
    }

    return {
      success: true,
      data: {
        studentName: loginData.FIO || "Учень",
        gradeLevel: (loginData.class_name || "Клас").toString().trim(),
        schoolId: String(loginData.school_id || "default_school"),
        schoolName: loginData.school_name || "Моя школа",
        lessons: lessons,
        grades: grades,
        tokens: {
          access: loginData.access_token,
          refresh: loginData.refresh_token
        }
      }
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
