# Extraccion Entra ID y Azure DevOps desde mobile-agent

## Resumen ejecutivo

El path entregado, `/Users/dev14/Desktop/WorkProjects/Mobile agent/agentEngine`, no es un repo Git. Es un contenedor. El repo real inspeccionado esta en:

`/Users/dev14/Desktop/WorkProjects/Mobile agent/agentEngine/open-swe`

Ese repo si es Git y esta en `main...origin/main [ahead 1]`. Ya tenia cambios locales antes de esta inspeccion. No se modifico ningun archivo del repo `open-swe`.

La logica de Entra ID y Azure DevOps ya esta bastante separada del engine:

- Entra vive principalmente en `integrations/entra` y en helpers de `platform/dashboard_api`.
- Azure DevOps vive principalmente en `integrations/azure-devops`, `platform/integrations` y `packages/capability-gateway`.
- El runtime del agente solo deberia consumir identidad, scope y herramientas ya gobernadas. No deberia guardar tokens ni conocer secretos.

Punto debil del plan original: asumir que `agentEngine` era el repo. No lo es. El repo real es `agentEngine/open-swe`.

## Repo mobile-agent inspeccionado

### Stack

- Lenguaje backend: Python `>=3.11`.
- Backend/API: FastAPI, Uvicorn, LangGraph, DeepAgents, LangChain.
- Package manager backend: `uv`.
- Frontend dashboard: React 19, TypeScript, Vite, TanStack Router/Query.
- Package manager frontend: el lockfile presente es `apps/dashboard/bun.lock`; las instrucciones locales tambien usan comandos `npm` desde `apps/dashboard`.
- Integracion MCP: `langchain-mcp-adapters` y preset propio para `@azure-devops/mcp`.

### Entrypoints principales

- `langgraph.json`
  - Graph `agent`: `agent.server:get_agent`
  - Graph `scheduler`: `agent.scheduler:get_scheduler`
  - HTTP app: `agent.webapp:app`
  - Env file declarado: `.env`
- `agent/server.py`
  - Composicion principal del agente.
  - Carga herramientas por actor y scope.
- `agent/webapp.py`
  - App FastAPI expuesta por LangGraph.
- `platform/dashboard_api/agent_dashboard/routes.py`
  - Rutas del dashboard, login Entra, callback, sesion y endpoints Azure DevOps.
- `apps/dashboard/src/routes/login.tsx`
  - Pantalla de login que redirige al endpoint backend de Entra.

### Scripts relevantes

- `make dev`: `uv run langgraph dev`
- `make dev-all`: `./scripts/dev-all.sh`
- `make run`: `uv run uvicorn agent.webapp:app --reload --port 8000`
- `make test`: `uv run pytest -vvv`
- `make install`: `uv pip install -e .`
- Dashboard:
  - `dev`
  - `build`
  - `preview`
  - `test`
  - `lint`
  - `format`
  - `typecheck`

### Estructura principal

- `agent/`: entrypoints y compatibilidad historica.
- `apps/dashboard/`: UI React.
- `engine/agent-engine-core/`: nucleo neutral del agente.
- `packages/model-launcher/`: capa de modelos.
- `packages/capability-gateway/`: carga gobernada de herramientas por capability.
- `integrations/entra/`: OAuth, validacion de identidad y tokens Entra.
- `integrations/azure-devops/`: preset MCP Azure DevOps.
- `platform/dashboard_api/`: API de sesion, dashboard y endpoints de integracion.
- `platform/integrations/`: integraciones runtime fuera del engine.

## Archivos inspeccionados

### Entra/Auth

- `integrations/entra/identity_entra/oauth.py`
- `integrations/entra/identity_entra/tokens.py`
- `integrations/entra/identity_entra/encryption.py`
- `integrations/entra/identity_entra/models.py`
- `platform/dashboard_api/agent_dashboard/routes.py`
- `platform/dashboard_api/agent_dashboard/oauth.py`
- `platform/dashboard_api/agent_dashboard/entra_oauth.py`
- `platform/dashboard_api/agent_dashboard/auth_tokens.py`
- `apps/dashboard/src/lib/api.ts`
- `apps/dashboard/src/routes/login.tsx`
- `tests/test_entra_routes.py`
- `tests/test_entra_oauth.py`
- `tests/test_auth_tokens.py`
- `tests/test_dashboard_csrf.py`

