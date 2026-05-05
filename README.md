# LINC Pastor Dashboard

A bilingual (English/Arabic) church administration dashboard for LINC Ministries' Leadership Development Program (2026–2028). Built as a frontend-only React application with Firebase backend services and Google API integrations.

## Features

### Spiritual Gifts Assessment
- Bilingual assessment form (English/Arabic) with RTL layout support
- 65+ questions covering faith journey, spiritual gifts, ministry alignment, and personal vision
- Automatic scoring and primary/secondary gift identification
- Ministry area recommendations based on results
- Email delivery of results via Gmail API

### Admin Dashboard
- Review all trainee submissions with detailed score breakdowns
- Filter, search, and sort trainees by gift type, name, or date
- Visual gift score charts and ministry alignment analysis
- Access to full assessment responses per trainee

### Calendar & Meeting Management
- Interactive monthly calendar view for scheduling
- Create, edit, and delete meetings with Google Meet integration
- Participant selection and automatic email invitations via Gmail
- Real Google Meet link creation through Google Calendar API
- Upcoming meetings list with quick actions

### Authentication & Security
- Google Sign-In and Email/Password authentication via Firebase
- Admin-only access to `/dashboard` and `/calendar` routes
- Firebase Realtime Database for persistent data storage
- OAuth 2.0 implicit flow for Google API access (Calendar, Gmail)

### Localization
- Full English/Arabic bilingual support
- Automatic RTL layout switching for Arabic
- Persistent language preference (localStorage)
- All UI strings, forms, and notifications translated

## Tech Stack

- **React 19** with TypeScript
- **Vite 8** for fast builds and HMR
- **Tailwind CSS** for styling
- **Firebase** (Auth, Realtime Database, Firestore)
- **Google APIs** (Calendar v3, Gmail via REST)
- **Framer Motion** for animations
- **Lucide React** for icons
- **date-fns** for date manipulation
- **React Router v6** for routing

## Project Structure

```
kiroform/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AssessmentForm.tsx
│   │   ├── Calendar.tsx
│   │   ├── Layout.tsx
│   │   └── PageTitle.tsx
│   ├── i18n/                # Internationalization
│   │   ├── index.tsx        # I18nProvider & useI18n hook
│   │   └── translations.ts  # EN/AR translation map
│   ├── pages/               # Route-level components
│   │   ├── AdminDashboard.tsx
│   │   ├── LandingPage.tsx
│   │   ├── PrivacyPolicy.tsx
│   │   └── TermsOfService.tsx
│   ├── services/            # External API integrations
│   │   └── gmail.ts         # Gmail API & Google Calendar
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Router & auth guard
│   ├── firebase.ts          # Firebase initialization
│   └── main.tsx             # Entry point
├── .env                     # Environment variables (git-ignored)
├── .env.example             # Template for required env vars
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Firebase project with Realtime Database enabled
- Google Cloud Project with Calendar API and Gmail API enabled

### Setup

1. **Clone and install dependencies:**
   ```bash
   cd kiroform
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Fill in the following in `.env`:

   | Variable | Description |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | Firebase project API key |
   | `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
   | `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
   | `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
   | `VITE_FIREBASE_APP_ID` | Firebase app ID |
   | `VITE_FIREBASE_MEASUREMENT_ID` | Firebase measurement ID |
   | `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |
   | `VITE_GOOGLE_REDIRECT_URI` | OAuth redirect (e.g. `http://localhost:3000`) |

3. **Firebase Rules:**

   Ensure your Firebase Realtime Database rules allow read/write:
   ```json
   {
     "rules": {
       "form": {
         ".read": "auth != null",
         ".write": true
       },
       "meetings": {
         ".read": "auth != null",
         ".write": "auth != null"
       }
     }
   }
   ```

4. **Google OAuth Configuration:**

   In your Google Cloud Console:
   - Enable **Google Calendar API** and **Gmail API**
   - Create OAuth 2.0 Client ID (Web application type)
   - Add `http://localhost:3000` to **Authorized JavaScript origins**
   - Add `http://localhost:3000` and `http://127.0.0.1:3000` to **Authorized redirect URIs**
   - Scopes required: `https://www.googleapis.com/auth/calendar.events`, `https://www.googleapis.com/auth/gmail.send`

5. **Start the dev server:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

Output will be in `dist/`. Deploy to any static hosting (Firebase Hosting, Vercel, Netlify, etc.)

## Admin Access

Access to `/dashboard` and `/calendar` is restricted to these email addresses by default:
- `georgejoseph5000@gmail.com`
- `georgtawadrous@gmail.com`
- `test@example.com`

Edit the `admins` array in `src/App.tsx` to add or remove admin users.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## License

Private — LINC Ministries

## Created by

T-TLabs
