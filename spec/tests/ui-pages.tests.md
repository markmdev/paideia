# UI Pages -- Dashboard Shell, Navigation, Landing Page, Responsive Behavior, Cross-Cutting Patterns

> Behavioral tests for the landing page, dashboard layout shell, role-based sidebar navigation, role-specific dashboard content, custom error and loading states, responsive behavior, and cross-cutting UI patterns used throughout the application.

---

## Landing Page (/)

### Hero section displays application title in serif font

**Given** a visitor navigates to the root URL "/"

**Then** the page renders a hero section containing the text "The Operating System for K-12 Teaching"
**And** the heading uses the `font-heading` class, which maps to the Instrument Serif font family
**And** the word "Teaching" is rendered in italic with an amber-800 color

---

### Header displays the application logo and brand name

**Given** a visitor navigates to "/"

**Then** the sticky header contains a BookOpen icon inside an amber-600 rounded container
**And** the header displays the text "Paideia" in bold
**And** the header has a white semi-transparent background with backdrop blur

---

### Powered by Claude badge is prominently displayed in the hero

**Given** a visitor navigates to "/"

**Then** the hero section contains a pill-shaped badge reading "Powered by Claude Opus -- Anthropic"
**And** the badge includes a star SVG icon in amber-600
**And** the badge has a white semi-transparent background with a border in amber-200

---

### Hero section renders two CTA buttons

**Given** a visitor navigates to "/"

**Then** the hero section displays a primary button labeled "Try the Demo" linking to "/login"
**And** the primary button has an amber-700 background and includes an ArrowRight icon
**And** the hero section displays a secondary outline button labeled "Get Started Free" linking to "/register"

---

### Header contains Sign In and Get Started navigation links

**Given** a visitor navigates to "/"

**Then** the header displays a "Sign In" ghost button linking to "/login"
**And** the header displays a "Get Started" button with amber-700 background linking to "/register"

---

### Stats section displays four metrics in a divided grid

**Given** a visitor navigates to "/"

**Then** a stats section appears below the hero, bordered top and bottom
**And** it displays exactly four stat cards:
  - "5+" with label "Hours saved per week"
  - "13" with label "AI-powered features"
  - "100+" with label "Standards aligned"
  - "6" with label "Modules built-in"
**And** the stat values use the `font-heading` serif class
**And** on viewports >= 640px (sm), the grid displays 4 columns divided by vertical borders

---

### Six module cards describe each product module

**Given** a visitor navigates to "/"

**Then** a "Five Modules. One Platform." section renders six feature cards:
  1. "Instructional Design" with a BookOpen icon and amber accent
  2. "Assessment Intelligence" with a BarChart3 icon and terracotta accent
  3. "SPED & Compliance" with a ShieldCheck icon and sage accent
  4. "Family Engagement" with a Users icon and sky accent
  5. "District Intelligence" with a Brain icon and slate accent
  6. "Student AI Tutor" with a Sparkles icon and rose accent
**And** each card has a colored top border (3px), an icon in a tinted background, a title, and a description

---

### Module cards grid is responsive

**Given** a visitor navigates to "/" on a viewport >= 1024px (lg)

**Then** the module cards display in a 3-column grid

**Given** a visitor navigates to "/" on a viewport between 640px and 1023px (sm to md)

**Then** the module cards display in a 2-column grid

**Given** a visitor navigates to "/" on a viewport < 640px

**Then** the module cards stack in a single column

---

### How It Works section shows three steps

**Given** a visitor navigates to "/"

**Then** a "How It Works" section displays with the subtitle "From lesson creation to longitudinal insight in three steps."
**And** it renders three step cards in order:
  1. Step "1" -- "Create": describes AI-assisted standards-aligned creation
  2. Step "2" -- "Assess": describes AI-drafted individualized feedback
  3. Step "3" -- "Grow": describes longitudinal mastery tracking
**And** each step number appears in a round amber-bordered circle
**And** on sm+ viewports, a horizontal connector line links the step circles

---

### CTA section encourages sign-up

**Given** a visitor navigates to "/"

