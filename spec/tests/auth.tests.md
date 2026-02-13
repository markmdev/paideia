# Authentication, Authorization, and Role Guards

> Behavioral tests for user registration, credential-based authentication, session management, middleware route protection, and role-based access control across all five user roles.

---

## Registration (POST /api/auth/register)

### Successful registration with valid fields

**Given** no user exists with the email "newteacher@school.edu"

**When** a client sends POST /api/auth/register with body:
  - name: "Jordan Taylor"
  - email: "newteacher@school.edu"
  - password: "securepass123"

**Then** the response status is 201
**And** the response body contains:
  - id: a non-empty string identifier
  - name: "Jordan Taylor"
  - email: "newteacher@school.edu"
  - role: "teacher"

---

### New users default to the teacher role

**Given** no user exists with the email "newuser@school.edu"

**When** a client sends POST /api/auth/register with body:
  - name: "Alex Morgan"
  - email: "newuser@school.edu"
  - password: "password123"

**Then** the response status is 201
**And** the response body field "role" is "teacher"
**And** the database record for this user has role "teacher"

---

### Registration ignores a role field in the request body

**Given** no user exists with the email "sneaky@school.edu"

**When** a client sends POST /api/auth/register with body:
  - name: "Sneaky Admin"
  - email: "sneaky@school.edu"
  - password: "password123"
  - role: "admin"

**Then** the response status is 201
**And** the response body field "role" is "teacher"
**And** the database insert was called with role "teacher", not "admin"

---

### Password is hashed before storage

**Given** no user exists with the email "hash-test@school.edu"

**When** a client sends POST /api/auth/register with body:
  - name: "Hash Test"
  - email: "hash-test@school.edu"
  - password: "myplaintextpassword"

**Then** bcrypt.hash is called with the plain text password "myplaintextpassword" and a cost factor of 12
**And** the database insert stores the bcrypt hash as the passwordHash field
**And** the stored passwordHash is not equal to "myplaintextpassword"

---

### Response does not include the password or password hash

**Given** no user exists with the email "safe@school.edu"

**When** a client sends POST /api/auth/register with body:
  - name: "Safe User"
  - email: "safe@school.edu"
  - password: "securepassword"

**Then** the response status is 201
**And** the response body has exactly four keys: "id", "name", "email", "role"
**And** the response body does not contain a "password" field
**And** the response body does not contain a "passwordHash" field

---

### Duplicate email returns 409 conflict

**Given** a user already exists with email "taken@school.edu"

**When** a client sends POST /api/auth/register with body:
  - name: "Another User"
  - email: "taken@school.edu"
  - password: "password123"

**Then** the response status is 409
**And** the response body field "error" is "Email already registered"

---

### Missing name returns 400

**Given** no user exists with the email "noname@school.edu"

**When** a client sends POST /api/auth/register with body:
  - email: "noname@school.edu"
  - password: "password123"

**Then** the response status is 400
**And** the response body field "error" is "Missing required fields"

---

### Missing email returns 400

**When** a client sends POST /api/auth/register with body:
  - name: "No Email"
  - password: "password123"

**Then** the response status is 400
**And** the response body field "error" is "Missing required fields"

---

### Missing password returns 400

**When** a client sends POST /api/auth/register with body:
  - name: "No Password"
  - email: "nopass@school.edu"

**Then** the response status is 400
**And** the response body field "error" is "Missing required fields"

---

### Empty body returns 400

**When** a client sends POST /api/auth/register with an empty body {}

**Then** the response status is 400
**And** the response body field "error" is "Missing required fields"

---

### Password shorter than 6 characters returns 400

**When** a client sends POST /api/auth/register with body:
  - name: "Short Pass"
  - email: "short@school.edu"
  - password: "12345"

**Then** the response status is 400
**And** the response body field "error" is "Password must be at least 6 characters"

---

### Internal server error returns 500

**Given** the database throws an unexpected error during user creation

**When** a client sends POST /api/auth/register with body:
  - name: "Error User"
  - email: "error@school.edu"
  - password: "password123"

**Then** the response status is 500
**And** the response body field "error" is "Registration failed"

---

## Authentication (Credentials Provider)

### Successful login with correct email and password

**Given** a user exists with email "rivera@school.edu", passwordHash bcrypt("password123"), role "teacher", name "Ms. Rivera"

