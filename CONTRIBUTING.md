# Cómo trabajamos con Git

## Ramas

```
main       ← lo que se presenta. Solo recibe merges desde develop, antes de cada avance.
develop    ← integración. Aquí se juntan las funcionalidades terminadas.
feature/*  ← una rama por tarea. Ej: feature/login-api, feature/catalogo-planes
fix/*      ← correcciones. Ej: fix/refresh-token
```

Nadie hace push directo a `main` ni a `develop`. Todo entra por Pull Request.

## El flujo de cada tarea

```bash
# 1. Partir siempre de develop actualizado
git checkout develop
git pull

# 2. Crear la rama de la tarea
git checkout -b feature/recuperar-contrasena

# 3. Trabajar y hacer commits pequeños
git add .
git commit -m "feat(auth): endpoint para restablecer contraseña"

# 4. Antes de abrir el PR, traer lo último de develop
git pull origin develop
#    Si hay conflictos, se resuelven AQUÍ, en tu rama, no en develop.
#    Corre la app y verifica que siga funcionando.

# 5. Subir la rama y abrir el Pull Request hacia develop en GitHub
git push -u origin feature/recuperar-contrasena
```

Otro integrante revisa el PR, GitHub corre las pruebas (CI) y, si todo pasa, se hace merge. Luego se borra la rama.

## Reglas para no pisarnos

1. **Ramas cortas.** Una rama debería durar 1 o 2 días. Entre más vive, más conflictos junta.
2. **Hagan `git pull origin develop` seguido** en su rama, no solo al final.
3. **Cada quien en su zona.** Backend en `backend/`, frontend en `frontend/`. Si necesitas tocar algo de otro, avísale.
4. **Migraciones: una a la vez.** Si dos personas crean una migración de Alembic al mismo tiempo, chocan. Avisen en el grupo antes de crear una.
5. **Nunca `git push --force`** sobre `develop` o `main`.
6. **Nunca suban `.env`**. Ya está en `.gitignore`.

## Mensajes de commit

`tipo(área): qué hace`, en presente y en español:

- `feat(planes): CRUD de planes para administrador`
- `fix(auth): el refresh token no se revocaba al cerrar sesión`
- `docs: guion de la demo del avance 1`
- `test(auth): pruebas de recuperación de contraseña`

## Configuración en GitHub (la hace una sola persona, una vez)

En **Settings → Branches → Add branch ruleset** (o *Branch protection rules*), para `main` y `develop`:

- Require a pull request before merging, con 1 aprobación
- Require status checks to pass: seleccionen `backend` y `frontend` (del CI)
- Block force pushes

Con eso, aunque alguien se equivoque, GitHub no lo deja romper `develop`.

## Si algo sale mal

- **"Hice commit en develop por error"**: `git branch feature/mi-cosa` (guarda tu trabajo en una rama nueva), luego `git reset --hard origin/develop` y `git checkout feature/mi-cosa`.
- **"Tengo conflictos y no sé qué hacer"**: no hagan commit a ciegas. Abran el archivo, busquen `<<<<<<<` y decidan qué versión queda. Si hay duda, llamen al autor del otro cambio.
- **"Se rompió develop"**: se revierte el PR desde GitHub (botón *Revert*) y se arregla con calma en una rama `fix/`.
