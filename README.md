# FNaF vs Toy Story

Arena voxel/blocky para navegador móvil basada en una Mega Pizzería.

## Ejecutar

```bash
python -m pip install -r requirements.txt
python app.py
```

Abrir `http://localhost:5001`.

## Controles

- Modo Joystick o Flechas: movimiento.
- Desliza el centro de la pantalla: mira.
- Puñetazo, disparar, cambiar arma, Rayos X, salto y correr.

## APIs

- `GET/POST /api/estado`: progreso de misiones.
- `GET/POST /api/pvp?room=arena-1`: estado ligero de jugadores PvP.

Tres.js r128 se sirve localmente desde `static/js/three.min.js`.
