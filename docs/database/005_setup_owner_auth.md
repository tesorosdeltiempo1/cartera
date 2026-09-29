# Preparar el acceso privado del propietario

La aplicación actual usa el rol público `anon` y las tablas tenían políticas abiertas. No publiques formularios de tesis/objetivos ni uses el borrado hasta cerrar ese acceso.

## Antes de tocar la base de datos

1. Desde la app actual, descarga un respaldo JSON y guárdalo en un lugar privado.
2. En Supabase, abre el proyecto correcto y entra en **Authentication → Sign In / Providers**. Habilita **Email** con contraseña.
3. En **Authentication → Settings / Configuration**, desactiva los registros públicos (**Allow new users to sign up**). Debe quedar habilitada solo la cuenta que tú crees.
4. En **Authentication → Users**, crea manualmente tu usuario propietario con tu correo. Define la contraseña directamente en Supabase; no la pegues en el chat ni en archivos del repositorio.
5. Copia el **User UID** de ese usuario. No es la contraseña; se utiliza para que la política RLS permita solo esa cuenta.

## Prueba y aplicación del SQL

1. Abre `001_consolidated_assets_dry_run.sql` en Supabase **SQL Editor**.
2. Reemplaza todas las apariciones de `REPLACE_WITH_OWNER_USER_UUID` por el User UID copiado. Mantén las comillas simples alrededor del UID.
3. Ejecuta una vez dejando `ROLLBACK` al final. Debe terminar sin errores; esto **revierte la prueba y no deja cambios aplicados**.
4. Si la prueba termina correctamente, cambia únicamente la última instrucción `rollback;` por `commit;` y ejecútala una vez más.
5. Ese `COMMIT` amplía las categorías, crea el detalle de snapshots, elimina acceso `anon` a las tablas de cartera y permite CRUD solo al User UID indicado. La web antigua dejará de poder leer/escribir hasta desplegar la versión con inicio de sesión; es una pausa esperada y evita dejar la API anónima abierta.
6. Vuelve a ejecutar `002_inspect_supabase_read_only.sql`. Verifica que las políticas de las cuatro tablas solo nombren `authenticated`, que cada una use `public.is_cartera_owner()` y que ya no haya grants `anon` ni `TRUNCATE` para `anon`/`authenticated`.

## Después

- No vuelvas a habilitar registros públicos.
- Inicia sesión en la nueva web usando la cuenta creada.
- Confirma que Dashboard, posiciones e histórico cargan antes de introducir objetivos o tesis.
- El catálogo empieza vacío. Crea un único activo Amazon, decide su objetivo global y vincula manualmente sus dos posiciones. El `17%` antiguo de una fila no se copiará; introduce el objetivo que decidas para la exposición total.
- Si el SQL da error, no cambies a `COMMIT`: copia el mensaje de error sin incluir correo, contraseña, keys ni datos patrimoniales.
