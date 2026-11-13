-- Ejecutar una vez, después de esquema.sql y de subir los archivos indicados.
begin;

insert into public.contenido_sitio (clave, texto) values
  ('inicio.titulo', 'Diagnóstico de precisión y cuidado experto para tu mascota.'),
  ('inicio.descripcion', 'Estudios ecográficos veterinarios de alta resolución para un diagnóstico oportuno, certero y no invasivo. Respuestas claras cuando más lo necesitas.'),
  ('inicio.imagen_titulo', 'Resultados Inmediatos'),
  ('inicio.imagen_subtitulo', 'Informe clínico completo en cada consulta'),
  ('inicio.testimonios_antetitulo', 'Confianza Demostrada'),
  ('inicio.testimonios_titulo', 'Testimonios de Pacientes'),
  ('inicio.testimonios_descripcion', 'La tranquilidad de quienes confían en nuestro diagnóstico nos avala día a día.'),
  ('inicio.testimonio_1_texto', 'Llevé a mi perrita por un dolor abdominal persistente. La atención fue impecable y el diagnóstico ecográfico permitió a su veterinario operar a tiempo. Totalmente recomendados.'),
  ('inicio.testimonio_1_autor', 'María Contreras'),
  ('inicio.testimonio_1_contexto', 'Tutora de "Luna" (Golden Retriever)'),
  ('inicio.testimonio_2_texto', 'Excelente nivel profesional y gran paciencia con mi gato, que suele ser muy nervioso en consultas clínicas. El informe me lo entregaron de inmediato.'),
  ('inicio.testimonio_2_autor', 'Dr. Roberto Rivas'),
  ('inicio.testimonio_2_contexto', 'Veterinario Remitente'),
  ('inicio.testimonio_3_texto', 'El monitoreo ecográfico de la gestación de mi mascota fue una experiencia muy emocionante y súper clara. Explicaron detalladamente cada órgano.'),
  ('inicio.testimonio_3_autor', 'Andrea Gómez'),
  ('inicio.testimonio_3_contexto', 'Tutora de "Bella"'),
  ('equipo.introduccion', 'En Imagenología Veterinaria entendemos que detrás de cada estudio hay un miembro más de la familia. Por eso trabajamos con equipos de vanguardia y un enfoque humano, ofreciendo diagnósticos confiables que ayudan a los médicos veterinarios a tomar mejores decisiones.'),
  ('equipo.mision', 'Ofrecer diagnósticos ecográficos veterinarios precisos y oportunos, con tecnología de alta resolución y un trato cálido que respete el bienestar de cada paciente.'),
  ('equipo.vision', 'Ser el centro de referencia en diagnóstico por imagen veterinaria de la región, reconocido por su excelencia técnica y confianza.'),
  ('equipo.valores', 'Precisión, empatía, confianza, innovación y compromiso con la salud animal.'),
  ('servicios.introduccion', 'Diagnóstico por imagen veterinario de alta precisión.'),
  ('servicios.requisitos_intro', 'Para asegurar la mejor calidad de imagen y la comodidad del paciente, solicitamos lo siguiente:'),
  ('contacto.introduccion', 'Para programar una cita o solicitar más información, contáctanos.'),
  ('contacto.domicilio', 'El estudio se realiza a tu domicilio. Está pensado para clínicas que no tienen equipo de ultrasonido propio.'),
  ('footer.descripcion', 'Servicio especializado en ultrasonido y diagnóstico por imagen veterinaria de alta precisión.'),
  ('footer.lema', 'Diagnóstico Ecográfico Especializado');

insert into public.contenido_sitio (clave, imagen_ruta) values
  ('inicio.imagen', 'inicio/diagnostico-por-imagen.webp'),
  ('equipo.imagen', 'equipo/owie.jpg'),
  ('sitio.logo', 'sitio/logo-imagenologia-veterinaria.png');

insert into public.equipo (nombre, cargo, descripcion, orden) values
  ('Juan Antonio Duarte', 'Especialista en Ecografía Veterinaria',
   'Con más de 15 años de experiencia en el diagnóstico por imagen veterinaria.', 1);

insert into public.datos_contacto (telefono, correo, horarios) values
  ('+503 7069 1122', 'ecografia@imagenologiaveterinaria.com',
   array['Lunes: 8:30 AM - 1:00 PM', 'Martes: de 8:30 AM - 5:00 PM', 'Sábados: 2:00 PM - 6:00 PM']);

insert into public.servicios (nombre, descripcion, detalles, precio, orden) values
  ('Ultrasonido abdominal', 'Evaluación de hígado, riñones, vejiga y más órganos.',
   array['Resultado el mismo día', 'Informe incluido'], 35, 1),
  ('Ecografía gestacional', 'Confirmación y seguimiento de gestación.',
   array['Conteo de cachorros', 'Control de viabilidad'], 25, 2),
  ('Ultrasonido de urgencia', 'Evaluación ecográfica rápida en el momento para detectar problemas urgentes',
   array['POCUS abdominal', 'POCUS torácico', 'POCUS cardíaco y vascular'], 25, 3);

insert into public.requisitos_servicio (servicio_id, texto, orden)
select s.id, r.texto, r.orden
from public.servicios s
cross join lateral (values
  (1, case when s.nombre = 'Ultrasonido abdominal'
    then 'Ayuno de 8-12 horas (agua permitida).'
    else 'Ayuno: consulte con nosotros.' end),
  (2, 'Vejiga llena: en algunos casos se requiere para una mejor visualización. Siga las instrucciones proporcionadas al programar la cita.'),
  (3, 'Afeitado: es posible que sea necesario afeitar el área a examinar para obtener una mejor calidad de imagen. Esto se realizará en la clínica antes del estudio.'),
  (4, 'Historial clínico: al programar la cita, proporcione los exámenes realizados, los medicamentos y las condiciones preexistentes del paciente.')
) as r(orden, texto)
where s.nombre in ('Ultrasonido abdominal', 'Ecografía gestacional', 'Ultrasonido de urgencia');

commit;