**When** the credentials provider authorize function receives:
  - email: "rivera@school.edu"
  - password: "password123"

**Then** authorize returns a user object with:
  - id: the user's database ID
  - name: "Ms. Rivera"
  - email: "rivera@school.edu"
  - role: "teacher"

---

### Failed login with wrong password

**Given** a user exists with email "rivera@school.edu" and passwordHash bcrypt("password123")

**When** the credentials provider authorize function receives:
  - email: "rivera@school.edu"
  - password: "wrongpassword"

**Then** authorize returns null

---

### Failed login with non-existent email

**Given** no user exists with email "nobody@school.edu"

**When** the credentials provider authorize function receives:
  - email: "nobody@school.edu"
  - password: "password123"

**Then** authorize returns null

---

### Failed login with missing email

**When** the credentials provider authorize function receives:
  - password: "password123"

**Then** authorize returns null

---

### Failed login with missing password

**When** the credentials provider authorize function receives:
  - email: "rivera@school.edu"

**Then** authorize returns null

---

### Failed login when user has no password hash

**Given** a user exists with email "oauth-only@school.edu" and passwordHash is null (OAuth-only account)

**When** the credentials provider authorize function receives:
  - email: "oauth-only@school.edu"
  - password: "password123"

**Then** authorize returns null

---

## JWT and Session Shape

### JWT callback stores role and id from the user object

**Given** a user signs in with id "user-abc-123" and role "sped_teacher"

**When** the JWT callback fires with the user object

**Then** the resulting JWT token contains:
  - token.id: "user-abc-123"
  - token.role: "sped_teacher"

---

### Session callback populates session.user from the JWT token

**Given** a JWT token with id "user-abc-123" and role "admin"

**When** the session callback fires with that token

**Then** the session object contains:
  - session.user.id: "user-abc-123"
  - session.user.role: "admin"

---

### Session carries all four identity fields

**Given** a user is authenticated with:
  - id: "user-xyz-789"
  - name: "Dr. Williams"
  - email: "williams@school.edu"
  - role: "admin"

**When** the session is retrieved via the auth() function

**Then** session.user contains:
  - id: "user-xyz-789"
  - name: "Dr. Williams"
  - email: "williams@school.edu"
  - role: "admin"

---

### The session strategy is JWT, not database

**Given** the NextAuth configuration in auth.ts

**When** the session strategy is inspected

**Then** it is set to "jwt"

---

### Role type accepts all five standard roles

**Given** the role field on the session user

**When** a user has any of the following roles: "teacher", "sped_teacher", "admin", "parent", "student"

**Then** each role is a valid value for session.user.role

---

## Middleware / Route Protection

### Unauthenticated user accessing /dashboard is redirected to /login

**Given** no user is signed in

**When** a request is made to /dashboard

**Then** the middleware redirects to /login

---

### Unauthenticated user accessing /dashboard/assignments is redirected to /login

**Given** no user is signed in

**When** a request is made to /dashboard/assignments

**Then** the middleware redirects to /login

---

### Unauthenticated user accessing a nested dashboard route is redirected to /login

**Given** no user is signed in

**When** a request is made to /dashboard/iep/some-id

**Then** the middleware redirects to /login

---

### Authenticated user accessing /login is redirected to /dashboard

**Given** a user is signed in with role "teacher"

**When** a request is made to /login

**Then** the middleware redirects to /dashboard

---

### Authenticated user accessing /register is redirected to /dashboard

**Given** a user is signed in with role "parent"

**When** a request is made to /register

**Then** the middleware redirects to /dashboard

---

### API routes are not intercepted by middleware

**Given** no user is signed in

**When** a request is made to /api/auth/register

**Then** the middleware does not redirect; the request passes through to the route handler

---

### The landing page (/) is accessible without authentication

**Given** no user is signed in

**When** a request is made to /

**Then** the middleware does not redirect; the page is served normally

---

### Static assets are excluded from middleware matching

**Given** the middleware matcher configuration

**When** a request is made to /_next/static/some-file.js or /favicon.ico

**Then** the middleware does not run

---

## API Route Auth Guards (401 Unauthorized)

### Unauthenticated request to GET /api/assignments returns 401

**Given** no user is signed in

