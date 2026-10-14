// Builds data/semester.json from Canvas (canvas.json) + Learning Suite (hand-entered below
// from the LS Prioritizer and Combined Schedule). Run: node data/build.js
const fs = require('fs');
const path = require('path');

const canvas = JSON.parse(fs.readFileSync(path.join(__dirname, 'canvas.json'), 'utf8'));

// [date, time, course, title, note?]
const LS = [
  ['2026-10-14', '11:59 pm', 'NDFS 250', 'Food Ingredients #1'],
  ['2026-10-16', '10:00 am', 'NDFS 250', 'Quiz 3 opens', 'Closes Saturday 9:00 pm.'],
  ['2026-10-17', '9:00 pm', 'NDFS 250', 'Quiz 3 closes'],
  ['2026-10-19', '11:59 pm', 'NDFS 250', 'Scientific Literature Review #1'],
  ['2026-10-21', '12:59 pm', 'NDFS 251', 'Lab Manual Ch 8 - Fruit & Veg Processing'],
  ['2026-10-21', '12:59 pm', 'NDFS 251', 'Lab Manual Ch 9 - Thermal Processing'],
  ['2026-10-28', '12:59 pm', 'NDFS 251', 'Lab Manual Ch 12 - Proteins/Cheese'],
  ['2026-10-28', '12:59 pm', 'NDFS 251', 'Lab Manual Ch 11 - Meats'],
  ['2026-10-30', '10:00 am', 'NDFS 250', 'Quiz 4 opens', 'Closes Saturday 9:00 pm.'],
  ['2026-10-31', '9:00 pm', 'NDFS 250', 'Quiz 4 closes'],
  ['2026-11-03', '9:00 pm', 'NDFS 250', 'Midterm 2 ends — Testing Center', 'Testing Center window likely opens around Fri Oct 30 (Midterm 1 ran Fri–Tue).'],
  ['2026-11-11', '12:59 pm', 'NDFS 251', 'Lab Manual Ch 15 - Emulsions'],
  ['2026-11-11', '12:59 pm', 'NDFS 251', 'Lab Manual Ch 14 - Eggs'],
  ['2026-11-11', '11:59 pm', 'NDFS 250', 'Food Ingredients #2'],
  ['2026-11-16', 'start of class', 'NDFS 250', 'Your Current Issue in the News presentation', '2–3 min at the start of class: summarize one food-science news article and explain how it relates to food science. 10 pts. Sick or excused? Tell Dr. Pang ASAP and try to swap with someone who has not presented yet.'],
  ['2026-11-16', '11:59 pm', 'NDFS 250', 'Scientific Literature Review #2'],
  ['2026-11-18', '12:59 pm', 'NDFS 251', 'Lab Manual Ch 13 - Frozen Desserts'],
  ['2026-11-18', '12:59 pm', 'NDFS 251', 'Lab Manual Ch 10 - Freezing'],
  ['2026-11-19', '9:00 pm', 'NDFS 250', 'Quiz 5 closes'],
  ['2026-11-20', '11:59 pm', 'NDFS 250', 'Scientific Literature Review - Reflection'],
  ['2026-11-25', '12:59 pm', 'NDFS 251', 'Lab Manual Ch 16 - Sugar Confections'],
  ['2026-11-25', '12:59 pm', 'NDFS 251', 'Lab Manual Ch 17 - Leavening'],
  ['2026-12-02', '', 'SWELL 121', 'Attendance'],
  ['2026-12-02', '', 'SWELL 121', 'GOALS'],
  ['2026-12-03', '9:00 pm', 'NDFS 250', 'Quiz 6 closes'],
  ['2026-12-07', '9:00 pm', 'NDFS 250', 'Midterm 3 ends — Testing Center'],
  ['2026-12-09', '12:59 pm', 'NDFS 251', 'Lab Manual Ch 18 - Gluten & Bread'],
  ['2026-12-09', '', 'NDFS 250', 'End of semester questionnaire (in class)'],
  ['2026-12-09', '', 'NDFS 250', 'Course and Instructor Evaluation (online)'],
  ['2026-12-09', '', 'SWELL 121', 'Final Exam'],
  ['2026-12-14', '', 'NDFS 250', 'In-class Final Exam'],
  ['2026-12-14', '', 'NDFS 251', 'Final Examination'],
];

function kindOf(title, type) {
  if (type === 'wiki_page') return 'reading';
  if (type === 'calendar_event') return 'event';
  if (/presentation/i.test(title)) return 'present';
  if (/exam|midterm|final/i.test(title)) return 'exam';
  if (/capstone/i.test(title)) return 'project';
  if (/essay|literature review|reflection/i.test(title)) return 'paper';
  if (/quiz/i.test(title)) return 'quiz';
  if (/lab manual/i.test(title)) return 'lab';
  return 'assignment';
}

