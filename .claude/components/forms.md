# Forms

react-hook-form + Zod + shadcn `<Form>` wrappers. One canonical recipe; don't invent variants.

## The recipe

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/query-client';
import { toast } from 'sonner';

const schema = z.object({
  display_name: z.string().trim().min(1, 'required').max(120),
  job_title: z.string().trim().max(120).optional(),
});
type FormValues = z.infer<typeof schema>;

export function ProfileForm({ defaults }: { defaults: Partial<FormValues> }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: '', job_title: '', ...defaults },
  });

  async function onSubmit(values: FormValues) {
    try {
      await apiRequest('PATCH', '/api/me', values);
      toast.success('Saved');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="job_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </Form>
  );
}
```

## Why this shape

- **Zod schema colocated** with the form component. The inferred `FormValues` type is single-source-of-truth.
- **`<Form>` from [components/ui/form.tsx](../../components/ui/form.tsx)** wraps the RHF Provider so `<FormField>` children can `useFormContext`.
- **`<FormMessage />` renders the Zod error** for that field automatically.
- **`apiRequest` for the submit call** — preserves 401-retry; pair with `useSWRConfig().mutate(key)` for invalidation.

## Variations

### When you need loading state in multiple places

`form.formState.isSubmitting` is already true while the `onSubmit` promise is in flight — read it from any descendant via `useFormContext()`. If you need the state outside the form's React tree, lift it into local `useState` around the `apiRequest` call (see [.claude/skills/new-swr-mutation/SKILL.md](../skills/new-swr-mutation/SKILL.md)).

### When the form is in a Dialog/Sheet

Same recipe. Use `form.reset()` in the dialog's `onOpenChange` handler to clear stale values when reopened.

### When you need server-side validation errors

Backend returns 400 with `{ error: { code: 'VALIDATION_ERROR', message, details: { issues: ZodIssue[] } } }`. Map `issues[].path[0]` to RHF's `form.setError(field, { message })`:

```ts
catch (err) {
  const body = await (err as Response).json?.();
  if (body?.error?.code === 'VALIDATION_ERROR') {
    body.error.details.issues.forEach((iss: any) => {
      form.setError(iss.path[0], { message: iss.message });
    });
  }
}
```

Note: `apiRequest` throws a plain `Error` with `${status}: ${text}`, not a Response. You'd need to widen the throw signature or use `fetch` directly for this pattern.

## Don't do this

- Don't use uncontrolled inputs (`document.querySelector` style) — RHF owns form state.
- Don't validate inside the submit handler — let Zod do it via `zodResolver`.
- Don't add server-action submit handlers — this codebase doesn't use them.
- Don't import RHF without `<Form>` wrapper — you lose accessibility (aria-describedby on errors etc).
