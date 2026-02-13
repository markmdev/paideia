Three new detail pages built by subagents, all verified in browser:
1. `/dashboard/classes/[classId]/page.tsx` — Teacher class detail (roster, assignments, standards analysis)
2. `/dashboard/schools/[schoolId]/page.tsx` — Admin school detail (teachers, classes tables)
3. `/dashboard/students/[studentId]/page.tsx` — Admin student detail (enrollment, mastery, submissions)

### Bugs Found & Fixed (Iteration 6)
- ✅ Early warning table overflow: `whitespace-normal` on Indicators cell and expanded intervention cell (shadcn TableCell has `whitespace-nowrap` default). Commit c1126f8.
- ✅ Student detail mastery table overflow: `overflow-x-auto` wrapper. Commit e64dc73.
- ✅ Student table: names made clickable to student detail page. Commit 61a88a7.

### Browser Testing (Iteration 6)
- ✅ Teacher: Early Warning — 22 students, 6 High/6 Moderate/10 On Track, expandable AI interventions wrap properly
- ✅ Teacher: Messages — type badges, compose dialog, message list with dates
- ✅ Teacher: Lesson Plan detail — markdown renders (bold, italic), grade/subject/duration badges
- ✅ Teacher: Class Detail (Period 1) — 7 students, 4 assignments, standards analysis, mobile responsive
- ✅ Admin: District Analytics — 6 stat cards, mastery distribution, avg scores, teacher engagement, AI Insights button
- ✅ Admin: Schools — 2 schools with avg scores, proper pluralization
- ✅ Admin: School Detail (Washington MS) — 3 teachers, 9 classes, 71% avg, classes table with subjects
- ✅ Admin: Student Detail (Aisha Torres) — stat cards, enrollment, mastery, submissions
- ✅ Student (Aisha): Dashboard, assignments, tutor hub — all working

### Fixed: Markdown table rendering (commit 6aec5bf)
Installed `remark-gfm` and added `remarkPlugins={[remarkGfm]}` + table styling components to all 8 files using ReactMarkdown. CER Framework table now renders as proper HTML table with borders and header styling.

### Bugs Found & Fixed (Iteration 6 continued)
53. ✅ Em dash spacing: "Great job —keep" → "Great job — keep" on student-progress page (5 instances, commit cfe78cd)
54. ✅ Cross-class mastery leakage: ELA class detail showed science standards (HS-LS1-3) in strengths. Fixed by filtering mastery records via standards.subject join (commit e197160)
55. ✅ Double-dashes in seed data content (messages, essays, feedback) — fixed by background agent ac339e8, commit 5859fa8
56. ✅ Admin student detail: mastery level badges clipped — fixed with w-24, whitespace-nowrap, commit ca85e16
57. ⚠️ Duplicate "Symbols Speak Louder Than Words" draft assignments in DB (from AI testing) — data clutter, not code bug

### Browser Testing (Iteration 6 continued)
- ✅ Student: Progress page — em dashes fixed ("Great job — keep it up!")
- ✅ Teacher: Messages — compose dialog with To dropdown (Sarah Chen, Marcus Williams), subject, message textarea, Send button
- ✅ Teacher: My Classes — 5 periods, click through to class detail
- ✅ Teacher: Class Detail (Period 1) — mastery now ELA-only (no science leakage), standards analysis correct
- ✅ Teacher: Grading list — 3 assignments with progress bars and rubric info
- ✅ Teacher: Grading detail (American Dream) — 7 submissions, stat cards, "Grade All Ungraded (3)", differentiation section at bottom
- ✅ Admin: Students table — 22 students, search bar, scores, mastery badges, clickable names
- ✅ Admin: Student Detail (Aisha Torres) — stat cards, class enrollment table, mastery breakdown (8 ELA standards), recent submissions

### Commits This Session (Iteration 6+)
```
ca85e16 Fix mastery level badge clipping on admin student detail page
80d958e Update workspace with iteration 6 continued progress
e197160 Filter class detail mastery records by subject to prevent cross-class leakage
5859fa8 Fix double-dashes to em dashes in seed data
cfe78cd Fix em dash spacing on student progress page
e900421 Fix double-dash to em dash on student progress page
6aec5bf Add remark-gfm for markdown table rendering in AI content
c1126f8 Fix early warning table overflow with whitespace-normal on wrapping cells
e64dc73 Fix mastery table overflow on student detail page
61a88a7 Add admin student detail page with clickable names in students table
aeb2eb9 Add teacher class detail page with roster and performance
a2aed86 Add admin school detail page with teachers and classes
```

### Browser Testing (Iteration 6 session 2 — current)
- ✅ Admin: Messages — empty state for admin (correct, messages are parent-teacher)
- ✅ Teacher (Rivera): Messages — 7 messages with type badges (Message, Alert, Progress, Assignment, Weekly Digest), sparkle icons on AI-generated
- ✅ Teacher: Message detail (Marcus reply) — full message body, em dashes correct, translation feature, reply section
- ✅ Teacher: AI-generated message detail (Progress) — "AI Generated" badge, rich narrative, AI disclosure footer
- ✅ Student (Aisha): Assignments — 2 cards, no Create button, "Grading" badges
- ✅ Student: Assignment detail — 2 tabs only (Assignment, Your Submission), no teacher-only features
- ✅ Student: Your Submission — full essay, "Submitted" badge, "Awaiting Teacher Feedback" amber card
- ✅ Student: Dashboard — stat cards, Quick Actions, "Your Assignments" section with Submitted badges
- ✅ Mobile (390x844): Student dashboard — cards stack, clean responsive layout
- ✅ Mobile: Student dashboard scrolled — Quick Actions + Your Assignments section clean
- ✅ Mobile: Teacher My Classes — 5 periods stacked vertically
- ✅ Mobile: Teacher Class Detail (Period 1) — 2x2 stat grid, roster with avatars, assignments, standards analysis
- ✅ Mobile: Teacher Early Warning — summary cards stack, table with risk badges (indicator text truncated but acceptable)
- ✅ Mobile: Parent (Marcus) dashboard — Children, Unread Messages, Quick Actions
- ✅ Mobile: Parent My Children — DeShawn card with On Track badge
- ✅ Mobile: Parent Child Detail — stat cards, skills, AI Transparency panel beautiful on mobile
- ✅ SPED: IEP Management — 2 students, correct pluralization, review dates with days-left badges
- ✅ SPED: IEP Detail (DeShawn) — rich present levels, 2 SMART goals with data points/trends, 9 accommodations, related services, compliance deadlines
- ✅ Landing page hero — stunning Instrument Serif, "Powered by Claude Opus" badge, CTAs, stats section

