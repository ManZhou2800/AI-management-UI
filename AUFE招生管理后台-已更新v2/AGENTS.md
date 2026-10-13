<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the administrator experience as a single route with view switching because it is an operational workspace, not public content.
- The first registered account becomes the active super admin (DB trigger); later self-registrations start inactive and must be enabled in 权限管理, because access is controlled by the super admin.
- Admin data access goes through the browser client with RLS gated on `is_staff()`; only privileged account creation uses a server function, so permissions live in the database.
- To-dos are derived from source tables (leads, bookings, events, ads) rather than stored, so finishing work at the source clears them automatically.
- Images live in a private storage bucket; the image library stores long-lived signed URLs because the workspace blocks public buckets.
- Customer follow-up lives only in 工作台 (WorkbenchView); there is no separate 意向线索 page, so advisors work from one prioritized list.
- `cloud()` falls back to a localStorage demo backend (demo.ts) when /api/cloud is unreachable, so the online preview works without the local Tencent proxy.
