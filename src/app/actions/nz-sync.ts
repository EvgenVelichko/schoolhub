'use server';
import { spawn } from 'node:child_process';

// ─── NZ.ua Mobile API v2 ────────────────────────────────────────────
// Based on real API structures from:
//   - https://github.com/TechAngle/nz-cli   (Go, v2 API)
//   - https://github.com/FussuChalice/OpenNZ (Dart, v1 API)
//
// Endpoints used:
//   POST /v2/user/login                  → { access_token, student_id, FIO, class_name, ... }
//   POST /v2/schedule/diary              → { dates[].calls[].subjects[].lesson[].mark }
//   POST /v2/schedule/student-performance→ { subjects[].marks[].{value,type} }
//   POST /v2/schedule/subject-grades     → { lessons[].{mark, lesson_date, lesson_type} }

const API = 'https://api-mobile.nz.ua/v2';

const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Accept-Charset': 'utf-8',
  'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8',
  'User-Agent': 'NZApp/3.0.0 (Android 14; sdk 34)',
  'Connection': 'Keep-Alive',
  'X-Requested-With': 'ua.nz.journal',
};

// ─── Subject normalization ──────────────────────────────────────────

const ABBR: Record<string, string> = {
  'укр. мова': 'Українська мова',
  'укр.мова': 'Українська мова',
  'українська': 'Українська мова',
  'укр. літ.': 'Українська література',
  'укр.літ.': 'Українська література',
  'укр. літ': 'Українська література',
  'зар. літ.': 'Зарубіжна література',
  'зар.літ.': 'Зарубіжна література',
  'зар. літ': 'Зарубіжна література',
  'англ. мова': 'Англійська мова',
  'англ.мова': 'Англійська мова',
  'англійська': 'Англійська мова',
  'нім. мова': 'Німецька мова',
  'нім.мова': 'Німецька мова',
  'франц. мова': 'Французька мова',
  'франц.мова': 'Французька мова',
  'геогр.': 'Географія',
  'географія': 'Географія',
  'геогр': 'Географія',
  'іст. укр.': 'Історія України',
  'іст.укр.': 'Історія України',
  'всесв. іст.': 'Всесвітня історія',
  'всесв.іст.': 'Всесвітня історія',
  'історія': 'Історія',
  'матем.': 'Математика',
  'математика': 'Математика',
  'алгебра': 'Алгебра',
  'геометрія': 'Геометрія',
  'фізика': 'Фізика',
  'хімія': 'Хімія',
  'біологія': 'Біологія',
  'біол.': 'Біологія',
  'інформ.': 'Інформатика',
  'інформатика': 'Інформатика',
  'фізкульт.': 'Фізкультура',
  'фізкультура': 'Фізкультура',
  "осн. здор.": "Основи здоров'я",
  'мистецтво': 'Мистецтво',
  'музика': 'Музика',
  'труд. навч.': 'Трудове навчання',
  'трудове': 'Трудове навчання',
};

