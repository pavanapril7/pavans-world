# Next.js Full-Stack Application

A modern, production-ready Next.js application with TypeScript, Redux Toolkit, Tailwind CSS, shadcn/ui, Zod validation, and PostgreSQL with Prisma ORM.

## Technology Stack

### Core Framework
- **Next.js 16** - React framework with App Router for server-side rendering and static site generation
- **React 19** - UI library for building component-based interfaces
- **TypeScript 5** - Type-safe JavaScript for enhanced developer experience

### State Management
- **Redux Toolkit** - Predictable state container with modern Redux patterns
- **React-Redux** - Official React bindings for Redux

### Styling & UI
- **Tailwind CSS 4** - Utility-first CSS framework for rapid UI development
- **shadcn/ui** - Accessible and customizable UI component library
- **Lucide React** - Beautiful icon library

### Data & Validation
- **Zod** - TypeScript-first schema validation library
- **Prisma** - Type-safe ORM for database operations
- **PostgreSQL** - Robust relational database

### Testing
- **Jest** - JavaScript testing framework
- **React Testing Library** - Testing utilities for React components
- **fast-check** - Property-based testing library

### Code Quality
- **ESLint** - Linting for code quality and consistency
- **Prettier** - Code formatter for consistent style

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** 20.x or higher
- **npm** or **yarn** package manager
- **PostgreSQL** 14.x or higher

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory by copying the example:

```bash
cp .env.example .env
```

Update the environment variables in `.env`:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/nextjs_app?schema=public"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Environment Variables Explained:**

- `DATABASE_URL` - PostgreSQL connection string with the following format:
  - `user` - Your PostgreSQL username
  - `password` - Your PostgreSQL password
  - `localhost:5432` - Database host and port
  - `nextjs_app` - Database name
  - `schema=public` - Database schema

- `NEXT_PUBLIC_APP_URL` - Base URL for the application (exposed to the browser)

### 4. Set Up the Database

Run Prisma migrations to create the database schema:

```bash
npm run db:migrate
```

This will:
- Create the database if it doesn't exist
- Apply all migrations to set up the schema
- Generate the Prisma Client

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Available Scripts

### Development
- `npm run dev` - Start the development server with hot reload
- `npm run build` - Create an optimized production build
- `npm run start` - Start the production server (requires build first)

### Code Quality
- `npm run lint` - Run ESLint to check for code issues
- `npm run lint:fix` - Automatically fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is formatted correctly
- `npm run type-check` - Run TypeScript compiler to check for type errors

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode

### Database
- `npm run db:migrate` - Create and apply a new migration
- `npm run db:push` - Push schema changes to the database without migrations
- `npm run db:studio` - Open Prisma Studio to view and edit data
- `npm run db:generate` - Generate Prisma Client (runs automatically after migrations)

## Project Structure

```
nextjs-app/
├── src/
│   ├── app/                    # Next.js App Router pages and layouts
│   │   ├── api/                # API routes
│   │   ├── example/            # Example feature page
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles with Tailwind directives
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── TailwindTest.tsx    # Tailwind styling example
│   │   ├── TechCard.tsx        # Technology card component
│   │   └── UserForm.tsx        # Form with Zod validation
│   ├── lib/                    # Utility functions and configurations
│   │   ├── redux/              # Redux store configuration
│   │   │   ├── store.ts        # Store setup
│   │   │   ├── provider.tsx    # Redux provider component
│   │   │   ├── hooks.ts        # Typed Redux hooks
│   │   │   └── slices/         # Redux slices
│   │   ├── prisma.ts           # Prisma client singleton
│   │   └── utils.ts            # Utility functions
│   ├── schemas/                # Zod validation schemas
│   │   └── user.schema.ts      # User validation schema
│   └── types/                  # TypeScript type definitions
│       └── index.ts            # Shared types
├── prisma/
│   ├── migrations/             # Database migrations
│   └── schema.prisma           # Prisma schema definition
├── __tests__/                  # Test files
├── public/                     # Static assets
├── .env                        # Environment variables (not in git)
├── .env.example                # Environment variables template
├── components.json             # shadcn/ui configuration
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## Key Features

### Type Safety Throughout
- TypeScript for compile-time type checking
- Zod for runtime validation
- Prisma for type-safe database queries

### State Management
- Redux Toolkit with pre-configured store
- Typed hooks for useSelector and useDispatch
- Example slice demonstrating best practices

### Modern Styling
- Tailwind CSS with custom configuration
- shadcn/ui components for consistent UI
- Dark mode support via class-based theming

### Database Integration
- Prisma ORM with PostgreSQL
- Type-safe database client
- Migration system for schema changes
- Example User model with CRUD operations

### Form Validation
- Zod schemas for data validation
- Type inference from schemas
- Example form with validation

## Example Usage

### Creating a New API Route

```typescript
// src/app/api/example/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const data = await prisma.user.findMany();
  return NextResponse.json(data);
}
```

### Using Redux State

```typescript
'use client';

import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { increment } from '@/lib/redux/slices/exampleSlice';

export default function Counter() {
  const count = useAppSelector((state) => state.example.value);
  const dispatch = useAppDispatch();

  return (
    <button onClick={() => dispatch(increment())}>
      Count: {count}
    </button>
  );
}
```

### Creating a Zod Schema

```typescript
// src/schemas/example.schema.ts
import { z } from 'zod';

export const exampleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18 or older'),
});

export type ExampleInput = z.infer<typeof exampleSchema>;
```

### Adding a Prisma Model

```prisma
// prisma/schema.prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

After adding a model, run:
```bash
npm run db:migrate
```

## Testing

The project includes comprehensive tests:

- **Unit Tests** - Test individual components and functions
- **Integration Tests** - Test full-stack flows
- **Property-Based Tests** - Test properties across many inputs

Run tests with:
```bash
npm test
```

## Building for Production

Create an optimized production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

The build process:
- Compiles TypeScript
- Optimizes and bundles JavaScript
- Purges unused CSS
- Generates static pages where possible

## Learn More

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Zod Documentation](https://zod.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)

### Tutorials
- [Next.js Learn](https://nextjs.org/learn)
- [Redux Essentials](https://redux.js.org/tutorials/essentials/part-1-overview-concepts)
- [Tailwind CSS Tutorial](https://tailwindcss.com/docs/utility-first)

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify DATABASE_URL in .env is correct
- Check database user has proper permissions

### Build Errors
- Run `npm run type-check` to identify TypeScript errors
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`
- Ensure all dependencies are installed: `npm install`

### Test Failures
- Ensure database is set up: `npm run db:migrate`
- Check environment variables are set
- Run tests individually to isolate issues

## License

This project is private and proprietary.
