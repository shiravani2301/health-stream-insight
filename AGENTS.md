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

- Dashboard data lives only in src/data/syntheticAdmissions.ts (Admission shape); charts in src/components/dashboard derive from it so a verified CSV can replace it.
- Never name D3 SVG classes "grid": Tailwind's .grid ancestor class would match descendant selectors.