### Azure DevOps

- `integrations/azure-devops/integration_azure_devops/__init__.py`
- `platform/integrations/agent_integrations/azure_devops_mcp.py`
- `platform/dashboard_api/agent_dashboard/azure_devops_api.py`
- `packages/capability-gateway/capability_gateway/adapters.py`
- `packages/capability-gateway/capability_gateway/gateway.py`
- `packages/capability-gateway/capability_gateway/registry.py`
- `agent/server.py`
- `platform/dashboard_api/agent_dashboard/workspaces.py`
- `agent/composition/developer_profiles.py`
- `tests/test_azure_devops_mcp.py`
- `tests/test_azure_devops_dashboard_api.py`
- `tests/test_actor_scope_and_seam.py`
- `tests/test_workspace_hardening.py`
- `tests/test_capability_gateway.py`

## Flujo actual de Entra ID

### Login

1. El dashboard usa `loginUrl()` en `apps/dashboard/src/lib/api.ts`.
2. La UI redirige a `/dashboard/api/entra/login`.
3. `platform/dashboard_api/agent_dashboard/routes.py` sanitiza `redirect_to`.
4. El backend genera:
   - `state`
   - `nonce`
   - PKCE `code_verifier`
   - `code_challenge`
5. El backend construye la URL de autorizacion Microsoft con `build_entra_authorize_url`.
6. Se setean cookies `httpOnly` para state y PKCE.
7. El navegador sale hacia Microsoft Entra.

### Callback

1. Microsoft vuelve a `/dashboard/api/entra/callback`.
2. El backend valida cookie de state y compara nonce con HMAC.
3. El backend valida que exista PKCE.
4. `exchange_entra_code` intercambia el authorization code por tokens.
5. `validate_entra_id_token` consulta OpenID config/JWKS y valida el ID token.
6. `enforce_entra_allowlist` valida tenant y/o dominio si estan configurados.
7. `identity_from_claims` crea la identidad interna:
   - `actor_id`: `entra:<oid>`
   - tenant desde `tid`
   - email desde `email`, `preferred_username` o `upn`
8. `upsert_auth_tokens` guarda tokens cifrados.
9. Se emite cookie de sesion `osw_session`.
10. Se limpian cookies transitorias de Entra.

### Sesion y CSRF

`platform/dashboard_api/agent_dashboard/oauth.py` maneja:

- JWT de sesion del dashboard.
- Cookie `osw_session`.
- Sanitizacion de redirects para evitar open redirects.
- Validacion same-origin para mutaciones.
- Configuracion de cookies `SameSite=None; Secure` cuando el API base URL es HTTPS; en local HTTP usa valores laxos.

## Variables de entorno identificadas

No se abrieron archivos `.env` con valores reales. Esta lista sale de codigo y ejemplos. No incluye secretos.

### Entra/Auth/Dashboard

- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET`
- `ENTRA_TENANT_ID`
- `ENTRA_AUTHORITY`
- `ENTRA_ALLOWED_TENANTS`
- `ENTRA_ALLOWED_DOMAINS`
- `TOKEN_ENCRYPTION_KEY`
- `DASHBOARD_JWT_SECRET`
- `DASHBOARD_API_BASE_URL`
- `DASHBOARD_BASE_URL`
- `DASHBOARD_ALLOWED_ORIGINS`
- `VITE_DASHBOARD_API_BASE_URL`

### Azure DevOps y workspaces

- `AZURE_DEVOPS_MCP_ORG`
- `AZURE_DEVOPS_MCP_DOMAINS`
- `AZURE_DEVOPS_MCP_TRANSPORT`
- `AZURE_DEVOPS_MCP_URL`
- `AZURE_DEVOPS_MCP_PACKAGE`
- `AZURE_DEVOPS_MCP_COMMAND`
- `AZURE_DEVOPS_MCP_AUTHENTICATION`
- `AZURE_DEVOPS_MCP_PROJECT`
- `AZURE_DEVOPS_MCP_TEAM`
- `ON_DEVPROFILE_TRYCONTROLLER_PROJECTS`
- `ON_DEVPROFILE_TRYCONTROLLER_REPOS`
- `ON_DEVPROFILE_TRYCONTROLLER_INTEGRATION_BRANCH`
- `ON_MOBILE_AGENT_INTEGRATION_BRANCH`
- `ON_MOBILE_AGENT_WORKTREE_ROOT`
- `ON_MOBILE_AGENT_ALLOW_NONAZURE_WORKSPACE`
- `ON_MOBILE_AGENT_ALLOW_DIRTY_WORKSPACE`
- `ON_MOBILE_AGENT_ALLOW_STALE_INTEGRATION`
- `WORKSPACE_DIRECTORY_PICKER_ENABLED`
- `SANDBOX_TYPE`
- `LOCAL_WORKTREE_SANDBOX_ROOT_DIR`
- `LOCAL_SANDBOX_ROOT_DIR`
- `LOCAL_WORKTREE_SANDBOX_INHERIT_ENV`

Deuda operativa: `.env.example` no documenta las variables criticas de Entra, Azure DevOps, token encryption ni dashboard session. Hoy eso deja demasiado conocimiento en codigo/tests.

## Flujo actual de Azure DevOps

### Token ADO

No se usa PAT como fuente principal en el flujo actual inspeccionado. El flujo usa Entra:

1. Entra entrega refresh token al login.
2. `identity_entra/tokens.py` guarda access token y refresh token cifrados.
3. `get_azure_devops_access_token(actor_id)` usa el refresh token Entra para pedir un access token con scope Azure DevOps.
4. El access token ADO se cachea cifrado con expiracion.
5. El token ADO se usa server-side. No se envia al frontend ni al modelo.

Scope Azure DevOps observado:

- `499b84ac-1321-427f-aa17-267ca6975798/user_impersonation`

### Herramientas MCP Azure DevOps

`integrations/azure-devops/integration_azure_devops/__init__.py` define un preset para `@azure-devops/mcp`.

Comportamiento observado:

- Transporte remoto por defecto: `streamable_http`.
- Endpoint remoto por defecto: `https://mcp.dev.azure.com/{org}`.
- Toolsets por defecto: `core,work,work-items,repositories,pipelines,test-plans,search,wiki`.
- Header read-only: `X-MCP-Readonly: true`.
- Header toolsets: `X-MCP-Toolsets`.
- Header bearer: `Authorization: Bearer <token>`, solo server-side.

Politica read-only:

- Permite nombres o marcadores de lectura como list/get/search/query/show.
- Bloquea create/update/delete/add/remove/run/queue/publish/set.
- El prompt fragment prohibe crear, actualizar, aprobar o mergear PRs; modificar work items; correr pipelines; cambiar permisos; o usar HTTP generico como bypass.

### Carga de herramientas por actor

1. `agent/server.py` resuelve `actor_id`.
2. `resolve_actor_scope(actor_id)` consulta proyectos Azure DevOps visibles para el usuario.
3. `load_tools_for(actor_id, domain_pack=..., project_scope=...)` pide herramientas al capability gateway.
4. `capability_gateway` resuelve credenciales internamente.
5. El agente recibe herramientas gobernadas, no tokens crudos.

Esta frontera es correcta. Lo que seria incorrecto es mover tokens, refresh tokens o secretos al core runtime de OpenCode.

### Endpoints dashboard Azure DevOps

`platform/dashboard_api/agent_dashboard/azure_devops_api.py` implementa REST read-only para dashboard:

- `list_projects`
- `list_repositories`
- `list_pull_requests`
- `list_work_item_state_counts`
- `list_recent_builds`
- `get_project_usage`

