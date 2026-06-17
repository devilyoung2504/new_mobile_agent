# OpenCode Orchestrator Contract

## Principio de arquitectura

OpenCode debe tratarse como runtime/worker. Su responsabilidad es ejecutar el
agente, herramientas locales y herramientas externas ya gobernadas. No debe
convertirse en proveedor de identidad, token store, policy engine ni sistema de
auditoria.

El backend/orchestrator es el dueno de identidad, sesion, tokens, policy,
aprobaciones humanas y auditoria. Entra ID y Azure DevOps viven detras de esa
frontera.

Regla principal: OpenCode nunca debe recibir secretos ni tokens crudos. Eso
incluye prompts, herramientas visibles al modelo, frontend state, shell logs,
workspace files y cualquier salida model-visible.

## Responsabilidades por componente

### OpenCode runtime

- Ejecuta sesiones de agente como worker.
- Recibe contexto minimo de sesion y actor scope ya filtrado.
- Usa tools inyectadas por el orchestrator.
- Ejecuta comandos locales bajo las reglas del runtime.
- No implementa login Entra, callback OAuth, token refresh ni token storage.
- No decide permisos corporativos por su cuenta.

### Backend/orchestrator

- Emite y valida sesiones corporativas.
- Mantiene el token store cifrado.
- Resuelve actor scope para organizaciones, proyectos y repos.
- Decide que toolsets puede usar cada sesion.
- Inyecta solo herramientas gobernadas.
- Ejecuta writes aprobados server-side.
- Registra auditoria de solicitudes, aprobaciones, ejecuciones y rechazos.
- Rechaza por defecto cualquier operacion fuera de scope o no reconocida.

### Entra auth

- Maneja login, callback y cierre de sesion.
- Valida `state`, `nonce` y PKCE.
- Valida ID token con OpenID/JWKS.
- Aplica allowlists de tenant y dominio.
- Emite identidad interna basada en `actor_id`, tenant, email y display name.
- Entrega tokens solo al backend/orchestrator.

### Azure DevOps adapter/MCP

- Expone Azure DevOps como adapter/MCP gobernado.
- Opera read-only por defecto.
- Recibe credenciales solo desde backend/orchestrator.
- Aplica allowlists especificas por operacion.
- Bloquea HTTP generico como bypass.
- No entrega access tokens, refresh tokens ni PATs al modelo.

### Dashboard futuro

- Puede mostrar sesion, scope, solicitudes de aprobacion y resultados.
- Puede recibir comandos de aprobar o rechazar.
- No debe guardar tokens en cliente.
- No debe exponer secrets en estado frontend, logs o URLs.

## Session contract

La sesion es un contrato conceptual entre orchestrator y OpenCode. No es un
schema final todavia.

Campos minimos:

- `session_id`: identificador opaco de sesion.
- `actor_id`: identificador estable del usuario, por ejemplo `entra:<oid>`.
- `display_name`: nombre visible.
- `email`: correo del usuario.
- `tenant_id`: tenant Entra validado.
- `allowed_organizations`: organizaciones Azure DevOps permitidas.
- `allowed_projects`: proyectos permitidos por organizacion.
- `allowed_repositories`: repos permitidos por proyecto.
- `selected_work_item`: work item activo, si aplica.
- `selected_repo`: repo activo, si aplica.
- `selected_branch`: branch activo, si aplica.
- `toolsets`: toolsets habilitados para la sesion.
- `policy`: modo de operacion, allowlists y acciones bloqueadas.
- `audit_context`: correlation ids, origen de sesion y metadata de auditoria.

OpenCode puede leer esta informacion como contexto operativo. No puede
extender permisos ni resolver secretos a partir de ella.

## Actor scope contract

El actor scope define que permisos y contexto llegan al agente.

Debe incluir:

- Organizaciones Azure DevOps permitidas.
- Proyectos permitidos.
- Repos permitidos.
- Work items o areas permitidas, si el producto lo requiere.
- Toolsets habilitados.
- Modo read-only por defecto.
- Acciones bloqueadas.

Reglas:

- Scope ausente significa rechazar.
- Repo fuera de scope significa rechazar.
- Proyecto fuera de scope significa rechazar.
- Toolset no habilitado significa no inyectar la herramienta.
- El agente no puede pedir un scope mas amplio dentro del runtime.

## Tool injection contract

