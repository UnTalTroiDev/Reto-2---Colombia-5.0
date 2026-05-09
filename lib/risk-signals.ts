/**
 * Motor de señales de riesgo determinístico para contratos SECOP II.
 *
 * Cada señal devuelve un peso 0..100 y una descripción humana.
 * El score base se calcula como la suma ponderada de señales activas,
 * antes de pasar al LLM para análisis cualitativo.
 *
 * Las heurísticas están fundamentadas en patrones de corrupción documentados
 * por Transparencia por Colombia, la Contraloría, y la academia (Universidad Externado).
 */

export type Severity = "alta" | "media" | "baja";

/**
 * Las 5 banderas rojas canónicas para auditoría de contratación pública.
 * Cada señal heurística mapea a una de estas para vista unificada en UI.
 */
export type CategoriaRiesgo =
  | "implementacion"
  | "licitacion"
  | "relaciones"
  | "conflictos_interes"
  | "financiero";

export type RiskSignal = {
  id: string;
  /** Categoría interna detallada (mantenida para retrocompatibilidad). */
  category:
    | "modalidad"
    | "valor"
    | "concentracion"
    | "transparencia"
    | "temporal"
    | "datos";
  /** Una de las 5 banderas rojas canónicas. */
  umbrella: CategoriaRiesgo;
  severity: Severity;
  weight: number; // contribución al score (0..100)
  title: string;
  detail: string;
};

export type ContractRow = {
  id_contrato?: string | null;
  nombre_entidad?: string | null;
  nit_entidad?: string | null;
  proveedor_adjudicado?: string | null;
  documento_proveedor?: string | null;
  departamento?: string | null;
  ciudad?: string | null;
  sector?: string | null;
  estado_contrato?: string | null;
  tipo_de_contrato?: string | null;
  modalidad_de_contratacion?: string | null;
  justificacion_modalidad_de?: string | null;
  fecha_de_firma?: string | null;
  fecha_de_inicio_del_contrato?: string | null;
  fecha_de_fin_del_contrato?: string | null;
  valor_del_contrato?: string | number | null;
  valor_de_pago_adelantado?: string | number | null;
  valor_facturado?: string | number | null;
  valor_pagado?: string | number | null;
  saldo_cdp?: string | number | null;
  dias_adicionados?: string | number | null;
  liquidaci_n?: string | null;
  habilita_pago_adelantado?: string | null;
  es_pyme?: string | null;
  origen_de_los_recursos?: string | null;
  duraci_n_del_contrato?: string | number | null;
  descripcion_del_proceso?: string | null;
  objeto_del_contrato?: string | null;
  urlproceso?: { url?: string } | string | null;
};

export type RiskAssessment = {
  score: number; // 0..100 (mayor = más riesgo)
  level: "crítico" | "alto" | "medio" | "bajo" | "mínimo";
  signals: RiskSignal[];
  summary: {
    high: number;
    medium: number;
    low: number;
  };
};

const MODALIDAD_RIESGO: Record<string, { weight: number; reason: string }> = {
  "contratación directa": {
    weight: 22,
    reason:
      "Modalidad sin pluralidad de oferentes obligatoria — históricamente la modalidad con mayor concentración de hallazgos de la Contraloría.",
  },
  "régimen especial": {
    weight: 12,
    reason:
      "Régimen especial puede saltar las reglas estándar de Ley 80/Ley 1150 según el tipo de entidad.",
  },
  "mínima cuantía": {
    weight: 8,
    reason: "Mínima cuantía permite procesos abreviados; útil verificar que el valor justifique la modalidad.",
  },
  "selección abreviada": {
    weight: 6,
    reason: "Modalidad de selección abreviada — verificar pluralidad real de oferentes.",
  },
};