function norm(raw: string): string {
  if (!raw) return '';
  const s = raw.trim().replace(/\s+/g, ' ');
  return ABBR[s.toLowerCase()] ?? s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Network ────────────────────────────────────────────────────────

function parseJson(raw: string, tag: string): any {
  const t = raw.trim();
  if (!t) throw new Error(`Порожня відповідь (${tag})`);
  if (t[0] === '<') {
    // Detect Cloudflare challenge vs NZ.ua login page
    if (t.includes('cf-') || t.includes('cloudflare') || t.includes('challenge')) {
      throw new Error(`Cloudflare блокує запит (${tag}). Спробуйте пізніше`);
    }
    throw new Error(`NZ.ua повернув HTML замість даних (${tag}). Можливо, невірний логін/пароль або сервер тимчасово недоступний`);
  }
  try { return JSON.parse(t); }
  catch { throw new Error(`Невалідний JSON (${tag})`); }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function post(url: string, body: Record<string, unknown>, headers: Record<string, string>, tag: string): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(1500);

    // 1) try fetch
    try {
      const res = await fetch(url, {
        method: 'POST', headers,
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      const raw = await res.text();
      try { return parseJson(raw, tag); }
      catch (e: any) { lastError = e; }
    } catch (e: any) { lastError = e; }

    // 2) curl fallback (Cloudflare sometimes blocks node fetch)
    try {
      const bin = process.platform === 'win32' ? 'curl.exe' : 'curl';
      const args = ['-sS', '--max-time', '30', '-X', 'POST', url,
        '--http1.1', '--compressed'];
      for (const [k, v] of Object.entries(headers)) args.push('-H', `${k}: ${v}`);
      args.push('--data-raw', JSON.stringify(body));

      const r = await new Promise<{ code: number | null; out: string; err: string }>(res => {
        const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '', err = '';
        p.stdout.on('data', c => (out += c));
        p.stderr.on('data', c => (err += c));
        p.on('close', code => res({ code, out, err }));
        p.on('error', () => res({ code: -1, out, err: `cannot run ${bin}` }));
      });
      if (r.code === 0) {
        try { return parseJson(r.out, tag); }
        catch (e: any) { lastError = e; }
      } else {
        lastError = new Error(`curl failed (${tag}): ${r.err || r.code}`);
      }
    } catch (e: any) { lastError = e; }
  }

  throw lastError || new Error(`Не вдалося з'єднатися з NZ.ua (${tag})`);
}

// ─── Helpers ────────────────────────────────────────────────────────

function dateTs(d: string): number {
  return new Date(d + 'T12:00:00').getTime();
}

function joinHw(parts: string[]): string {
  return [...new Set(parts)].filter(Boolean).join('; ').trim();
}

function textOf(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.filter(Boolean).map(i => String(i).trim()).filter(Boolean).join('; ');
  return '';
}

// ─── Main sync ──────────────────────────────────────────────────────

export async function syncWithNzPortal(login: string, pass: string, opts?: { deep?: boolean }) {
  const log: string[] = [];

  try {
    // ── 1. Login ──
    const me = await post(
      `${API}/user/login`,
      { username: login, password: pass, exponentPushToken: '' },
      BASE_HEADERS,
      'login',
    );
    if (!me.access_token) {
      throw new Error(me.error_message || 'Невірний логін або пароль nz.ua');
    }

    const studentId: number = me.student_id;
    const authHeaders = { ...BASE_HEADERS, Authorization: `Bearer ${me.access_token}` };

    // ── Date range: Sep 1 → now + 7 days ──
    const now = new Date();
    const yearStart = now.getMonth() < 8 ? now.getFullYear() - 1 : now.getFullYear();
    const startDate = `${yearStart}-09-01`;
    const endDate = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);

    // ── 2. Diary ──
    // Response: { dates: [{ date, calls: [{ call_number, call_time_start, call_time_end,
    //            subjects: [{ subject_name, room, teacher:{id,name}, lesson:[{type,mark,comment}], hometask:[] }] }] }] }
    const diary = await post(
      `${API}/schedule/diary`,
      { start_date: startDate, end_date: endDate, student_id: studentId },
      authHeaders,
      'diary',
    );
    if (diary.error_message) log.push(`diary warning: ${diary.error_message}`);

    const grades: any[] = [];
    const gradeKeys = new Set<string>();
    const lessons: any[] = [];

    // Collect subject_id mapping from performance for deep fetch
    const subjectIdMap = new Map<string, string>(); // subject_name → subject_id

    for (const day of (diary.dates || [])) {
      const date: string = day.date;
      if (!date) continue;

      for (const call of (day.calls || [])) {
        const callNum = call.call_number ?? 0;
        const timeStart: string = call.call_time_start || call.time_start || '--:--';
        const timeEnd: string = call.call_time_end || call.time_end || '--:--';

        for (const subj of (call.subjects || [])) {
          const name = norm(subj.subject_name);
          if (!name) continue;

          // -- Extract marks from lesson[] --
          // API structure: lesson is always an array of { type: string, mark: string, comment: string }
          const lessonArr: any[] = Array.isArray(subj.lesson) ? subj.lesson : (subj.lesson ? [subj.lesson] : []);

          for (let li = 0; li < lessonArr.length; li++) {
            const l = lessonArr[li];
            const mark: string = (typeof l.mark === 'string' ? l.mark : String(l.mark ?? '')).trim();
            if (!mark) continue;

            const type: string = l.type || 'Поточна';
            const key = `${date}|${name}|${type}|${callNum}_${li}`;
            if (!gradeKeys.has(key)) {
              gradeKeys.add(key);
              grades.push({ subject: name, score: mark, date, type, timestamp: dateTs(date) + callNum * 100 + li, sourceKey: key });
            }
          }

          // -- Build lesson card --
          const hwParts: string[] = [];
          // hometask is string[] per API
          if (Array.isArray(subj.hometask)) {
            subj.hometask.forEach((h: any) => { const t = textOf(h); if (t) hwParts.push(t); });
          }
          // Also check inside lesson[].comment for homework-like text
          for (const l of lessonArr) {
            if (l.comment) { const t = textOf(l.comment); if (t) hwParts.push(t); }
          }

          const teacherName = typeof subj.teacher === 'object' ? subj.teacher?.name : '';

          lessons.push({
            subject: name,
            time: timeStart,
            timeEnd: timeEnd,
            room: subj.room || '---',
            teacher: teacherName || 'Вчитель',
            homework: joinHw(hwParts),
            date,
            order: callNum,
          });
        }
      }
    }
    log.push(`diary: ${grades.length} grades, ${lessons.length} lessons`);

    // ── 3. Student-performance ──
    // Response: { subjects: [{ subject_id, subject_name, subject_shortname,
    //             marks: [{ value: "10", type: "Поточна" }] }], missed: { days, lessons } }
    // v1 difference: marks is just string[] like ["10","7"]
    // We handle both formats.
    try {
      const perf = await post(
        `${API}/schedule/student-performance`,
        { start_date: startDate, end_date: endDate, student_id: studentId },
        authHeaders,
        'performance',
      );

      if (perf.subjects && Array.isArray(perf.subjects)) {
        for (const s of perf.subjects) {
          const name = norm(s.subject_name || '');
          if (!name) continue;

          // Save subject_id for deep fetch
          if (s.subject_id) subjectIdMap.set(s.subject_name, s.subject_id);

          // Performance marks don't have dates — they are summary marks for the period.
          // We can't add them as individual dated grades. But if diary missed them entirely,
          // we still want them. We'll use a synthetic key with no date — these won't appear
          // in the date-filtered view but will count toward averages.
          if (!Array.isArray(s.marks)) continue;

          for (let i = 0; i < s.marks.length; i++) {
            const m = s.marks[i];
            // v2: mark is { value, type }, v1: mark is plain string
            const mark: string = (typeof m === 'object' ? m.value : String(m)).trim();
            const type: string = typeof m === 'object' ? (m.type || 'Поточна') : 'Поточна';
            if (!mark || mark === 'Н' || mark === 'H') continue; // "Н" = absent

            // Performance doesn't give us individual dates.
            // Only add if we don't already have enough marks for this subject from diary.
            const existingForSubject = grades.filter(g => g.subject === name).length;
            if (i < existingForSubject) continue; // diary already has this many marks

            const key = `perf|${name}|${type}|${i}`;
            if (!gradeKeys.has(key)) {
              gradeKeys.add(key);
              // Use startDate as fallback date so it doesn't break date formatting
              grades.push({ subject: name, score: mark, date: startDate, type, timestamp: dateTs(startDate) + i, sourceKey: key });
            }
          }
        }
      }
      log.push(`performance: ${perf.subjects?.length ?? 0} subjects`);
    } catch {
      log.push('performance: endpoint unavailable');
    }

    // ── 4. Subject-grades (deep fetch, initial sync only) ──
    // Response: { lessons: [{ mark, lesson_date, lesson_type, lesson_id, subject, comment }],
    //             number_missed_lessons: 0 }
    // This is the BEST source for detailed grades — has date + type per mark.
    if (opts?.deep) {
      let deepAdded = 0;

      for (const [rawName, subjectId] of subjectIdMap) {
        try {
          const sg = await post(
            `${API}/schedule/subject-grades`,
            { start_date: startDate, end_date: endDate, student_id: studentId, subject_id: subjectId },
            authHeaders,
            `grades/${rawName}`,
          );

          const name = norm(rawName);
          const sgLessons: any[] = sg.lessons || [];

          for (let i = 0; i < sgLessons.length; i++) {
            const l = sgLessons[i];
            const mark: string = (typeof l.mark === 'string' ? l.mark : String(l.mark ?? '')).trim();
            const date: string = l.lesson_date || '';
            if (!mark || !date) continue;

            const type: string = l.lesson_type || 'Поточна';
            const key = `${date}|${name}|${type}|sg_${l.lesson_id || i}`;
            if (!gradeKeys.has(key)) {
              gradeKeys.add(key);
              grades.push({ subject: name, score: mark, date, type, timestamp: dateTs(date) + i, sourceKey: key });
              deepAdded++;
            }
          }
        } catch {
          // Some subjects may not have this endpoint
        }
      }
      log.push(`subject-grades: +${deepAdded}`);
    }

    log.push(`total: ${grades.length} grades, ${lessons.length} lessons`);

    return {
      success: true,
      log,
      data: {
        studentName: me.FIO || 'Учень',
        gradeLevel: String(me.class_name || 'Клас').trim(),
        schoolId: String(me.school_id || 'default_school'),
        schoolName: me.school_name || 'Моя школа',
        lessons,
        grades,
        tokens: { access: me.access_token, refresh: me.refresh_token },
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message, log };
  }
}