**Then** a call-to-action section displays the heading "Teachers save 5+ hours every week"
**And** it includes a "Start for Free" button linking to "/register" with a ChevronRight icon
**And** the section has a warm amber-to-orange gradient background

---

### Demo Credentials section lists test accounts

**Given** a visitor navigates to "/"

**Then** a "Demo Credentials" section appears with the note: all accounts use password `password123`
**And** it lists five credential rows in a 2-column grid (on sm+):
  - Teacher: rivera@school.edu
  - Admin: williams@school.edu
  - Parent: sarah.chen@email.com
  - Student: aisha@student.edu
  - SPED Teacher: rodriguez@school.edu
**And** each row shows a colored dot, the role name, and the email in monospace

---

### Footer displays compliance badges

**Given** a visitor navigates to "/"

**Then** the footer contains the Paideia logo (BookOpen icon, amber-600)
**And** the footer displays the text "FERPA . COPPA . IDEA . SOC 2 Compliant"
**And** the footer has a stone-50 background with a top border

---

### Stats grid is 2x2 on mobile viewports

**Given** a visitor navigates to "/" on a viewport < 640px

**Then** the stats section displays in a 2-column grid (grid-cols-2)
**And** all four stat cards remain visible, arranged in two rows of two

---

## Dashboard Shell

### Dashboard layout requires authentication

**Given** no user is authenticated

**When** a request is made to any route under "/dashboard"

**Then** the user is redirected to "/login"

---

### Dashboard shell renders the sidebar, header, and content area

**Given** a teacher is authenticated and navigates to "/dashboard"

**Then** the page renders a SidebarProvider wrapping:
  - A collapsible Sidebar on the left with header, navigation, and footer
  - A SidebarInset area containing a top header bar and a main content area
**And** the sidebar header contains a BookOpen icon and "Paideia" text linked to "/dashboard"

---

### Sidebar displays a collapsible rail for icon-only mode

**Given** an authenticated user is on any dashboard page

**Then** the sidebar includes a SidebarRail element for resize/collapse interaction
**And** the sidebar is configured with `collapsible="icon"`, enabling toggle between full and icon-only modes
**And** when collapsed, the "Paideia" text is hidden via the `group-data-[collapsible=icon]:hidden` class

---

### Top header bar shows the sidebar toggle, role badge, and user menu

**Given** a teacher named "Ms. Rivera" is authenticated

