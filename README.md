# Social Calendar

A comprehensive social calendar application built with Next.js that helps you connect with friends and colleagues, manage your schedule, and find optimal meeting times by integrating multiple calendar services.

## Features

### Core Features
- **Multi-Calendar Integration**: Connect Google Calendar, Microsoft Outlook, and Apple Calendar
- **Social Availability**: See when your contacts are free based on their calendar data
- **Smart Meeting Suggestions**: AI-powered suggestions for optimal meeting times based on group availability
- **Task Management**: Create and manage tasks with NLP-powered duration estimation
- **Conflict Detection**: Automatic detection and notification of scheduling conflicts
- **Work/Personal Separation**: Maintain privacy by separating work and personal calendar access

### User Interface
- **Multiple Calendar Views**: Day, week, month, and year views
- **Responsive Design**: Optimized for both mobile and desktop
- **Real-time Updates**: Live notifications for events, tasks, and availability changes
- **Intuitive Dashboard**: Clean, modern interface for easy navigation

### Authentication
- **OAuth Integration**: Sign in with Google, Microsoft, and Apple accounts
- **Secure Token Management**: Proper handling of calendar access tokens
- **Privacy Controls**: Granular control over what information is shared

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Lucide Icons
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **Calendar APIs**: Google Calendar API, Microsoft Graph API
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18.x or later
- PostgreSQL database
- Google OAuth credentials
- Microsoft OAuth credentials (optional)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd social-calendar
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

   Fill in your environment variables:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/social_calendar"
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Microsoft OAuth
   MICROSOFT_CLIENT_ID=your-microsoft-client-id
   MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
   MICROSOFT_TENANT_ID=common
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── auth/              # Authentication pages
│   ├── api/               # API routes
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── calendar/          # Calendar-related components
│   ├── tasks/            # Task management components
│   └── availability/     # Availability components
├── lib/                  # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # Utility functions
└── prisma/               # Database schema and migrations
```

## API Integration

### Google Calendar
The app integrates with Google Calendar API to:
- Fetch user calendar events
- Create new events
- Monitor calendar changes

### Microsoft Graph
Microsoft Graph API integration provides:
- Access to Outlook calendars
- Event management
- Real-time notifications

## Database Schema

The application uses a comprehensive database schema including:
- **Users**: User account information
- **Calendars**: Connected calendar services
- **Events**: Calendar events from all sources
- **Tasks**: User-created tasks with duration estimates
- **Groups**: User groups for collaborative scheduling
- **Availability**: Computed availability data
- **Notifications**: System notifications

## Privacy & Security

- **Token Security**: OAuth tokens are securely stored and managed
- **Data Separation**: Work and personal calendar data are kept separate
- **Privacy Controls**: Users control what information is shared with contacts
- **Encryption**: Sensitive data is encrypted in the database

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
npx prisma studio    # Open Prisma Studio
npx prisma migrate dev # Run database migrations
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set up environment variables in Vercel dashboard
4. Deploy automatically on push

### Docker

```bash
docker build -t social-calendar .
docker run -p 3000:3000 social-calendar
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
