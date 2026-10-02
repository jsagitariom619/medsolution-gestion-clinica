# MedSolution — Gestión Clínica

MVP web para gestión clínica con:

- Registro y edición de pacientes.
- Registro de atenciones con signos vitales, evaluación, diagnóstico e indicaciones.
- Historia clínica longitudinal por paciente.
- Registro de procedimientos con categoría, responsable, importe y observaciones.
- Reportes por rango de fechas, actividad diaria, procedimientos por tipo y movimientos consolidados.
- Exportación CSV.
- Respaldo e importación JSON.
- Diseño responsive para escritorio, tablet y móvil.

## Importante sobre esta versión

Esta primera versión guarda los datos en `localStorage` del navegador. Es adecuada para evaluación funcional, demostración y definición del flujo, pero no debe considerarse todavía una arquitectura final para información clínica sensible ni para trabajo multiusuario/multidispositivo.

Antes de usar datos clínicos reales en producción se recomienda incorporar:

1. Autenticación.
2. Base de datos central segura (por ejemplo Supabase/PostgreSQL).
3. Row Level Security (RLS), roles y auditoría.
4. Copias de seguridad y política de acceso.
5. Cifrado y controles operativos acordes al contexto de uso.

La estructura del modelo separa pacientes, atenciones y procedimientos para facilitar esa migración y la futura carga de movimientos históricos.

## Despliegue en Vercel

El proyecto es estático y no requiere build.

### Desde GitHub

1. Crear un repositorio nuevo.
2. Subir todos los archivos de esta carpeta a la raíz.
3. En Vercel elegir **Add New → Project**.
4. Importar el repositorio de GitHub.
5. Framework Preset: **Other**.
6. Build Command: dejar vacío.
7. Output Directory: dejar vacío.
8. Deploy.

## Uso local

Puede abrirse `index.html` directamente o servirse con cualquier servidor estático, por ejemplo:

```bash
python3 -m http.server 4173
```

Luego abrir `http://localhost:4173`.

## Datos históricos

No contiene datos ficticios. La carga histórica se puede hacer posteriormente mediante un importador controlado que transforme Excel/CSV/JSON a las colecciones `patients`, `attentions` y `procedures`, evitando duplicados y manteniendo referencias por paciente.
