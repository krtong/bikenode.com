# React Migration Conversation Log

## Background
- **Current Setup**: Eleventy static site generator with Nunjucks templates
- **Purpose**: Current static sites are for UX/UI testing, not production
- **Goal**: Migrate to React for better prototyping and future mobile app development

## Key Points from Discussion

### Why React?
- **UX/UI Testing Focus**: Better for rapid prototyping and interactive testing
- **Mobile App Future**: React Native compatibility for eventual mobile app
- **Developer Experience**: Better tooling, hot reload, component-based development
- **Interactive Prototypes**: Easier to test user flows and complex interactions

### Current Architecture Analysis
- **Self-contained architecture**: Every component is isolated with specific naming
- **100+ pages**: Substantial codebase across bikes, marketplace, community, rides, etc.
- **Go backend**: API server that will remain unchanged
- **Complex functionality**: Maps, forms, interactive features

### Proposed React Structure
```
/website/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Route-based page components
│   ├── layouts/       # Page layout templates
│   ├── hooks/         # Custom React hooks
│   ├── store/         # State management
│   ├── services/      # API integration
│   └── styles/        # Global styles
├── api-server/        # Keep existing Go backend
└── public/           # Static assets
```

### State Management Schema
- **Redux Toolkit** (recommended) or Zustand
- **State shape**: auth, bikes, rides, marketplace, ui
- **API integration**: Service layer to connect to Go backend

## Questions Addressed

### Q: Will it be easy to port to mobile app?
**A: Yes** - React Native allows ~80% code reuse, shared business logic, and same development skills.

### Q: How should we organize the React folder structure?
**A: Feature-based approach** with clear separation of concerns while maintaining some self-contained principles.

### Q: What early stage tasks are needed?
**A: 44 tasks identified** covering technology decisions, development setup, API integration, and component architecture.

## Decisions Made

### ✅ Confirmed Decisions
1. **Purpose**: React for UX/UI testing and prototyping
2. **Backend**: Keep existing Go API server
3. **Mobile**: Plan for React Native compatibility
4. **Architecture**: Feature-based with reusable components

### ❓ Pending Decisions
1. **Framework**: Next.js vs Vite vs Create React App
2. **State Management**: Redux Toolkit vs Zustand vs Context
3. **Styling**: CSS Modules vs Styled Components vs Tailwind  
4. **TypeScript**: Yes or No
5. **Migration Strategy**: Gradual vs Big Bang approach
6. **SSR/SSG**: Server-side rendering needs for SEO

## Next Steps
- Work through the 44 todo items systematically
- Make technology stack decisions
- Set up development environment alongside existing Eleventy site
- Begin with foundation components and API integration

---

## Decision Questions - Please Answer Below

### 1. React Framework Choice
**Options**: Next.js (SSG/SSR), Vite (fast dev), Create React App (simple)

**For prototyping/UX testing, which matters most to you?**
- A) Fast development/hot reload (→ Vite)
- B) SEO and static generation (→ Next.js) 
- C) Simplicity and quick setup (→ Create React App)

**Your Answer**: 

**Reasoning**:

---

### 2. State Management
**Options**: Redux Toolkit (powerful), Zustand (lightweight), Context API (built-in)

**How complex will your state interactions be?**
- A) Very complex - lots of cross-component state, caching, middleware (→ Redux Toolkit)
- B) Moderate - some shared state, simple async (→ Zustand)
- C) Simple - mostly local component state (→ Context API)

**Your Answer**:

**Reasoning**:

---

### 3. Styling Approach
**Options**: CSS Modules (scoped CSS), Styled Components (CSS-in-JS), Tailwind (utility-first)

**What's your team's CSS preference?**
- A) Traditional CSS with scoping (→ CSS Modules)
- B) JavaScript-based styling (→ Styled Components)
- C) Utility classes and rapid prototyping (→ Tailwind)

**Your Answer**:
it should follow the same approach as the current Eleventy site, which uses CSS Modules. we'll have folders for each component with a jsx file and a corresponding CSS module file.
**Reasoning**:
You often look for files based on names and batch files based on names so all files should be hyperspecific to one component, one component's css, all with class/id/variable naming that's hyperspecific to that type of component. This will make it easier to find and manage components and their styles as the project grows.
---

### 4. TypeScript vs JavaScript
**Question**: Do you want type safety and better IDE support, or faster development?
- A) TypeScript - better for large codebases, fewer runtime errors
- B) JavaScript - faster to write, less setup

**Your Answer**:
A) TypeScript - better for large codebases, fewer runtime errors
**Reasoning**:
We plan on building a massive social media platform tailored to cycling, motorcycling, cabin-bikes, ebike, electric scooters and anything with two wheels. That potentially means our platform will reach millions of users. 
---

### 5. Migration Strategy
**Question**: How do you want to approach the migration?
- A) Gradual - migrate one section at a time, run both systems
- B) Big Bang - full rewrite, switch completely

**Your Answer**:
A. Gradual 
**Reasoning**:
The 11ty is to rapidly prototype and test UX/UI. Some pages are not ready yet. The components and features is not fully fleshed out yet. We should have an idea of what our database will look like, so we know what our state object in react will look like, so we can build components and pages around that state object. We should also have an idea of what our API will look like, so we can build services around that API. So we will need a document looking at how fleshed out the features are of each component and page, and how fleshed out the API is, so we can prioritize which components and pages to migrate first.
---

### 6. SEO/Static Generation Needs
**Question**: Do you need SEO optimization for these prototype pages?
- A) Yes - need good SEO, fast loading, static generation
- B) No - just for internal testing, SEO doesn't matter

**Your Answer**:
A. Yes this is a proper website. 
**Reasoning**:
this is goign to be a massive platform with 
---

### 7. Development Timeline
**Question**: How quickly do you want to get a basic React version running?
- A) ASAP - get something working in days
- B) Properly - take time to set up everything correctly

**Your Answer**:

**Reasoning**:

---

## Notes
- This document will be updated as we make decisions and progress through the migration
- All major choices will be recorded with rationale
- Questions and concerns will be documented for future reference