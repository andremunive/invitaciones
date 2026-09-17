# CLAUDE.md

Contexto vivo del proyecto para Claude Code. Actualizar cada vez que cambien requerimientos, decisiones o arquitectura.

## 1. Resumen del proyecto

Aplicación web para gestionar las invitaciones al **cumpleaños de Ruby**. Consta de dos partes:

1. **Panel administrativo (privado)**: para registrar invitados, generar invitaciones con nombre personalizado, obtener el link compartible y ver el estado de confirmación (RSVP) de cada invitado.
2. **Página pública de invitación**: plantilla única a la que se accede mediante un link personalizado por invitado. Muestra los detalles del evento (incluida la ubicación) y permite confirmar asistencia. La confirmación queda registrada en la base de datos y se refleja en el panel.

El proyecto es de uso personal / familiar; no requiere multi-tenant ni escala pública.

## 2. Stack

- **Frontend**: Angular 18 (standalone components, **SPA cliente-only** — SSR desactivado). Ver [package.json](package.json). Estilos con **Tailwind CSS v3** — configurado en [tailwind.config.js](tailwind.config.js) y directivas en [src/styles.scss](src/styles.scss).
- **Backend / Datos**: [Supabase](https://supabase.com/) (PostgreSQL + API REST/JS SDK). Toda la persistencia (invitados, respuestas) vive en Supabase.
  - Proyecto: **`invitaciones-ruby`** — ref `dzwhdqzpfmekjblynfba`, org `xfwljjjwexwmhepeevbj`, región `us-east-1`.
  - URL API: `https://dzwhdqzpfmekjblynfba.supabase.co`.
  - Cuenta: `juam98tores@gmail.com` (accedida vía MCP). La `anon key` / `publishable key` se cargará en `src/environments/environment.ts` cuando conectemos el cliente.
- **Autenticación del panel**: usuario y clave **hardcodeados en el código** (no se usa Supabase Auth). Es aceptable porque solo lo usará el dueño del evento; se protege vía [authGuard](src/app/core/auth/auth.guard.ts) sobre las rutas `/admin/*`. Credenciales actuales en [environment.ts](src/environments/environment.ts): `admin` / `ruby2026`. Sesión persistida en `sessionStorage` (se cierra al cerrar la pestaña).
- **Hosting**: **Netlify** como SPA estática. Config en [netlify.toml](netlify.toml) (Node 20, `npm run build`, publish `dist/invitaciones`, redirect `/* → /index.html 200` para deep links). Deploy vía GitHub → Netlify (autobuild en cada push).

## 3. Funcionalidades

### 3.1 Panel administrativo (`/admin`)

- Login con usuario/clave hardcodeados.
- Tabla de invitados con columnas: nombre, fecha de creación, estado de RSVP (`pendiente` / `confirmado` / `rechazado`), link de invitación (copiar / compartir).
- Botón **"Registrar invitado"**: crea un nuevo invitado (nombre + campos opcionales que definamos, ej. cantidad de acompañantes).
- Botón **"Generar invitación"** por fila: crea (o recupera) el token único del invitado y genera la URL personalizada tipo `https://<host>/invitacion/<token>`.
- Botones de compartir a redes sociales (WhatsApp mínimo; Facebook/Instagram/X opcionales) precargando texto + link.
- Vista/columna con la respuesta del invitado (confirmado o no, fecha de respuesta, mensaje opcional si lo agregamos).

### 3.2 Invitación pública (`/invitacion/:token`)

- Plantilla visual del evento, común a todos los invitados. Lo **único que cambia por invitado es el nombre** (y el estado RSVP guardado).
- Muestra: nombre del invitado, saludo personalizado, detalles del evento (fecha, hora, lugar), **ubicación** (mapa embebido o link a Google Maps), y CTA para confirmar asistencia.
- Formulario / botones de RSVP: **Confirmar** / **No podré asistir** (posiblemente + mensaje corto). La respuesta se guarda en Supabase asociada al token del invitado.
- Debe ser mobile-first (se comparte por WhatsApp).

## 4. Modelo de datos (borrador)

Tabla `public.guests` en Supabase (migración `create_guests_table` ya aplicada):

| Columna                | Tipo                                | Notas                                                                       |
|------------------------|-------------------------------------|-----------------------------------------------------------------------------|
| `id`                   | `uuid` PK default `gen_random_uuid()` | Generado por Supabase.                                                    |
| `name`                 | `text` not null                     | Nombre del invitado tal como se mostrará en la invitación.                  |
| `token`                | `text` unique not null              | Slug corto (12 chars hex) generado client-side con `crypto.randomUUID`.     |
| `seats`                | `int` not null default `1` check `>= 1` | Cupos asignados **contando al invitado**.                               |
| `invitation_opened`    | `bool` not null default `false`     | Se marca `true` la primera vez que se abre la invitación pública.           |
| `invitation_opened_at` | `timestamptz` nullable              | Fecha de primer render.                                                     |
| `rsvp_status`          | `text` not null default `'pending'` check `in (pending, confirmed, declined)` | Estado de la confirmación.                          |
| `responded_at`         | `timestamptz` nullable              | Cuándo respondió.                                                           |
| `created_at`           | `timestamptz` not null default `now()` |                                                                          |

Índices auxiliares: `guests_token_idx` (búsqueda por token para la vista pública), `guests_rsvp_status_idx`.

**RLS (Row Level Security)**: habilitado. Estrategia elegida: **anon abierto** — políticas SELECT/INSERT/UPDATE/DELETE para el rol `anon` sin filtro. Es pragmático para un evento familiar; el trade-off es que quien inspeccione el bundle JS puede listar toda la tabla. Si el proyecto se hace público más adelante habría que endurecerlo (ver §7 histórico).

## 5. Estructura de rutas prevista

- `/` → redirige a `/admin` o muestra landing simple.
- `/admin/login` → formulario de login (usuario/clave hardcodeados).
- `/admin` → tabla de invitados + acciones (protegida por `AuthGuard`).
- `/invitacion/:token` → invitación pública.
- `**` → 404.

## 6. Estado actual del código

- [x] Scaffold Angular 18 + Tailwind v3 configurado.
- [x] Login del panel (`/admin/login`) con credenciales hardcodeadas en `environment.ts`, sesión en `sessionStorage`. Componentes: [LoginComponent](src/app/admin/login/login.component.ts), [AuthService](src/app/core/auth/auth.service.ts), [authGuard](src/app/core/auth/auth.guard.ts).
- [x] Placeholder de [DashboardComponent](src/app/admin/dashboard/dashboard.component.ts) con botón "Salir".
- [x] Rutas en [app.routes.ts](src/app/app.routes.ts): `/` → `/admin` (guard) → login si no autenticado.
- [x] Tabla `guests` creada en Supabase con RLS abierto para `anon`.
- [x] Cliente `@supabase/supabase-js` conectado en [SupabaseService](src/app/core/supabase/supabase.service.ts). CRUD en [GuestsService](src/app/core/guests/guests.service.ts). Modelo en [guest.model.ts](src/app/core/guests/guest.model.ts).
- [x] UI del panel: lista de invitados (card mobile-first) + formulario "Registrar invitado" cableado al `GuestsService`. Contador de cupos confirmados. Eliminar con `confirm()`. Ver [DashboardComponent](src/app/admin/dashboard/dashboard.component.ts).
- [x] Generación/compartir del link desde el panel: token auto-generado al crear, botón "Copiar link" (Clipboard API) y "WhatsApp" (`wa.me/?text=`). URL base: `window.location.origin + /invitacion/{token}`.
- [x] Invitación pública `/invitacion/:token` (fuera del `authGuard`) con diseño **1A "Sobre que se abre · confeti"** de Claude Design ([proyecto 54355117-cf19-4932-9abd-4637a86890d1](https://claude.ai/design/p/54355117-cf19-4932-9abd-4637a86890d1)). Flujo: sobre cerrado con sello "R" pulsante → tap → animación de confeti + `rise` + contenido revelado con datos del invitado. `markOpened` se dispara al abrir el sobre (no al cargar la ruta). Sección de datos con grid: Fecha, Hora, Lugar, Cupos, Código. RSVP con 3 estados: `pending` (botones "Confirmar asistencia" + "No podré asistir"), `confirmed` (chip verde "Ya confirmaste tu asistencia"), `declined` (chip rosa "Lamentamos que no puedas acompañarnos"). Ver [InvitationComponent](src/app/invitation/invitation.component.ts).

## 7. Decisiones pendientes / por definir

Actualizar esta sección a medida que se cierren decisiones.

- [ ] **Datos del evento** en [environment.ts](src/environments/environment.ts) están con los placeholders del diseño (`hostAge: 27`, `date: 'Sábado 24 de octubre'`, `time: '8:00 PM'`, `venueName: 'Casa de los Mangos'`, `venueAddress: 'Calle 12 #45-30'`, `dressCode: 'Colores tropicales'`, `message: '...'`, `locationUrl: 'https://maps.google.com/?q=Cumpleanos+Ruby'`). **Reemplazar por los datos reales** cuando el usuario los dé.
- [ ] **Foto de Ruby**: el diseño reserva un círculo 170×170 arriba y el `<image-slot>` de Claude Design fue reemplazado por un gradiente naranja con letra "R" como placeholder. Cuando haya foto real, meter un `<img src="...">` en su lugar (círculo con `border-radius:50%`, `object-fit:cover`).
<!-- campos del invitado resueltos: name, token, seats (contando al invitado), invitation_opened(+at), rsvp_status(+responded_at) -->
<!-- credenciales del panel resuelto: admin / ruby2026 en environment.ts -->
<!-- cliente Supabase resuelto: @supabase/supabase-js instalado, publishable key en environment.ts -->
<!-- RLS resuelto: anon abierto (SELECT/INSERT/UPDATE/DELETE sin filtro) -->
- [ ] **Cómo confirma cupos el invitado**: hoy `seats` es lo asignado por el admin. ¿El invitado puede confirmar un número menor al asignado (necesitaríamos un campo `confirmed_seats`)?
<!-- hosting resuelto: Netlify SPA vía GitHub → ver netlify.toml -->
- [ ] **Diseño de la invitación**: plantilla (colores, tipografías, foto, música/animaciones si aplica).
- [ ] **i18n**: el contenido es en español (Colombia). No se contempla multi-idioma.

## 8. Comandos útiles

```bash
npm start              # ng serve → http://localhost:4200
npm run build          # build de producción
npm run watch          # build development en watch
npm test               # tests unitarios (Karma + Jasmine)
```

## 9. Convenciones

- Idioma del código: nombres de variables/funciones en inglés; textos de UI en español.
- Componentes standalone (Angular 18) — no `NgModule` salvo excepción.
- Estilos con SCSS por componente. **Mobile-first en toda la aplicación** (panel admin incluido, no solo la invitación pública): breakpoints desde móvil hacia arriba con `@media (min-width: ...)`.
- Secretos y URLs de Supabase: en `src/environments/environment.ts` (crear cuando se configure Supabase). No commitear claves reales si el repo se hace público.
