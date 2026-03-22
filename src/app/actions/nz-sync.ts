'use server';
import { spawn } from 'node:child_process';

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

async function parseApiResponse(res: Response, context: string) {
  const raw = await res.text();
  const text = raw.trim();
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const looksLikeHtml =
    text.startsWith('<!DOCTYPE') ||
    text.startsWith('<html') ||
    contentType.includes('text/html');

  if (looksLikeHtml) {
    throw new Error(`NZ.ua повернув HTML замість JSON (${context}).`);
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`NZ.ua повернув невалідний JSON (${context}).`);
  }
}

async function requestJsonWithCurl(
  url: string,
  payload: Record<string, unknown>,
  headers: Record<string, string>,
  context: string
) {
  const curlBinary = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const args = ['-sS', '--max-time', '30', '-X', 'POST', url];

  for (const [key, value] of Object.entries(headers)) {
    args.push('-H', `${key}: ${value}`);
  }

  args.push('--data-raw', JSON.stringify(payload));

  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const proc = spawn(curlBinary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    proc.stderr.on('data', (chunk) => (stderr += chunk.toString()));
    proc.on('close', (code) => resolve({ code, stdout, stderr }));
    proc.on('error', () => resolve({ code: -1, stdout, stderr: `Не вдалося запустити ${curlBinary}` }));
  });

  if (result.code !== 0) {
    throw new Error(`Помилка запиту до NZ.ua (${context}): ${result.stderr || `exit code ${result.code}`}`);
  }

  const text = result.stdout.trim();
  if (!text) throw new Error(`Порожня відповідь NZ.ua (${context})`);
  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    throw new Error(`NZ.ua повернув HTML замість JSON (${context}) навіть через curl.`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`NZ.ua повернув невалідний JSON (${context}) через curl.`);
  }
}

async function requestJson(
  url: string,
  payload: Record<string, unknown>,
  headers: Record<string, string>,
  context: string
) {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store'
  });

  try {
    const data = await parseApiResponse(res, context);
    return { ok: res.ok, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('HTML замість JSON')) {
      const data = await requestJsonWithCurl(url, payload, headers, context);
      return { ok: true, data };
    }
    throw error;
  }
}

/**
 * Parse a date string like "2026-03-22" into a UTC-safe timestamp.
 * new Date("2026-03-22") is treated as UTC midnight, which in UTC+2/+3
 * becomes the previous day. Adding T12:00:00 avoids the day shift.
 */
function safeDateTs(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getTime();
}

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

/**
 * Extract grades from diary data.
 * The diary is the only endpoint that ties marks to the actual calendar date
 * they were recorded on (day.date). The subject-grades endpoint returns
 * lesson_date which is the timetable date, not the real mark date.
 */
function extractGradesFromDiary(diary: any): any[] {
  const grades: any[] = [];
  const gradeKeys = new Set<string>();

  if (!diary?.dates) return grades;

  diary.dates.forEach((day: any) => {
    const dateStr = day.date;
    (day.calls || []).forEach((call: any) => {
      const order = parseInt(call.call_number || call.number || 0);
      (call.subjects || []).forEach((subject: any) => {
        const lessonData = subject.lesson;
        if (lessonData) {
          const lessonsList = Array.isArray(lessonData) ? lessonData : [lessonData];
          lessonsList.forEach((l: any, lessonIdx: number) => {
            // v2 diary: mark is a plain string ("8"), type is "Поточна"
            const score = l.mark;
            if (!score || typeof score !== 'string' || score.trim() === '') return;

            const gradeType = l.type || "Урок";
            const sourceKey = `${dateStr}|${subject.subject_name}|${gradeType}|${order}_${lessonIdx}`;

            if (!gradeKeys.has(sourceKey)) {
              gradeKeys.add(sourceKey);
              grades.push({
                subject: subject.subject_name,
                score: score.trim(),
                date: dateStr,
                type: gradeType,
                timestamp: safeDateTs(dateStr) + order * 100 + lessonIdx,
                sourceKey
              });
            }
          });
        }
      });
    });
  });

  return grades;
}

export async function syncWithNzPortal(login: string, pass: string) {
  try {
    const loginResult = await requestJson(
      `${API_BASE}/user/login`,
      { username: login, password: pass, exponentPushToken: "" },
      HEADERS,
      'login'
    );

    const loginData = loginResult.data;
    if (!loginResult.ok || !loginData.access_token) {
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

    const diaryResult = await requestJson(
      `${API_BASE}/schedule/diary`,
      { start_date: start, end_date: end },
      authHeaders,
      'schedule/diary'
    );

    if (!diaryResult.ok) throw new Error('Помилка отримання даних щоденника');
    const diary = diaryResult.data;

    // DEBUG: dump raw diary structure for the most recent 2 days that have marks
    const debugDays: any[] = [];
    if (diary.dates) {
      for (const day of diary.dates) {
        for (const call of (day.calls || [])) {
          for (const subj of (call.subjects || [])) {
            if (subj.lesson) {
              const lArr = Array.isArray(subj.lesson) ? subj.lesson : [subj.lesson];
              for (const l of lArr) {
                if (l.mark && String(l.mark).trim() !== '') {
                  debugDays.push({
                    _dayDate: day.date,
                    _callNumber: call.call_number || call.number,
                    _subjectName: subj.subject_name,
                    _subjectKeys: Object.keys(subj),
                    _lessonKeys: Object.keys(l),
                    _lessonFull: l,
                    _subjectFull: { ...subj, lesson: '<<omitted>>' }
                  });
                }
              }
            }
          }
        }
      }
    }
    console.log('=== NZ DEBUG: days with marks (last 10) ===');
    console.log(JSON.stringify(debugDays.slice(-10), null, 2));
    console.log('=== NZ DEBUG END ===');

    const grades: any[] = extractGradesFromDiary(diary);

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
              });
            }

            const homework = Array.from(new Set(homeworkParts))
              .filter(Boolean)
              .join("; ");

            // v2 diary: room is a string, teacher is {id, name}
            const teacherName = typeof subject.teacher === 'object'
              ? subject.teacher?.name
              : subject.teacher_name || subject.teacher;

            lessons.push({
              subject: subject.subject_name,
              time: call.call_time_start || call.time_start || "--:--",
              timeEnd: call.call_time_end || call.time_end || "--:--",
              room: subject.room || subject.room_name || "---",
              teacher: teacherName || "Вчитель",
              homework: homework.trim(),
              date: dateStr,
              order
            });
          });
        });
      });

      // Вручну додаємо Фізику по п'ятницях 2-м уроком, якщо її немає
      datesProcessed.forEach(d => {
        const dObj = new Date(d + 'T12:00:00');
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
