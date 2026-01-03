// Edge function to parse bank statements and categorize merchants with Gemini.\nimport { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_AI_API_KEY") ?? "";

const CATEGORY_LABELS = [
  "Matvara",
  "Veitingar",
  "Reikningar",
  "Samgöngur",
  "Skemmtun",
  "Laun",
  "Annað",
];

const HEADER_ALIASES = {
  date: ["date", "transaction date", "value date", "booking date", "dagsetning", "faersludagur"],
  merchant: ["merchant", "description", "details", "text", "skyring", "lysing", "beneficiary", "receiver"],
  amount: ["amount", "value", "amount isk", "isk", "upphaed", "faersluupphaed"],
  debit: ["debit", "withdrawal", "out"],
  credit: ["credit", "deposit", "in"],
};

const MAX_HEADER_SCAN = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: "Supabase env vars not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let payload;
  try {
    payload = await req.json();
  } catch (_err) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { fileBase64, storagePath, storageBucket, accountId } = payload ?? {};

  let fileBytes;
  try {
    fileBytes = await resolveFileBytes({ fileBase64, storagePath, storageBucket, authHeader });
  } catch (err) {
    return jsonResponse({ error: err.message ?? "Failed to load file" }, 400);
  }

  const workbook = XLSX.read(fileBytes, { type: "array" });
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) {
    return jsonResponse({ error: "No worksheet found" }, 400);
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
  if (!rows.length) {
    return jsonResponse({ error: "No rows found" }, 400);
  }

  const { headerRow, startIndex } = detectHeaderRow(rows);
  const columnMap = mapColumns(headerRow);

  if (columnMap.dateIndex === null || (columnMap.amountIndex === null && columnMap.debitIndex === null && columnMap.creditIndex === null)) {
    return jsonResponse({ error: "Missing required columns (date/amount)" }, 400);
  }

  const parsedRows = [];
  for (let i = startIndex; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawDate = getCell(row, columnMap.dateIndex);
    const rawMerchant = getCell(row, columnMap.merchantIndex);
    const rawAmount = getCell(row, columnMap.amountIndex);
    const rawDebit = getCell(row, columnMap.debitIndex);
    const rawCredit = getCell(row, columnMap.creditIndex);

    const parsedDate = parseDateCell(rawDate);
    if (!parsedDate) continue;

    const merchantOriginal = String(rawMerchant ?? "").trim();
    if (!merchantOriginal) continue;

    const amount = resolveAmount(rawAmount, rawDebit, rawCredit);
    if (amount === null) continue;

    parsedRows.push({
      date: parsedDate,
      merchant_original: merchantOriginal,
      amount,
    });
  }

  if (!parsedRows.length) {
    return jsonResponse({ error: "No transactions parsed" }, 400);
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name");

  if (categoriesError || !categories) {
    return jsonResponse({ error: "Unable to load categories" }, 500);
  }

  const categoryByName = new Map(categories.map((category) => [category.name, category.id]));
  const defaultCategoryId = categoryByName.get("Annað") ?? null;

  const { data: existingMappings } = await supabase
    .from("transactions")
    .select("merchant_original, merchant_clean, category_id, categories(name)")
    .eq("user_id", userData.user.id)
    .not("category_id", "is", null);

  const merchantMap = new Map();
  (existingMappings ?? []).forEach((row) => {
    const candidate = row.merchant_clean || row.merchant_original;
    const normalized = normalizeMerchant(candidate);
    if (!normalized) return;
    merchantMap.set(normalized, {
      merchant_clean: row.merchant_clean || row.merchant_original,
      category_name: row.categories?.name ?? null,
      category_id: row.category_id,
    });
  });

  const uniqueMerchants = Array.from(new Set(parsedRows.map((row) => normalizeMerchant(row.merchant_original))));
  const aiCache = new Map();

  for (const normalized of uniqueMerchants) {
    if (!normalized || merchantMap.has(normalized)) continue;
    const original = parsedRows.find((row) => normalizeMerchant(row.merchant_original) === normalized)?.merchant_original;
    if (!original) continue;
    const aiResult = await classifyMerchant(original);
    aiCache.set(normalized, aiResult);
  }

  const insertPayload = parsedRows.map((row) => {
    const normalized = normalizeMerchant(row.merchant_original);
    const mapped = merchantMap.get(normalized) ?? aiCache.get(normalized) ?? {};
    const categoryName = mapped.category_name && categoryByName.has(mapped.category_name)
      ? mapped.category_name
      : normalizeCategory(mapped.category ?? "");

    return {
      user_id: userData.user.id,
      account_id: accountId ?? null,
      date: row.date,
      merchant_original: row.merchant_original,
      merchant_clean: mapped.merchant_clean || cleanMerchant(row.merchant_original),
      amount: row.amount,
      category_id: categoryByName.get(categoryName) ?? defaultCategoryId,
      tags: [],
      is_verified: false,
    };
  });

  const { data: insertedRows, error: insertError } = await supabase
    .from("transactions")
    .insert(insertPayload)
    .select("id, date, merchant_original, merchant_clean, amount, category_id");

  if (insertError) {
    return jsonResponse({ error: insertError.message ?? "Insert failed" }, 500);
  }

  const categoryById = new Map(categories.map((category) => [category.id, category.name]));
  const responseRows = (insertedRows ?? []).map((row) => ({
    ...row,
    category_name: categoryById.get(row.category_id) ?? "Annað",
  }));

  return jsonResponse({
    processed: responseRows.length,
    transactions: responseRows,
  });
});

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveFileBytes({ fileBase64, storagePath, storageBucket, authHeader }) {
  if (fileBase64) {
    const cleaned = String(fileBase64).split(",").pop().trim();
    return decodeBase64(cleaned);
  }

  if (!storagePath) {
    throw new Error("Missing fileBase64 or storagePath");
  }

  const bucket = storageBucket || "statements";
  const storageClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await storageClient.storage.from(bucket).download(storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? "Unable to download file from storage");
  }

  return new Uint8Array(await data.arrayBuffer());
}

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function detectHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, MAX_HEADER_SCAN); i += 1) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    const normalized = row.map((cell) => normalizeHeader(cell));
    const matches = {
      date: normalized.some((value) => hasAlias(value, HEADER_ALIASES.date)),
      merchant: normalized.some((value) => hasAlias(value, HEADER_ALIASES.merchant)),
      amount: normalized.some((value) => hasAlias(value, HEADER_ALIASES.amount) || hasAlias(value, HEADER_ALIASES.debit) || hasAlias(value, HEADER_ALIASES.credit)),
    };

    if ((matches.date && matches.amount) || (matches.date && matches.merchant && matches.amount)) {
      return { headerRow: row, startIndex: i + 1 };
    }
  }

  return { headerRow: rows[0], startIndex: 1 };
}

