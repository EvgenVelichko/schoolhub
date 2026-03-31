/**
 * Debug script: dumps the raw NZ.UA diary API response to see exact field names.
 *
 * Usage: node debug-nz-api.mjs <login> <password>
 *
 * This will print:
 * 1. Top-level keys of the diary response
 * 2. Structure of the first few days with marks
 * 3. Full raw data for days with marks (last 10)
 */

const API_BASE = "https://api-mobile.nz.ua/v2";
const HEADERS = {
  "User-Agent": "NZ.UA/3.2.1 (Android 14; Pixel 8 Build/UP1A.231005.007)",
  Accept: "application/json",
  "Content-Type": "application/json",
  "Accept-Language": "uk-UA,uk;q=0.9",
};

const [login, password] = process.argv.slice(2);
if (!login || !password) {
  console.error("Usage: node debug-nz-api.mjs <login> <password>");
  process.exit(1);
}

async function main() {
  // 1. Login
  console.log("--- Logging in... ---");
  const loginRes = await fetch(`${API_BASE}/user/login`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ username: login, password, exponentPushToken: "" }),
  });
  const loginData = await loginRes.json();
  if (!loginData.access_token) {
    console.error("Login failed:", loginData);
    process.exit(1);
  }
  console.log("Login OK. Token:", loginData.access_token.slice(0, 20) + "...");

  const authHeaders = {
    ...HEADERS,
    Authorization: `Bearer ${loginData.access_token}`,
  };

  // 2. Fetch diary for last 2 weeks
  const now = new Date();
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);
  const start = twoWeeksAgo.toISOString().split("T")[0];
  const end = now.toISOString().split("T")[0];

  console.log(`\n--- Fetching diary: ${start} to ${end} ---`);
  const diaryRes = await fetch(`${API_BASE}/schedule/diary`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ start_date: start, end_date: end }),
  });
  const diary = await diaryRes.json();

  console.log("\n=== TOP-LEVEL KEYS ===");
  console.log(Object.keys(diary));

  if (!diary.dates) {
    console.log('No "dates" field! Full response:');
    console.log(JSON.stringify(diary, null, 2));
    process.exit(0);
  }

  console.log(`\n=== Total days in response: ${diary.dates.length} ===`);

  // 3. Find days with marks
  const daysWithMarks = [];
  for (const day of diary.dates) {
    for (const call of day.calls || []) {
      for (const subj of call.subjects || []) {
        // Check all possible mark locations
        const hasDirectMark = subj.mark || subj.marks;
        let hasLessonMark = false;
        if (subj.lesson) {
          const lessons = Array.isArray(subj.lesson)
            ? subj.lesson
            : [subj.lesson];
          for (const l of lessons) {
            if (l.mark || l.marks || l.score || l.value) {
              hasLessonMark = true;
            }
          }
        }
        if (hasDirectMark || hasLessonMark) {
          daysWithMarks.push({
            dayDate: day.date,
            dayKeys: Object.keys(day),
            callKeys: Object.keys(call),
            callNumber: call.call_number ?? call.number ?? call.order,
            callTimeStart: call.call_time_start ?? call.time_start,
            subjectName: subj.subject_name ?? subj.name ?? subj.subject,
            subjectKeys: Object.keys(subj),
            subjectDirectMark: subj.mark,
            subjectDirectMarks: subj.marks,
            lessonData: subj.lesson,
          });
        }
      }
    }
  }

  console.log(`\n=== Days with marks found: ${daysWithMarks.length} ===`);

  if (daysWithMarks.length > 0) {
    console.log("\n=== LAST 10 ENTRIES WITH MARKS (full detail) ===");
    console.log(JSON.stringify(daysWithMarks.slice(-10), null, 2));
  }

  // 4. Also dump a complete raw day for the most recent day with data
  const lastDayWithCalls = diary.dates
    .filter((d) => d.calls && d.calls.length > 0)
    .slice(-1)[0];
  if (lastDayWithCalls) {
    console.log(`\n=== FULL RAW DAY: ${lastDayWithCalls.date} ===`);
    console.log(JSON.stringify(lastDayWithCalls, null, 2));
  }

  // 5. Also try student-performance and subject-grades to compare
  console.log("\n--- Trying student-performance endpoint ---");
  try {
    const perfRes = await fetch(`${API_BASE}/schedule/student-performance`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ start_date: start, end_date: end }),
    });
    const perfData = await perfRes.json();
    console.log("student-performance top keys:", Object.keys(perfData));
    if (perfData.subjects) {
      console.log(`subjects count: ${perfData.subjects.length}`);
      // Print first 2 subjects with their marks
      console.log("First 2 subjects:");
      console.log(JSON.stringify(perfData.subjects.slice(0, 2), null, 2));
    } else {
      console.log(
        "Full response:",
        JSON.stringify(perfData, null, 2).slice(0, 2000),
      );
    }
  } catch (e) {
    console.log("student-performance failed:", e.message);
  }

  // 6. Try subject-grades for the first subject if we got performance data
  console.log("\n--- Trying subject-grades endpoint (first subject) ---");
  try {
    const perfRes2 = await fetch(`${API_BASE}/schedule/student-performance`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ start_date: start, end_date: end }),
    });
    const perfData2 = await perfRes2.json();
    if (perfData2.subjects && perfData2.subjects.length > 0) {
      const firstSubj = perfData2.subjects[0];
      const subjId = firstSubj.subject_id || firstSubj.id;
      console.log(
        `Fetching grades for subject: ${firstSubj.subject_name || firstSubj.name} (id: ${subjId})`,
      );

      const sgRes = await fetch(`${API_BASE}/schedule/subject-grades`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          start_date: start,
          end_date: end,
          subject_id: subjId,
        }),
      });
      const sgData = await sgRes.json();
      console.log("subject-grades top keys:", Object.keys(sgData));
      console.log("Full response (first 3000 chars):");
      console.log(JSON.stringify(sgData, null, 2).slice(0, 3000));
    }
  } catch (e) {
    console.log("subject-grades failed:", e.message);
  }
}

main().catch(console.error);
