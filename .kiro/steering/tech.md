# Technology Stack

## Core Framework
- **Next.js 16** with App Router (React 19, TypeScript 5)
- **Node.js 20+** runtime environment

## Database & ORM
- **PostgreSQL** - Primary database
- **Prisma 7** - Type-safe ORM with migrations
- **@prisma/adapter-pg** - PostgreSQL adapter

## State Management & UI
- **Redux Toolkit** - Global state management
- **React-Redux** - React bindings for Redux
- **Tailwind CSS 4** - Utility-first styling with custom theme
- **shadcn/ui** - Accessible component library
- **Lucide React** - Icon library
- **class-variance-authority** - Component variant management

## Validation & Security
- **Zod 4** - Runtime schema validation and type inference
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token generation and verification
- Custom rate limiting middleware
- Input sanitization utilities

## Testing
- **Jest 30** - Test framework
- **React Testing Library** - Component testing
- **ts-jest** - TypeScript support for Jest
- **fast-check** - Property-based testing

## Code Quality
- **ESLint 9** with Next.js config
- **Prettier 3** - Code formatting
- **TypeScript strict mode** enabled

## Common Commands

### Development
```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run type-check       # TypeScript type checking
```

### Database
```bash
npm run db:migrate       # Create and apply migration
npm run db:push          # Push schema without migration
npm run db:studio        # Open Prisma Studio GUI
npm run db:generate      # Generate Prisma Client
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format with Prettier
npm run format:check     # Check formatting
```

### Testing
```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
```

## Key Configuration Files
- `tsconfig.json` - TypeScript config with strict mode, path aliases (`@/*`)
- `next.config.ts` - Next.js config with image domains
- `tailwind.config.ts` - Tailwind with shadcn/ui theme variables
- `prisma/schema.prisma` - Database schema with enums and relations
- `jest.config.js` - Jest with ts-jest and jsdom environment
- `.env` - Environment variables (DATABASE_URL, JWT_SECRET, etc.)