**When** a GET request is sent to /api/assignments

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Unauthenticated request to POST /api/lesson-plans returns 401

**Given** no user is signed in

**When** a POST request is sent to /api/lesson-plans with a valid body

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Unauthenticated request to GET /api/admin/overview returns 401

**Given** no user is signed in

**When** a GET request is sent to /api/admin/overview

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Unauthenticated request to GET /api/parent/dashboard returns 401

**Given** no user is signed in

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Unauthenticated request to GET /api/student/progress returns 401

**Given** no user is signed in

**When** a GET request is sent to /api/student/progress

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Unauthenticated request to GET /api/iep returns 401

**Given** no user is signed in

**When** a GET request is sent to /api/iep

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Unauthenticated request to POST /api/tutor returns 401

**Given** no user is signed in

**When** a POST request is sent to /api/tutor with a valid body

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

## Role-Based Access Control: Admin Routes

### Admin can access GET /api/admin/overview

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/admin/overview

**Then** the response status is 200

---

### Admin can access GET /api/admin/analytics

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/admin/analytics

**Then** the response status is 200

---

### Admin can access GET /api/admin/schools

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/admin/schools

**Then** the response status is 200

---

### Admin can access GET /api/admin/teachers

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/admin/teachers

**Then** the response status is 200

---

### Admin can access GET /api/admin/students

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/admin/students

**Then** the response status is 200

---

### Admin can access GET /api/admin/insights

**Given** a user is signed in with role "admin"

**When** a POST request is sent to /api/admin/insights with valid analytics data

**Then** the response status is 200

---

### Teacher cannot access admin routes

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/admin/overview

**Then** the response status is 403
**And** the response body field "error" is "Forbidden"

---

### Student cannot access admin routes

**Given** a user is signed in with role "student"

**When** a GET request is sent to /api/admin/overview

**Then** the response status is 403

---

### Parent cannot access admin routes

**Given** a user is signed in with role "parent"

**When** a GET request is sent to /api/admin/overview

**Then** the response status is 403

---

### SPED teacher cannot access admin routes

**Given** a user is signed in with role "sped_teacher"

**When** a GET request is sent to /api/admin/overview

**Then** the response status is 403

---

## Role-Based Access Control: IEP and Compliance Routes

### SPED teacher can access GET /api/iep

**Given** a user is signed in with role "sped_teacher"

**When** a GET request is sent to /api/iep

**Then** the response status is 200

---

### Admin can access GET /api/iep

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/iep

**Then** the response status is 200

---

### Regular teacher cannot access IEP routes

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/iep

**Then** the response status is 403
**And** the response body field "error" is "Forbidden: SPED teacher or admin role required"

---

### Student cannot access IEP routes

**Given** a user is signed in with role "student"

**When** a GET request is sent to /api/iep

**Then** the response status is 403

---

### Parent cannot access IEP routes

**Given** a user is signed in with role "parent"

**When** a GET request is sent to /api/iep

**Then** the response status is 403

---

### SPED teacher can access GET /api/compliance

**Given** a user is signed in with role "sped_teacher"

**When** a GET request is sent to /api/compliance

**Then** the response status is 200

---

### Admin can access GET /api/compliance

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/compliance

**Then** the response status is 200

---

### Regular teacher cannot access compliance routes

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/compliance

**Then** the response status is 403
**And** the response body field "error" is "Forbidden: SPED teacher or admin role required"

---

### SPED teacher sees only their own IEPs

**Given** a SPED teacher is signed in
**And** there are IEPs authored by this teacher and IEPs authored by other SPED teachers

**When** a GET request is sent to /api/iep

**Then** the response contains only IEPs where authorId matches the signed-in teacher's ID

---

### Admin sees all IEPs

**Given** an admin is signed in
**And** there are IEPs authored by multiple SPED teachers

**When** a GET request is sent to /api/iep

**Then** the response contains all IEPs regardless of authorId

---

## Role-Based Access Control: Parent Routes

### Parent can access GET /api/parent/dashboard

**Given** a user is signed in with role "parent"

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 200

---

### Parent can access GET /api/parent/children/:childId

**Given** a user is signed in with role "parent"
**And** the parent is linked to a child with childId "child-123"

**When** a GET request is sent to /api/parent/children/child-123

**Then** the response status is 200

---

