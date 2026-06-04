# Ticket Filters Demo

A Next.js app showcasing the ticket filtering system built with Firebase Firestore.

## Setup

### 1. Add your Firebase config

Open `config/firebase.ts` and replace the placeholder values:

```ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

Get them from: Firebase Console → Project Settings → Your apps → SDK setup and configuration.

### 2. Create the Firestore collection

Create a collection called `myNewTickets`. Each document should have:

| Field | Type | Example |
|-------|------|---------|
| name | string | "Alice Martin" |
| email | string | "alice@example.com" |
| subject | string | "Order not received" |
| agent | string | "" or "bob@example.com" |
| status | string | "open" / "pending" / "on-hold" / "solved" / "closed" |
| priority | string | "Urgent" / "High" / "Medium" / "Low" |
| folder | string | "Active" / "Archive" / "Spam" / "Trash" |
| attachmentLink | string | "true" or "false" |
| madeBy | string | "alice@example.com" |
| followers | array | ["bob@example.com"] |
| tags | array | ["billing", "refund"] |
| dateCreated | timestamp | Firestore Timestamp |
| lastActivity | timestamp | Firestore Timestamp |
| lastMessage | timestamp | Firestore Timestamp |
| message | string | "Hello" |

See `scripts/seedData.mjs` for 8 ready-to-use example documents.

### 3. Firestore rules (dev only)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /myNewTickets/{doc} {
      allow read, write: if true;
    }
  }
}
```

### 4. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## Filter Categories

| Filter | What it does |
|--------|-------------|
| Status | open / pending / on-hold / solved / closed |
| Priority | Urgent / High / Medium / Low |
| Assignment | Assigned or Unassigned |
| Attachment | Has or does not have attachment |
| Creation date | Today / Yesterday / Last week / Last month |
| Last activity | Same date buckets |
| Last message | Same date buckets |
| Folder | Active / Archive / Spam / Trash |

Multiple filters stack (AND logic). Click Apply to run, Clear all to reset.
