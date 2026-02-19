# AI Development Rules - Edilristrutturazioni

## Tech Stack
- **React 18 & TypeScript**: Core framework and type-safe development.
- **Vite**: Build tool and development server.
- **Supabase**: Backend-as-a-Service for Authentication, PostgreSQL Database, and Edge Functions.
- **Tailwind CSS**: Utility-first styling framework.
- **shadcn/ui**: Component library built on top of Radix UI primitives.
- **TanStack Query (React Query)**: Server state management and data fetching.
- **React Router v6**: Client-side routing (routes managed in `src/App.tsx`).
- **Lucide React**: Standard icon library for the application.
- **Sonner**: Toast notification system.
- **Date-fns**: Date manipulation and formatting (localized to Italian).
- **Vite PWA**: Progressive Web App support with Service Workers and Push Notifications.

## Library Usage Rules
- **Components**: Always check `src/components/ui/` for existing shadcn components before building from scratch.
- **Icons**: Use `lucide-react` exclusively. Do not import icons from other libraries.
- **Styling**: Use Tailwind CSS classes. Utilize the `cn()` utility from `src/lib/utils.ts` for conditional class merging.
- **State Management**: 
  - Use **Supabase Hooks** or **TanStack Query** for server-side data.
  - Use **Context API** for global app state (e.g., `AuthContext`, `CompanyContext`).
  - Use **Local State (`useState`)** for component-specific UI logic.
- **Backend**: All database interactions must go through the Supabase client in `src/integrations/supabase/client.ts`.
- **Notifications**: Use `toast` from `sonner` for user feedback.
- **Dates**: Use `date-fns` for all date logic. Use the `it` locale for formatting.
- **Forms**: Use `react-hook-form` with `zod` for validation when building complex forms.

## Architecture Guidelines
- **Pages**: Located in `src/pages/`.
- **Components**: Located in `src/components/`. Keep them small and focused.
- **Hooks**: Custom logic should be extracted into hooks in `src/hooks/`.
- **Types**: Define shared interfaces in `src/types/`.
- **PWA**: Service worker logic for push notifications is located in `public/sw-push.js`.