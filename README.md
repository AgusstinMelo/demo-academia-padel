# ÉLITE PÁDEL · Plataforma web + PWA (demo)

Demo funcional de una plataforma para una academia de pádel en Medellín: web pública para captar alumnos y una app instalable (PWA) con tres roles —alumno, profesor y administrador— para reservar clases, comprar packs con créditos, confirmar pagos y recibir notificaciones.

Vite + React + TypeScript + Tailwind CSS, React Router, Motion, lucide-react, date-fns, Recharts y vite-plugin-pwa. Sin backend: los datos son simulados y se guardan en el navegador para que las acciones se mantengan durante la presentación.

## Detalles de la propuesta

Hola, mi nombre es Agustín, soy desarrollador web especializado en sitios y aplicaciones a medida. Para que veas desde el primer momento cómo podría quedar la plataforma de la academia, preparé una demo funcional: [enlace a la demo].

En la demo puedes recorrer todo el sistema:

- **Web pública:** presenta la academia con un diseño deportivo moderno, programas por nivel, profesores, packs con precio por clase y ahorro, testimonios, preguntas frecuentes, ubicación y botón de WhatsApp para la clase de prueba.
- **App del alumno:** créditos disponibles con cuenta regresiva de vencimiento, calendario semanal con cupos en tiempo real, reserva y cancelación según la política de la academia, y compra de packs por transferencia, Nequi (con comprobante) o pasarela de pago.
- **App del profesor:** agenda del día y de la semana con los alumnos inscritos, asistencia y perfil de cada alumno.
- **Panel de administración:** ingresos, ocupación y packs por vencer en gráficos, aprobación de comprobantes con un clic (el pack se activa y el alumno recibe el aviso), usuarios y créditos, horarios con detección de choques de cancha o profesor, reportes en Excel y envío de novedades a todos o a un segmento.
- **App instalable con notificaciones:** se instala en el celular sin pasar por la tienda, funciona sin conexión y avisa de reservas, recordatorios de clase, pagos y vencimientos.

Está hecha con tecnologías actuales (React y TypeScript), las reglas del negocio (créditos, vencimientos a 60 días y reservas sin duplicados) están probadas con tests automáticos y la base de datos ya está diseñada para Supabase, con varias sedes y una futura tienda online. Todo se adapta a la marca, los precios, los horarios y las políticas de la academia.

En mi perfil vas a encontrar otros trabajos destacados. Puedo entregarte el proyecto en 14 días, con hasta 2 rondas de revisiones, y te entrego el código completo y los accesos a todo. ¡Estamos en contacto!

