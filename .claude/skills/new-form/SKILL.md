---
name: new-form
description: Build a form with react-hook-form + Zod + shadcn Form primitives, wired to apiRequest for submit. Use whenever the user needs to fill out and submit a form (profile, settings, admin write, claim submit).
---

# Add a form

One canonical pattern. The full recipe lives at [.claude/components/forms.md](../../components/forms.md) — this skill is the action-oriented version.

## Steps

1. **Define the Zod schema** colocated with the form. Match the backend's DTO exactly (the backend rejects unknown keys via `.strict()`):

   ```ts
   import { z } from 'zod';
   const schema = z.object({
     display_name: z.string().trim().min(1, 'required').max(120),
     job_title: z.string().trim().max(120).optional(),
   });
   type FormValues = z.infer<typeof schema>;
   ```

2. **Create the form** with `useForm + zodResolver`:

   ```ts
   import { useForm } from 'react-hook-form';
   import { zodResolver } from '@hookform/resolvers/zod';

   const form = useForm<FormValues>({
     resolver: zodResolver(schema),
     defaultValues: { display_name: '', job_title: '', ...initialFromProfile },
   });
   ```

3. **Wire submit to `apiRequest`** (and optionally invalidate cache after):

   ```ts
   import { apiRequest } from '@/lib/query-client';
   import { useSWRConfig } from 'swr';
   import { qk } from '@/lib/query-keys';
   import { toast } from 'sonner';

   const { mutate } = useSWRConfig();
   async function onSubmit(values: FormValues) {
     try {
       await apiRequest('PATCH', '/api/me', values);
       void mutate(qk.profile());
       toast.success('Saved');
     } catch (err) {
       toast.error((err as Error).message);
     }
   }
   ```

4. **Render with shadcn `<Form>` primitives:**

   ```tsx
   import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
   import { Input } from '@/components/ui/input';
   import { Button } from '@/components/ui/button';

   <Form {...form}>
     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
       <FormField
         control={form.control}
         name="display_name"
         render={({ field }) => (
           <FormItem>
             <FormLabel>Display name</FormLabel>
             <FormControl><Input {...field} /></FormControl>
             <FormMessage />
           </FormItem>
         )}
       />
       <Button type="submit" disabled={form.formState.isSubmitting}>
         {form.formState.isSubmitting ? 'Saving…' : 'Save'}
       </Button>
     </form>
   </Form>
   ```

   `<FormMessage />` auto-renders the Zod error for that field. No manual error wiring needed.

## Variations

- **Multi-step:** use `form.watch()` to drive a wizard; only validate the current step's fields with `form.trigger(['fieldA', 'fieldB'])`.
- **Dialog/Sheet:** call `form.reset()` in `onOpenChange` to clear stale values when reopened.
- **Server-side validation errors:** map `body.error.details.issues[].path[0]` to `form.setError(field, { message })`. See [forms.md](../../components/forms.md#when-you-need-server-side-validation-errors).

## Server contract

- Backend DTOs are `.strict()` — extra keys → 400 `VALIDATION_ERROR`.
- Field names must match the DTO. Check [server/.claude/conventions.md](../../../../server/.claude/conventions.md) and the relevant module's `*.dto.ts`.

## Don'ts

- Don't use uncontrolled `<input>` with `document.querySelector` — RHF owns state.
- Don't add server-action submit handlers (`use server`) — not wired in this codebase.
- Don't bypass `<FormMessage />` to render errors inline — accessibility lives in the wrapper.
- Don't `JSON.parse` the schema response — `apiRequest` does it for you. Actually wait — `apiRequest` returns a `Response`, not parsed JSON. Call `.json()` if you need the body.

## Reference forms

- Profile patch: [app/(app)/settings/page.tsx](<../../../app/(app)/settings/page.tsx>) (ProfileTab)
- Claim submit: large multi-section form — see the claims module on the server side first.
- Login form: [app/(auth)/login/page.tsx](<../../../app/(auth)/login/page.tsx>) — but that one talks directly to Supabase JS, not our backend.

## See also

- [.claude/components/forms.md](../../components/forms.md)
- [.claude/conventions.md](../../conventions.md) — forms section.
