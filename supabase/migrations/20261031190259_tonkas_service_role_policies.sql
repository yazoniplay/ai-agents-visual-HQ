do $$
declare t text;
begin
  foreach t in array array['tonkas_agents','tonkas_tasks','tonkas_messages','tonkas_approvals','tonkas_activity','tonkas_settings'] loop
    execute format('drop policy if exists tonkas_service_role_all on public.%I',t);
    execute format('create policy tonkas_service_role_all on public.%I for all to service_role using (true) with check (true)',t);
  end loop;
end $$;
