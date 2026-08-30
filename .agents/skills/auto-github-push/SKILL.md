---
name: auto-github-push
description: Usa esta habilidad cuando el usuario pida guardar, subir, respaldar o pushear los cambios del código a GitHub.
---

Goal
Automatizar el proceso de guardar y subir código a GitHub de forma segura en el proyecto INTERFAST.

Instructions
- Analiza los archivos que el usuario modificó para entender qué cambió.
- Genera un mensaje de commit corto y descriptivo basado en esos cambios.
- Usa el script scripts/subir_cambios.sh para ejecutar la subida.
- Comando: bash scripts/subir_cambios.sh "tu_mensaje_de_commit_generado"
- Avisale al usuario cuando el código ya esté subido exitosamente.

Constraints
- Nunca subas archivos con contraseñas o variables de entorno (como .env).