function mapColumns(headerRow) {
  const normalized = headerRow.map((cell) => normalizeHeader(cell));
  const findIndex = (aliases) => normalized.findIndex((value) => hasAlias(value, aliases));

  return {
    dateIndex: findIndex(HEADER_ALIASES.date),
    merchantIndex: findIndex(HEADER_ALIASES.merchant),
    amountIndex: findIndex(HEADER_ALIASES.amount),
    debitIndex: findIndex(HEADER_ALIASES.debit),
    creditIndex: findIndex(HEADER_ALIASES.credit),
  };
}

function hasAlias(value, aliases) {
  if (!value) return false;
  return aliases.some((alias) => value.includes(alias));
}

function normalizeHeader(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function getCell(row, index) {
  if (index === null || index === undefined || index < 0) return null;
  return row[index];
}

function parseDateCell(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).toISOString().slice(0, 10);
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
      return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
    }

    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }
  }

  return null;
}

function parseAmountCell(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;

  const cleaned = String(value)
    .replace(/[^0-9,.-]/g, "")
    .replace(/\s+/g, "");

  if (!cleaned) return null;

  let normalized = cleaned;
  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");
  if (hasDot && hasComma) {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else if (hasComma && !hasDot) {
    normalized = normalized.replace(/,/g, ".");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolveAmount(rawAmount, rawDebit, rawCredit) {
  const direct = parseAmountCell(rawAmount);
  if (direct !== null) return direct;

  const debit = parseAmountCell(rawDebit) ?? 0;
  const credit = parseAmountCell(rawCredit) ?? 0;
  const derived = credit - debit;
  return Number.isNaN(derived) ? null : derived;
}

function normalizeMerchant(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanMerchant(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCategory(value) {
  if (!value) return "Annað";
  const trimmed = value.trim();
  const normalized = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const match = CATEGORY_LABELS.find((label) => {
    const normalizedLabel = label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return normalizedLabel === normalized;
  });
  return match ?? "Annað";
}

async function classifyMerchant(merchantOriginal) {
  if (!GEMINI_API_KEY) {
    return {
      merchant_clean: cleanMerchant(merchantOriginal),
      category: "Annað",
    };
  }

  const prompt = `You are a financial analyst. Identify this merchant: "${merchantOriginal}".\nReturn JSON only with keys: merchant_clean, category.\nCategory must be one of: ${CATEGORY_LABELS.join(", ")}.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 128 },
        tools: [{ google_search: {} }],
      }),
    },
  );

  if (!response.ok) {
    return {
      merchant_clean: cleanMerchant(merchantOriginal),
      category: "Annað",
    };
  }

  const result = await response.json();
  const text = (result.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join(" ")
    .trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      merchant_clean: cleanMerchant(merchantOriginal),
      category: "Annað",
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      merchant_clean: cleanMerchant(parsed.merchant_clean ?? merchantOriginal),
      category: normalizeCategory(parsed.category ?? ""),
    };
  } catch (_err) {
    return {
      merchant_clean: cleanMerchant(merchantOriginal),
      category: "Annað",
    };
  }
}