**Then** the dashboard top header bar (h-14) contains:
  - A SidebarTrigger button on the left
  - A vertical separator
  - A Badge displaying "Teacher" (derived from the user's role)
  - A UserMenu dropdown on the right

---

### Role badge displays the human-readable role label

**Given** a user with role "sped_teacher" is authenticated

**Then** the role badge in the dashboard header displays "SPED Teacher"

**Given** a user with role "district_admin" is authenticated

**Then** the role badge displays "District Admin"

---

### User menu dropdown shows name, email, role badge, and sign-out

**Given** a teacher named "Ms. Rivera" with email "rivera@school.edu" is authenticated
**And** the user clicks the avatar button in the top-right corner

**Then** a dropdown menu opens with width 256px (w-56) containing:
  - The user's name "Ms. Rivera"
  - The user's email "rivera@school.edu"
  - A secondary Badge showing "Teacher"
  - A separator
  - A "Sign out" button with a LogOut icon

---

### Sign-out button triggers signOut with redirect to /login

**Given** an authenticated user opens the user menu dropdown
**And** clicks the "Sign out" button

**Then** the NextAuth `signOut` function is called with `{ callbackUrl: '/login' }`

---

### User menu shows initials in the avatar fallback

**Given** a user named "Sarah Chen" is authenticated

**Then** the avatar fallback displays "SC" (first letter of each name part, uppercased, max 2 characters)

**Given** a user with no name is authenticated

**Then** the avatar fallback displays "?"

---

### Sidebar footer shows user name and email

**Given** a teacher named "Ms. Rivera" with email "rivera@school.edu" is authenticated

**Then** the sidebar footer displays "Ms. Rivera" and "rivera@school.edu" in truncated text
**And** when the sidebar is collapsed to icon mode, both name and email are hidden

---

## Sidebar Navigation by Role

### Teacher sidebar displays all instructional and assessment links

**Given** a user with role "teacher" is authenticated

**Then** the sidebar navigation displays the following groups and items:
  - **Overview**: Dashboard (/dashboard), My Classes (/dashboard/classes)
  - **Instructional Design**: Assignments (/dashboard/assignments), Lesson Plans (/dashboard/lesson-plans), Rubrics (/dashboard/rubrics), Quizzes (/dashboard/quizzes), Exit Tickets (/dashboard/exit-tickets)
  - **Assessment**: Assessment & Grading (/dashboard/grading), Reports (/dashboard/reports), Report Cards (/dashboard/report-cards), Early Warning (/dashboard/early-warning)
  - **Communication**: Messages (/dashboard/messages)

---

### SPED Teacher sidebar extends teacher navigation with Special Education section

**Given** a user with role "sped_teacher" is authenticated

**Then** the sidebar displays all the same groups as the teacher role
**And** an additional "Special Education" group with:
  - IEP Management (/dashboard/iep)
  - Progress Monitoring (/dashboard/progress-monitoring)
  - Compliance (/dashboard/compliance)

---

### Admin sidebar displays management and intelligence links

**Given** a user with role "admin" is authenticated

**Then** the sidebar navigation displays:
  - **Overview**: Dashboard (/dashboard)
  - **Management**: Schools (/dashboard/schools), Teachers (/dashboard/teachers), Students (/dashboard/students)
  - **Intelligence**: Analytics (/dashboard/analytics), Early Warning (/dashboard/early-warning), SPED Compliance (/dashboard/compliance)

---

### Parent sidebar displays family engagement links

**Given** a user with role "parent" is authenticated

**Then** the sidebar navigation displays:
  - **Overview**: Dashboard (/dashboard), My Children (/dashboard/children)
  - **Engagement**: Progress (/dashboard/progress), Messages (/dashboard/messages)

---

### Student sidebar displays learning-focused links

**Given** a user with role "student" is authenticated

**Then** the sidebar navigation displays:
  - **Overview**: Dashboard (/dashboard), My Classes (/dashboard/classes)
  - **Learning**: Assignments (/dashboard/assignments), AI Tutor (/dashboard/tutor), Progress (/dashboard/student-progress)

---

### Sidebar highlights the current page

**Given** a teacher navigates to "/dashboard/assignments"

**Then** the "Assignments" sidebar menu item is marked as active (isActive = true)
**And** no other sidebar items are marked as active

---

### Dashboard link is only active on exact /dashboard path

**Given** a teacher navigates to "/dashboard/assignments"

**Then** the "Dashboard" sidebar item is not active (exact match on "/dashboard" only)

**Given** a teacher navigates to "/dashboard"

**Then** the "Dashboard" sidebar item is active

---

### Nested paths activate their parent sidebar item

**Given** a teacher navigates to "/dashboard/assignments/new"

**Then** the "Assignments" sidebar item is active, because the pathname starts with "/dashboard/assignments"

---

## Role-Based Dashboard Content

### Teacher dashboard shows welcome message and five stat cards

**Given** a teacher named "Ms. Rivera" is authenticated and navigates to "/dashboard"

**Then** the page displays "Welcome back, Ms." in a serif heading
**And** five stat cards appear in a responsive grid:
  - "My Classes" with a GraduationCap icon
  - "Pending Grading" with a ClipboardList icon
  - "Assignments" with a Clock icon
  - "Students" with a Users icon
  - "Unread Messages" with a MessageSquare icon

---

### Teacher dashboard shows three Quick Actions

**Given** a teacher navigates to "/dashboard"

**Then** a "Quick Actions" section displays three action cards:
  - "Create Assignment" linking to /dashboard/assignments/new
  - "Grade Work" linking to /dashboard/grading
  - "View Reports" linking to /dashboard/reports
**And** each card has an icon, title, description, and a "Go to [title]" link

---

### SPED teacher dashboard includes Special Education quick actions

**Given** a user with role "sped_teacher" navigates to "/dashboard"

**Then** the teacher quick actions appear (Create Assignment, Grade Work, View Reports)
**And** a "Special Education" section appears with three additional action cards:
  - "IEP Management" linking to /dashboard/iep
  - "Progress Monitoring" linking to /dashboard/progress-monitoring
  - "Compliance" linking to /dashboard/compliance

---

### Admin dashboard shows welcome message and four stat cards

**Given** an admin named "Dr. Williams" navigates to "/dashboard"

**Then** the page displays "Welcome back, Dr." in a serif heading
**And** the subtitle reads "District-wide overview and compliance status."
**And** four stat cards appear:
  - "Schools" with GraduationCap icon
  - "Teachers" with Users icon
  - "Students" with Users icon
  - "Ungraded Submissions" with ClipboardList icon

---

### Admin dashboard shows three Quick Actions

**Given** an admin navigates to "/dashboard"

**Then** a "Quick Actions" section displays:
  - "Analytics" linking to /dashboard/analytics
  - "SPED Compliance" linking to /dashboard/compliance
  - "Schools" linking to /dashboard/schools

---

### Parent dashboard shows welcome, children count, and unread messages

**Given** a parent named "Sarah Chen" with two children navigates to "/dashboard"

**Then** the page displays "Welcome back, Sarah" in a serif heading
**And** the subtitle reads "Here is how your children are doing."
**And** two stat cards appear:
  - "Children" showing the count with children's names as the description
  - "Unread Messages" showing the count with "From teachers" as description

---

### Parent dashboard Quick Actions include children, progress, and messages

**Given** a parent navigates to "/dashboard"

**Then** three quick action cards appear:
  - "My Children" linking to /dashboard/children
  - "Progress Overview" linking to /dashboard/progress
  - "Messages" linking to /dashboard/messages

---

### Student dashboard shows welcome and four stat cards

**Given** a student named "Aisha Torres" navigates to "/dashboard"

**Then** the page displays "Welcome back, Aisha" in a serif heading
**And** the subtitle reads "Here is what is happening in your classes."
**And** four stat cards appear:
  - "My Classes" with GraduationCap icon
  - "Completed Assignments" with CheckCircle2 icon
  - "Average Score" with BarChart3 icon (displays percentage or "N/A")
  - "Tutor Sessions" with Bot icon

---

### Student dashboard shows upcoming assignments with submission status

**Given** a student has upcoming assignments

**Then** a "Your Assignments" section appears below the quick actions
**And** each assignment card shows:
  - The assignment title
  - A "Submitted" badge (emerald) or "Not Submitted" badge (amber)
  - Subject, class name, and due date
  - A link reading "View Submission" or "Start Working" with an ArrowRight icon
**And** clicking an assignment card navigates to `/dashboard/assignments/{id}`

---

### Student dashboard Quick Actions include assignments, AI tutor, and progress

**Given** a student navigates to "/dashboard"

**Then** three quick action cards appear:
  - "My Assignments" linking to /dashboard/assignments
  - "AI Tutor" linking to /dashboard/tutor
  - "My Progress" linking to /dashboard/student-progress

---

### Dashboard welcome message parses titled names correctly

**Given** a user named "Dr. Williams" navigates to "/dashboard"

**Then** the welcome heading displays "Welcome back, Dr."

**Given** a user named "Rivera" (single word) navigates to "/dashboard"

**Then** the welcome heading displays "Welcome back, Rivera"

**Given** a user with no name navigates to "/dashboard"

**Then** the welcome heading displays "Welcome back, there"

---

## Custom 404 Page

### 404 page displays BookOpen icon and Page Not Found heading

**Given** a visitor navigates to a non-existent route

**Then** the page renders a centered layout on a stone-50 background
**And** a BookOpen icon is displayed inside a round amber-50 container
**And** the heading "Page Not Found" appears in serif font (font-serif) with bold weight

---

### 404 page provides navigation back to home and dashboard

**Given** a visitor is viewing the 404 page

**Then** two buttons are displayed:
  - "Go Home" linking to "/" with amber-600 background
  - "Dashboard" linking to "/dashboard" with an outline style and stone-300 border

---

### 404 page shows a helpful description

**Given** a visitor is viewing the 404 page

**Then** a paragraph reads "The page you're looking for doesn't exist or has been moved."

---

## Loading and Error States

### Dashboard loading state shows skeleton placeholders

**Given** a user navigates to "/dashboard" and data is still loading

**Then** the loading component renders:
  - A Skeleton element (h-8 w-64) for the greeting header
  - A 2x4 grid (grid-cols-2 on mobile, lg:grid-cols-4) of four skeleton cards for stats
  - A Skeleton element (h-6 w-32) for the "Quick Actions" heading
  - A 3-column grid (on lg) of six skeleton cards for quick action placeholders

---

### Dashboard error boundary catches runtime errors with retry option

**Given** a runtime error occurs while loading the dashboard

**Then** the error boundary renders:
  - An AlertTriangle icon in a rose-50 circular container
  - A heading "Something went wrong" in serif font
  - A description: "An unexpected error occurred while loading the dashboard. Please try again, and contact support if the problem persists."
  - A "Try Again" button with amber-600 background that calls the `reset` function

---

### Empty state on assignments page shows friendly message

**Given** a teacher has no assignments

**When** they navigate to "/dashboard/assignments"

**Then** the page displays an empty state with:
  - A FileText icon in an amber-50 circular container
  - The heading "No assignments yet"
  - A description encouraging creation of a first assignment
  - A "Create Your First Assignment" button linking to /dashboard/assignments/new

---

### Empty state on assignments page for students shows different message

**Given** a student is enrolled in classes but no assignments are published

**When** they navigate to "/dashboard/assignments"

**Then** the empty state message reads "No assignments yet. Check back when your teachers post new work."
**And** no "Create" button is shown

---

### Empty state on grading page shows appropriate message

**Given** a teacher has no assignments

**When** they navigate to "/dashboard/grading"

**Then** the page displays "No assignments to grade"
**And** a message reads "Create an assignment and wait for student submissions to appear here."

---

### Empty state on grading page when assignments exist but no submissions

**Given** a teacher has assignments but no students have submitted work

**When** they navigate to "/dashboard/grading"

**Then** the page displays "Waiting for submissions"
**And** a Clock icon is shown in an amber-50 container

---

### Empty state on lesson plans page

**Given** a teacher has no lesson plans

**When** they navigate to "/dashboard/lesson-plans"

**Then** the page displays a dashed-border card with:
  - A BookOpen icon in amber-50
  - The heading "No lesson plans yet"
  - A "Generate with AI" button with Sparkles icon

---

### Empty state on IEP management page

**Given** a SPED teacher has no IEPs

**When** they navigate to "/dashboard/iep"

**Then** the page displays "No IEPs on your caseload"
**And** a "Create First IEP" button is shown

---

### Empty state on students page (admin)

**Given** an admin navigates to "/dashboard/students" and no students are enrolled

**Then** the page displays "No students found"
**And** a GraduationCap icon is shown
**And** the message reads "Students will appear here once they are enrolled in the platform."

---

### Empty state on early warning page

**Given** a teacher views the early warning page with no student data

**Then** the page displays "No student data available" inside a dashed-border card
**And** the message reads "Students will appear here once they have mastery records and submission data to analyze."

---

### Tutor hub shows empty state when no sessions exist

**Given** a student navigates to "/dashboard/tutor" with no previous tutor sessions

**Then** the page displays "No sessions yet. Pick a subject above to get started."

---

## Responsive Behavior (Mobile -- 390px width)

### Sidebar collapses on mobile viewports

**Given** an authenticated user views the dashboard on a 390px-wide viewport

**Then** the sidebar is not permanently visible as a side panel
**And** a SidebarTrigger button is present in the top header to open the sidebar
**And** the sidebar opens as an overlay or sheet when the trigger is activated

---

### Stat cards form a 2-column grid on mobile

**Given** a teacher views the dashboard on a mobile viewport (< 640px)

**Then** the teacher stat cards display in a 2-column grid (grid-cols-2)
**And** all five stat cards remain visible, wrapping to additional rows as needed

---

### Student dashboard stat cards form a 2-column grid on mobile

**Given** a student views the dashboard on a mobile viewport

**Then** the four stat cards display in a 2-column grid (sm:grid-cols-2)

---

### Quick action cards stack in a single column on mobile

**Given** a teacher views the dashboard on a viewport < 640px

**Then** the quick action cards display in a single column, stacked vertically

---

### Assignment cards stack single-column on mobile

**Given** a teacher has multiple assignments and views the assignments page on a mobile viewport

**Then** the assignment cards display in a single column (the sm:grid-cols-2 and lg:grid-cols-3 breakpoints do not apply)

---

### Compose dialog fits mobile viewport

**Given** a user opens the "New Message" compose dialog on a mobile viewport

**Then** the dialog content respects `sm:max-w-md`, rendering at full width on small screens
**And** all form fields (recipient select, subject input, message textarea) stack vertically
**And** the send button is accessible without horizontal scrolling

---

### Early warning table remains readable on mobile

**Given** a teacher views the early warning dashboard on a mobile viewport with students listed

**Then** the data table renders with horizontal scroll where needed
**And** column headers remain aligned with cell data

---

### Dashboard main content area adjusts padding on mobile

**Given** an authenticated user views the dashboard on a mobile viewport

**Then** the main content area has padding of 1rem (p-4)

**Given** an authenticated user views the dashboard on a viewport >= 768px (md)

**Then** the main content area has padding of 1.5rem (p-6)

---

## Common UI Patterns

### Stat card pattern: icon, title, value, and description

**Given** any dashboard page rendering stat cards (teacher, student, admin, or parent)

**Then** each stat card follows the pattern:
  - A Card wrapper
  - CardHeader with the title (text-sm font-medium) on the left and a muted icon (size-4) on the right
  - CardContent with a large value (text-2xl font-bold) and a muted description (text-xs)

---

### Quick action card pattern: icon, title, description, and navigation link

**Given** any dashboard page rendering quick action cards

**Then** each card follows the pattern:
  - A Card with hover:bg-accent/50 transition
  - CardHeader with an icon (size-5, primary color) + title, and a description
  - CardContent with a "Go to [title]" ghost button linking to the target page

---

### AI-generated content is rendered as markdown

**Given** an AI tutor assistant response is displayed in the chat

**Then** the content is rendered through ReactMarkdown with remark-gfm plugin
**And** markdown features (bold, italic, lists, code blocks, tables) render as styled HTML
**And** tables render with border-collapse, stone-300 borders, and bg-stone-50 header cells

---

### Powered by Claude badge appears on AI-generated sections

**Given** an AI tutor message is displayed in the chat (role = "assistant", not streaming)

**Then** a ClaudeBadge component renders below the message bubble
**And** the badge displays a star SVG icon and the text "Powered by Claude"
**And** the badge uses 10px font size in stone-400 color

---

### Claude badge appears on AI grading feedback

**Given** a teacher views AI-generated grading feedback for a submission

**Then** a ClaudeBadge is rendered at the bottom-right of the feedback panel

---

### AI disclosure footer on parent-facing AI-generated communications

**Given** a parent views AI-generated content (child detail page, progress narrative)

**Then** a ClaudeBadge is displayed alongside the AI-generated content
**And** the content is rendered through ReactMarkdown

---

### Data tables follow a consistent pattern

**Given** any page rendering a data table (early warning, students, report cards)

**Then** the table is wrapped in a rounded-lg border container with white background
**And** the table header row has bg-stone-50 background
**And** column headers use text-stone-600 color
**And** table rows are separated by borders (border-stone-200 or border-stone-100)

---

### Badge patterns for status (draft, approved, submitted)

**Given** a report card with status "approved" is displayed

**Then** it renders a Badge with bg-emerald-100 text-emerald-700 reading "Approved"

**Given** a report card with status "draft" is displayed

**Then** it renders a Badge with bg-amber-100 text-amber-700 reading "Draft"

---

### Badge patterns for risk levels

**Given** a student with risk level "high_risk" appears in the early warning table

**Then** their risk badge displays "High Risk" with bg-red-100 text-red-700 and a red dot

**Given** a student with risk level "moderate_risk" appears

**Then** their risk badge displays "Moderate" with bg-amber-100 text-amber-700 and an amber dot

**Given** a student with risk level "on_track" appears

**Then** their risk badge displays "On Track" with bg-emerald-100 text-emerald-700 and an emerald dot

---

### Badge patterns for mastery levels

**Given** the admin student table displays mastery distribution badges

**Then** the following color scheme applies:
  - "advanced" uses bg-emerald-100 text-emerald-700
  - "proficient" uses bg-blue-100 text-blue-700
  - "developing" uses bg-amber-100 text-amber-700
  - "beginning" uses bg-red-100 text-red-700

---

### Rubric score levels follow consistent color coding

**Given** a grading feedback panel displays criterion scores

**Then** the level badges follow this color mapping:
  - "beginning" uses bg-rose-100 text-rose-700
  - "developing" uses bg-amber-100 text-amber-700
  - "proficient" uses bg-emerald-100 text-emerald-700
  - "advanced" uses bg-blue-100 text-blue-700

---

### Color coding for score thresholds in early warning

**Given** the early warning table displays a student's average score

**Then** scores below 70% render in text-red-600
**And** scores between 70% and 79% render in text-amber-600
**And** scores 80% and above render in text-stone-900
**And** when no score data exists, "N/A" appears in text-stone-400

---

### Trend direction icons follow consistent pattern

**Given** the early warning table displays student trend direction

**Then** "declining" shows a TrendingDown icon in text-red-500
**And** "improving" shows a TrendingUp icon in text-emerald-500
**And** "stable" shows a Minus icon in text-stone-400

---

### Form pattern: compose message dialog

**Given** a user clicks the "New Message" button on the messages page

**Then** a Dialog opens with the title "New Message"
**And** the form contains:
  - A "To" label with a Select dropdown for recipient selection
  - A "Subject" label with an Input (placeholder: "Optional subject line")
  - A "Message" label with a Textarea (placeholder: "Write your message...", 5 rows)
  - A "Send" button with amber-600 background
**And** the send button shows a Loader2 spinner with "Sending..." text while submitting

---

### Dialog pattern for delete confirmation and batch operations

**Given** a teacher views the report cards page for a class with students

**Then** a BatchGenerateDialog is available to generate report cards for all students in the class
**And** the dialog follows the standard Dialog pattern with DialogHeader and action buttons

---

### Empty state pattern is consistent across pages

**Given** any page with no data to display

**Then** the empty state follows this pattern:
  - A centered container with vertical padding (py-16)
  - A rounded-full icon container in amber-50 with a relevant icon in amber-400
  - A semibold heading describing the empty state
  - A muted description paragraph (text-sm text-stone-500, max-w-md)
  - An optional action button to create the first item

---

### Page headers follow a consistent pattern

**Given** any dashboard subpage (assignments, lesson plans, grading, messages, etc.)

**Then** the page header contains:
  - An h1 with the page title in serif font (font-serif text-2xl font-bold tracking-tight)
  - A subtitle paragraph in muted text describing the page
  - Optionally, a primary action button on the right (e.g., "Create Assignment", "New IEP", "New Message")

---

### AI-generated badge on lesson plan cards

**Given** a lesson plan was generated by AI (aiMetadata is present)

**Then** the lesson plan card displays a Badge with Sparkles icon reading "AI" in amber-50 background with amber-700 text

---

### Assignment submission badges use consistent color coding

**Given** a student views their assignments on the student dashboard

**Then** submitted assignments show a "Submitted" badge in bg-emerald-100 text-emerald-700
**And** unsubmitted assignments show a "Not Submitted" badge in bg-amber-100 text-amber-700

---

### Grading progress bars show completion status

**Given** a teacher views the grading overview page with assignments that have submissions

**Then** each assignment card shows a progress bar (emerald-500 fill on stone-200 track)
**And** a label shows "X of Y graded" with a percentage
**And** fully graded assignments show a "Complete" badge in emerald
**And** partially graded assignments show a "N to grade" badge in amber

---

## Cross-Page Navigation

### Clicking student name in admin table navigates to student detail

**Given** an admin views the students table

**When** the admin clicks a student's name

**Then** navigation occurs to `/dashboard/students/{studentId}`
**And** the student name link has hover:text-amber-700 styling

---

### Practice This link on tutor hub navigates to tutor chat with pre-filled topic

**Given** a student has mastery gaps and views the tutor hub page

**Then** each suggested practice card links to `/dashboard/tutor/new?subject={subject}&topic={topic}`
**And** clicking the card navigates to the tutor chat pre-filled with the subject and topic

---

### Subject quick-start cards link to new tutor sessions

**Given** a student views the tutor hub page

**Then** six subject cards are displayed: Math, Science, ELA, Social Studies, Art, Computer Science
**And** each card links to `/dashboard/tutor/new?subject={subjectName}`

---

### Sidebar highlighting indicates current page (breadcrumb-like)

**Given** a teacher navigates to "/dashboard/lesson-plans/abc123"

**Then** the "Lesson Plans" sidebar item is highlighted as active (pathname starts with /dashboard/lesson-plans)
**And** no other sidebar items are highlighted
**And** this serves as a breadcrumb-like indicator of the current section

---

### Internal links use client-side navigation

**Given** a user clicks any internal Link in the sidebar, quick action cards, or assignment cards

**Then** navigation occurs via Next.js client-side routing (next/link)
**And** no full-page reload is triggered

---

### Lesson plan cards navigate to detail page on click

**Given** a teacher has lesson plans and views the lesson plans page

**When** the teacher clicks a lesson plan card

**Then** navigation occurs to `/dashboard/lesson-plans/{planId}`

---

### Assignment cards navigate to detail page on click

**Given** a teacher has assignments and views the assignments page

**When** the teacher clicks an assignment card

**Then** navigation occurs to the assignment detail page via the AssignmentCard component

---

### Grading cards navigate to assignment grading detail

**Given** a teacher views the grading overview with assignments that have submissions

**When** the teacher clicks an assignment grading card

**Then** navigation occurs to `/dashboard/grading/{assignmentId}`

---

## Middleware and Route Protection

### Unauthenticated users are redirected from dashboard to login

**Given** no user session exists

**When** a browser navigates to any "/dashboard/*" route

**Then** the middleware redirects the request to "/login"

---

### Authenticated users are redirected from login to dashboard

**Given** a user is already authenticated

**When** the user navigates to "/login"

**Then** the middleware redirects the request to "/dashboard"

---

### Authenticated users are redirected from register to dashboard

**Given** a user is already authenticated

**When** the user navigates to "/register"

**Then** the middleware redirects the request to "/dashboard"

---

### API routes are not intercepted by middleware

**Given** a request is made to any "/api/*" route

**Then** the middleware does not redirect the request
**And** API routes handle their own authentication checks internally

---

### Landing page is accessible without authentication

**Given** no user session exists

**When** a visitor navigates to "/"

**Then** the landing page renders normally without any redirect

---

## Typography and Theming

### Root layout configures three font families

**Given** any page renders in the application

**Then** the HTML body has CSS variables for three fonts:
  - `--font-geist-sans` (Geist, sans-serif body text)
  - `--font-geist-mono` (Geist Mono, monospace for code)
  - `--font-serif` (Instrument Serif, used for headings via `font-heading`)

---

### The font-heading CSS custom property resolves to serif

**Given** the global CSS is loaded

**Then** the `--font-heading` theme value maps to `var(--font-serif), "Georgia", serif`
**And** elements with class `font-heading` render in the Instrument Serif typeface

---

### Application title metadata is set correctly

**Given** any page renders

**Then** the HTML document has the title "Paideia"
**And** the description meta tag reads "The operating system for K-12 teaching"