Rutas expuestas desde `routes.py`:

- `GET /dashboard/api/azure/projects`
- `GET /dashboard/api/azure/repos`
- `GET /dashboard/api/azure/pull-requests`
- `GET /dashboard/api/azure/usage`

Aunque hay POSTs internos hacia Azure DevOps para WIQL y `workitemsbatch`, el uso es de consulta. No se observaron writes persistentes de Azure DevOps en esa capa.

### Workspaces Azure DevOps

`platform/dashboard_api/agent_dashboard/workspaces.py` endurece origen de repos:

- Acepta por defecto remotos Azure DevOps.
- Reconoce `dev.azure.com`, `ssh.dev.azure.com` y `*.visualstudio.com`.
- Usa `AZURE_DEVOPS_MCP_ORG` para validar organizacion.
- Tiene escapes explicitos para permitir workspace no Azure, sucio o integration branch stale.
- Fuerza Git no interactivo para evitar prompts por credenciales.

## Servicios reutilizables

### Reutilizables con cambios minimos

- `integrations/entra/identity_entra/oauth.py`
  - OAuth authorization URL, PKCE, nonce/state, token exchange, JWKS validation, allowlists.
  - Reutilizable como modulo backend de identidad.
- `integrations/entra/identity_entra/encryption.py`
  - Fernet/MultiFernet y rotacion de claves.
  - Reutilizable si se mantiene Python backend.
- `integrations/entra/identity_entra/tokens.py`
  - Contrato actual para guardar tokens y canjear token ADO.
  - Reutilizable solo si se reemplaza o abstrae LangGraph Store segun el futuro orchestrator.
- `integrations/azure-devops/integration_azure_devops/__init__.py`
  - Preset MCP Azure DevOps y politica read-only.
  - Es el bloque mas portable hacia un adapter/MCP gobernado.
- `packages/capability-gateway`
  - Buen punto para mantener herramientas por capability y resolver credenciales fuera del agente.
- `platform/integrations/agent_integrations/azure_devops_mcp.py`
  - Carga actor-scoped y resolucion de proyectos.
- Tests de Entra, token store, ADO MCP, dashboard API y workspace hardening.

### Acoplado o descartable

- `platform/dashboard_api/agent_dashboard/entra_oauth.py`
- `platform/dashboard_api/agent_dashboard/auth_tokens.py`

Son shims de compatibilidad. No deben portarse salvo que haya imports historicos que mantener.

- `agent/dashboard` y `agent/integrations`

El propio repo los trata como compatibilidad. No son fuente ideal para nueva integracion.

- `platform/dashboard_api/agent_dashboard/azure_devops_api.py`

Util para dashboard, pero acoplado a FastAPI/session/dashboard. No debe entrar al core runtime de OpenCode.

- `agent/server.py`

Mezcla composicion del agente con politica de producto y carga de herramientas. Es aceptable en el repo actual, pero no conviene copiar esa mezcla al fork.

- Referencias legacy GitHub en UI/API/scripts.

No son fuente de verdad para Entra/ADO. Deben tratarse como deuda historica si el producto se esta moviendo a Azure DevOps.

## Riesgos de seguridad

- `exchange_entra_code` arma errores con texto de respuesta del proveedor. Eso puede exponer detalle sensible si llega a logs o frontend. Minimo: normalizar error publico y loggear detalle solo de forma controlada.
- El token store actual depende de LangGraph Store. Para OpenCode, eso debe vivir en backend/orchestrator o vault, no en runtime local.
- `TOKEN_ENCRYPTION_KEY` es obligatorio para cifrar tokens. Debe venir de vault o secreto local seguro, nunca de repo.
- `DASHBOARD_JWT_SECRET` es critico. Si se rota sin estrategia, invalida sesiones; si se filtra, compromete sesiones.
- El scope ADO es amplio (`user_impersonation`). La mitigacion actual es policy read-only y tool gateway. No eliminar esa frontera.
- El agente no debe recibir access tokens, refresh tokens, client secret, cookies de sesion ni valores `.env`.
- Los writes ADO deben seguir bloqueados hasta tener aprobacion humana, auditoria y politica explicita.
- Los escape hatches de workspace son utiles para desarrollo, pero peligrosos en modo corporativo si quedan habilitados por defecto.