const items = [
  ...canvas.map(c => ({
    date: c.date, time: c.time, course: c.course,
    title: c.title.replace(/\s+/g, ' ').replace(/—Testing Center/, ' — Testing Center'),
    kind: kindOf(c.title, c.type), points: c.points || undefined, done: c.done || undefined,
  })),
  ...LS.map(([date, time, course, title, note]) => ({ date, time, course, title, kind: kindOf(title), note })),
];

const timeKey = t => {
  const m = /^(\d+):(\d+) (am|pm)$/.exec(t || '');
  if (!m) return -1;
  return ((+m[1] % 12) + (m[3] === 'pm' ? 12 : 0)) * 60 + +m[2];
};
items.sort((a, b) => a.date.localeCompare(b.date) || timeKey(a.time) - timeKey(b.time));

// Extra context for specific big items.
const NOTES = {
  'Midcourse Exam 2 — Testing Center': 'Lessons 7–11 + Labs 8/9/11. Check the Testing Center window.',
  'Capstone Essay': 'Biggest assignment in REL A (500 pts).',
  'Final Exam — Testing Center': 'Comprehensive. 213 pts — the biggest single item in CELL 210.',
};
for (const it of items) if (NOTES[it.title] && !it.note) it.note = NOTES[it.title];

// "turnin" = you submit something (online quiz, paper, lab manual, form);
// "do" = nothing to hand in (readings, attending, in-person/Testing Center exams, calendar reminders).
function actionOf(it) {
  if (it.kind === 'reading' || it.kind === 'event' || it.kind === 'exam') return 'do';
  if (it.kind === 'present') return 'do';
  if (/ opens$|^attendance$|\(in class\)/i.test(it.title)) return 'do';
  return 'turnin';
}
for (const it of items) it.action = actionOf(it);
for (const it of items) if (/Attend a TA Review Session/.test(it.title) && !it.note) it.note = 'Go to a TA review session, then turn it in on Canvas.';

// Heads-up notes that show only between `from` and `to`.
const notes = [
  { from: '2026-10-12', to: '2026-10-17', text: 'NDFS 250 Quiz 3 is only open Fri 10:00 am → Sat 9:00 pm.' },
  { from: '2026-10-12', to: '2026-10-24', text: 'Back-to-back exams coming: CELL 210 Exam 2 (closes Thu Oct 29) and NDFS 250 Midterm 2 (ends Tue Nov 3). Start reviewing for both the week of Oct 19.' },
  { from: '2026-10-18', to: '2026-10-19', text: 'NDFS 250 Scientific Literature Review #1 is due Monday night.', urgent: true },
  { from: '2026-10-25', to: '2026-11-03', text: 'Exam crunch: CELL 210 Exam 2 closes Thu, NDFS 250 Quiz 4 Fri–Sat, NDFS 250 Midterm 2 ends Tue Nov 3.', urgent: true },
  { from: '2026-10-19', to: '2026-10-31', text: 'SWELL 121 Performance Day is coming up — pick your dives and partners.' },
  { from: '2026-11-08', to: '2026-11-19', text: 'CELL 210 Exam 3 closes Thu Nov 19, right as NDFS 250 has Lit Review #2 (Mon), Quiz 5 (Thu) and the Reflection (Fri).' },
  { from: '2026-11-09', to: '2026-11-16', text: 'Your NDFS 250 Current Issue presentation is Mon Nov 16 at the start of class. Pick a food-science news article ahead of time. Lit Review #2 is due the same night.', urgent: true },
  { from: '2026-11-15', to: '2026-11-25', text: 'REL A Capstone Project Draft is due Wed Nov 25 (Thanksgiving week). Get it done before the break.' },
  { from: '2026-11-29', to: '2026-12-10', text: 'REL A Capstone Essay (500 pts) is due Thu Dec 10.', urgent: true },
  { from: '2026-12-01', to: '2026-12-07', text: 'NDFS 250 Midterm 3 ends Mon Dec 7.' },
  { from: '2026-12-06', to: '2026-12-17', text: 'Finals: SWELL Dec 9 · NDFS 250 & 251 Mon Dec 14 · CELL 210 final closes Thu Dec 17.', urgent: true },
];

const courses = [
  { code: 'CELL 210', name: 'Human Anatomy (Canvas)' },
  { code: 'NDFS 250', name: 'Essentials of Food Science' },
  { code: 'NDFS 251', name: 'Food Science Lab' },
  { code: 'REL A 250', name: 'Christ & His Everlasting Gospel (Canvas)' },
  { code: 'SWELL 121', name: 'Diving, Springboard' },
];

const out = { version: 2, generated_at: new Date().toISOString(), semester_end: '2026-12-18', courses, items, notes };
fs.writeFileSync(path.join(__dirname, 'semester.json'), JSON.stringify(out));
console.log(items.length, 'items');