const PLACEHOLDER_VALUES = new Set([
  "no definido",
  "no definida",
  "n/a",
  "na",
  "null",
  "ninguno",
  "ninguna",
  "sin definir",
  "sin información",
  "-",
  "--",
  "",
]);

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isPlaceholder(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  return PLACEHOLDER_VALUES.has(String(v).trim().toLowerCase());
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? new Date(t) : null;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Estadísticas de mercado para detectar valores atípicos.
 * Se calculan a partir de muestras del dataset; ver `lib/risk-context.ts`.
 */
export type MarketContext = {
  /** Número de contratos del mismo proveedor con la misma entidad. */
  providerEntityContracts?: number;
  /** Suma del valor histórico contratado entre proveedor y entidad. */
  providerEntitySumValor?: number;
  /** Mediana de valor para el tipo de contrato (de la muestra). */
  medianValorTipo?: number;
  /** Mediana de valor para la modalidad (de la muestra). */
  medianValorModalidad?: number;
};

export function evaluateContract(
  row: ContractRow,
  ctx: MarketContext = {},
): RiskAssessment {
  const signals: RiskSignal[] = [];

  const modalidad = (row.modalidad_de_contratacion ?? "").trim().toLowerCase();
  const tipo = (row.tipo_de_contrato ?? "").trim().toLowerCase();
  const valor = toNumber(row.valor_del_contrato);
  const adelantado = toNumber(row.valor_de_pago_adelantado);
  const fechaFirma = parseDate(row.fecha_de_firma);
  const fechaInicio = parseDate(row.fecha_de_inicio_del_contrato);
  const fechaFin = parseDate(row.fecha_de_fin_del_contrato);
  const diasAdicionados = toNumber(row.dias_adicionados);

  // ── 1. Modalidad de contratación ──────────────────────────────
  for (const [key, cfg] of Object.entries(MODALIDAD_RIESGO)) {
    if (modalidad.includes(key)) {
      const justificacionVacia = isPlaceholder(row.justificacion_modalidad_de);
      const sevExtra = key === "contratación directa" && justificacionVacia;
      signals.push({
        id: "modalidad-riesgo",
        category: "modalidad",
        umbrella: "licitacion",
        severity: sevExtra ? "alta" : key === "contratación directa" ? "alta" : "media",
        weight: cfg.weight + (sevExtra ? 8 : 0),
        title: `Modalidad de riesgo: ${row.modalidad_de_contratacion}`,
        detail: cfg.reason + (justificacionVacia ? " Además, la justificación está vacía o no definida." : ""),
      });
      break;
    }
  }

  // Justificación genérica de la modalidad (heurística)
  const just = (row.justificacion_modalidad_de ?? "").trim();
  if (
    !isPlaceholder(just) &&
    just.length > 0 &&
    just.length < 60 &&
    /^(servicios profesionales|apoyo a la gestión|prestación de servicios|contratación directa)$/i.test(just)
  ) {
    signals.push({
      id: "justificacion-generica",
      category: "modalidad",
      umbrella: "licitacion",
      severity: "media",
      weight: 8,
      title: "Justificación genérica de la modalidad",
      detail: `La justificación es genérica ("${just}"), sin detallar por qué no aplica licitación pública.`,
    });
  }

  // ── 2. Valor del contrato (financiero) ───────────────────────
  if (valor !== null) {
    if (valor === 0) {
      signals.push({
        id: "valor-cero",
        category: "valor",
        umbrella: "financiero",
        severity: "media",
        weight: 10,
        title: "Valor del contrato igual a cero",
        detail:
          "Contratos con valor cero pueden indicar errores de captura, contratos no remunerados sin justificación clara, o evasión del registro patrimonial.",
      });
    } else if (valor < 0) {
      signals.push({
        id: "valor-negativo",
        category: "valor",
        umbrella: "financiero",
        severity: "alta",
        weight: 18,
        title: "Valor del contrato negativo",
        detail:
          "Un valor negativo es anómalo y sugiere error de captura o ajuste contable irregular.",
      });
    }

    // Outlier vs. mediana del tipo de contrato (>10x)
    const median = ctx.medianValorTipo;
    if (median && median > 0 && valor / median > 10) {
      signals.push({
        id: "valor-atipico-tipo",
        category: "valor",
        umbrella: "financiero",
        severity: "media",
        weight: 12,
        title: `Valor ${(valor / median).toFixed(1)}x sobre mediana del tipo`,
        detail: `El valor (${formatCop(valor)}) es ${(valor / median).toFixed(1)} veces la mediana de contratos del tipo "${row.tipo_de_contrato}" (${formatCop(median)}).`,
      });
    }

    // Pago adelantado > 50% del valor
    if (adelantado !== null && valor > 0 && adelantado / valor > 0.5) {
      signals.push({
        id: "anticipo-excesivo",
        category: "valor",
        umbrella: "financiero",
        severity: "alta",
        weight: 14,
        title: `Anticipo del ${((adelantado / valor) * 100).toFixed(0)}% del valor`,
        detail:
          "El Decreto 1082/2015 limita el anticipo al 50% en obra pública. Anticipos altos son una señal clásica de captura del flujo de caja.",
      });
    }

    // Anticipo cobrado sin habilitación (inconsistencia financiera)
    if (
      adelantado !== null &&
      adelantado > 0 &&
      String(row.habilita_pago_adelantado ?? "").toLowerCase() === "no"
    ) {
      signals.push({
        id: "anticipo-no-habilitado",
        category: "valor",
        umbrella: "financiero",
        severity: "alta",
        weight: 16,
        title: "Anticipo registrado sin habilitación de pago adelantado",
        detail:
          "El contrato declara que NO habilita pago adelantado pero registra valor de anticipo. Inconsistencia documental grave.",
      });
    }

    // Redondeo sospechoso: valores grandes en millones perfectamente redondos
    if (valor >= 100_000_000 && valor % 1_000_000 === 0 && valor % 10_000_000 === 0) {
      signals.push({
        id: "redondeo-sospechoso",
        category: "valor",
        umbrella: "financiero",
        severity: "baja",
        weight: 4,
        title: `Valor exacto en decenas de millones (${formatCop(valor)})`,
        detail:
          "Contratos con valores perfectamente redondos a decenas de millones pueden indicar que no se hizo un cálculo real de costos sino una asignación discrecional.",
      });
    }

    // Sobre-ejecución: facturado > contrato
    const facturado = toNumber(row.valor_facturado);
    if (facturado !== null && valor > 0 && facturado > valor * 1.05) {
      signals.push({
        id: "sobre-ejecucion",
        category: "valor",
        umbrella: "implementacion",
        severity: "alta",
        weight: 14,
        title: `Facturado ${(((facturado - valor) / valor) * 100).toFixed(0)}% por encima del contrato`,
        detail: `Valor facturado ${formatCop(facturado)} excede el valor del contrato ${formatCop(valor)}. Sobreejecución sin adendas registradas.`,
      });
    }

    // Pago > facturado
    const pagado = toNumber(row.valor_pagado);
    if (pagado !== null && facturado !== null && facturado > 0 && pagado > facturado * 1.05) {
      signals.push({
        id: "pago-mayor-facturado",
        category: "valor",
        umbrella: "financiero",
        severity: "alta",
        weight: 12,
        title: "Valor pagado supera el valor facturado",
        detail: `Pagado ${formatCop(pagado)} > facturado ${formatCop(facturado)}. Inconsistencia contable que requiere conciliación.`,
      });
    }
  } else {
    signals.push({
      id: "valor-faltante",
      category: "datos",
      umbrella: "financiero",
      severity: "media",
      weight: 8,
      title: "Valor del contrato no reportado",
      detail: "Sin valor reportado no es posible auditar la proporcionalidad del contrato.",
    });
  }

  // Contrato terminado sin liquidación
  const estado = (row.estado_contrato ?? "").toLowerCase();
  const liquidacion = String(row.liquidaci_n ?? "").toLowerCase();
  if (
    (estado.includes("termin") || estado.includes("liquid")) &&
    liquidacion === "no"
  ) {
    signals.push({
      id: "no-liquidacion",
      category: "datos",
      umbrella: "implementacion",
      severity: "media",
      weight: 8,
      title: "Contrato terminado sin liquidación registrada",
      detail:
        "El contrato aparece como terminado pero no se ha liquidado. La Ley 80 obliga a liquidar dentro de 4 meses post-terminación.",
    });
  }

  // ── 3. Concentración proveedor-entidad (relaciones inusuales) ──
  if (ctx.providerEntityContracts && ctx.providerEntityContracts >= 5) {
    const sev: Severity =
      ctx.providerEntityContracts >= 20
        ? "alta"
        : ctx.providerEntityContracts >= 10
          ? "media"
          : "baja";
    const weight = sev === "alta" ? 16 : sev === "media" ? 10 : 5;
    signals.push({
      id: "concentracion-proveedor",
      category: "concentracion",
      umbrella: "relaciones",
      severity: sev,
      weight,
      title: `${ctx.providerEntityContracts} contratos del mismo proveedor con esta entidad`,
      detail: ctx.providerEntitySumValor
        ? `Suma histórica adjudicada: ${formatCop(ctx.providerEntitySumValor)}. Concentración en un mismo proveedor puede indicar relaciones preferenciales.`
        : "La concentración entre un proveedor y una entidad puede indicar relaciones preferenciales o falta de pluralidad real de oferentes.",
    });
  }

  // ── 3b. Conflictos de interés (mismas personas controlando) ──
  // Casteo a Record para acceder a campos no-tipados que vienen del API
  const r = row as unknown as Record<string, unknown>;
  const ordGastoDoc = String(r.n_mero_de_documento_ordenador_del_gasto ?? "").trim();
  const supDoc = String(r.n_mero_de_documento_supervisor ?? "").trim();
  const ordPagoDoc = String(r.n_mero_de_documento_ordenador_de_pago ?? "").trim();
  const repLegalDoc = String(r.identificaci_n_representante_legal ?? "").trim();

  // Autosupervisión: ordenador del gasto = supervisor
  if (
    ordGastoDoc &&
    supDoc &&
    ordGastoDoc === supDoc &&
    !isPlaceholder(ordGastoDoc)
  ) {
    signals.push({
      id: "autosupervision",
      category: "concentracion",
      umbrella: "conflictos_interes",
      severity: "alta",
      weight: 18,
      title: "Ordenador del gasto y supervisor son la misma persona",
      detail:
        "La misma persona aprueba el gasto y verifica su ejecución. Falla del control interno de la entidad — patrón clásico observado por la Contraloría.",
    });
  }

  // Pago a uno mismo: representante legal del proveedor = ordenador del gasto/pago de la entidad
  if (
    repLegalDoc &&
    !isPlaceholder(repLegalDoc) &&
    (repLegalDoc === ordGastoDoc || repLegalDoc === ordPagoDoc)
  ) {
    signals.push({
      id: "pago-a-uno-mismo",
      category: "concentracion",
      umbrella: "conflictos_interes",
      severity: "alta",
      weight: 22,
      title: "Representante legal del proveedor coincide con ordenador de la entidad",
      detail:
        "El documento de identidad del representante legal del adjudicatario coincide con el del ordenador del gasto o de pago. Conflicto de interés flagrante.",
    });
  }

  // Proveedor sin identificación clara (relaciones inusuales)
  if (
    isPlaceholder(row.documento_proveedor) ||
    (row.proveedor_adjudicado &&
      String(row.proveedor_adjudicado).toLowerCase().includes("sin descripcion"))
  ) {
    signals.push({
      id: "proveedor-sin-identificacion",
      category: "transparencia",
      umbrella: "relaciones",
      severity: "media",
      weight: 8,
      title: "Identificación del proveedor incompleta o ausente",
      detail:
        "El campo de proveedor o documento del proveedor está vacío o como placeholder. Imposibilita rastrear vínculos, otros contratos y beneficiarios reales.",
    });
  }

  // ── 4. Plazos sospechosos (implementación) ───────────────────
  if (fechaFirma && fechaInicio) {
    const d = daysBetween(fechaFirma, fechaInicio);
    if (d < 0) {
      signals.push({
        id: "fecha-incoherente",
        category: "temporal",
        umbrella: "implementacion",
        severity: "alta",
        weight: 12,
        title: "Fecha de inicio anterior a la firma",
        detail: `La ejecución comienza ${Math.abs(d)} días antes de la firma — posible backdating.`,
      });
    } else if (d === 0) {
      signals.push({
        id: "inicio-inmediato",
        category: "temporal",
        umbrella: "implementacion",
        severity: "media",
        weight: 6,
        title: "Inicio el mismo día de la firma",
        detail:
          "Inicio inmediato sin tiempo para perfeccionamiento (pólizas, registro presupuestal) puede indicar prisa irregular.",
      });
    }
  }

  if (fechaInicio && fechaFin) {
    const d = daysBetween(fechaInicio, fechaFin);
    if (d < 0) {
      signals.push({
        id: "duracion-negativa",
        category: "temporal",
        umbrella: "implementacion",
        severity: "alta",
        weight: 14,
        title: "Fecha fin anterior a la fecha de inicio",
        detail: "Duración negativa — error de captura grave o backdating.",
      });
    } else if (d > 365 * 5) {
      signals.push({
        id: "duracion-excesiva",
        category: "temporal",
        umbrella: "implementacion",
        severity: "media",
        weight: 8,
        title: `Duración del contrato: ${(d / 365).toFixed(1)} años`,
        detail:
          "Contratos a más de 5 años requieren vigencias futuras y son atípicos en gasto recurrente.",
      });
    }
  }

  // ── 4b. Adendas / extensiones de plazo ───────────────────────
  if (diasAdicionados !== null && diasAdicionados > 0) {
    const sev: Severity =
      diasAdicionados > 365 ? "alta" : diasAdicionados > 90 ? "media" : "baja";
    const weight = sev === "alta" ? 14 : sev === "media" ? 8 : 3;
    signals.push({
      id: "dias-adicionados",
      category: "temporal",
      umbrella: "implementacion",
      severity: sev,
      weight,
      title: `${diasAdicionados} días adicionados al plazo original`,
      detail:
        "Las extensiones de plazo (otrosíes) son uno de los principales mecanismos de captura del valor en obra pública y consultoría. La Contraloría las monitorea de forma especial cuando superan 90 días.",
    });
  }

  // ── 5. Calidad de datos / transparencia (relaciones) ─────────
  const camposCriticos: Array<{ key: keyof ContractRow; label: string }> = [
    { key: "objeto_del_contrato", label: "Objeto del contrato" },
    { key: "descripcion_del_proceso", label: "Descripción del proceso" },
    { key: "proveedor_adjudicado", label: "Proveedor adjudicado" },
    { key: "documento_proveedor", label: "Documento del proveedor" },
  ];
  const faltantes = camposCriticos.filter((c) => isPlaceholder(row[c.key]));
  if (faltantes.length > 0) {
    signals.push({
      id: "campos-criticos-faltantes",
      category: "transparencia",
      umbrella: "relaciones",
      severity: faltantes.length >= 2 ? "alta" : "media",
      weight: faltantes.length * 6,
      title: `${faltantes.length} campo(s) crítico(s) sin información`,
      detail: `Falta información en: ${faltantes.map((f) => f.label).join(", ")}. La transparencia exige completitud en estos campos.`,
    });
  }

  // Descripción muy corta o genérica
  const obj = (row.objeto_del_contrato ?? row.descripcion_del_proceso ?? "").trim();
  if (obj && obj.length > 0 && obj.length < 30) {
    signals.push({
      id: "objeto-vago",
      category: "transparencia",
      umbrella: "licitacion",
      severity: "baja",
      weight: 4,
      title: "Objeto del contrato muy breve",
      detail: `El objeto tiene solo ${obj.length} caracteres. Objetos vagos dificultan la fiscalización ciudadana.`,
    });
  }

  // ── Score y nivel ────────────────────────────────────────────
  const rawScore = signals.reduce((sum, s) => sum + s.weight, 0);
  const score = Math.min(100, Math.round(rawScore));

  const level: RiskAssessment["level"] =
    score >= 70 ? "crítico" : score >= 50 ? "alto" : score >= 30 ? "medio" : score >= 15 ? "bajo" : "mínimo";

  const summary = {
    high: signals.filter((s) => s.severity === "alta").length,
    medium: signals.filter((s) => s.severity === "media").length,
    low: signals.filter((s) => s.severity === "baja").length,
  };

  return {
    score,
    level,
    signals: signals.sort((a, b) => b.weight - a.weight),
    summary,
  };
}

function formatCop(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}
