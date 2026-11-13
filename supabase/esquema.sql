begin;

create schema privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null default 'usuario' check (rol in ('usuario', 'admin'))
);

create function privado.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function privado.crear_perfil() from public, anon, authenticated;
create trigger imagenologia_crear_perfil after insert on auth.users
for each row execute function privado.crear_perfil();

insert into public.perfiles (id) select id from auth.users
on conflict (id) do nothing;

-- SECURITY INVOKER consulta únicamente el perfil propio permitido por RLS.
create function privado.es_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'admin'
  );
$$;
revoke all on function privado.es_admin() from public, anon, authenticated;
grant execute on function privado.es_admin() to authenticated;

create table public.contenido_sitio (
  clave text primary key check (btrim(clave) <> ''),
  texto text,
  imagen_ruta text,
  check ((texto is null) <> (imagen_ruta is null)),
  check (btrim(coalesce(texto, imagen_ruta)) <> '')
);

create table public.equipo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (btrim(nombre) <> ''),
  cargo text not null check (btrim(cargo) <> ''),
  descripcion text not null check (btrim(descripcion) <> ''),
  foto_ruta text check (btrim(foto_ruta) <> ''),
  orden integer not null default 0 check (orden >= 0)
);

create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (btrim(nombre) <> ''),
  descripcion text not null check (btrim(descripcion) <> ''),
  detalles text[] not null default '{}',
  precio numeric(10,2) not null check (precio >= 0 and precio <> 'NaN'),
  activo boolean not null default true,
  orden integer not null default 0 check (orden >= 0)
);

create table public.requisitos_servicio (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  texto text not null check (btrim(texto) <> ''),
  orden integer not null default 0 check (orden >= 0)
);
create index on public.requisitos_servicio (servicio_id, orden);

create table public.datos_contacto (
  id smallint primary key default 1 check (id = 1),
  telefono text not null check (btrim(telefono) <> ''),
  correo text not null check (btrim(correo) <> ''),
  horarios text[] not null check (cardinality(horarios) > 0)
);

create table public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid default auth.uid() references auth.users(id) on delete set null,
  servicio_id uuid not null references public.servicios(id) on delete restrict,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 120),
  telefono text not null check (telefono ~ '^[+0-9 ()-]{7,25}$' and char_length(regexp_replace(telefono, '[^0-9]', '', 'g')) between 7 and 15),
  correo text not null check (char_length(correo) <= 254 and correo ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  motivo text not null check (char_length(btrim(motivo)) between 1 and 2000),
  estado text not null default 'nueva' check (estado in ('nueva', 'atendida')),
  notas text not null default '' check (char_length(notas) <= 2000),
  proxima_cita date,
  creada_en timestamptz not null default now()
);
create index on public.solicitudes (usuario_id);
create index on public.solicitudes (servicio_id);

alter table public.contenido_sitio enable row level security;
revoke all on public.contenido_sitio from public, anon, authenticated;
alter table public.equipo enable row level security;
revoke all on public.equipo from public, anon, authenticated;
alter table public.servicios enable row level security;
revoke all on public.servicios from public, anon, authenticated;
alter table public.requisitos_servicio enable row level security;
revoke all on public.requisitos_servicio from public, anon, authenticated;
alter table public.datos_contacto enable row level security;
revoke all on public.datos_contacto from public, anon, authenticated;
alter table public.perfiles enable row level security;
revoke all on public.perfiles from public, anon, authenticated;
alter table public.solicitudes enable row level security;
revoke all on public.solicitudes from public, anon, authenticated;

grant select on public.contenido_sitio, public.equipo, public.servicios, public.requisitos_servicio, public.datos_contacto to anon, authenticated;
grant insert, update, delete on public.equipo, public.servicios, public.requisitos_servicio to authenticated;
grant update (texto, imagen_ruta) on public.contenido_sitio to authenticated;
grant update (telefono, correo, horarios) on public.datos_contacto to authenticated;
grant select on public.perfiles, public.solicitudes to authenticated;
grant insert (servicio_id, nombre, telefono, correo, motivo) on public.solicitudes to anon, authenticated;
grant update (nombre, telefono, correo, motivo, servicio_id, estado, notas, proxima_cita) on public.solicitudes to authenticated;
grant delete on public.solicitudes to authenticated;

create policy perfil_propio on public.perfiles for select to authenticated
using (id = (select auth.uid()));

create policy lectura_publica on public.contenido_sitio for select to anon, authenticated
using (true);
create policy administrar on public.contenido_sitio for all to authenticated
using ((select privado.es_admin())) with check ((select privado.es_admin()));

create policy lectura_publica on public.equipo for select to anon, authenticated
using (true);
create policy administrar on public.equipo for all to authenticated
using ((select privado.es_admin())) with check ((select privado.es_admin()));

create policy lectura_publica on public.servicios for select to anon, authenticated
using (activo);
create policy administrar on public.servicios for all to authenticated
using ((select privado.es_admin())) with check ((select privado.es_admin()));

create policy lectura_publica on public.requisitos_servicio for select to anon, authenticated
using (exists (select 1 from public.servicios s where s.id = servicio_id and s.activo));
create policy administrar on public.requisitos_servicio for all to authenticated
using ((select privado.es_admin())) with check ((select privado.es_admin()));

create policy lectura_publica on public.datos_contacto for select to anon, authenticated
using (true);
create policy administrar on public.datos_contacto for all to authenticated
using ((select privado.es_admin())) with check ((select privado.es_admin()));

create policy enviar_solicitud_visita on public.solicitudes for insert to anon
with check (
  usuario_id is null
  and estado = 'nueva'
  and exists (select 1 from public.servicios s where s.id = servicio_id and s.activo)
);

create policy enviar_solicitud on public.solicitudes for insert to authenticated
with check (
  usuario_id = (select auth.uid())
  and estado = 'nueva'
  and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') = 'false'
  and exists (select 1 from public.perfiles where id = usuario_id)
  and exists (select 1 from public.servicios s where s.id = servicio_id and s.activo)
);

create policy revisar_solicitudes on public.solicitudes for select to authenticated
using ((select privado.es_admin()));
create policy atender_solicitudes on public.solicitudes for update to authenticated
using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy eliminar_solicitudes on public.solicitudes for delete to authenticated
using ((select privado.es_admin()));

-- Crear el bucket público desde Storage antes de cargar los archivos.
create policy administrar_imagenes_imagenologia on storage.objects for all to authenticated
using (
  bucket_id = 'imagenologia'
  and (storage.foldername(name))[1] in ('inicio', 'equipo', 'sitio')
  and (select privado.es_admin())
)
with check (
  bucket_id = 'imagenologia'
  and (storage.foldername(name))[1] in ('inicio', 'equipo', 'sitio')
  and (select privado.es_admin())
);

commit;
