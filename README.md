# Mi entrenamiento

App web instalable (PWA) para registrar entrenamientos: series, pesos, repeticiones y progreso. **Tus datos se quedan en tu dispositivo** (no hay servidor ni cuentas).

## Qué hace
- **Entrenar**: empieza un entrenamiento vacío o desde una rutina; apunta peso y repeticiones, marca cada serie como hecha (arranca el temporizador de descanso). Te enseña lo que hiciste la última vez y avisa de récords de peso.
- **Historial**: todos tus entrenamientos; puedes repetirlos, editarlos o borrarlos.
- **Progreso**: constancia semanal frente a tu objetivo, y por ejercicio: peso máximo, 1RM estimado (Epley), mejor volumen y gráfica de evolución.
- **Ejercicios y rutinas**: lista editable con 157 ejercicios de partida con foto.
- **Cómo se hace**: fotos de inicio y final de cada ejercicio, con una animación del movimiento, y un botón «Ver vídeo» que abre YouTube con la búsqueda de ese ejercicio.
- **Ajustes**: descanso por defecto, objetivo semanal, copia de seguridad (archivo o texto) y aviso si hace más de 30 días de la última.

## Fotos de ejercicios
Las fotos de los 157 ejercicios de partida proceden de [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (dominio público, Unlicense). Los ejercicios que creas tú no llevan foto.

## Desarrollo
```bash
npm install
npm run dev      # servidor local
npm test         # pruebas
npm run build    # genera dist/
```

## Publicar en GitHub Pages
En Settings → Pages → Source: **GitHub Actions**. El flujo `.github/workflows/deploy.yml` publica en cada push a `main`.

## iPhone
Ábrela en **Safari**, Compartir → *Añadir a pantalla de inicio*. Los datos de Safari y los del icono son distintos: introduce los tuyos ya desde el icono (o usa Importar copia).
