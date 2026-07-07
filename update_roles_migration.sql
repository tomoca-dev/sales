-- Run this only if you previously installed a schema that allowed Sales Rep/Admin only.
alter table public.profiles alter column role set default 'Customer';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (
  role in ('Sales Rep','Admin','Payment Collector','Factory/Ops','Marketing','Management','Customer','Driver')
);