### Teacher cannot access parent dashboard

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 403

---

### Student cannot access parent dashboard

**Given** a user is signed in with role "student"

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 403

---

### Admin cannot access parent dashboard

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/parent/dashboard

**Then** the response status is 403

---

## Role-Based Access Control: Student Routes

### Student can access GET /api/student/progress

**Given** a user is signed in with role "student"

**When** a GET request is sent to /api/student/progress

**Then** the response status is 200

---

### Teacher cannot access student progress

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/student/progress

**Then** the response status is 403
**And** the response body field "error" is "Forbidden: student role required"

---

### Parent cannot access student progress

**Given** a user is signed in with role "parent"

**When** a GET request is sent to /api/student/progress

**Then** the response status is 403

---

### Student can access POST /api/tutor (Socratic tutor)

**Given** a user is signed in with role "student"

**When** a POST request is sent to /api/tutor with a valid message body

**Then** the response status is 200

---

### Teacher cannot access the Socratic tutor

**Given** a user is signed in with role "teacher"

**When** a POST request is sent to /api/tutor with a valid message body

**Then** the response status is 403
**And** the response body field "error" is "Forbidden: only students can access the tutor"

---

### Admin cannot access the Socratic tutor

**Given** a user is signed in with role "admin"

**When** a POST request is sent to /api/tutor with a valid message body

**Then** the response status is 403

---

### Student can access GET /api/tutor/sessions

**Given** a user is signed in with role "student"

**When** a GET request is sent to /api/tutor/sessions

**Then** the response status is 200

---

### Teacher cannot access tutor sessions

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/tutor/sessions

**Then** the response status is 403
**And** the response body field "error" is "Forbidden: only students can access tutor sessions"

---

### Only students can submit assignments

**Given** a user is signed in with role "teacher"

**When** a POST request is sent to /api/submissions with a valid body

**Then** the response status is 403

---

### Student can submit assignments

**Given** a user is signed in with role "student"

**When** a POST request is sent to /api/submissions with a valid body

**Then** the response status is not 403

---

## Role-Based Access Control: Teacher Content Routes

### Teacher can access GET /api/assignments

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/assignments

**Then** the response status is 200

---

### Teacher can access GET /api/lesson-plans

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/lesson-plans

**Then** the response status is 200

---

### Teacher can access GET /api/rubrics

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/rubrics

**Then** the response status is 200

---

### Teacher can access GET /api/grading

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/grading

**Then** the response status is 200

---

### Teacher can access GET /api/quizzes

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/quizzes

**Then** the response status is 200

---

### Teacher can generate exit tickets

**Given** a user is signed in with role "teacher"

**When** a POST request is sent to /api/exit-tickets/generate with valid content

**Then** the response status is not 403

---

### SPED teacher can generate exit tickets

**Given** a user is signed in with role "sped_teacher"

**When** a POST request is sent to /api/exit-tickets/generate with valid content

**Then** the response status is not 403

---

### Student cannot generate exit tickets

**Given** a user is signed in with role "student"

**When** a POST request is sent to /api/exit-tickets/generate with valid content

**Then** the response status is 403

---

### Parent cannot generate exit tickets

**Given** a user is signed in with role "parent"

**When** a POST request is sent to /api/exit-tickets/generate with valid content

**Then** the response status is 403

---

### Teacher can generate quizzes

**Given** a user is signed in with role "teacher"

**When** a POST request is sent to /api/quizzes/generate with valid content

**Then** the response status is not 403

---

### SPED teacher can generate quizzes

**Given** a user is signed in with role "sped_teacher"

**When** a POST request is sent to /api/quizzes/generate with valid content

**Then** the response status is not 403

---

### Admin cannot generate quizzes

**Given** a user is signed in with role "admin"

**When** a POST request is sent to /api/quizzes/generate with valid content

**Then** the response status is 403

---

## Role-Based Access Control: Report Cards

### Teacher can access GET /api/report-cards

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/report-cards

**Then** the response status is 200

---

### SPED teacher can access GET /api/report-cards

**Given** a user is signed in with role "sped_teacher"

**When** a GET request is sent to /api/report-cards

**Then** the response status is 200

---

### Admin cannot access report card routes

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/report-cards

**Then** the response status is 403
**And** the response body field "error" is "Forbidden: teacher role required"

