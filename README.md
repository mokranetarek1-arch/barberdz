# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## HFafa PWA notes

- This workspace contains a small HFafa barber-management app ported from a Flutter starter. It supports an offline-first PWA setup via `vite-plugin-pwa`.
- A local demo data store is implemented in `src/App.jsx`. To connect to the original Supabase backend, a client wrapper is available at `src/supabaseClient.js` (pre-filled with the project's public URL and key).

Run locally:

```bash
npm install
npm run dev
```

Build & preview (service worker active in preview/build):

```bash
npm run build
npm run preview
```

If you want me to wire `src/App.jsx` to use Supabase instead of localStorage, tell me and I will implement the authentication and data sync flows.
