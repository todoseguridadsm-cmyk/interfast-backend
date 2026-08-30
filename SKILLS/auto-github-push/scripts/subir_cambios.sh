#!/bin/bash
# Recibe el mensaje de commit que armó el Agente de IA
MENSAJE=$1

git add .
git commit -m "$MENSAJE"
git push