---

### Student cannot access report card routes

**Given** a user is signed in with role "student"

**When** a GET request is sent to /api/report-cards

**Then** the response status is 403

---

## Role-Based Access Control: Early Warning

### Teacher can access GET /api/early-warning

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/early-warning

**Then** the response status is not 403

---

### SPED teacher can access GET /api/early-warning

**Given** a user is signed in with role "sped_teacher"

**When** a GET request is sent to /api/early-warning

**Then** the response status is not 403

---

### Admin can access GET /api/early-warning

**Given** a user is signed in with role "admin"

**When** a GET request is sent to /api/early-warning

**Then** the response status is not 403

---

### Student cannot access early warning

**Given** a user is signed in with role "student"

**When** a GET request is sent to /api/early-warning

**Then** the response status is 403

---

### Parent cannot access early warning

**Given** a user is signed in with role "parent"

**When** a GET request is sent to /api/early-warning

**Then** the response status is 403

---

## Role-Based Access Control: Grading Differentiation

### Teacher can access grading differentiation

**Given** a user is signed in with role "teacher"

**When** a POST request is sent to /api/grading/differentiate with valid data

**Then** the response status is not 403

---

### SPED teacher can access grading differentiation

**Given** a user is signed in with role "sped_teacher"

**When** a POST request is sent to /api/grading/differentiate with valid data

**Then** the response status is not 403

---

### Student cannot access grading differentiation

**Given** a user is signed in with role "student"

**When** a POST request is sent to /api/grading/differentiate with valid data

**Then** the response status is 403

---

## Role-Based Access Control: Messages

### Teacher can access GET /api/messages

**Given** a user is signed in with role "teacher"

**When** a GET request is sent to /api/messages

**Then** the response status is 200

---

### Parent can access GET /api/messages

**Given** a user is signed in with role "parent"

**When** a GET request is sent to /api/messages

**Then** the response status is 200

---

## Data Scoping

### Teachers see only their own assignments

**Given** a teacher "Ms. Rivera" is signed in
**And** assignments exist created by Ms. Rivera and by other teachers

**When** a GET request is sent to /api/assignments

**Then** the response contains only assignments where teacherId matches Ms. Rivera's user ID

---

### Teachers see only their own lesson plans

**Given** a teacher "Mr. Okafor" is signed in
**And** lesson plans exist created by Mr. Okafor and by other teachers

**When** a GET request is sent to /api/lesson-plans

**Then** the response contains only lesson plans where teacherId matches Mr. Okafor's user ID

---

### Students see only their own tutor sessions

**Given** a student "Aisha" is signed in
**And** tutor sessions exist for Aisha and for other students

**When** a GET request is sent to /api/tutor/sessions

**Then** the response contains only sessions where studentId matches Aisha's user ID

---

### Parents see only their linked children on the dashboard

**Given** a parent "Sarah Chen" is signed in
**And** Sarah is linked to child "Aisha Torres" in the parentChildren table
**And** other children exist in the system who are not linked to Sarah

**When** a GET request is sent to /api/parent/dashboard

**Then** the response contains data only for Aisha Torres, not for unlinked children

---

## Login Page UI

### Login page renders email and password fields

**Given** a user navigates to /login

**When** the page loads

**Then** the page displays an email input field with label "Email"
**And** the page displays a password input field with label "Password"
**And** both fields are required

---

### Login page renders a sign-in button

**Given** a user navigates to /login

**When** the page loads

**Then** the page displays a "Sign in" submit button

---

### Login page has five demo login buttons

**Given** a user navigates to /login

**When** the page loads

**Then** the page displays exactly 5 demo account buttons:
  - "Teacher (Ms. Rivera)" for rivera@school.edu
  - "Admin (Dr. Williams)" for williams@school.edu
  - "Parent (Sarah Chen)" for sarah.chen@email.com
  - "Student (Aisha Torres)" for aisha@student.edu
  - "SPED Teacher (Ms. Rodriguez)" for rodriguez@school.edu

---

### Demo login button signs in with preset credentials

**Given** a user is on the /login page

**When** the user clicks the "Teacher (Ms. Rivera)" demo button

**Then** the signIn function is called with:
  - email: "rivera@school.edu"
  - password: "password123"
  - redirect: false

---

### Login page links to registration page

