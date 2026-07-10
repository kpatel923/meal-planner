import Papa from 'papaparse'

const REQUIRED_FIELDS = ['item_name', 'category', 'ingredients', 'diet_type']
const VALID_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']
const VALID_DIET_TYPES  = ['veg', 'vegan', 'nonveg']

// Every recipe field we round-trip through export/import. Keeping this list in
// one place means export and import stay in sync — nothing silently dropped.
const OPTIONAL_STRING_FIELDS = [
  'notes', 'detail_notes', 'video_url', 'written_url', 'photo_url', 'image_url',
  'source', 'budget_tag',
]
const OPTIONAL_NUMBER_FIELDS = [
  'prep_time', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g',
  'cost_per_serving', 'leftover_days', 'rating',
]

// ─────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────

export function exportMealsAsJSON(meals, filename = 'my-meals.json') {
  const clean = meals.map(({ id, user_id, created_at, updated_at, ...rest }) => rest)
  const blob  = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' })
  triggerDownload(blob, filename)
}

export function exportMealsAsCSV(meals, filename = 'my-meals.csv') {
  const clean = meals.map(({ id, user_id, created_at, updated_at, ...rest }) => rest)
  const csv   = Papa.unparse(clean)
  const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename)
}

function triggerDownload(blob, filename) {
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href  = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────
// IMPORT
// ─────────────────────────────────────────

// Returns { valid: [], errors: [] }
export async function parseMealsFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'json') {
    return parseJSON(file)
  } else if (ext === 'csv') {
    return parseCSV(file)
  } else {
    return { valid: [], errors: ['Unsupported file type. Please upload a .json or .csv file.'] }
  }
}

async function parseJSON(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        const rows = Array.isArray(data) ? data : [data]
        resolve(validateRows(rows))
      } catch {
        resolve({ valid: [], errors: ['Invalid JSON file. Could not parse.'] })
      }
    }
    reader.readAsText(file)
  })
}

async function parseCSV(file) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(validateRows(results.data))
      },
      error: () => {
        resolve({ valid: [], errors: ['Failed to parse CSV file.'] })
      },
    })
  })
}

function validateRows(rows) {
  const valid  = []
  const errors = []

  rows.forEach((row, i) => {
    const rowNum = i + 1
    const rowErrors = []

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!row[field] || String(row[field]).trim() === '') {
        rowErrors.push(`Row ${rowNum}: missing "${field}"`)
      }
    }

    // Validate category
    if (row.category && !VALID_CATEGORIES.includes(row.category)) {
      rowErrors.push(
        `Row ${rowNum}: category "${row.category}" must be one of ${VALID_CATEGORIES.join(', ')}`
      )
    }

    // Validate diet_type
    if (row.diet_type && !VALID_DIET_TYPES.includes(row.diet_type)) {
      rowErrors.push(
        `Row ${rowNum}: diet_type "${row.diet_type}" must be one of ${VALID_DIET_TYPES.join(', ')}`
      )
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
    } else {
      const clean = {
        item_name:   String(row.item_name).trim(),
        category:    String(row.category).trim(),
        ingredients: String(row.ingredients).trim(),
        diet_type:   String(row.diet_type).trim(),
      }
      // Carry every optional detail so an import fully restores a recipe.
      for (const f of OPTIONAL_STRING_FIELDS) {
        if (row[f] != null && String(row[f]).trim() !== '') clean[f] = String(row[f]).trim()
      }
      for (const f of OPTIONAL_NUMBER_FIELDS) {
        if (row[f] != null && String(row[f]).trim() !== '') {
          const n = Number(row[f])
          if (Number.isFinite(n)) clean[f] = n
        }
      }
      valid.push(clean)
    }
  })

  return { valid, errors }
}
