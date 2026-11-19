-- Event budgets: an expected and a final amount per cost, and whether the
-- cost is fixed or variable. Needs 20261113140000_community.sql. Safe to
-- run again: the existing rows are converted on the first run only.
--
--   cost_type        fixed: the same whatever the turnout (venue, prizes,
--                    tools); variable: grows with headcount (food, swag,
--                    travel)
--   expected_amount  the estimate made while planning
--   amount           the final cost, once the bill is known (the same
--                    column as before, so "spent" on the budget page still
--                    adds up)
--
-- Until now a planned cost kept its estimate in `amount`. Those estimates
-- move to `expected_amount` and `amount` is cleared, since nothing final is
-- known for them yet. Costs already owed or paid keep their amount as the
-- final one and get it as their expected one too. Food, swag and travel
-- start as variable, everything else as fixed; the event page can change
-- any of them.

alter table public.community_expenses
  add column if not exists cost_type text not null default 'fixed',
  add column if not exists expected_amount numeric(12, 2);

do $$
begin
  -- The cost type's check doubles as the "already converted" marker.
  if exists (
    select 1 from pg_constraint
    where conname = 'community_expenses_cost_type_check'
  ) then
    return;
  end if;

  alter table public.community_expenses
    add constraint community_expenses_cost_type_check
    check (cost_type in ('fixed', 'variable'));
  alter table public.community_expenses
    add constraint community_expenses_expected_amount_check
    check (expected_amount is null or expected_amount >= 0);

  update public.community_expenses
  set cost_type = 'variable'
  where category in ('food', 'swag', 'travel');

  update public.community_expenses
  set
    expected_amount = amount,
    amount = case when status = 'planned' then null else amount end
  where amount is not null;
end $$;
