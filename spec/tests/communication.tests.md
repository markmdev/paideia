# Messaging, Translation, and Contacts

> Behavioral tests for parent-teacher messaging, contact resolution by role, multilingual translation, AI-generated communications, message read status, and the messaging UI.

---

## Message Listing (GET /api/messages)

### Unauthenticated request returns 401

**Given** no user is signed in

**When** a GET request is sent to /api/messages

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Authenticated parent sees their sent and received messages

**Given** a parent "Sarah Chen" is signed in
**And** messages exist where Sarah is the sender or receiver

**When** a GET request is sent to /api/messages

**Then** the response status is 200
**And** the response is an array of messages
**And** every message in the array has Sarah's user ID as either senderId or receiverId

---

### Messages include sender and receiver display names

**Given** a parent "Sarah Chen" is signed in
**And** a message exists from Sarah to teacher "Ms. Rivera"

**When** a GET request is sent to /api/messages

**Then** each message in the response includes:
  - senderName: a resolved display name (e.g. "Sarah Chen")
  - receiverName: a resolved display name (e.g. "Ms. Rivera")

---

### Messages sent by the current user have isFromMe true

**Given** a parent "Sarah Chen" is signed in
**And** a message exists where Sarah is the sender

**When** a GET request is sent to /api/messages

**Then** that message has isFromMe: true

---

### Messages received by the current user have isFromMe false

**Given** a parent "Sarah Chen" is signed in
**And** a message exists where Sarah is the receiver

**When** a GET request is sent to /api/messages

**Then** that message has isFromMe: false

---

### Messages are ordered by createdAt descending (newest first)

**Given** a teacher "Ms. Rivera" is signed in
**And** three messages exist at different timestamps

**When** a GET request is sent to /api/messages

**Then** the response array is sorted by createdAt in descending order (newest message first)

---

### Message list is limited to 50 results

**Given** a teacher is signed in
**And** more than 50 messages exist for this user

**When** a GET request is sent to /api/messages

**Then** the response contains at most 50 messages

---

### User with no messages sees an empty array

**Given** a parent "Sarah Chen" is signed in
**And** no messages exist where Sarah is the sender or receiver

**When** a GET request is sent to /api/messages

**Then** the response status is 200
**And** the response is an empty array

---

### Each message includes all expected fields

**Given** a parent "Sarah Chen" is signed in
**And** a message exists in the system involving Sarah

**When** a GET request is sent to /api/messages

**Then** each message in the response contains these fields:
  - id: a non-empty string
  - senderId: a user ID string
  - receiverId: a user ID string
  - subject: a string or null
  - content: a non-empty string
  - type: one of "general", "progress_update", "assignment_insight", "weekly_digest", "alert"
  - isAIGenerated: a boolean
  - status: one of "draft", "sent", "read"
  - senderName: a string
  - receiverName: a string
  - isFromMe: a boolean
  - createdAt: a valid ISO timestamp

---

## Sending Messages (POST /api/messages)

### Unauthenticated request returns 401

**Given** no user is signed in

**When** a POST request is sent to /api/messages with a valid body

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Parent sends a message to a teacher

**Given** a parent "Sarah Chen" is signed in
**And** a teacher "Ms. Rivera" exists in the system

