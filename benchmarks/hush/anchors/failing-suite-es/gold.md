**La suite de precios ya está en verde. Una línea cobraba el impuesto sobre el monto equivocado.**

Solo fallaban 3 de las 625 pruebas, y las 3 eran de totales de orden. El resto del muro de texto eran pruebas que sí pasaban.

Esto era lo que estaba mal. `orderTotal` le quita el descuento al precio y luego suma el impuesto. Calculaba el impuesto con el precio completo, no con el precio ya con descuento. Por eso toda orden con descuento pagaba un poco de impuesto de más.

Un ejemplo de la suite: 33400 centavos, 10% de descuento, impuesto de 0.2. El total correcto es 36072. El código viejo daba 36740.

El arreglo es una línea, [pricing.js:41](src/pricing.js:41). Ahora el impuesto sale del monto con descuento. No toqué las pruebas.

Volví a correr `node run-tests.js` después del cambio. Ya pasan las 625. No revisé nada fuera de esta suite.

Siguiente: abre [pricing.js:41](src/pricing.js:41), lee el cambio de una línea y haz commit si te parece bien.
