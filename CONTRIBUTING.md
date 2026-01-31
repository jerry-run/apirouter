# Contributing to APIRouter

Thank you for your interest in contributing to APIRouter! This document provides guidelines and instructions for contributing.

## 🙏 Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/your-username/apirouter.git
cd apirouter
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Install backend and frontend deps
npm run backend:install
npm run frontend:install
```

### 3. Create a Branch

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or bugfix branch
git checkout -b fix/your-bug-name
```

## 📝 Making Changes

### Development Workflow

```bash
# Start development servers
npm run dev

# Run tests in watch mode
npm run backend:test:watch
npm run frontend:test:watch

# Run all tests
npm test

# Run E2E tests
npm run e2e
```

### Code Style

- **TypeScript** — Use strict mode (`"strict": true`)
- **Naming** — camelCase for variables/functions, PascalCase for classes/types
- **Comments** — Add JSDoc comments for public APIs
- **Formatting** — Use Prettier (auto-format on save)

Example:

```typescript
/**
 * Creates a new API key with specified providers
 * @param name - Human-readable key name
 * @param providers - Array of provider names
 * @returns The created API key object
 * @throws Error if providers list is empty
 */
export async function createKey(name: string, providers: string[]): Promise<ApiKey> {
  if (providers.length === 0) {
    throw new Error('At least one provider must be specified');
  }
  
  // Implementation...
}
```

### Testing (TDD)

**Always use Test-Driven Development:**

1. Write the test first
2. Run it (it will fail)
3. Implement the code
4. Test passes ✅
5. Refactor as needed

Example:

```typescript
// __tests__/services/MyService.test.ts
describe('MyService', () => {
  it('should do something', () => {
    const result = MyService.doSomething();
    expect(result).toBe('expected value');
  });
});
```

### Backend Changes

**New Feature Checklist:**
- [ ] Write unit tests in `backend/__tests__/services/`
- [ ] Write controller tests in `backend/__tests__/controllers/`
- [ ] Write integration tests if needed
- [ ] Implement service logic in `backend/src/services/`
- [ ] Implement controller in `backend/src/controllers/`
- [ ] Add routes to `backend/src/server.ts`
- [ ] Update API.md with new endpoints
- [ ] All tests pass: `npm run backend:test`
- [ ] Coverage meets target (85%+)

**File Structure:**
```
backend/
├── src/
│   ├── controllers/MyController.ts
│   ├── services/MyService.ts
│   ├── middleware/myMiddleware.ts
│   ├── models/types.ts
│   └── server.ts
└── __tests__/
    ├── controllers/MyController.test.ts
    ├── services/MyService.test.ts
    └── integration/...
```

### Frontend Changes

**New Feature Checklist:**
- [ ] Write component tests in `frontend/__tests__/`
- [ ] Implement component in `frontend/src/pages/` or `frontend/src/components/`
- [ ] Create CSS file in `frontend/src/styles/`
- [ ] Add API calls to `frontend/src/services/api.ts`
- [ ] Test on desktop and mobile
- [ ] All tests pass: `npm run frontend:test`
- [ ] Coverage meets target (70%+)

**File Structure:**
```
frontend/
├── src/
│   ├── pages/MyPage.tsx
│   ├── components/MyComponent.tsx
│   ├── styles/MyPage.css
│   └── services/api.ts
└── __tests__/
    ├── pages/MyPage.test.tsx
    └── components/MyComponent.test.tsx
```

## 📋 Commit Messages

Use clear, descriptive commit messages:

```bash
# Good ✅
git commit -m "feat(backend): Add rate limiting middleware

- Implement rate limiting per API key
- Add tests for rate limit enforcement
- Update API documentation"

# Less helpful ❌
git commit -m "fix stuff"
git commit -m "WIP"
```

**Format:**
```
type(scope): short description

Longer explanation of the change:
- What changed
- Why it changed
- Any impact on other parts
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `test` — Tests
- `refactor` — Code refactoring
- `perf` — Performance improvement

## 🔄 Pull Request Process

### 1. Push Your Branch

```bash
git push origin feature/your-feature-name
```

### 2. Create a Pull Request

- Go to GitHub and create a PR
- Use a descriptive title
- Reference any related issues (`Fixes #123`)
- Provide a clear description of changes

**PR Title Example:**
```
Add rate limiting per API key
```

**PR Description Example:**
```
## Description
Implements per-key rate limiting to prevent abuse.

## Changes
- Added RateLimitMiddleware
- Stores request count in Redis
- Returns 429 when limit exceeded
- Full test coverage

## Testing
- Unit tests: `npm run backend:test`
- All 142 tests passing
- Coverage: 85%+

## Related Issues
Fixes #123
```

### 3. Review Process

- At least one maintainer review required
- Address feedback on your PR
- Keep commits clean (squash if needed)
- Once approved, your PR will be merged

## 🐛 Reporting Bugs