### Database re-seeded this session
Ran `npm run db:seed` after seed data double-dash fix (commit 5859fa8). All em dashes now correct in live DB.

### Bugs Found & Fixed (Iteration 6 session 3)
58. ✅ Compliance page subtitle: "across your caseload" shown to admin — now role-aware ("across your district" for admin). Commit d5055d9.

### Browser Testing (Iteration 6 session 3 — current)
- ✅ Teacher (Rivera): Quizzes list — 1 quiz card (ELA Vocabulary Unit 3), "8th Grade", "10 questions", "+ New Quiz" button
- ✅ Teacher: Quiz creation wizard — 3-step stepper (Configure/Generate/Review), Topic, Subject, Grade Level, Num Questions (10 default), Difficulty (Medium), Question Types (MC/Short/Essay toggles), Standards (optional), "Generate with AI" button
- ✅ Teacher: Exit Tickets — clean form with Topic, Grade Level, Subject, Questions dropdown, Lesson Context, "Generate Exit Ticket" button
- ✅ Admin (Williams): Schools — 2 school cards, correct pluralization, avg scores (78%, 83%)
- ✅ Admin: School Detail (Washington MS) — 4 stat cards, 3 teachers table, 10 classes table with subjects/scores, Top Subjects by Score, Mastery Distribution (37 Adv, 60 Pro, 45 Dev, 28 Beg)
- ✅ Admin: Dashboard — "Welcome back, Dr. Williams", 4 stats, 3 Quick Actions
- ✅ Admin: Early Warning — 22 students (4 High Risk, 7 Moderate, 11 On Track), expandable AI recommendations work beautifully with numbered steps
- ✅ Admin: SPED Compliance — 3 deadlines (Ethan 90d, DeShawn 185d/550d), all On Track, subtitle now role-aware
- ✅ SPED (Rodriguez): IEP Management — 2 students, correct pluralization
- ✅ SPED: IEP Detail (DeShawn) — full PLAAFP, 2 SMART goals with data/trends, 9 accommodations, services, deadlines
- ✅ SPED: Progress Monitoring — student list, Quick Data Entry form, goal charts with baseline/goal dashed lines, trend badges
- ✅ SPED: Sidebar Special Education section — IEP Management, Progress Monitoring, Compliance all linked
- ✅ Student (DeShawn): Dashboard — 2 classes, 0 completed, N/A avg, 1 tutor, 2 assignment cards with Submitted badges

### Bugs Found & Fixed (Iteration 7 — browser polish)
59. ✅ All students showed "8th Grade" including 3rd graders — seed data had students[14..19] enrolled in both Rivera's 8th grade ELA and Chen's 3rd grade class. Fixed seed to make Chen's students exclusive. Re-seeded. (commit 1dd7b57)

### Browser Testing (Iteration 7 — current session)
- ✅ Teacher (Okafor): My Classes — 3 Biology classes (Period 1: 8 students, Period 2: 6, Period 3: 0). Properly scoped to Science only.
- ✅ Teacher (Okafor): Class Detail (Bio Period 1) — 8 students with varied mastery (Advanced/Proficient/Developing/Beginning), 2 assignments, standards analysis (HS-LS science standards only, no ELA leakage)
- ✅ Teacher (Okafor): Assignments — 3 Biology assignments (Cell Structure Lab Report, Genetics and Heredity Lab, Ecosystem Research Poster), all Science/10th Grade
- ✅ Teacher (Okafor): Assessment & Grading — 1 assignment (Genetics, 6/6 graded, 84% avg)
- ✅ Teacher (Chen): Dashboard — "Welcome back, Mrs. Chen", 1 class, 5 pending, 3 assignments, 6 students
- ✅ Teacher (Chen): My Classes — "3rd Grade All Subjects", All Subjects, 6 students
- ✅ Teacher (Chen): Reports & Analytics — 3rd Grade class, 72% avg, 54 data points, mastery distribution bar
- ✅ Teacher (Chen): Early Warning — 6 students (1 High Risk: Yuki Tanaka 65%, 2 Moderate, 3 On Track). Properly scoped.
- ✅ Teacher (Chen): Lesson Plans — 1 plan (Multiplying by Multiples of 10, 3rd Grade, Math, 40 min)
- ✅ Teacher (Chen): Report Cards — 1 class, 0 report cards, "Generate All" button
- ✅ Admin: Schools list — 2 schools with correct pluralization
- ✅ Admin: Jefferson Elementary detail — 1 Teacher (Mrs. Chen), 6 Students, 1 Class, 83% Avg. Teachers/Classes tables, Top Subjects (Math 83%), Mastery Distribution (Adv 14, Pro 22, Dev 13, Beg 5)
- ✅ Admin: Students — grade distribution now correct (16 at 8th Grade, 6 at 3rd Grade)
- ✅ Mobile (390x844): Admin school detail — 2x2 stat grid, tables fit, mastery distribution clean
- ✅ Mobile (390x844): Admin students — table readable but rightmost columns (Avg Score, Mastery) cut off (minor, acceptable)

### Browser Testing (Iteration 7 continued — this session)
- ✅ Teacher (Rivera): Messages — 7 messages, compose dialog opens cleanly
- ✅ Teacher: Compose message — To dropdown shows Sarah Chen (Parent), Marcus Williams (Parent)
- ✅ Teacher: Send message — composed "Upcoming Poetry Unit" to Sarah Chen, sent successfully, appeared at top of list
- ✅ Parent (Sarah Chen): Messages — received "Upcoming Poetry Unit" from Ms. Rivera at top, dated 2/12/2026
- ✅ Parent: Message detail — full body, "Translate this message" feature with language dropdown, Reply section with "Reply to: Ms. Rivera"
- ✅ **Message compose flow: END-TO-END VERIFIED** (teacher → parent, appears in both inboxes)
- ✅ Mobile (390x844): SPED Progress Monitoring — student list (DeShawn 2 goals, Ethan 1 goal), Quick Data Entry form clean
- ✅ Mobile: DeShawn Reading Fluency chart — On Track, baseline/goal/data lines, 12 data points, 99 wpm latest
- ✅ Mobile: DeShawn Written Expression chart — Flat trend, 6 data points, rubric score 2.5/4
- ✅ Mobile: Ethan Organization goal — On Track, 8 data points, 65% latest, clear upward trend
- ✅ Mobile: Teacher Grading list — 3 assignments with progress bars, clean responsive cards
- ✅ Mobile: Teacher Grading detail (American Dream) — 2x2 stat grid, 7 submissions with avatar initials, all readable
- ✅ Admin: District Analytics — 6 stat cards, mastery distribution, avg scores by subject, teacher engagement table
- ✅ Admin: "Generate AI District Insights" button visible at bottom
- ✅ Teacher: Report Cards — 5 classes, Period 1 has 5 report cards (1 draft, 4 approved), Recent table with varied grades
- ✅ Teacher: Early Warning (after reseed) — 16 students, 3 High Risk, 5 Moderate, 8 On Track
- ✅ Student (DeShawn): Progress — 42% ELA mastery (Beginning), encouraging messages, Areas to Improve with standards