El orchestrator debe entregar tools ya gobernadas. OpenCode no debe construir
clientes corporativos crudos ni resolver credenciales.

Para la fase inicial:

- Inyectar Azure DevOps MCP read-only.
- No inyectar herramientas write de Azure DevOps.
- No inyectar Android skills en esta fase.
- No inyectar Mobile MCP en esta fase.
- No exponer tokens al modelo.
- No permitir HTTP generico como bypass hacia Azure DevOps.

Si una tool necesita credencial, la credencial se resuelve server-side dentro
del orchestrator o adapter. El modelo solo ve la operacion permitida y su
resultado saneado.

## Token and secret boundary

Estas cosas nunca deben entrar a OpenCode:

- `ENTRA_CLIENT_SECRET`
- Refresh tokens.
- Azure DevOps access tokens.
- Cookies de sesion.
- `TOKEN_ENCRYPTION_KEY`
- `DASHBOARD_JWT_SECRET`
- PATs.
- Archivo `.env` completo.
- OAuth authorization codes.
- PKCE verifier.
- Raw ID tokens.
- Raw provider error bodies si pueden contener datos sensibles.

Si algo de esta lista es necesario para una operacion, esa operacion pertenece
al backend/orchestrator, no al runtime.

## Azure DevOps write policy

La fase inicial es read-only. Ese debe ser el default operacional y de
seguridad.

Writes futuros solo pueden existir con:

- Aprobacion humana explicita.
- Auditoria.
- Allowlist por accion.
- Rechazo por defecto.
- Pruebas de bloqueo.
- Ejecucion server-side por orchestrator.

Una aprobacion humana no habilita escritura general en Azure DevOps. Autoriza
una sola operacion concreta.

## Local development contract

Variables esperadas para desarrollo local, sin valores:

