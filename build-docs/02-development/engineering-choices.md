# Engineering Choices

## Technology Stack

### Frontend Framework
- **React** with TypeScript for type safety and component-based architecture
- **Vite** for fast development and build times
- **React Router** for client-side navigation

### Styling
- **Tailwind CSS** for utility-first styling
- **PostCSS** for advanced CSS processing
- **CSS Modules** for component-scoped styles

### State Management
- **Zustand** for global state management (simple, performant, TypeScript-first)
- **React Query / TanStack Query** for server state and caching
- **React Context API** for theme and user session context

### Data Visualization
- **Recharts** for data visualization components
- **Chart.js** as alternative option

### Testing
- **Vitest** for unit testing (faster than Jest, native ESM support)
- **React Testing Library** for component testing
- **Cypress** for end-to-end testing
- **MSW (Mock Service Worker)** for API mocking
- **Lighthouse CI** for performance testing

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/               # Page-level components
├── services/            # API clients and data services
├── hooks/               # Custom React hooks
├── context/             # React context providers
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
├── assets/              # Static assets (images, icons, etc.)
├── styles/              # Global styles and theme files
└── App.tsx              # Main application component
```

## Development Tools

### Code Quality
- **ESLint** with TypeScript support
- **Prettier** for code formatting
- **Husky** and **lint-staged** for pre-commit hooks
- **Commitlint** for conventional commits

### Build Process
- **Vite** for development server and production build
- **PostCSS** with autoprefixer
- **Tailwind CSS** with custom configuration

## Performance Considerations

### Bundle Optimization
- Tree-shaking enabled
- Code splitting for lazy loading
- Image optimization
- Caching strategies

### Accessibility
- Semantic HTML structure
- ARIA attributes where needed
- Keyboard navigation support
- Screen reader compatibility

## Deployment

### Hosting
- **Vercel** or **Netlify** for static site deployment
- **GitHub Pages** as alternative option

### CI/CD
- GitHub Actions for automated testing and deployment
- Automated code quality checks
- Versioned releases

## API Integration

### Authentication
- JWT tokens for authentication
- Session management
- Token refresh mechanisms

### Error Handling
- Global error boundaries
- API error responses handling
- User-friendly error messages

## Data Management

### Mock Data Strategy
- Mock data for initial development
- API integration for production data
- Data fixtures for testing

### Data Flow
- Unidirectional data flow
- Component composition patterns
- State management patterns

## External Services

### SMS Provider
- **Primary**: Twilio (reliable, global coverage, robust webhooks)
- **Alternative**: AWS SNS (cost-effective for US-only)

### Email Provider
- **Primary**: SendGrid (excellent deliverability, analytics, templates)
- **Alternative**: AWS SES (cost-effective, high volume)

### Error Tracking
- **Sentry** for frontend and backend error tracking
- Performance monitoring integration
- Session replay for debugging

### Analytics
- **Vercel Analytics** for web vitals
- **Custom metrics** in Supabase for business analytics

## Caching Strategy

### Browser Caching
- Static assets cached via CDN
- Service worker for offline support (optional)

### API Caching
- React Query for client-side data caching
- Stale-while-revalidate strategy
- Cache invalidation on mutations

### Database Caching
- PostgreSQL query cache (built-in)
- Supabase Edge Function caching
- Connection pooling via PgBouncer

### CDN
- **Vercel Edge Network** or **Cloudflare** for global content delivery
- Asset optimization and caching

## PDF Generation

### Report Generation
- **Puppeteer** for PDF generation (headless Chrome)
- Template-based reports with HTML/CSS
- Edge Functions for serverless generation

### Alternative
- **jsPDF** for client-side PDF generation (smaller reports)

## Feature Flags

### Implementation Options
- **LaunchDarkly** (enterprise option)
- **Custom solution** using database flags
- Environment-based feature toggling

## Form Management

### Forms & Validation
- **React Hook Form** for form state management
- **Zod** for schema validation
- Type-safe form handling