### Bugs Found & Fixed (Iteration 7 continued)
60. ✅ Report Cards: "Generate All" button shown for classes with 0 students — hidden when studentCount is 0. Commit 87a3c11.

### Browser Testing (Iteration 7 session 3 — this session)
- ✅ **Parent → Teacher message flow: END-TO-END VERIFIED** — Sarah Chen sent "Question About Aisha's Reading Progress" to Ms. Rivera via API, appeared in both parent and teacher inboxes
- ✅ Parent compose dialog: To dropdown shows "Ms. Rivera (Teacher)" — correctly role-filtered contacts
- ✅ Admin: Students table — 22 students, varied scores, mastery distribution badges, clickable names
- ✅ Admin: Student Detail (Ethan Nakamura) — 3 classes (ELA, Bio, SPED Resource), 3 submissions, 62% avg, 9 mastery standards (all Developing/Beginning), IEP Status with "Active" ADHD badge and "View IEP" link
- ✅ Admin: Messages — clean empty state "No messages yet" (correct, admin has no parent-teacher messages)
- ✅ Mobile (390x844): Admin messages empty state — clean envelope icon, proper responsive
- ✅ Mobile: Teacher (Rivera) messages — 8 messages stacked cleanly, type badges, sender names, previews
- ✅ Mobile: Teacher compose dialog — To/Subject/Message fields fit mobile viewport, Send button accessible
- ✅ Teacher: Class Detail (Period 4, 0 students) — clean empty state: 0/0/N/A/N/A stat cards, "No students enrolled" and "No assignments created" empty state messages
- ✅ Teacher: Report Cards — Periods 4-5 (0 students) no "Generate All" button (fix confirmed), Period 1 shows 5 cards (1 draft, 4 approved)
- ✅ Teacher: Report Card Detail (DeShawn Williams C+) — rich narrative mentioning verbal comprehension, SPED connection, Strengths/Growth/Recommendations sections, AI disclosure footer, "Powered by Claude" badge
- ✅ Landing page full scroll: Hero → Stats → 6 Module Cards → How It Works (3-step) → CTA section — all polished

### Browser Testing (Iteration 8-9 — this session)
- ✅ Student (Aisha): Assignment detail "Your Submission" tab — full essay text, "Submitted" badge, "Awaiting Teacher Feedback" amber card (Narrative Writing)
- ✅ Student (Aisha): American Dream Essay submission — full essay, "Awaiting Teacher Feedback" card (no approved feedback yet, correct)
- ✅ Student (DeShawn): AI Tutor hub — "Suggested Practice" section shows 4 weak ELA areas (31%, 35%, 38%, 38% mastery) with "Practice This" links
- ✅ Student (DeShawn): "Practice This" link → tutor chat pre-fills input with "I need help with: [standard description]" (fix committed c538595)
- ✅ Teacher (Rivera): Assessment & Grading — 3 assignments (Poetry 5/5 graded 72% avg, Narrative 0/6, American Dream 0/7)
- ✅ Teacher: Grading detail (Poetry Analysis) — 5 submissions with scores (Amara 88%, Noah 74%, Priya 58%), stat cards
- ✅ Teacher: Submission feedback (Amara Osei 88%) — rubric scores (Thesis 23/25 Adv, Evidence 22/25 Pro, Organization 23/25 Adv, Language 20/25 Pro), Overall Feedback with "Approved" badge, Strengths/Improvements/Next Steps, Feedback tone dropdown, Approve & Return / Edit / Regenerate buttons, "Powered by Claude" badge
- ✅ Admin: District Analytics — 6 stat cards, Standards Mastery Distribution, Avg Scores by Subject, Teacher Engagement table, "Generate AI District Insights" button

- ✅ Mobile (390x844): DeShawn tutor hub — Suggested Practice cards stack, subject 2-col grid, Recent Sessions below
- ✅ Mobile: Tutor chat — ELA badge + timer + End Session fit one row, pre-filled input visible with send button

### Bugs Found & Fixed (Iteration 8-9)
61. ✅ Tutor chat input empty when arriving from "Suggested Practice" — added initialValue prop to ChatInput, pre-fills with "I need help with: [topic]" from URL param. Commit c538595.

### Bugs Found & Fixed (Iteration 10)
62. ✅ Report Cards: "1 drafts" → "1 draft" — pluralization fix + Number() coercion for SQL count comparison (commits de6f906, 09d5df9)
63. ✅ Reports mastery heatmap: Science standards (HS-LS1-*) leaked into ELA class report — added innerJoin with standards table filtered by cls.subject (commit 52c2ebc)