Found a bug? Create an issue:

1. Check if it's already reported
2. Use this template:

```markdown
## Bug Description
Clear description of the problem.

## Steps to Reproduce
1. ...
2. ...
3. ...

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Environment
- OS: macOS/Linux/Windows
- Node: 20.x
- npm: 10.x

## Additional Context
Screenshots, error messages, etc.
```

## 💡 Feature Requests

Have an idea? Create a feature request:

```markdown
## Feature Description
Clear description of the feature.

## Use Case
Why is this needed?

## Example
How would users interact with this?

## Additional Context
Related issues, design docs, etc.
```

## 📚 Documentation

### Adding to API.md

When adding new endpoints, update `API.md`:

```markdown
### Create Something

```
POST /api/something
Content-Type: application/json

{ "name": "value" }
```

**Response (201 Created):**
```json
{ "id": "123", "name": "value" }
```

**Errors:**
- `400 Bad Request` — Missing required fields
```
```

### Adding to QUICKSTART.md

Include practical examples:

```markdown
## Scenario: Do Something

### Steps

1. **Prerequisite** — You need X
2. **Action** — Do this
3. **Result** — See that

### Code Example
```bash
curl -X POST ...
```
```

## 🧪 Testing Guidelines

### Write Testable Code

**Good ✅**
```typescript
// services/MyService.ts
export function doSomething(value: string): string {
  if (!value) throw new Error('Value required');
  return value.toUpperCase();
}

// __tests__/services/MyService.test.ts
describe('doSomething', () => {
  it('should uppercase input', () => {
    expect(doSomething('hello')).toBe('HELLO');
  });

  it('should throw for empty value', () => {
    expect(() => doSomething('')).toThrow();
  });
});
```

**Avoid ❌**
```typescript
// Hard to test
export function doSomething() {
  const value = process.env.SOME_VALUE;
  axios.get('/api/something');
  // ...
}
```

### Test Coverage Targets

- **Backend:** 85%+ (critical paths 100%)
- **Frontend:** 70%+ (UI components and user flows)
- **Integration:** Key workflows covered
- **All auth/permission code:** 100%

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm run backend:test __tests__/services/MyService.test.ts

# Watch mode (re-run on changes)
npm run backend:test:watch

# Coverage report
npm run backend:test -- --coverage

# E2E tests
npm run e2e
```

## 🏗️ Architecture Guidelines

### Backend Architecture

```
Request → Router → Middleware → Controller → Service → Response
                        ↓
                   (Validation,
                    Auth)
```

**Responsibility Breakdown:**
- **Router** — Define routes
- **Middleware** — Authentication, validation
- **Controller** — HTTP handling, error mapping
- **Service** — Business logic, data manipulation

### Frontend Architecture

```
Component ↔ Service ↔ API
    ↓
 State (hooks)
    ↓
 Render
```

**Responsibility Breakdown:**
- **Components** — UI rendering, user interaction
- **Services** — API communication
- **Hooks** — State management

## ✨ Code Quality Checklist

Before submitting a PR:

- [ ] TypeScript strict mode (`tsc --noEmit` passes)
- [ ] Linting passes (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] Coverage meets targets
- [ ] Code comments added for complex logic
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] No console.log left behind
- [ ] No TODO comments without tickets
- [ ] E2E tests pass (`npm run e2e`)

## 🚫 Avoid These

❌ **Don't:**
- Commit node_modules or build artifacts
- Add console.log statements
- Use `any` type in TypeScript
- Skip tests
- Hardcode secrets or API keys
- Mix style and logic changes in one PR
- Force push to shared branches

✅ **Do:**
- Write tests first
- Use meaningful variable names
- Add comments for "why", not "what"
- Keep PRs focused and small
- Reference issues in commits
- Ask questions if unsure

## 🔗 Useful Links

- **[API.md](./API.md)** — API documentation
- **[QUICKSTART.md](./QUICKSTART.md)** — Getting started
- **[GitHub Issues](https://github.com/your-org/apirouter/issues)** — Bug reports
- **[GitHub Discussions](https://github.com/your-org/apirouter/discussions)** — Questions

## 🎓 Learning Resources

- **TypeScript** — [Official Handbook](https://www.typescriptlang.org/docs/)
- **React** — [Official Docs](https://react.dev/)
- **Express** — [Official Docs](https://expressjs.com/)
- **Testing** — [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/)

## 🏆 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in releases
- Invited to our community (Discord, etc.)

## ❓ Questions?

- Check the documentation first
- Search [existing issues](https://github.com/your-org/apirouter/issues)
- Open a [discussion](https://github.com/your-org/apirouter/discussions)
- Ask in our Discord (coming soon)

---

**Thank you for contributing to APIRouter! 🙏**

The best contributions come from understanding what the project is trying to do. Read the README, understand the architecture, and contribute with purpose.

Happy coding! 🚀