- `ENTRA_CLIENT_ID`
- `ENTRA_TENANT_ID`
- `ENTRA_CLIENT_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `DASHBOARD_JWT_SECRET`
- `AZURE_DEVOPS_MCP_ORG`
- `AZURE_DEVOPS_MCP_DOMAINS`
- `AZURE_DEVOPS_MCP_PROJECT`
- `AZURE_DEVOPS_MCP_TRANSPORT`
- `AZURE_DEVOPS_MCP_URL`

Estas variables deben documentarse en una guia o `.env.example` futuro sin
valores reales. No deben copiarse desde entornos personales ni imprimirse en
logs.

## Security rejection cases

Estos casos deben fallar:

- Tenant no permitido.
- Dominio no permitido.
- `state` invalido.
- `nonce` invalido.
- PKCE ausente.
- Token store sin encryption key.
- Herramienta write ADO solicitada en modo read-only.
- Repo fuera del scope.
- Proyecto fuera del scope.
- Workspace no Azure sin override explicito.
- Toolset no habilitado.
- HTTP generico usado como bypass.
- Token o secret visible para el modelo.

## Human approval gate for Azure DevOps writes

### Flujo de solicitud de escritura

El agente puede proponer una accion Azure DevOps de escritura, pero no puede
ejecutarla directamente.

La solicitud debe incluir:

- Tool name.
- Operacion MCP exacta.
- Argumentos exactos.
- Organizacion, proyecto, repo o work item afectado.
- Justificacion.
- Riesgo.
- Efecto esperado.

La solicitud queda en estado `pending`. No se ejecuta ninguna llamada write
mientras esta pendiente.

### Validacion previa del orchestrator

Antes de mostrar la solicitud al humano, el orchestrator debe validar:

- `actor_id`.
- Sesion activa.
- Scope Azure DevOps.
- Que organizacion, proyecto, repo o work item pertenecen al scope permitido.
- Que la operacion esta en una allowlist especifica.
- Que no se esta usando HTTP generico como bypass.

Cualquier operacion no reconocida se rechaza por defecto.

### Aprobacion humana

El humano debe ver la operacion, argumentos, target, riesgo y efecto esperado.
Puede aprobar o rechazar.

Una aprobacion genera un `approval_id` con:

- Accion exacta.
- Argumentos exactos.
- `actor_id`.
- `session_id`.
- Expiracion corta.
- Estado: `unused`, `used`, `expired` o `rejected`.

La aprobacion es one-shot. Una aprobacion usada no se puede reutilizar.

### Ejecucion posterior a la aprobacion

El orchestrator ejecuta la accion usando credenciales server-side.

Reglas:

- El modelo nunca recibe access token, refresh token, PAT, cookie ni secret.
- El MCP de Azure DevOps recibe credenciales solo desde backend/orchestrator.
- La ejecucion compara argumentos aprobados contra argumentos reales.
- Si los argumentos cambiaron, rechazar.
- Si la aprobacion expiro, rechazar.
- Si la aprobacion ya fue usada, rechazar.
- Al terminar, registrar resultado en auditoria.

## Approval request immutability and idempotency

Cada approval request debe canonicalizarse antes de aprobacion.

El orchestrator debe calcular `approval_request_hash` usando:

- Tool name.
- Operacion MCP.
- Argumentos en JSON canonico.
- `actor_id`.
- `session_id`.
- Target: organizacion, proyecto, repo y work item afectado.

El hash aprobado debe almacenarse junto con el `approval_id`.

Antes de ejecutar, el orchestrator debe recalcular el hash desde la solicitud
real de ejecucion. Si el hash difiere, rechazar.

Cada aprobacion debe ser one-shot. Cada ejecucion debe tener un
`idempotency_key`.

Los reintentos no deben duplicar:

- PRs.
- Comentarios.
- Branches.
- Work item updates.

Para writes soportados, la UI de aprobacion debe mostrar un dry-run o preview
payload antes de aprobar.

Las allowlists deben ser especificas por operacion. No se permite una allowlist
generica de escritura.

## Implementation modes

### A. Tool gating dentro del orchestrator

OpenCode y el MCP exponen herramientas read-only por defecto. Las herramientas
write no se inyectan al modelo.

Cuando existe aprobacion, el orchestrator ejecuta server-side la accion write.
El modelo solo recibe el resultado saneado.

Esta es la opcion preferida para MVP.

### B. Temporary write tool enablement

El orchestrator habilita temporalmente una herramienta write especifica solo
para una operacion aprobada. La herramienta debe requerir `approval_id` y debe
validar hash, scope, expiracion e idempotencia.

Esta opcion tiene mas riesgo porque acerca capacidades write al runtime/modelo.
Solo debe usarse si el modelo/runtime lo requiere y despues de probar la opcion
A.

Decision: usar A para MVP.

## Write candidates by risk

### Bajo o medio riesgo

- Crear branch, solo si la rama base esta en allowlist y la rama destino
  cumple naming policy.
- Crear draft PR, solo con work item asociado, branch origen dentro de scope y
  base branch permitida.
- Comentar en work item.
- Comentar en PR.
- Actualizar descripcion de PR draft.

### Alto riesgo

- Actualizar estado de work item.
- Asignar work item.
- Aprobar PR.
- Completar o mergear PR.
- Correr pipeline.
- Modificar permisos.
- Borrar ramas.

Para MVP, permitir como maximo:

- Crear draft PR.
- Comentar work item.
- Comentar PR.

Todo lo demas permanece bloqueado.

## Future implementation phases

1. Adapter Azure DevOps read-only.
2. Orchestrator session.
3. Entra auth.
4. OpenCode session bootstrap.
5. Android skill.
6. Writes con aprobacion humana.
7. Mobile MCP.

No adelantar fases solo para "dejar listo". La frontera de seguridad vale mas
que reducir pasos.

## Tests de rechazo obligatorios

Antes de habilitar writes, deben existir pruebas para:

- Write sin `approval_id`.
- `approval_id` inexistente.
- `approval_id` expirado.
- `approval_id` ya usado.
- Operacion distinta a la aprobada.
- Argumentos modificados despues de aprobacion.
- `approval_request_hash` distinto.
- Falta de `idempotency_key`.
- Reintento que intenta duplicar PR.
- Reintento que intenta duplicar comentario.
- Reintento que intenta duplicar branch.
- Reintento que intenta duplicar work item update.
- Repo fuera de scope.
- Proyecto fuera de scope.
- Actor distinto al aprobado.
- Intento de merge sin allowlist.
- Intento de usar HTTP generico como bypass.

## Decision

La decision para MVP es:

- Read-only por defecto.
- Writes ejecutados server-side por orchestrator.
- Aprobacion one-shot.
- Hash inmutable de approval request.
- Idempotencia obligatoria por ejecucion.
- Tokens nunca visibles al modelo.
- No habilitar herramientas write generales dentro del runtime.

Esta es la frontera minima que evita el error caro: convertir OpenCode en un
runtime con secretos, OAuth y permisos corporativos crudos.
