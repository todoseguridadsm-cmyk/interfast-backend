const express = require('express');

console.log("Comprobando sintaxis de backend/index.js...");
try {
  require('./index.js');
  console.log("Sintaxis de index.js 100% CORRECTA.");
} catch(err) {
  console.error("ERROR DE SINTAXIS O CARGA:", err);
}
