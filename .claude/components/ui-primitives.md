# UI Primitives (shadcn/ui)

What's available in [components/ui/](../../components/ui/). Sourced from shadcn/ui's CLI generator — each primitive wraps a Radix primitive with project-specific Tailwind classes and CVA variants.

## Available primitives

| Primitive | Radix base | Notes |
|---|---|---|
| `<Button>` | — | CVA variants: default, destructive, outline, secondary, ghost, link |
| `<Input>` | — | text input with focus ring |
| `<Label>` | `@radix-ui/react-label` | form labels |
| `<Form>` family | — | `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>` — wraps react-hook-form |
| `<Card>`, `<CardHeader>`, etc. | — | content containers |
| `<Dialog>` | `@radix-ui/react-dialog` | modals |
| `<AlertDialog>` | `@radix-ui/react-alert-dialog` | destructive-action confirmations |
| `<Sheet>` | `@radix-ui/react-dialog` | slide-over drawers |
| `<Popover>` | `@radix-ui/react-popover` | small floating panels |
| `<Tooltip>` | `@radix-ui/react-tooltip` | global TooltipProvider already mounted |
| `<DropdownMenu>` | `@radix-ui/react-dropdown-menu` | menus + submenus |
| `<NavigationMenu>` | `@radix-ui/react-navigation-menu` | not heavily used; sidebar is custom |
| `<Tabs>` | `@radix-ui/react-tabs` | settings / admin tabs |
| `<Select>` | `@radix-ui/react-select` | dropdown picker |
| `<Checkbox>` | `@radix-ui/react-checkbox` | + label component for labelled state |
| `<RadioGroup>` | `@radix-ui/react-radio-group` | |
| `<Switch>` | `@radix-ui/react-switch` | iOS-style toggle |
| `<Slider>` | `@radix-ui/react-slider` | |
| `<Avatar>` | `@radix-ui/react-avatar` | |
| `<Progress>` | `@radix-ui/react-progress` | linear progress bar |
| `<ScrollArea>` | `@radix-ui/react-scroll-area` | custom scrollbars on overflow regions |
| `<Separator>` | `@radix-ui/react-separator` | horizontal/vertical divider |
| `<Accordion>` | `@radix-ui/react-accordion` | collapsible sections |
| `<Toast>` | `@radix-ui/react-toast` | not heavily used; `sonner` is the primary toaster |
| `<Skeleton>` | — | shimmer loading placeholders |
| `<Table>` family | — | `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableCell>`, etc. |
| `<Badge>` | — | small status pills (CVA variants: default, secondary, destructive, outline, success) |
| `<Textarea>` | — | multi-line input |
| `<Page>`, `<PageHeader>` | — | layout primitives for page chrome |

## Variants via CVA

`class-variance-authority` defines variant maps. Example from `<Button>`:

```ts
const buttonVariants = cva(
  'inline-flex items-center justify-center …',
  {
    variants: {
      variant: { default: '…', destructive: '…', outline: '…', ghost: '…' },
      size: { default: 'h-10 px-4 py-2', sm: 'h-9 px-3', icon: 'h-10 w-10' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
```

Use the typed `VariantProps` for component props. Don't override variants ad-hoc — extend the cva config.

## Class merging

`cn()` in [lib/utils.ts](../../lib/utils.ts) merges class strings via `clsx + tailwind-merge`. Use it whenever passing `className` props that should compose with the component's defaults:

```tsx
<Button className={cn('w-full', isPrimary && 'bg-primary')} />
```

## When to add a new primitive

Run `npx shadcn add <component>` — generates a fresh file in `components/ui/<component>.tsx` you can customize. Don't import directly from `@radix-ui/*` in a page; always wrap via shadcn so variant logic lives in one place.
