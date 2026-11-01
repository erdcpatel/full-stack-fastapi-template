# Frontend

React + Vite frontend built with TypeScript, Tailwind CSS, and TanStack Router/Query. Purely npm-driven.

---

## Commands

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
Open <http://localhost:5173>. Requests to `/api` proxy to the FastAPI backend at <http://localhost:8000>.

### Build for Production
```bash
npm run build
```
Builds the production bundle into `../backend/app/frontend` which is automatically served by FastAPI on port 8000.

### Lint Code
```bash
npm run lint
```
