# PayefyKYC

Portal de onboarding y KYC para empresas mexicanas que solicitan tarjetas de crédito y terminales TPV con Payefy.

## Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS v4 + shadcn/ui (New York, slate)
- **Backend:** Supabase (Auth + PostgreSQL + Storage) via `@supabase/ssr`
- **Correos:** Resend
- **i18n:** next-intl (español por defecto)
- **Formularios:** react-hook-form + Zod
- **PDFs:** pdf-lib

## Setup local

1. Clona el repositorio:
   ```bash
   git clone https://github.com/abolivarc/PayefyKYC.git
   cd PayefyKYC
   ```

2. Instala dependencias:
   ```bash
   npm install
   ```

3. Copia el archivo de variables de entorno y completa los valores:
   ```bash
   cp .env.example .env.local
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

   La app estará disponible en [http://localhost:3000](http://localhost:3000).

## Estructura del proyecto

```
app/
  (auth)/          # Rutas públicas: login, registro
  (client)/        # Portal del cliente: dashboard, solicitudes, perfil
  (admin)/         # Portal interno: revisión, kanban, auditoría
  api/             # API Routes: webhooks, notificaciones, PDF, auditoría
components/
  ui/              # Componentes shadcn/ui
  forms/           # Componentes de formularios
  documents/       # Componentes de gestión de documentos
  kanban/          # Componentes del tablero kanban
  notifications/   # Componentes de notificaciones
  audit/           # Componentes de auditoría
lib/
  supabase/        # Clientes Supabase (browser, server, middleware)
  email/           # Templates de correo con Resend
  pdf/             # Generación de PDFs con pdf-lib
  validations/     # Esquemas Zod
  i18n/            # Configuración y mensajes de next-intl
types/             # Tipos TypeScript compartidos
supabase/
  migrations/      # Migraciones de base de datos
```