## Cómo correrla

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # tests de la capa de dominio y de los datos de ejemplo (Vitest)
npm run build     # chequeo de tipos (app + service worker) y build de producción en dist/
npm run preview   # sirve dist/ (la PWA y el modo sin conexión solo funcionan en el build)
```

### Recorrido sugerido para presentar

1. **Web pública** (`/`): hero, packs y sección «Instala la app».
2. **Ingresar → Entrar como alumno.** Inicio: créditos y vencimiento. **Reservar** una clase; luego intenta una marcada **«Último cupo»**: la primera vez otro alumno «se adelanta» y el sistema lo resuelve sin descontar créditos (demo de reservas simultáneas).
3. **Packs y pagos → Pack 4 → Nequi**, subir cualquier imagen como comprobante: queda pendiente.
4. Cambiar a **Admin** con el selector de la barra superior → **Pagos → Aprobar**. Volver a **Alumno**: llegó la notificación y el pack está activo.
5. **Profesor**: agenda y asistencia.
6. **Simular paso del tiempo** (ícono de reloj) → **+3 días**: aparece la alerta de vencimiento y los recordatorios.
7. **Ajustes → Enviar notificación de prueba**: notificación real del sistema si se da permiso.

El botón **Restablecer demo** (dentro de «Simular paso del tiempo») vuelve todo al estado inicial.

## Desplegar en Vercel

1. Sube el proyecto a un repositorio de GitHub.
2. En [vercel.com/new](https://vercel.com/new) importa el repositorio y pulsa **Deploy**. Vercel detecta Vite (build `npm run build`, salida `dist`). `vercel.json` ya redirige las rutas a la app y excluye el service worker, el manifest y los archivos estáticos.
3. Cambia `business.url` en `src/config.ts` y las URLs de `public/robots.txt` y `public/sitemap.xml` por el dominio final.

> La PWA necesita HTTPS (Vercel lo da por defecto). Para probar la instalación en un celular, abre el link de Vercel en Chrome (Android) o Safari (iPhone).

## Configuración del negocio

Todo está en **`src/config.ts`**:

| Bloque | Qué contiene |
| --- | --- |
| `business` | Nombre, URL, zona horaria (America/Bogota), moneda, **WhatsApp**, teléfono, dirección, horarios y texto del banner de demo |
| `rules` | **Días de vencimiento** de los packs (60), **política de cancelación** (12 h), aviso de vencimiento (7 días), recordatorios (24 h y 2 h), ventana de reserva (14 días), duración y cupo por defecto |
| `packs` | Clase suelta, pack 4 y pack 8: clases, **precio en COP** y beneficios |
| `paymentMethods` | Datos de transferencia y Nequi que ve el alumno |
| `weeklyTemplate` | Horario semanal de clases (día, hora, nivel, cancha, profesor) con el que se genera la agenda de la demo |
| `site` | Textos de la web pública: hero, cifras, programas, profesores, cómo funciona, testimonios, FAQ y fotos |

Colores y tipografías: variables en `src/styles/tokens.css` (modo oscuro por defecto y modo claro en la app). Las fuentes (Archivo y Manrope) se sirven desde el propio sitio.

## Arquitectura

```
src/
  config.ts               Negocio y contenido
  domain/                 Reglas puras + tests (Vitest)
    credits.ts            Estado del pack, vencimiento a 60 días, qué pack se consume primero
    booking.ts            Validación de reservas (créditos, cupo, duplicados, choques), cancelación, conflictos de agenda
    notifications.ts      Recordatorios de clase y avisos de vencimiento sin duplicados
    time.ts               Fechas en America/Bogota
  data/
    types.ts              Interfaz DataSource (getSlots, createBooking, cancelBooking, buyPack, confirmPayment, getNotifications…)
    mockDataSource.ts     Implementación de la demo (localStorage, latencia 300–500 ms)
    supabaseDataSource.ts Misma interfaz con los TODO de cada consulta
    index.ts              Elige la fuente con VITE_DATA_SOURCE=mock|supabase
  app/                    App: alumno, profesor y admin
  public/                 Web pública y página de compatibilidad
  pwa/pwa.ts              Instalación, permisos y notificaciones (con el flujo real de Web Push documentado)
  sw.ts                   Service worker: caché, offline, push y clic en notificaciones