**Given** a user navigates to /login

**When** the page loads

**Then** the page displays a "Register" link that navigates to /register

---

### Login page shows error on invalid credentials

**Given** a user is on the /login page

**When** the user submits the form with incorrect credentials
**And** signIn returns a result with an error

**Then** the page displays the message "Invalid email or password"

---

### Successful login redirects to /dashboard

**Given** a user is on the /login page

**When** the user submits valid credentials
**And** signIn returns a result without an error

**Then** the router pushes to "/dashboard"
**And** the router refreshes

---

### Login page disables all buttons while a login is in progress

**Given** a user is on the /login page

**When** the user clicks the sign-in button (or a demo button)
**And** the signIn call is still pending

**Then** the sign-in button is disabled
**And** all demo buttons are disabled

---

### Login page shows loading state on the sign-in button

**Given** a user is on the /login page

**When** the user clicks the sign-in button

**Then** the button text changes to "Signing in..." while the request is in progress

---

## Registration Page UI

### Registration page renders all four form fields

**Given** a user navigates to /register

**When** the page loads

**Then** the page displays input fields for:
  - "Name" (type text, required)
  - "Email" (type email, required)
  - "Password" (type password, required)
  - "Confirm Password" (type password, required)

---

### Registration page shows a teacher role notice

**Given** a user navigates to /register

**When** the page loads

**Then** the page displays text: "You will be registered as a Teacher. Contact your administrator for other role types."

---

### Registration page validates password match on the client

**Given** a user is on the /register page

**When** the user enters:
  - name: "Test User"
  - email: "test@school.edu"
  - password: "password123"
  - confirmPassword: "differentpassword"
**And** the user submits the form

**Then** the page displays the message "Passwords do not match"
**And** no request is sent to the server

---

### Registration page validates password length on the client

**Given** a user is on the /register page

**When** the user enters:
  - name: "Test User"
  - email: "test@school.edu"
  - password: "short"
  - confirmPassword: "short"
**And** the user submits the form

**Then** the page displays the message "Password must be at least 8 characters"
**And** no request is sent to the server

---

### Registration page links to login page

**Given** a user navigates to /register

**When** the page loads

**Then** the page displays a "Sign in" link that navigates to /login

---

### Successful registration redirects to /login

**Given** a user is on the /register page

**When** the user fills out valid data and submits the form
**And** the /api/auth/register endpoint returns status 201

**Then** the router pushes to "/login"

---

### Registration page shows server-side error messages

**Given** a user is on the /register page

**When** the user submits a form with an email that is already registered
**And** the /api/auth/register endpoint returns status 409 with error "Email already registered"

**Then** the page displays the message "Email already registered"

---

### Registration page shows generic error on network failure

**Given** a user is on the /register page

**When** the user submits a valid form
**And** the fetch call throws an exception

**Then** the page displays the message "Registration failed. Please try again."

---

### Registration page disables the submit button while loading

**Given** a user is on the /register page

**When** the user submits the form
**And** the request is still pending

**Then** the submit button is disabled
**And** the button text is "Creating account..."

---

## Auth Configuration

### Auth uses the custom sign-in page

**Given** the NextAuth configuration in auth.ts

**When** the pages configuration is inspected

**Then** the signIn page is set to "/login"

---

### Auth uses the Drizzle adapter

**Given** the NextAuth configuration in auth.ts

**When** the adapter is inspected

**Then** it is a DrizzleAdapter initialized with the database client

---

## Database Schema

### Users table has email uniqueness constraint

**Given** the users table schema definition

**When** the email column is inspected

**Then** it has a unique constraint
**And** it is not nullable

---

### Users table defaults role to teacher

**Given** the users table schema definition

**When** the role column is inspected

**Then** its default value is "teacher"
**And** it is not nullable

---

### Users table uses cuid2 for primary keys

**Given** the users table schema definition

**When** the id column is inspected

**Then** it is a text primary key with a $defaultFn that generates cuid2 values

---

### Accounts table cascades deletion from users

**Given** the accounts table schema definition

**When** the userId foreign key is inspected

**Then** it references users.id with onDelete: "cascade"

---

### Sessions table cascades deletion from users

**Given** the sessions table schema definition

**When** the userId foreign key is inspected

**Then** it references users.id with onDelete: "cascade"