**When** Sarah sends POST /api/messages with body:
  - receiverId: [Ms. Rivera's user ID]
  - subject: "Question about homework"
  - content: "How is Aisha doing in class?"

**Then** the response status is 201
**And** the response contains a message with:
  - id: a unique string identifier
  - senderId: matching Sarah's user ID
  - receiverId: matching Ms. Rivera's user ID
  - subject: "Question about homework"
  - content: "How is Aisha doing in class?"
  - type: "general" (the default)
  - isAIGenerated: false
  - status: "sent"

---

### Missing receiverId returns 400

**Given** a parent "Sarah Chen" is signed in

**When** Sarah sends POST /api/messages with body:
  - content: "Hello"

**Then** the response status is 400
**And** the response body field "error" contains "receiverId and content are required"

---

### Missing content returns 400

**Given** a parent "Sarah Chen" is signed in

**When** Sarah sends POST /api/messages with body:
  - receiverId: [a valid user ID]

**Then** the response status is 400
**And** the response body field "error" contains "receiverId and content are required"

---

### Sending to a non-existent user returns 404

**Given** a parent "Sarah Chen" is signed in

**When** Sarah sends POST /api/messages with body:
  - receiverId: "nonexistent-user-id"
  - content: "Hello"

**Then** the response status is 404
**And** the response body field "error" contains "Receiver not found"

---

### Message type defaults to general when not specified

**Given** a parent "Sarah Chen" is signed in
**And** a teacher "Ms. Rivera" exists

**When** Sarah sends POST /api/messages with body:
  - receiverId: [Ms. Rivera's user ID]
  - content: "Quick question"

**Then** the response status is 201
**And** the response body field "type" is "general"

---

### Teacher sends an AI-generated progress message

**Given** a teacher "Ms. Rivera" is signed in
**And** a parent "Sarah Chen" exists

**When** Ms. Rivera sends POST /api/messages with body:
  - receiverId: [Sarah's user ID]
  - subject: "Weekly Progress Update"
  - content: "AI-generated progress summary for Aisha."
  - type: "progress_update"
  - isAIGenerated: true
  - metadata: { "source": "weekly_digest" }

**Then** the response status is 201
**And** the response body field "isAIGenerated" is true
**And** the response body field "type" is "progress_update"

---

### Subject is optional and defaults to null

**Given** a parent "Sarah Chen" is signed in
**And** a teacher "Ms. Rivera" exists

**When** Sarah sends POST /api/messages with body:
  - receiverId: [Ms. Rivera's user ID]
  - content: "Just a quick note"

**Then** the response status is 201
**And** the response body field "subject" is null

---

## Message Detail (GET /api/messages/[messageId])

### Unauthenticated request returns 401

**Given** no user is signed in

**When** a GET request is sent to /api/messages/msg-123

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Receiver can view a message sent to them

**Given** a parent "Sarah Chen" is signed in
**And** a message exists with id "msg-abc" where Sarah is the receiver

**When** a GET request is sent to /api/messages/msg-abc

**Then** the response status is 200
**And** the response contains the full message with:
  - id: "msg-abc"
  - senderName: the sender's display name
  - receiverName: Sarah's display name
  - content: the full message body
  - isFromMe: false

---

### Sender can view a message they sent

**Given** a teacher "Ms. Rivera" is signed in
**And** a message exists with id "msg-def" where Ms. Rivera is the sender

**When** a GET request is sent to /api/messages/msg-def

**Then** the response status is 200
**And** the response body field "isFromMe" is true

---

### Viewing a received message auto-marks it as read

**Given** a parent "Sarah Chen" is signed in
**And** a message exists with id "msg-unread" where Sarah is the receiver and status is "sent"

**When** a GET request is sent to /api/messages/msg-unread

**Then** the response status is 200
**And** the message's status in the database is updated to "read"

---

### Viewing a sent message does not change its status

**Given** a teacher "Ms. Rivera" is signed in
**And** a message exists with id "msg-sent" where Ms. Rivera is the sender and status is "sent"

**When** a GET request is sent to /api/messages/msg-sent

**Then** the response status is 200
**And** the message's status in the database remains "sent" (not changed to "read")

---

### User cannot view a message they did not send or receive

**Given** a teacher "Mr. Okafor" is signed in
**And** a message exists with id "msg-other" between Sarah Chen and Ms. Rivera

**When** a GET request is sent to /api/messages/msg-other

**Then** the response status is 404
**And** the response body field "error" is "Message not found"

---

### Non-existent message returns 404

**Given** a parent "Sarah Chen" is signed in

**When** a GET request is sent to /api/messages/nonexistent-id

**Then** the response status is 404
**And** the response body field "error" is "Message not found"

---

## Updating Messages (PUT /api/messages/[messageId])

### Unauthenticated request returns 401

**Given** no user is signed in

**When** a PUT request is sent to /api/messages/msg-123 with body:
  - status: "read"

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Receiver marks a message as read

**Given** a parent "Sarah Chen" is signed in
**And** a message exists with id "msg-toread" where Sarah is the receiver and status is "sent"

**When** Sarah sends PUT /api/messages/msg-toread with body:
  - status: "read"

**Then** the response status is 200
**And** the returned message has status "read"

---

### Sender cannot mark their own sent message as read

**Given** a teacher "Ms. Rivera" is signed in
**And** a message exists with id "msg-own" where Ms. Rivera is the sender and status is "sent"

**When** Ms. Rivera sends PUT /api/messages/msg-own with body:
  - status: "read"

**Then** the response status is 400
**And** the response body field "error" is "No valid updates provided"

---

### User cannot update a message they did not send or receive

**Given** a teacher "Mr. Okafor" is signed in
**And** a message exists with id "msg-foreign" between Sarah Chen and Ms. Rivera

**When** Mr. Okafor sends PUT /api/messages/msg-foreign with body:
  - status: "read"

**Then** the response status is 404
**And** the response body field "error" is "Message not found"

---

## Contacts (GET /api/messages/contacts)

### Unauthenticated request returns 401

**Given** no user is signed in

**When** a GET request is sent to /api/messages/contacts

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Teacher sees parents of their students as contacts

**Given** a teacher "Ms. Rivera" is signed in
**And** Ms. Rivera teaches a class with student "Aisha Torres"
**And** "Sarah Chen" is Aisha's parent (linked via the parentChildren table)

**When** a GET request is sent to /api/messages/contacts

**Then** the response status is 200
**And** the response is an array containing Sarah Chen
**And** each contact has fields: id, name, role

---

### Parent sees their children's teachers as contacts

**Given** a parent "Sarah Chen" is signed in
**And** Sarah's child "Aisha Torres" is enrolled in a class taught by "Ms. Rivera"

**When** a GET request is sent to /api/messages/contacts

**Then** the response status is 200
**And** the response is an array containing Ms. Rivera
**And** each contact has fields: id, name, role

---

### Admin sees all teachers and SPED teachers as contacts

**Given** an admin "Dr. Williams" is signed in
**And** teachers "Ms. Rivera", "Mr. Okafor", "Ms. Chen" and SPED teacher "Ms. Rodriguez" exist

**When** a GET request is sent to /api/messages/contacts

**Then** the response status is 200
**And** the response includes contacts with role "teacher" and role "sped_teacher"
**And** the response does not include parents or students

---

### Teacher with no students sees empty contacts

**Given** a teacher is signed in
**And** the teacher has no classes or no students in their classes

**When** a GET request is sent to /api/messages/contacts

**Then** the response status is 200
**And** the response is an empty array

---

### Parent with no linked children sees empty contacts

**Given** a parent is signed in
**And** the parent has no entries in the parentChildren table

**When** a GET request is sent to /api/messages/contacts

**Then** the response status is 200
**And** the response is an empty array

---

### SPED teacher sees parents of their students as contacts

**Given** a SPED teacher "Ms. Rodriguez" is signed in
**And** Ms. Rodriguez teaches a class with students whose parents are in the system

**When** a GET request is sent to /api/messages/contacts

**Then** the response status is 200
**And** the response contains the parents of those students

---

### Contacts are deduplicated when a parent has multiple children in the same teacher's classes

**Given** a teacher "Ms. Rivera" is signed in
**And** a parent "Sarah Chen" has two children in Ms. Rivera's classes

**When** a GET request is sent to /api/messages/contacts

**Then** Sarah Chen appears only once in the contacts list (not duplicated)

---

## Translation (POST /api/messages/translate)

### Unauthenticated request returns 401

**Given** no user is signed in

**When** a POST request is sent to /api/messages/translate with a valid body

**Then** the response status is 401
**And** the response body field "error" is "Unauthorized"

---

### Translate a message to Spanish

**Given** a parent "Sarah Chen" is signed in

**When** Sarah sends POST /api/messages/translate with body:
  - text: "Your child is making great progress in reading comprehension this quarter."
  - targetLanguage: "Spanish"

**Then** the response status is 200
**And** the response contains:
  - translatedText: a non-empty string in Spanish
  - targetLanguage: "Spanish"
  - originalLanguage: a detected language string (e.g. "English")

---

### Missing text returns 400

**Given** a user is signed in

**When** a POST request is sent to /api/messages/translate with body:
  - targetLanguage: "Spanish"

**Then** the response status is 400
**And** the response body field "error" contains "text and targetLanguage are required"

---

### Missing targetLanguage returns 400

**Given** a user is signed in

**When** a POST request is sent to /api/messages/translate with body:
  - text: "Hello, how is my child doing?"

**Then** the response status is 400
**And** the response body field "error" contains "text and targetLanguage are required"

---

### Translation supports all ten listed languages

**Given** a user is signed in

**When** a POST request is sent to /api/messages/translate for each of these target languages:
  - Spanish
  - Mandarin Chinese
  - Vietnamese
  - Arabic
  - French
  - Korean
  - Portuguese
  - Tagalog
  - Russian
  - Haitian Creole

**Then** each request returns status 200
**And** each response contains a non-empty translatedText in the requested language

---

### Translation preserves education-context vocabulary

**Given** a user is signed in

**When** a POST request is sent to /api/messages/translate with body:
  - text: "Aisha scored 85% on her rubric-aligned essay assessment. She is meeting grade-level expectations in argumentative writing."
  - targetLanguage: "Spanish"

**Then** the response status is 200
**And** the AI translates education-specific terms naturally into the target language
**And** the translation preserves the warm, supportive tone appropriate for parent communication

---

## AI-Generated Messages

### AI-generated messages are flagged with isAIGenerated true

**Given** a teacher "Ms. Rivera" is signed in
**And** a message exists that was AI-generated (isAIGenerated is true in the database)

**When** a GET request is sent to /api/messages

**Then** the AI-generated message in the response has isAIGenerated: true

---

### Progress narrative AI service returns structured output

**Given** a call to the generateParentProgressNarrative service with:
  - studentName: "Aisha Torres"
  - subject: "ELA"
  - gradingPeriod: "Q2 2025"
  - recentScores: at least one score entry
  - masteryData: at least one mastery entry

**When** the AI service completes

**Then** the response contains:
  - summary: a plain-language string (3-5 sentences)
  - strengths: an array of 2-4 plain-language strings
  - areasToGrow: an array of 1-3 positively-framed growth areas
  - homeActivity: a specific, practical 10-15 minute home activity
  - overallStatus: one of "good", "watch", "concern"

---

### Weekly digest AI service returns structured output

**Given** a call to the generateWeeklyDigest service with:
  - studentName: "Aisha Torres"
  - weekOf: "2025-01-13"
  - activities: at least one subject with assignments

**When** the AI service completes

**Then** the response contains:
  - greeting: a warm greeting mentioning the student by name
  - highlights: an array of 2-4 positive accomplishments
  - concerns: an array of 0-2 gently phrased concerns
  - upcomingWork: an array of 1-3 upcoming items
  - encouragement: a brief encouraging closing

---

### Translation AI service detects original language

**Given** a call to the translateCommunication service with:
  - text: "Your child had a wonderful week in science class."
  - targetLanguage: "Mandarin Chinese"

**When** the AI service completes

**Then** the response contains:
  - translatedText: a non-empty string in Mandarin Chinese
  - targetLanguage: "Mandarin Chinese"
  - originalLanguage: "English"

---

## Messaging UI: Message List Page

### Message list page renders at /dashboard/messages

**Given** a teacher "Ms. Rivera" is signed in

**When** she navigates to /dashboard/messages

**Then** the page displays the heading "Messages"
**And** the page displays a "New Message" compose button

---

### Empty message list shows placeholder text

**Given** a user is signed in with no messages

**When** they navigate to /dashboard/messages

**Then** the page displays "No messages yet"
**And** the page displays helper text about receiving and sending messages

---

### Parent sees role-appropriate subtitle

**Given** a parent "Sarah Chen" is signed in

**When** she navigates to /dashboard/messages

**Then** the subtitle text is "Stay connected with your children's teachers."

---

### Teacher sees role-appropriate subtitle

**Given** a teacher "Ms. Rivera" is signed in

**When** she navigates to /dashboard/messages

**Then** the subtitle text is "Communicate with parents and colleagues."

---

### Message list renders type badges

**Given** a teacher is signed in
**And** messages exist with types "general", "progress_update", "weekly_digest", and "alert"

**When** she navigates to /dashboard/messages

**Then** each message row displays a type badge:
  - "general" displays as "Message"
  - "progress_update" displays as "Progress"
  - "assignment_insight" displays as "Assignment"
  - "weekly_digest" displays as "Weekly Digest"
  - "alert" displays as "Alert"

---

### Unread messages are visually highlighted

**Given** a parent is signed in
**And** a received message exists with status "sent" (unread)

**When** she navigates to /dashboard/messages

**Then** the unread message row has a highlighted background
**And** the unread message shows a closed envelope icon
**And** read messages show an open envelope icon

---

### AI-generated messages display a sparkle icon in the list

**Given** a parent is signed in
**And** a message exists with isAIGenerated: true

**When** she navigates to /dashboard/messages

**Then** the AI-generated message row displays a sparkle icon indicator

---

### Message preview truncates long content to 120 characters

**Given** a user is signed in
**And** a message exists with content longer than 120 characters

**When** they navigate to /dashboard/messages

**Then** the preview text is truncated to 120 characters followed by "..."

---

## Messaging UI: Message Detail Page

### Message detail page renders the full message

**Given** a parent "Sarah Chen" is signed in
**And** a message exists from Ms. Rivera to Sarah with subject "Progress Update" and content "Aisha is doing great in class."

**When** Sarah navigates to /dashboard/messages/[messageId]

**Then** the page displays the subject "Progress Update"
**And** the page displays "From: Ms. Rivera"
**And** the page displays the full message content
**And** the page displays the message date and time

---

### AI-generated messages show "AI Generated" badge

**Given** a parent is signed in
**And** a message exists with isAIGenerated: true

**When** the parent views the message detail page

**Then** the page displays a badge with text "AI Generated"
**And** the page displays a disclaimer: "This message was generated by AI. The teacher reviewed and approved it before sharing."

---

### Message detail page shows translation section with language dropdown

**Given** a parent is signed in and viewing a message detail page

**When** the page loads

**Then** the page displays a "Translate this message" section
**And** the section contains a language dropdown with 10 language options:
  - Spanish, Mandarin Chinese, Vietnamese, Arabic, French, Korean, Portuguese, Tagalog, Russian, Haitian Creole
**And** a "Translate" button

---

### Translating a message displays the translated text

**Given** a parent is signed in and viewing a message detail page
**And** the parent selects "Spanish" from the language dropdown

**When** the parent clicks the "Translate" button

**Then** the page displays a loading state ("Translating...")
**And** after the translation completes, the translated text appears in a highlighted card
**And** the card shows a badge with the target language name "Spanish"

---

### Message detail page shows a reply section

**Given** a parent "Sarah Chen" is signed in
**And** viewing a message from Ms. Rivera with subject "Homework Question"

**When** the page loads

**Then** the page displays a "Reply" section
**And** the reply is pre-addressed to Ms. Rivera
**And** the reply subject is pre-filled as "Re: Homework Question"

---

### Reply subject strips duplicate "Re:" prefix

**Given** a parent is signed in
**And** viewing a message with subject "Re: Original Topic"

**When** the page loads

**Then** the reply subject is "Re: Original Topic" (not "Re: Re: Original Topic")

---

## Messaging UI: Compose Dialog

### Compose dialog loads contacts from the API

**Given** a teacher "Ms. Rivera" is signed in

**When** Ms. Rivera clicks the "New Message" button on the messages page

**Then** a compose dialog opens
**And** the dialog loads contacts from GET /api/messages/contacts
**And** the "To" dropdown shows the available contacts with their role labels

---

### Contact dropdown displays role labels

**Given** a teacher is signed in
**And** the compose dialog is open with contacts loaded

**When** the teacher opens the "To" dropdown

**Then** each contact is shown as "[Name] (Role)" where role is:
  - "Teacher" for teacher
  - "SPED Teacher" for sped_teacher
  - "Parent" for parent
  - "Admin" for admin
  - "Student" for student

---

### Sending a message from the compose dialog

**Given** a teacher "Ms. Rivera" is signed in
**And** the compose dialog is open

**When** Ms. Rivera selects a parent from the "To" dropdown
**And** enters a subject
**And** enters a message body
**And** clicks the "Send" button

**Then** a POST request is sent to /api/messages with the selected receiverId, subject, content, and type "general"
**And** a success toast "Message sent" appears
**And** the dialog closes
**And** the page refreshes to show the new message

---

### Compose dialog shows "No contacts available" when contacts list is empty

**Given** a user is signed in with no available contacts

**When** they open the compose dialog

**Then** the dialog displays "No contacts available"

---

## End-to-End Communication Flow

### Teacher sends message, parent receives it

**Given** a teacher "Ms. Rivera" is signed in

**When** Ms. Rivera sends POST /api/messages to parent "Sarah Chen" with subject "Class Update" and content "Aisha did well on the essay."

**Then** the message is created with status "sent"

**When** Sarah Chen signs in and sends GET /api/messages

**Then** Sarah's message list includes the message from Ms. Rivera
**And** the message has isFromMe: false
**And** the message has senderName: "Ms. Rivera"
**And** the message has status: "sent" (unread)

**When** Sarah views the message via GET /api/messages/[messageId]

**Then** the message status is automatically updated to "read"

---

## Database Schema: Messages Table

### Messages table has required columns and defaults

**Given** the messages table schema definition

**When** the columns are inspected

**Then** the table has:
  - id: text primary key with cuid2 default
  - senderId: text, not null, references users.id
  - receiverId: text, not null, references users.id
  - subject: text, nullable
  - content: text, not null
  - type: text, not null, default "general"
  - language: text, not null, default "en"
  - isAIGenerated: boolean, not null, default false
  - status: text, not null, default "sent"
  - metadata: text, nullable (JSON string)
  - createdAt: timestamp, not null, defaults to now

---

### Message type supports five categories

**Given** the messages table schema

**When** the type column is inspected

**Then** valid values include: "general", "progress_update", "assignment_insight", "weekly_digest", "alert"

---

### Message status supports three states

**Given** the messages table schema

**When** the status column is inspected

**Then** valid values include: "draft", "sent", "read"