supabase/schema.sql       Modelo de datos propuesto
```

Las pantallas nunca leen datos directamente: usan la `DataSource` a través de `useQuery`, que vuelve a pedir los datos cuando algo cambia (y entre pestañas, simulando el tiempo real).

## Esquema de base de datos

`supabase/schema.sql` está validado contra Postgres. Resumen:

| Tabla | Para qué |
| --- | --- |
| `clubs`, `courts` | Sedes y canchas. Las tablas principales llevan `club_id` (multi-sede) |
| `profiles`, `coaches` | Usuario de Supabase Auth con su **rol** (alumno, profesor, admin), nivel y sede; datos extra del profesor |
| `class_slots` | Clases: cancha, profesor, inicio, duración, cupo y nivel. **Restricciones de exclusión** impiden dos clases a la vez en la misma cancha o con el mismo profesor |
| `bookings` | Reservas. **Índice único** (clase, alumno) para reservas activas: imposible reservar dos veces |
| `packs`, `user_packs` | Catálogo y packs comprados con **créditos restantes** y **vencimiento** |
| `payments` | Pagos con método, estado, comprobante (Storage privado) y respuesta de la pasarela |
| `credit_adjustments` | Auditoría de ajustes manuales de créditos |
| `notifications`, `notification_prefs` | Centro de notificaciones (con `dedupe_key` para no repetir recordatorios) y preferencias |
| `push_subscriptions` | Una suscripción Web Push por dispositivo |

Funciones: `book_class` (valida y reserva de forma atómica, con bloqueo de fila para el último cupo), `cancel_booking` (devuelve el crédito según la política) y `confirm_payment` (activa el pack y notifica). Las políticas **RLS** separan roles: cada alumno ve lo suyo, el profesor sus clases y alumnos, el admin todo lo de su sede. Al final del archivo están comentadas las tareas de **pg_cron** para recordatorios y vencimientos.

## Notificaciones y compatibilidad

En la demo, las notificaciones se generan con los eventos simulados y aparecen en el centro de notificaciones de la app. Si el usuario da permiso, también se muestran como **notificaciones del sistema** (Notification API vía service worker).

En producción el flujo es **Web Push** (documentado en `src/pwa/pwa.ts` y ya preparado en `src/sw.ts`): suscripción con claves VAPID → tabla `push_subscriptions` → Edge Function de Supabase que envía el push, disparada por los cambios en la base y por pg_cron.

| Función | Android | iPhone / iPad |
| --- | --- | --- |
| Usar la app en el navegador | Sí | Sí |
| Instalar en la pantalla de inicio | Sí (botón «Instalar app») | Manual: Compartir → Agregar a inicio |
| Push sin instalar | Sí, desde Chrome | No |
| Push con la app instalada | Sí | Solo iOS/iPadOS 16.4+, pidiendo el permiso tras un toque |
| Funcionar sin conexión | Sí | Sí |

Limitaciones: el sistema puede retrasar o no entregar notificaciones si limita la app (ahorro de batería, modo concentración), y los contadores en el ícono no están en todas las versiones. Por eso todo aviso queda también dentro de la app. La misma tabla está en la página `/compatibilidad`.

## Hoja de ruta

| Etapa | Alcance |
| --- | --- |
| **1. Web + gestión** | Supabase (esquema, Auth con correo, RLS), implementar `supabaseDataSource.ts`, web pública, app de alumno/profesor/admin, pagos por transferencia y Nequi con comprobante en Storage |
| **2. PWA + push** | App instalable (ya incluida), claves VAPID, tabla `push_subscriptions`, Edge Function `send-push`, recordatorios y vencimientos con pg_cron |
| **3. Pasarela de pago** | Wompi o Mercado Pago: checkout, webhook firmado que activa el pack al instante, conciliación en reportes |
| **4. Multi-sede y tienda** | Activar más sedes (el modelo ya tiene `club_id`), packs por sede, tienda online (productos, stock, pedidos) con la misma pasarela |

## Costos recurrentes (a completar)

Independientes del desarrollo. Valores orientativos a confirmar con cada proveedor según el uso real.

| Concepto | Proveedor sugerido | Costo mensual |
| --- | --- | --- |
| Hosting web y PWA | Vercel | [completar] |
| Base de datos, Auth, Storage y Edge Functions | Supabase | [completar] |
| Dominio (.com / .co) | [registrador] | [completar, pago anual] |
| Pasarela de pago | Wompi / Mercado Pago | [completar: % + valor fijo por transacción] |
| Correo transaccional (opcional) | Resend / SendGrid | [completar] |
| **Total estimado** | | **[completar]** |

> Demo de propuesta: nombres, precios, testimonios y datos son de ejemplo, y los pagos son simulados. Fotos de Unsplash.
