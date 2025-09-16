// script.js - substitua seu arquivo atual por este
const display = document.getElementById("display");

function appendValue(value) {
  display.value += value;
}

function clearDisplay() {
  display.value = "";
}

/* --- Helpers para encontrar parênteses correspondentes --- */
function findClosingParen(expr, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < expr.length; i++) {
    if (expr[i] === "(") depth++;
    else if (expr[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
function findOpeningParen(expr, closeIdx) {
  let depth = 0;
  for (let i = closeIdx; i >= 0; i--) {
    if (expr[i] === ")") depth++;
    else if (expr[i] === "(") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/* --- Substitui chamadas de função de forma robusta (encontra parênteses balanceados) --- */
function replaceFunction(expr, name, replacer) {
  const token = name + "(";
  let pos = expr.indexOf(token);
  while (pos !== -1) {
    let open = pos + name.length; // índice do '('
    let close = findClosingParen(expr, open);
    // se não encontrar fechamento, considera até o fim e iremos auto-fechar mais tarde
    let inner = close === -1 ? expr.slice(open + 1) : expr.slice(open + 1, close);
    const replacement = replacer(inner.trim());
    expr = expr.slice(0, pos) + replacement + (close === -1 ? "" : expr.slice(close + 1));
    pos = expr.indexOf(token, pos + replacement.length);
  }
  return expr;
}

/* --- Substitui potências com ^ de forma segura (base ^ expoente) --- */
function replacePowers(expr) {
  while (expr.includes("^")) {
    let idx = expr.indexOf("^");

    // encontra operando à esquerda
    let leftStart, left;
    let i = idx - 1;
    if (i >= 0 && expr[i] === ")") {
      leftStart = findOpeningParen(expr, i);
      if (leftStart === -1) leftStart = 0;
      left = expr.slice(leftStart, idx);
    } else {
      let j = i;
      while (j >= 0 && /[A-Za-z0-9._]/.test(expr[j])) j--;
      leftStart = j + 1;
      left = expr.slice(leftStart, idx);
    }

    // encontra operando à direita
    let rightEnd, right;
    let k = idx + 1;
    if (k < expr.length && expr[k] === "(") {
      let close = findClosingParen(expr, k);
      if (close === -1) close = expr.length - 1; // auto-close
      rightEnd = close;
      right = expr.slice(idx + 1, rightEnd + 1);
    } else {
      let l = k;
      while (l < expr.length && /[A-Za-z0-9._]/.test(expr[l])) l++;
      rightEnd = l - 1;
      right = expr.slice(idx + 1, rightEnd + 1);
    }

    // Se algum operando estiver faltando -> marca erro
    if (!left || !right) throw new Error("Potência mal formada");

    // substitui pela função Math.pow(base,expo)
    const replacement = "Math.pow(" + left + "," + right + ")";
    expr = expr.slice(0, leftStart) + replacement + expr.slice(rightEnd + 1);
  }
  return expr;
}

/* --- Função principal de cálculo --- */
function calculate() {
  try {
    let expr = display.value || "";
    expr = expr.trim();

    // 0) caracteres e símbolos visuais → normaliza (× ÷ − → * / -)
    expr = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/—/g, "-");

    // 1) remove caracteres indesejados (permite letras para funções, números, operadores, parênteses, ponto e espaço)
    expr = expr.replace(/[^0-9+\-*/().,%^A-Za-zπ\s]/g, "");

    // 2) substitui π e 'pi' por Math.PI (cuida de "2pi" -> "2*Math.PI")
    expr = expr.replace(/π/g, "pi");
    expr = expr.replace(/([0-9.])\s*pi\b/ig, "$1*Math.PI"); // 2pi -> 2*Math.PI
    expr = expr.replace(/\bpi\b/ig, "Math.PI");

    // 3) auto-fecha parênteses abertos
    const openCount = (expr.match(/\(/g) || []).length;
    const closeCount = (expr.match(/\)/g) || []).length;
    if (openCount > closeCount) expr += ")".repeat(openCount - closeCount);

    // 4) funções: sqrt, ln, log, sin, cos, tan
    //    - sqrt(x) -> Math.sqrt(x)
    //    - ln(x) -> Math.log(x)
    //    - log(x) -> Math.log10(x)
    //    - sin/cos/tan -> Math.sin((x)*PI/180) etc (graus -> radianos)
    expr = replaceFunction(expr, "sqrt", (inner) => `Math.sqrt(${inner})`);
    expr = replaceFunction(expr, "ln", (inner) => `Math.log(${inner})`);
    expr = replaceFunction(expr, "log", (inner) => `Math.log10(${inner})`);
    expr = replaceFunction(expr, "sin", (inner) => `Math.sin((${inner})*Math.PI/180)`);
    expr = replaceFunction(expr, "cos", (inner) => `Math.cos((${inner})*Math.PI/180)`);
    expr = replaceFunction(expr, "tan", (inner) => `Math.tan((${inner})*Math.PI/180)`);

    // 5) porcentagem:
    //    caso: "(... )%" -> "(/100)"
    expr = expr.replace(/\)\s*%/g, ")/100");
    //    caso: "50%" -> "(50/100)"
    expr = expr.replace(/(\d+(\.\d+)?)\s*%/g, "($1/100)");

    // 6) potências ^ (pode ser 2^3 ou (1+2)^(3+4) etc)
    expr = replacePowers(expr);

    // 7) limpeza final (remove espaços)
    expr = expr.replace(/\s+/g, "");

    // 8) avaliar expressão com Function (mais previsível que eval)
    //    cuidado: já sanitizamos caracteres acima
    const result = Function('"use strict"; return (' + expr + ')')();

    // 9) tratar o resultado
    if (typeof result === "number" && isFinite(result)) {
      // remover zeros desnecessários - limitar a 8 casas decimais
      const rounded = parseFloat(result.toFixed(8));
      display.value = rounded.toString();
    } else {
      display.value = "Erro";
    }
  } catch (err) {
    // console.error(err);
    display.value = "Erro";
  }
}