## Frontera futura hacia OpenCode

### Debe vivir en backend/orchestrator

- Login Entra.
- Callback OAuth.
- Validacion de state, nonce y PKCE.
- Validacion de ID token/JWKS.
- Allowlist de tenants/dominios.
- Sesion de usuario.
- Token store cifrado.
- Refresh tokens.
- Canje de token Entra a Azure DevOps.
- Auditoria.
- Politicas de aprobacion humana.

### Puede vivir como adapter

- Azure DevOps MCP provider.
- Politica read-only de herramientas.
- Resolucion de org/proyectos/repos permitidos.
- REST read-only para dashboard, si el dashboard se conserva.
- Capability gateway o equivalente que entregue herramientas ya filtradas.

### Nunca debe vivir dentro del core runtime de OpenCode

- `ENTRA_CLIENT_SECRET`
- Refresh tokens.
- Access tokens ADO.
- Cookies de sesion.
- Logica de OAuth callback.
- Token encryption keys.
- PATs.
- Bypass HTTP generico hacia Azure DevOps.
- Writes ADO sin aprobacion humana.
- Allowlist corporativa hardcodeada dentro del runtime del agente.

## Propuesta de migracion futura

1. No migrar codigo todavia.
2. Definir contrato backend primero:
   - identidad actual
   - actor id
   - org/proyectos/repos permitidos
   - lista de toolsets habilitados
3. Portar documentacion y variables requeridas a una guia interna.
4. Extraer Entra como modulo backend/orchestrator, no como dependencia de OpenCode core.
5. Extraer Azure DevOps como adapter MCP read-only.
6. Conectar OpenCode solo contra herramientas gobernadas.
7. Agregar writes ADO solo despues de:
   - aprobacion humana
   - auditoria
   - politica por accion
   - pruebas de rechazo

Cambio minimo correcto ahora: documentar lo existente. Cualquier migracion directa de auth al runtime seria el error caro.

## Decisiones pendientes

- Donde vivira el backend/orchestrator final.
- Si se conserva FastAPI o se reemplaza por otra capa.
- Donde se persistiran tokens en produccion.
- Como se rotaran `TOKEN_ENCRYPTION_KEY` y `DASHBOARD_JWT_SECRET`.
- Si OpenCode conservara dashboard web o solo CLI/TUI.
- Que org/proyectos/repos ADO estaran permitidos por ambiente.
- Que toolsets MCP se habilitan inicialmente.
- Si los writes ADO quedan fuera de alcance o entran con aprobacion humana.
- Como se mapeara `actor_id` Entra a usuarios/roles internos.
- Como se auditaran prompts, herramientas y acciones persistentes sin filtrar secretos.

## Proximos pasos

1. Agregar `.env.example` o guia interna con variables Entra/ADO sin valores.
2. Escribir contrato minimo de orchestrator: usuario, sesion, scope y herramientas.
3. Crear pruebas de rechazo para:
   - tenant no permitido
   - dominio no permitido
   - state/nonce invalido
   - token store sin encryption key
   - herramienta ADO write bloqueada
4. Portar primero `integration_azure_devops` como adapter read-only.
5. Portar despues Entra solo al backend/orchestrator.
6. Mantener OpenCode core sin secretos ni OAuth.

## Validacion realizada

- Se verifico que `agentEngine` no es repo Git.
- Se verifico que `agentEngine/open-swe` si es repo Git.
- Se inspeccionaron rutas, modulos, tests y configuracion relevantes.
- No se abrieron archivos `.env` con secretos.
- No se ejecutaron integraciones Entra ni Azure DevOps.
- No se modifico `open-swe`.
- Este cambio agrega solo documentacion al fork OpenCode.
