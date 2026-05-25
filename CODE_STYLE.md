# Code Style

- TypeScript strict mode. Prefer `type` over `interface` for unions/intersections.
- Named exports for utilities, hooks, stores, and types. React components (pages and UI components) use default export. Relative imports only, no path aliases.
- English for all comments, docs, commit messages, and code.
- **Arrow functions**: Always use arrow functions (`const fn = () => {}`) — never the `function` keyword, for any purpose (helpers, callbacks, module-level utilities).
- **Functional programming style**: No `class` keyword. Prefer factory functions over classes. Use closures for stateful encapsulation. Stateful modules export a `createX()` factory that returns a plain object with typed methods. For event-based modules, expose `on` bound from an internal `EventEmitter` instance rather than subclassing it.

## Libraries & Tooling

- **UI framework**: Bootstrap + react-bootstrap. Use react-bootstrap components (`Button`, `Form`, `Modal`, etc.) — do not write raw Bootstrap HTML classes manually when a component exists.
- **State management**: Zustand. Use `create()` from `zustand` for all global state. Prefer slices for large stores. No Redux, no Context API for app state.
- **HTTP**: Axios for all REST service calls. Define typed request/response shapes. Create a shared axios instance (base URL, interceptors) rather than calling `axios.get/post` directly in components.
- **JavaScript spec**: Target ES2024+ (latest stable). Use modern syntax: `structuredClone`, `Promise.withResolvers`, `Array.toSorted/toReversed/findLast`, `Object.groupBy`, logical assignment operators, `at()`, etc.
- **Build tool**: electron-vite. Keep `electron.vite.config.ts` minimal. Use `import.meta.env` for environment variables in renderer code — never `process.env`.
- **Icons**: Prefer [Font Awesome Free](https://fontawesome.com/icons) icons via `@fortawesome/react-fontawesome`. Import icons individually — never import the full bundle. Always destructure the specific icon from its package:
  ```tsx
  import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
  import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
  ```
  Do not do `import * as icons from '@fortawesome/free-solid-svg-icons'` or import a collection object.
