// FILE: /apps/web/src/lib/equipmentDetection.js

export function normalizeText(value = "") {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function toLowerText(value = "") {
  return normalizeText(value).toLowerCase();
}

const EQUIPMENT_RULES = [
  {
    type: "Pressure Vessel",
    category: "Pressure Test Certificate",
    keywords: [
      "pressure vessel",
      "vessel",
      "mawp",
      "design pressure",
      "test pressure",
      "psi",
      "kpa",
      "bar",
    ],
  },
  {
    type: "Air Receiver",
    category: "Pressure Test Certificate",
    keywords: [
      "air receiver",
      "receiver",
      "compressed air",
      "compressor receiver",
      "working pressure",
    ],
  },
  {
    type: "Forklift",
    category: "Thorough Examination Certificate",
    keywords: [
      "forklift",
      "lift truck",
      "counterbalance",
      "toyota 8fg",
      "hyster",
      "tcm",
      "komatsu forklift",
    ],
  },
  {
    type: "Crane",
    category: "Load Test Certificate",
    keywords: [
      "crane",
      "mobile crane",
      "overhead crane",
      "gantry crane",
      "boom",
      "slew",
      "hook block",
    ],
  },
  {
    type: "Chain Block",
    category: "Load Test Certificate",
    keywords: [
      "chain block",
      "chain hoist",
      "lever hoist",
      "hoist",
    ],
  },
  {
    type: "Shackle",
    category: "Load Test Certificate",
    keywords: [
      "shackle",
      "bow shackle",
      "dee shackle",
      "d shackle",
    ],
  },
  {
    type: "Lifting Sling",
    category: "Load Test Certificate",
    keywords: [
      "sling",
      "webbing sling",
      "round sling",
      "chain sling",
      "sling length",
    ],
  },
  {
    type: "Lifting Beam",
    category: "Load Test Certificate",
    keywords: [
      "lifting beam",
      "spreader beam",
      "spreader",
      "beam swl",
    ],
  },
  {
    type: "Man Cage",
    category: "Load Test Certificate",
    keywords: [
      "man cage",
      "man basket",
      "personnel basket",
      "basket swl",
    ],
  },
  {
    type: "Excavator Bucket",
    category: "Load Test Certificate",
    keywords: [
      "bucket",
      "excavator",
      "zx250",
      "cat bucket",
      "hitachi bucket",
      "bucket capacity",
      "lifting lug",
    ],
  },
  {
    type: "Ladder",
    category: "Inspection Certificate",
    keywords: [
      "ladder",
      "step ladder",
      "extension ladder",
    ],
  },
  {
    type: "Scaffolding",
    category: "Inspection Certificate",
    keywords: [
      "scaffold",
      "scaffolding",
      "tower scaffold",
    ],
  },
];

export function detectEquipmentType(input) {
  const haystack = toLowerText(
    [
      input?.raw_text,
      input?.manufacturer,
      input?.model,
      input?.serial_number,
      input?.equipment_description,
      input?.plate_text,
      input?.capacity,
      input?.swl,
      input?.mawp,
    ]
      .filter(Boolean)
      .join(" ")
  );

  let best = {
    type: "General Equipment",
    category: "Inspection Certificate",
    score: 0,
  };

  for (const rule of EQUIPMENT_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (haystack.includes(keyword)) score += 1;
    }
    if (score > best.score) {
      best = {
        type: rule.type,
        category: rule.category,
        score,
      };
    }
  }

  if (best.score === 0) {
    if (haystack.includes("swl") || haystack.includes("wll")) {
      return {
        type: "Lifting Equipment",
        category: "Load Test Certificate",
      };
    }

    if (
      haystack.includes("pressure") ||
      haystack.includes("kpa") ||
      haystack.includes("bar") ||
      haystack.includes("psi")
    ) {
      return {
        type: "Pressure Equipment",
        category: "Pressure Test Certificate",
      };
    }
  }

  return {
    type: best.type,
    category: best.category,
  };
}

export function buildEquipmentDescription(data = {}) {
  const parts = [
    normalizeText(data.manufacturer),
    normalizeText(data.equipment_type),
    normalizeText(data.model),
    normalizeText(data.capacity),
  ].filter(Boolean);

  let description = parts.join(" ");

  const serial = normalizeText(data.serial_number || data.identification_number || data.equipment_id);
  if (serial) {
    description = description
      ? `${description} SN:${serial}`
      : `SN:${serial}`;
  }

  return description || "Unnamed Equipment";
}

export function expiryBucketFromDate(value) {
  if (!value) return "NO_EXPIRY";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(value);
  expiry.setHours(0, 0, 0, 0);

  const diffDays = Math.round((expiry.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= 30) return "EXPIRING_30_DAYS";
  return "ACTIVE";
}

export function buildDocumentGroup({ clientName, equipmentType, equipmentDescription }) {
  return [
    normalizeText(clientName) || "Unknown Client",
    normalizeText(equipmentType) || "General Equipment",
    normalizeText(equipmentDescription) || "Unnamed Equipment",
  ].join(" / ");
}