### Browser Testing (Iteration 10)
- ✅ Admin: Student Detail (Ethan Nakamura) — 3 classes, 62% avg, 3 submissions, IEP Status "Active" ADHD
- ✅ Admin: "View IEP" cross-navigation from student detail → IEP detail page works (navigated to Ethan's IEP)
- ✅ Admin: IEP Detail (Ethan) — rich PLAAFP, 1 SMART goal (Organization), "Powered by Claude", admin sidebar correct
- ✅ Admin: Students search — typing "priya" filters to Priya Sharma (58%, 1 Dev 6 Beg) — instant client-side filter
- ✅ Student (Aisha): My Classes — 1 class (8th Grade ELA - Period 1, Ms. Rivera, 8 students)
- ✅ Teacher (Rivera): Report Cards — "1 draft" (pluralization fix confirmed), "4 approved", 5 report cards total
- ✅ Teacher: Reports & Analytics — 5 class cards with mastery distribution bars, "No mastery data yet" for empty classes
- ✅ Teacher: Reports detail (Period 1 heatmap) — 8 ELA-only standards (science leakage fixed), 7 students, color-coded cells
- ✅ Mobile (390x844): Reports heatmap — table scrolls horizontally, student names readable, cells sized correctly
- ✅ Mobile: Landing page — hero (Instrument Serif, CTAs), stats 2x2, module cards stacked single-column with colored borders

### Dev Server
Background task b7d8737 running `npm run dev` on localhost:3000.
Chrome tab ID: 1135439413. **Currently mobile viewport (390x844), on landing page.**

### Bugs Found & Fixed (Iteration 11)
64. ✅ Default Next.js 404 page (black background) — created custom not-found.tsx with BookOpen icon, Instrument Serif heading, Go Home + Dashboard CTAs (commit e790df9)
65. ✅ Student feedback items (strengths/improvements/next steps) showed raw markdown (*italic*, **bold**) — wrapped in ReactMarkdown (commit 6501c09)
66. ⚠️ IEP wizard: "Generated by AI — Review required" helper text shows even when content is manually typed (minor, cosmetic)

### Browser Testing (Iteration 11)
- ✅ Custom 404 page (/nonexistent-page) — BookOpen icon, stone/amber design, Go Home + Dashboard buttons
- ✅ Custom 404 page (/dashboard/nonexistent-page) — same custom page renders
- ✅ SPED: IEP Creation Wizard step 1 — Student dropdown (DeShawn, Ethan), Disability Category dropdown (10+ IDEA categories), Start/End dates pre-filled
- ✅ SPED: IEP Wizard step 2 (Present Levels) — large textarea, "Auto-generate with AI" button, placeholder text
- ✅ SPED: IEP Wizard step 3 (Goals) — "AI Suggest" + "+ Add Goal" buttons, SMART goal form (Area, Frequency, Goal Text template, Baseline, Target, Measurement Method)
- ✅ SPED: IEP Wizard step 4 (Accommodations) — "AI Suggest" + "+ Add", type dropdown (Instructional/Assessment/Environmental/Behavioral), description field
- ✅ SPED: IEP Wizard step 5 (Review) — full summary (student, disability, dates, present levels, goals count, accommodations), "Create IEP" button
- ✅ Student (Aisha): Graded feedback view — emerald grade card (91.67/100, A), rich Teacher Feedback narrative referencing her essay, Strengths (green border, 3 items), Areas for Improvement (amber border, 3 numbered items), Next Steps (blue border, 3 numbered items), AI disclosure footer
- ✅ Student feedback: markdown now renders (italic *should*, *opposite* properly styled)

### Grading Data Added This Session
- Graded Aisha's American Dream Essay via API (Claude Opus) — 91.67% A
- Approved feedback via PUT /api/grading/[id] action=approve
- Student now sees Feedback tab with full AI-generated feedback

### Bugs Found & Fixed (Iteration 12)
67. ✅ Student dashboard: "0 Completed Assignments" despite having graded+approved work — dashboard filtered `eq(status, 'graded')` but approval changes status to `'returned'`. Fixed with `inArray(status, ['graded', 'returned'])`. Commit 43702dc.
68. ✅ Parent child detail: raw markdown in feedback items (*why*, *should* showing asterisks) — wrapped strengths, improvements, finalFeedback in ReactMarkdown. Commit 4b8fe8b.

### Browser Testing (Iteration 12)
- ✅ Mobile (390x844): Student feedback view — grade card (emerald A), strengths/improvements/next steps all render perfectly with colored borders
- ✅ Mobile: Student feedback markdown rendered (*should* italic, *opposite* italic)
- ✅ Parent (Sarah Chen): My Children — Aisha 92% avg, "The American Dream Essay: A" in Recent Grades
- ✅ Parent: Child detail — 92% avg, 1 class, 1 graded assignment, Skills Snapshot (8 ELA), Recent Feedback with markdown fixed, AI Transparency panel
- ✅ Parent: Progress — 84% ELA mastery, On Track, 8 skills with progress bars
- ✅ Student (DeShawn): Assignments — 2 cards (Narrative Writing, American Dream), both "Grading" status
- ✅ Teacher (Rivera): Reports & Analytics — 5 class cards with mastery bars, Periods 4-5 "No mastery data yet"
- ✅ Teacher: Report detail (Period 1 heatmap) — 7 students x 8 ELA standards, color-coded cells, "Find Gaps" button
- ✅ Teacher: Assessment & Grading — 3 assignments (Poetry 5/5 100%, Narrative 0/6 0%, American Dream 1/7 14% 92% avg)
- ✅ Teacher: Grading detail (Narrative Writing) — 6 submissions, "Grade All Ungraded (6)" button
- ✅ Teacher: Submission feedback panel — split view (student work left, AI feedback right), Draft badge, Overall Feedback narrative, Strengths/Improvements/Next Steps, feedback tone dropdown, Approve & Return/Edit/Regenerate buttons, "Powered by Claude" badge
- ✅ Teacher: Lesson Plans — 3 cards with badges
- ✅ Teacher: Lesson Plan detail — Standards Alignment, Learning Objectives, Warm-Up, Closure, Materials, Differentiation 3 tiers
- ✅ Admin: District Analytics — 6 stat cards, mastery distribution, avg scores, teacher engagement, AI insights button
- ✅ Mobile (390x844): Admin analytics — stat cards 2x3 grid, tables fit (AI Feedback column truncated, minor)
- ✅ Hydration errors on pages are from Claude-in-Chrome browser extension, not app bugs

### Browser Testing (Iteration 13)
- ✅ Admin: School Detail (Washington MS) on desktop — 4 stat cards (3 Teachers, 16 Students, 9 Classes, 80% Avg), Teachers table, Classes section
- ✅ Mobile (390x844): Admin School Detail — 2x2 stat grid, Teachers table fits, Classes table with 9 rows, Top Subjects (Science 84%, ELA 76%), Mastery Distribution (23 Adv, 38 Pro, 32 Dev, 23 Beg)
- ✅ SPED: Progress Monitoring data entry — Goal dropdown (Reading Fluency, Written Expression), Value input, Unit dropdown (wpm, %, rubric 0-4, count), Notes textarea, "+ Record Data Point" button
- ✅ SPED: Ethan Nakamura progress — 1 active goal (Organization and Task Completion), On Track, baseline 45% → target 80%, 8 data points, latest 65%, clear upward trend
- ✅ Mobile (390x844): Teacher Messages — 6+ messages stacked cleanly with type badges, dates, preview text
- ✅ Mobile: Compose dialog — To dropdown (Sarah Chen Parent, Marcus Williams Parent), Subject, Message textarea, Send button — all fit 390px viewport
- ✅ Student (Aisha): AI Tutor hub on desktop — 6 colorful subject cards (3x2), greeting, Recent Sessions (Math Linear Equations), no Suggested Practice (correct — high mastery)
- ✅ Student: Tutor chat on desktop — ELA badge, timer, End Session button, Socratic response ("what do you already know about..."), "Powered by Claude" badge, input hint
- ✅ Teacher (Rivera): Early Warning — 16 students, 3 High Risk, 5 Moderate, 8 On Track, expandable AI interventions (3 numbered, specific, data-driven recommendations per student)
- ✅ Teacher: Rubrics — 1 template (Essay Writing Rubric), 4 criteria, 4 levels, "+ Create Rubric" button
- ✅ Student (Aisha): Dashboard — bug #67 fix confirmed: 1 Completed Assignment, 92% avg, 2 Tutor Sessions
- ✅ Landing page full scroll: Hero → Stats → 5 Modules → How It Works → CTA → Demo Credentials → Footer — all polished

### Bugs Found & Fixed (Iteration 14)
69. ✅ My Classes page: grade level badge showed raw "10" instead of "10th Grade" — added formatGradeLevel. Commit 598a609.

### Browser Testing (Iteration 14)
- ✅ Mobile (390x844): Report card detail (Aisha Torres A-) — full page: Overall Narrative, Powered by Claude, Strengths (3 green), Areas for Growth (2 amber), Recommendations (2 blue), AI disclosure footer — all clean on mobile
- ✅ Mobile: Quiz detail (ELA Vocabulary Unit 3) — 10 questions with Bloom's badges (Remember, Understand, Analyze), correct answers highlighted green, explanations, standards badges — clean on mobile
- ✅ Student (DeShawn): Assignment detail (Narrative Writing) — Assignment tab + Your Submission tab, description + instructions, "Submitted" badge, essay text, "Awaiting Teacher Feedback" amber card (tab switch works via keyboard/programmatic click, browser automation has trouble with Radix tab clicks)
- ✅ Student (DeShawn): Progress page — 42% ELA mastery (Beginning), encouraging empty state for "What I'm Good At", 5 specific "Areas to Improve" standards
- ✅ Teacher (Okafor): My Classes — 3 Biology classes, grade badges now show "10th Grade" (fix confirmed)
- ✅ Teacher (Okafor): Class Detail (Period 3, 0 students) — clean empty state: 0/0/N/A/N/A stat cards, "No students enrolled" and "No assignments created" messages
- ✅ SPED: IEP Management — 2 students (DeShawn SLD 184d left, Ethan ADHD 244d left)
- ✅ SPED: IEP Detail (DeShawn) — rich PLAAFP (specific assessment data: F&P Level T, 97 wpm, STAR 18th percentile, 72% spelling), "Edit IEP" button present

### Bugs Found & Fixed (Iteration 15)
70. ✅ Lesson plan edit page: grade badge showed raw "8" instead of "8th Grade" — added formatGradeLevel to edit page + new page preview. Commit 75bea19.

### Browser Testing (Iteration 15)
- ✅ SPED: IEP Edit page (DeShawn) — "Edit IEP: DeShawn Williams", Present Levels textarea with full PLAAFP, "Regenerate with AI" button, 2 Goals (Reading Fluency, Written Expression) with all SMART fields editable, 8+ Accommodations with type dropdowns, "Save IEP" button
- ✅ Teacher: Lesson plan detail — "Analyzing Persuasive Techniques in Media", 8th Grade, ELA, 50 min, standards, all sections
- ✅ Teacher: Lesson plan edit page — card-based layout, editable title, badges (8th Grade fix confirmed), standards, 3 editable objectives, 5 editable sections (Warm-Up through Closure), materials, differentiation tiers, assessment plan, Save Changes + Cancel buttons
- ✅ Parent (Sarah Chen): Progress page — "Track your children's mastery across subjects", ELA 84% On Track, 8 ELA skills with bars and levels (2 Advanced, 6 Proficient)
- ✅ Login page (desktop) — email/password, Sign in, 5 demo buttons (Teacher, Admin, Parent, Student, SPED Teacher), Register link
- ✅ Login page (mobile 390x844) — all elements fit, 2-column demo buttons, clean responsive
- ✅ Registration page (desktop) — Name, Email, Password, Confirm Password, "You will be registered as a Teacher" note, Create account, Sign in link
- ✅ Registration page (mobile 390x844) — all fields fit, button full width, clean responsive
- ✅ Demo login button (Student Aisha Torres) — JS click works, navigated to student dashboard correctly (browser automation ref click doesn't trigger React handlers — known limitation, not code bug)
- ✅ Teacher (Rivera): Rubrics list — 1 template (Essay Writing Rubric), 4 criteria, 4 levels, "+ Create Rubric" button
- ✅ Teacher: Rubric detail — full 4x4 color-coded grid (Thesis/Evidence/Organization/Language × Beginning/Developing/Proficient/Advanced), 25% weights each, "Use in Assignment" + "Delete" buttons
- ✅ Teacher: Dashboard — 5 stat cards (5 classes, 13 pending, 3 assignments, 16 students, 1 unread), Quick Actions, full sidebar
- ✅ Landing page full scroll (desktop) — Hero → Stats (5+/13/100+/6) → 6 Module Cards → How It Works → CTA → Demo Credentials → Footer (FERPA/COPPA/IDEA/SOC 2)
- ✅ Grade level formatting audit: ALL display-level gradeLevel usages go through formatGradeLevel across entire dashboard

### Dev Server
Background task b7d8737 running `npm run dev` on localhost:3000.
Chrome tab ID: 1135439413. Currently desktop viewport (1280x900), on teacher dashboard. Signed in as rivera@school.edu.

### Browser Testing (Iteration 16)
- ✅ Teacher: Create Assignment wizard (desktop) — 3-step stepper, Learning Objective textarea, Class/Assignment Type/Subject/Grade Level/Standards fields, "Generate with AI" button
- ✅ Teacher: Create Rubric (desktop) — two-panel layout (Assignment Details + Proficiency Levels), tag badges with removable levels + Add, "Generate with AI"
- ✅ Teacher: Generate Quiz (desktop) — 3-step stepper, Topic/Subject/Grade/NumQuestions/Difficulty/Question Types toggles (MC/Short/Essay)/Standards, "Generate with AI"
- ✅ Teacher: Create Lesson Plan (desktop) — AI Lesson Plan Generator card, Subject/Grade/Topic/Duration/Model, full-width "Generate with AI"
- ✅ Teacher: Exit Ticket Generator (desktop) — Topic/Grade/Subject/Questions/Lesson Context, "Generate Exit Ticket"
- ✅ Teacher: Reports & Analytics (desktop) — 5 class cards with mastery distribution bars, Period 4-5 "No mastery data yet"
- ✅ Mobile (390x844): Assignment creation — stepper + all fields stack cleanly, button accessible
- ✅ Mobile: Rubric creation — two-panel stacks to single column, proficiency level tags fit
- ✅ Mobile: Quiz creation — all fields + Question Type toggles fit in row
- ✅ Mobile: Lesson plan creation — all fields stack, full-width button
- ✅ Mobile: Exit tickets — all fields fit, button accessible
- ✅ Mobile: IEP creation wizard step 1 — 5-step icon stepper (person/doc/target/shield/check), Student Info form, Back/Next nav
- ✅ SPED: IEP creation stepper icons (zoomed) — clear and legible on mobile

### Browser Testing (Iteration 17-18)
- ✅ Teacher: Reports detail heatmap (Period 1) — 7 students × 8 ELA standards, color-coded cells (pink/amber/green/blue/gray), "Find Gaps" button, Sort dropdown, averages column
- ✅ User menu dropdown — "Ms. Rivera", rivera@school.edu, "Teacher" badge, "Sign out" button (Radix DropdownMenu works with pointerdown events, not programmatic click — automation limitation, not code bug)
- ✅ Test suite: 192/192 passing across 24 files (confirmed iteration 17)
- ⏳ Code health review: background agent ab5c88c running

### Browser Testing (Iteration 20)
- ✅ Teacher: Assignment detail (Poetry Analysis) — Assignment tab with description + instructions, Completed badge, 8th Grade, ELA badges, Delete button (no Edit page exists — not in scope)
- ✅ Teacher: Reports & Analytics — 5 class cards, Period 4-5 "No mastery data yet" with 0 students
- ✅ Teacher: Reports heatmap (Period 1) — 7 students × 8 ELA standards, color-coded cells, "Find Gaps" dialog opens via JS click
- ✅ Teacher: Find Gaps dialog — "Standards Gap Analysis" with "No major gaps found" message (correct — most students above proficient)
- ✅ Teacher: Heatmap Sort button — cycles from "Name A-Z" to "Highest Avg", students reorder correctly (Jayden 88% → DeShawn 42%)
- ✅ Teacher: Sidebar toggle — collapses to icon-only mode, expands back to full labels, clean transitions
- ✅ Teacher: Class Detail (Period 4, 0 students) — clean empty state: 0/0/N/A/N/A stat cards, "No students enrolled" and "No assignments created" messages, no Standards Analysis section (conditionally hidden)
- ✅ Teacher: Dashboard — 5 stat cards (5 classes, 13 pending, 3 assignments, 16 students, 1 unread), 3 Quick Actions
- ✅ Parent (Marcus): Progress — 42% ELA "Needs Help" badge, 8 ELA skills (mostly Beginning)
- ✅ Parent (Marcus): My Children — DeShawn now shows "Falling Behind" (rose badge) correctly reflecting 42% mastery (was "On Track" before fix)
- ✅ Parent (Sarah): My Children — Aisha Torres "On Track" with 92% avg, American Dream Essay A grade (correct)

### Bugs Found & Fixed (Iteration 20)
71. ✅ Parent child status defaulted to "On Track" when no graded submissions, ignoring mastery data — added mastery-based fallback (commit 7d63954)

### Dev Server
Background task b7d8737 running `npm run dev` on localhost:3000.
Chrome tab ID: 1135439413. Currently desktop viewport (1280x900). Signed in as sarah.chen@email.com (parent).

### Browser Testing (Iteration 21)
- ✅ Admin: Dashboard quick actions — Analytics, SPED Compliance, Schools links all navigate correctly
- ✅ Admin: Teachers page — 4 teachers with engagement metrics (Classes, Assignments, Submissions Graded, AI Feedback)
- ✅ Admin: Lesson Plans — empty state (correct, admin hasn't created any)
- ✅ Teacher (Rivera): Message reply flow — typed reply to Sarah Chen, sent successfully, "Re: Question About Aisha's Reading Progress" appeared at top of messages list dated 2/13/2026
- ✅ **Teacher message reply flow: END-TO-END VERIFIED** (teacher → parent reply)
- ✅ Mobile (390x844): Teacher messages — 10 messages stacked with type badges, reply at top
- ✅ Mobile: Teacher dashboard — 5 stat cards stack single-column, Quick Actions below
- ✅ Mobile: SPED IEP Management — 2x2 stat grid, DeShawn (SLD, 184d) + Ethan (ADHD) cards
- ✅ Mobile: SPED IEP Edit (DeShawn) — Present Levels textarea, "Regenerate with AI", 2 SMART goals with all fields, 8+ accommodations with type dropdowns, "Save IEP" button at bottom
- ✅ Student (Aisha): Dashboard — 1 Completed, 92% avg (bug #67 fix holding), 2 assignments with "Submitted" badges
- ✅ Student: Feedback tab (American Dream Essay) — emerald grade card (91.67/100, A), rich Teacher Feedback narrative, Strengths (green, 4 items), Areas for Improvement (amber, 3 numbered), Next Steps (blue, 3 numbered), markdown renders correctly, AI disclosure footer
- ✅ Student: Assignments list — 2 cards with "Grading" badges (assignment-level status, correct)
- ✅ Login page (signed out) — Email/Password, Sign in, 5 demo buttons, Register link
- ✅ Landing page full scroll — Hero → Stats → Modules → How It Works → CTA → Demo Credentials → Footer, all polished

### Browser Testing (Iteration 22)
- ✅ Production build: all ~100 routes compiled clean (`npx next build` succeeded)
- ✅ TypeScript: zero type errors (`npx tsc --noEmit` clean)
- ✅ Registration page: Name, Email, Password, Confirm Password, "You will be registered as a Teacher" note, Create account, Sign in link
- ✅ Registration validation: empty submit blocked by HTML5 validation, mismatched passwords shows "Passwords do not match" error
- ✅ Login invalid credentials: "Invalid email or password" error message shown correctly
- ✅ Login page: 5 demo buttons (Teacher, Admin, Parent, Student, SPED Teacher), Email/Password form, Register link
- ✅ SPED (Rodriguez): Dashboard — "Welcome back, Ms. Rodriguez", SPED Teacher badge, 1 class, 0 pending, 0 assignments, 2 students, 1 unread
- ✅ SPED: Dashboard — Special Education quick actions (IEP Management, Progress Monitoring, Compliance) below standard actions
- ✅ SPED: Sidebar — full nav with Special Education section (IEP Management, Progress Monitoring, Compliance)
- ✅ SPED: IEP creation wizard validation — Next button blocked without required Student/Disability fields
- ✅ SPED: Messages — 3+ messages with Marcus Williams, type badges (Message, Progress, Weekly Digest)
- ✅ Student (DeShawn): Dashboard — 2 classes, 0 completed, N/A avg, 1 tutor, 2 assignments with Submitted badges
- ✅ Student (DeShawn): Progress — 42% ELA (Beginning), encouraging messaging, 5 specific standards to improve
- ✅ Student (DeShawn): Tutor hub — 4 weak ELA areas (31-38%) with "Practice This" links, subject cards, 1 recent session
- ✅ Admin: Teacher Engagement — 4 teachers (Rivera 5/3/6/11, Okafor 3/3/6/6, Chen 1/3/5/2, Rodriguez SPED 1/0/0/0)
- ✅ Admin: District Analytics — 6 stat cards, mastery distribution, avg scores, teacher engagement, AI Insights button
- ✅ Admin: Compliance — 3 deadlines (Ethan 89d, DeShawn 184d/549d), role-aware subtitle "across your district"
- ✅ Parent (Sarah Chen): Messages on mobile — 7+ messages stacked, compose dialog with "Ms. Rivera (Teacher)" in recipient dropdown
- ✅ Parent: My Children — Aisha "On Track" 92%, American Dream A
- ✅ Parent: Child Detail — 92% avg, 1 class, 1 graded, Skills Snapshot (8 ELA), Recent Feedback (rich AI feedback), AI Transparency panel
- ✅ Mobile (390x844): Admin teacher engagement table — 4 teachers with columns, standard mobile scroll
- ✅ Mobile: Compliance dashboard — 4 stat cards, 3 deadlines table
- ✅ Mobile: Parent compose dialog — recipient dropdown, subject, message all fit 390px viewport
- ✅ Test suite: 192/192 passing across 24 files (confirmed iteration 22)

### Browser Testing (Iteration 23)
- ✅ Invalid route params: /children/nonexistent → custom 404, /iep/nonexistent → 404, /classes/nonexistent → 404, /assignments/fake-id → 404
- ✅ Message translation: 10 languages (Spanish, Mandarin, Vietnamese, Arabic, French, Korean, Portuguese, Tagalog, Russian, Haitian Creole)
- ✅ Registration validation: empty submit blocked, mismatched passwords shows "Passwords do not match"
- ✅ Login invalid credentials: "Invalid email or password" error
- ✅ SPED IEP wizard validation: Next blocked without Student/Disability fields
- ✅ Parent compose: recipient dropdown correctly shows "Ms. Rivera (Teacher)" only

### Code Health Fixes (Iteration 23 — via subagents)
72. ✅ children/[childId]/page.tsx: added remarkGfm to 3 ReactMarkdown usages (commit 973c61b)
73. ✅ formatGradeLevel: consolidated from 2 locations to 1 canonical @/lib/format (commit 973c61b)
74. ✅ assignments/generate/route.ts: replaced inline Anthropic client with singleton, hardcoded model with AI_MODEL (commit aba5c99)
75. ✅ Lesson plan differentiation: added markdown rendering + null safety for 3 tiers (commit 8ef76e1)
76. ✅ Assignment generation preview: added ReactMarkdown for description/instructions/diff versions (commit 8ef76e1)
77. ✅ SQL count coercion and report card rendering fixes (commit 9815fee)
- Agent a6a9f5b still running (SQL count + submission rendering + report card narrative)

### Pebble Issues Fixed This Iteration
- TEAC-tbwx7g (remarkGfm missing)
- TEAC-w14gs9 (inline Anthropic client)
- TEAC-35nhut (formatGradeLevel dual location)
- TEAC-9o17yn (lesson plan diff rendering)
- TEAC-a9yi7q (lesson plan diff null safety)
- TEAC-lbhhi5 (assignment preview raw text)

### Code Health Fixes (Iteration 24-26 — via subagents)
78. ✅ Report card narrative: replaced split/map with ReactMarkdown (commit dfab0b3)
79. ✅ Student submission: rendered as plain text instead of ReactMarkdown (commit 874ab9f)
80. ✅ Prose class standardization: ordered to `prose prose-stone prose-sm max-w-none` everywhere (commit 3c3a6d9, e3266d4)
81. ✅ Grading helpers: extracted buildRubricInput + persistGradingResult into src/lib/grading-helpers.ts (commit 18e2c37)
82. ✅ AI service extraction: moved inline tool schemas from early-warning, mastery/gaps, grading/differentiate into src/lib/ai/ modules (commit f96aba1)

### Pebble Issues Fixed (Iteration 24-26)
- TEAC-byx28z (report card narrative ReactMarkdown)
- TEAC-0mjsh0 (submission plain text)
- TEAC-xq5d7g (SQL count coercion)
- TEAC-3intag (prose class consistency)
- TEAC-x7rmk0 (grading helpers extraction)
- TEAC-jh1v8i (inline AI tool schemas)

### Browser Testing (Iteration 26)
- ✅ Teacher: Grading list — 3 assignments with correct counts and percentages
- ✅ Teacher: Submission detail (Amara Osei 88%) — student work as plain text (fix verified), rubric scores, Overall Feedback with approved badge, Strengths/Improvements/Next Steps, feedback tone dropdown, action buttons, "Powered by Claude"
- ✅ Teacher: Report Cards — "1 draft" (singular fix holding), "4 approved", Periods 4-5 no Generate All button
- ✅ Teacher: Report Card detail (Ethan Draft) — Draft badge, narrative via ReactMarkdown, Powered by Claude, 3 Strengths, 3 Growth Areas, 3 Recommendations, "Approve Report Card" button
- ✅ Student (Aisha): Assignments — 2 cards, student sidebar with Learning section
- ✅ Student: Assignment detail — 3 tabs (Assignment, Your Submission, Feedback), content correct
- ✅ Admin: Dashboard — "Welcome back, Dr. Williams", stats, Quick Actions
- ✅ Admin: District Analytics — 6 stat cards, mastery distribution, avg scores by subject (Math 83%, Science 84%, ELA 76%), teacher engagement, AI Insights button
- ✅ Mobile (390x844): Admin Students — 22 students with search, grades, mastery badges, clickable names
- ✅ Teacher: Lesson Plan detail — differentiation section has all 3 tiers with prose classes applied (9 prose elements total)
- ✅ Landing page: full scroll verified — Hero, Stats, 6 Modules, How It Works, CTA, Demo Credentials, Footer
- ✅ Test suite: 192/192 passing, TypeScript: zero errors

### Bugs Found & Fixed (Iteration 28)
83. ✅ Early warning page showed raw "Forbidden" text when accessed by unauthorized roles — added friendly 403 error message. Commit 91b5a28.

### Browser Testing (Iteration 28)
- ✅ Teacher (Rivera): Quiz detail (ELA Vocabulary Unit 3) — 10 questions with Bloom's badges (Remember/Understand/Apply/Analyze), correct answers highlighted green, explanations, point values, standards tags
- ✅ **Route guard testing (student accessing teacher pages):**
  - `/dashboard/grading` → renders page with empty state (data-level filtering, no data leak)
  - `/dashboard/admin` → custom 404 page (proper role guard)
  - `/dashboard/report-cards` → redirects to student dashboard (proper guard)
  - `/dashboard/early-warning` → friendly "You do not have permission" error card (fix verified)
  - `/dashboard/iep` → empty state "No IEPs on your caseload" (data-level filtering)
  - `/dashboard/reports` → empty state "No classes yet" (data-level filtering)
- ✅ Student (Aisha): Progress — 84% ELA (proficient), "What I'm Good At" with 5 standards, encouraging messages
- ✅ Admin: District Analytics — 6 stat cards, mastery distribution, avg scores, teacher engagement, "Generate AI District Insights" button
- ✅ Admin: Compliance on mobile — 4 stat cards, 3 deadlines (Ethan 89d, DeShawn 184d/549d), "across your district"
- ✅ Admin: Dashboard on mobile — 4 stat cards stacking, 3 Quick Actions
- ✅ SPED: Progress Monitoring on mobile — student list, Quick Data Entry form, DeShawn's 2 goals with charts (Reading Fluency 12pts, Written Expression 6pts), trend badges
- ✅ Parent (Marcus): Dashboard — 1 child, 2 unread messages, 3 Quick Actions
- ✅ Parent: My Children — DeShawn "Falling Behind" rose badge, 2 N/A recent grades
- ✅ Parent: Child Detail (DeShawn) — N/A avg, 2 classes, 0 graded, 8 ELA skills (mostly Beginning), AI Transparency panel with 3 cards, "Powered by Claude"
- ✅ Test suite: 192/192 passing, TypeScript: zero errors

### Browser Testing (Iteration 29 — Final Sweep)
- ✅ Teacher: Exit Ticket Generator — Topic, Grade Level, Subject dropdowns, Questions slider (3), Lesson Context textarea, Generate button
- ✅ Teacher: Assignment creation wizard — 3-step stepper, Learning Objective, Class/Type/Subject/Grade/Standards fields, "Generate with AI"
- ✅ Teacher: My Classes — 5 periods with "8th Grade" badges, ELA, student counts (7/5/4/0/0)
- ✅ Teacher: Quiz detail — 10 questions with Bloom's taxonomy badges, correct answers, explanations, point values
- ✅ Landing page (desktop, full scroll) — Hero with "Powered by Claude Opus" badge, 4 stats, 6 module cards, How It Works, CTA, Demo Credentials, Footer
- ✅ Production build: all routes compile clean
- ✅ Test suite: 192/192 passing, TypeScript: zero errors
- **No new bugs found this iteration.**

### Bugs Found & Fixed (Iteration 30)
84. ✅ QuizDetailPage: question.options JSON.parse had no try/catch protection — added safe parse with fallback. Standards parse already had try/catch. Console errors were from older session. Commit 2bfce8f.

### Console Error Audit (Iteration 30)
- Hydration mismatches: all caused by Claude-in-Chrome browser extension (confirmed by React error message), NOT app bugs
- QuizDetailPage JSON.parse: REAL BUG — standards field not valid JSON (see bug #84)
- StudentDetailPage parse error (1:57 PM): historical compile error, already resolved

### Remaining Pebble Issues (1)
- TEAC-6zuv8p: Two message compose components with overlapping functionality (P2, minor refactoring — not a bug)

### Dev Server
Background task b7d8737 running `npm run dev` on localhost:3000.
Chrome tab ID: 1135439413. Currently desktop viewport (1280x900).

## Verified Endpoints (all working)
- /api/health — 200
- /api/auth/csrf, /api/auth/callback/credentials, /api/auth/session — auth flow
- /api/assignments (GET/POST) — CRUD
- /api/rubrics (GET/POST) — CRUD
- /api/lesson-plans (GET/POST) — CRUD
- /api/quizzes (GET), /api/quizzes/generate (POST) — quiz generation
- /api/exit-tickets/generate (POST) — formative assessment
- /api/grading (GET/POST), /api/grading/[id] (GET/PUT), /api/grading/batch, /api/grading/analytics
- /api/mastery (GET), /api/mastery/[studentId], /api/mastery/gaps
- /api/early-warning (GET) — at-risk student detection with AI interventions
- /api/iep (GET/POST), /api/iep/[id] (GET/PUT/DELETE), goals, progress, compliance
- /api/parent/dashboard, /api/parent/children/[childId]
- /api/messages (GET/POST)
- /api/tutor (POST streaming), /api/tutor/sessions
- /api/admin/overview, analytics, schools, teachers, students, insights
- /api/report-cards (GET/POST), /api/report-cards/batch (POST)
- /api/grading/differentiate (POST) — assessment-driven differentiation
- /api/student/progress (GET) — student self-service mastery view
- /api/messages/contacts (GET) — role-aware contact list for compose

## Seed Users (password: password123)
- rivera@school.edu (teacher, 8th ELA)
- okafor@school.edu (teacher, 10th Bio)
- chen@school.edu (teacher, 3rd grade)
- rodriguez@school.edu (sped_teacher)
- williams@school.edu (admin)
- sarah.chen@email.com (parent)
- marcus.williams@email.com (parent)
- aisha@student.edu (student)
- deshawn@student.edu (student)
