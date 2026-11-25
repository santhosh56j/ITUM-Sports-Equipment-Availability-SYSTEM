# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Student email confirmation

Registration accepts only an address matching the entered student ID, such as
`24IT8678@itum.mrt.ac.lk`. In Supabase, enable **Authentication > Providers > Email > Confirm email** to require verification and send the confirmation message.

Under **Authentication > URL Configuration**, set the app's site URL and add its origin to the redirect URLs (for local development, `http://localhost:5173`). Add the production origin as well when deploying. Configure a custom SMTP provider under **Project Settings > Authentication > SMTP Settings** for reliable delivery.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
