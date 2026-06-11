import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DAYS, CATEGORIES, CATEGORY_ICONS, buildGroceryList } from './mealLogic'

const BRAND_GREEN = [70, 102, 70]   // sage-600
const BRAND_CREAM = [253, 252, 248]  // cream-50
const TEXT_DARK   = [30, 30, 30]
const TEXT_MID    = [100, 100, 100]

function addPageHeader(doc, text, pageWidth) {
  doc.setFillColor(...BRAND_GREEN)
  doc.rect(0, 0, pageWidth, 18, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(text, 14, 12)
  doc.setTextColor(...TEXT_DARK)
}

function addFooter(doc, pageNum, totalPages, pageWidth, pageHeight) {
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_MID)
  doc.text('Meal Planner', 14, pageHeight - 8)
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' })
}

export function exportToPDF(weeklyPlan, username = 'Your') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth  = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // ── Cover Page ─────────────────────────────────────────────
  doc.setFillColor(...BRAND_GREEN)
  doc.rect(0, 0, pageWidth, 80, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(32)
  doc.setTextColor(255, 255, 255)
  doc.text('Weekly Meal Plan', pageWidth / 2, 42, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(`${username}'s plan`, pageWidth / 2, 58, { align: 'center' })

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  doc.setFontSize(10)
  doc.setTextColor(...TEXT_MID)
  doc.text(`Generated on ${today}`, pageWidth / 2, 95, { align: 'center' })

  // Table of contents
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...TEXT_DARK)
  doc.text('Contents', 14, 115)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  DAYS.forEach((day, i) => {
    doc.text(`${day}`, 20, 125 + i * 8)
    doc.text(`Page ${i + 2}`, pageWidth - 14, 125 + i * 8, { align: 'right' })
  })
  doc.text('Grocery List', 20, 125 + DAYS.length * 8)
  doc.text(`Page ${DAYS.length + 2}`, pageWidth - 14, 125 + DAYS.length * 8, { align: 'right' })

  // ── Daily Plan Pages ────────────────────────────────────────
  DAYS.forEach((dayName, dayIdx) => {
    doc.addPage()
    addPageHeader(doc, `🍽  ${dayName}`, pageWidth)

    let y = 28
    const dayMeals = weeklyPlan[dayIdx] || {}

    CATEGORIES.forEach(category => {
      const meal = dayMeals[category]
      if (!meal) return

      const icon = CATEGORY_ICONS[category] || ''

      // Category label
      doc.setFillColor(...BRAND_CREAM)
      doc.roundedRect(14, y - 4, pageWidth - 28, 8, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...BRAND_GREEN)
      doc.text(`${icon}  ${category}`, 18, y + 1)

      // Meal name
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(...TEXT_DARK)
      doc.text(meal.item_name, 14, y + 12)

      // Ingredients table
      const ingredients = meal.ingredients || ''
      autoTable(doc, {
        startY: y + 16,
        head: [],
        body: [
          ['Ingredients', ingredients],
          ...(meal.notes ? [['Notes', meal.notes]] : []),
          ['Diet', (meal.diet_type || '').toUpperCase()],
        ],
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 2,
          textColor: TEXT_DARK,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 28, textColor: TEXT_MID },
          1: { cellWidth: pageWidth - 56 },
        },
        margin: { left: 14, right: 14 },
      })

      y = doc.lastAutoTable.finalY + 10

      // Page break if needed
      if (y > pageHeight - 30) {
        doc.addPage()
        addPageHeader(doc, `🍽  ${dayName} (continued)`, pageWidth)
        y = 28
      }
    })

    addFooter(doc, dayIdx + 2, DAYS.length + 2, pageWidth, pageHeight)
  })

  // ── Grocery List Page ───────────────────────────────────────
  doc.addPage()
  addPageHeader(doc, '🛒  Weekly Grocery List', pageWidth)

  const groceryMap = buildGroceryList(weeklyPlan)
  const sortedIngredients = Object.keys(groceryMap).sort()

  const groceryRows = sortedIngredients.map(ing => [
    `☐  ${ing.charAt(0).toUpperCase() + ing.slice(1)}`,
    groceryMap[ing].slice(0, 3).join(', ') + (groceryMap[ing].length > 3 ? '...' : ''),
  ])

  autoTable(doc, {
    startY: 24,
    head: [['Ingredient', 'Used In']],
    body: groceryRows,
    theme: 'striped',
    headStyles: {
      fillColor: BRAND_GREEN,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: TEXT_DARK,
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: pageWidth - 88 },
    },
    margin: { left: 14, right: 14 },
    alternateRowStyles: { fillColor: [248, 250, 248] },
  })

  addFooter(doc, DAYS.length + 2, DAYS.length + 2, pageWidth, pageHeight)

  // ── Save ────────────────────────────────────────────────────
  const filename = `meal-plan-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
