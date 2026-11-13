-- Ejecutar una vez en SQL Editor si el esquema ya estaba creado.
-- Permite que el formulario público guarde una solicitud
-- y que el admin edite los datos del cliente.
begin;

grant insert (servicio_id, nombre, telefono, correo, motivo)
  on public.solicitudes to anon;

grant update (nombre, telefono, correo, motivo, servicio_id, estado)
  on public.solicitudes to authenticated;

drop policy if exists enviar_solicitud_visita on public.solicitudes;

create policy enviar_solicitud_visita on public.solicitudes
for insert to anon
with check (
  usuario_id is null
  and estado = 'nueva'
  and exists (
    select 1 from public.servicios s
    where s.id = servicio_id and s.activo
  )
);

commit;
