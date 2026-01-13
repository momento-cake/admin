# Web Platform Chore

## Web Files to Modify

- `package.json` - <Why this file needs modification>
- `src/<path>/<file>.tsx` - <Why this file needs modification>
- `src/__tests__/<test>.test.tsx` - <Test updates needed>
- `vite.config.ts` - <Build configuration changes>
- `tsconfig.json` - <TypeScript configuration changes>
- `.env` - <Environment variable changes>

## Web Step by Step Tasks

### Task: Make Web Changes
- [ ] Update package.json dependencies (if dependency update)
- [ ] Run `npm install` to update lock file
- [ ] Run `npm audit` to check for security issues
- [ ] Refactor web code (if refactoring)
- [ ] Update imports and references
- [ ] Fix TypeScript errors: `npm run type-check`
- [ ] Fix linting errors: `npm run lint`
- [ ] Update environment variables (.env)
- [ ] Update related component tests
- [ ] Update integration tests
- [ ] Verify TanStack Query hooks still work
- [ ] Verify shadcn/ui components still work
- [ ] Test responsive design on different screen sizes
- [ ] Check browser console for warnings/errors

## Web Testing Strategy

### Component Tests
- UI component rendering
- User interactions
- Form validation
- Error and loading states
- Responsive behavior

### Integration Tests
- API client functions (TanStack Query)
- Authentication flows
- Data fetching and mutations
- localStorage/sessionStorage operations
- Routing and navigation

### Dependency Testing (for dependency updates)
- Verify React version compatibility
- Check Vite build still works
- Test shadcn/ui component compatibility
- Verify TanStack Query behavior
- Test Tailwind CSS compilation

## Web Validation Commands

```bash
# Navigate to web
cd gango-web

# Install dependencies
npm install

# Type check TypeScript
npm run type-check

# Run linting
npm run lint

# Run tests
npm run test

# Build for production
npm run build

# Check for outdated packages
npm outdated

# Check for security vulnerabilities
npm audit

# Start web locally to verify
PORT=3001 npm run dev
```

## Web Manual Testing Checklist
- [ ] Verify TypeScript compilation succeeds
- [ ] Run all web tests
- [ ] Check for npm audit security issues
- [ ] Test all pages and routes manually
- [ ] Verify shadcn/ui components render correctly
- [ ] Test forms and validation
- [ ] Check responsive design (mobile, tablet, desktop)
- [ ] Test different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Verify API integration still works
- [ ] Check browser console for errors/warnings
- [ ] Test authentication and authorization
- [ ] Verify Firebase integration works

## Web Best Practices

**Dependency Updates:**
- Update React and related packages together
- Test Vite compatibility after updates
- Verify shadcn/ui component compatibility
- Check TanStack Query breaking changes
- Test Tailwind CSS version compatibility

**Refactoring:**
- Follow existing React patterns
- Use shadcn/ui components consistently
- Keep components small and focused
- Extract custom hooks for reusable logic
- Maintain TypeScript type safety

**Configuration:**
- Keep .env file for environment variables
- Use Vite environment variable conventions
- Update both development and production configs
- Document configuration changes

**Performance:**
- Use code splitting for routes
- Optimize bundle size
- Implement proper loading states
- Use TanStack Query caching effectively
- Optimize image loading
