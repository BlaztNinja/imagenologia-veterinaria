-- Notas de la clínica, fecha de la siguiente cita y eliminación de clientes.
-- Ejecutar una vez en el editor SQL del proyecto ya creado.

alter table public.solicitudes
  add column if not exists notas text not null default '';

alter table public.solicitudes
  drop constraint if exists solicitudes_notas_largo;

alter table public.solicitudes
  add constraint solicitudes_notas_largo check (char_length(notas) <= 2000);

alter table public.solicitudes
  add column if not exists proxima_cita date;

grant update (nombre, telefono, correo, motivo, servicio_id, estado, notas, proxima_cita)
  on public.solicitudes to authenticated;
grant delete on public.solicitudes to authenticated;

drop policy if exists eliminar_solicitudes on public.solicitudes;

create policy eliminar_solicitudes on public.solicitudes
  for delete to authenticated
  using ((select privado.es_admin()));
