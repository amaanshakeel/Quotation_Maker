const LOGIN_USERNAME = "admin";
const LOGIN_PASSWORD = "admin123";

const COMPANY = {
  name: "AL HASHMI",
  subtitle: "EVENTS DECORATOR",
  address: "Main Lehtrar Road, Alipur, Islamabad.",
  phones: ["0337-9702328", "0319-1837192"],
  quotationTitle: "Quatation",
  logoMain: "assets/logo-main.jpg",
  logoWordmark: "assets/logo-wordmark.jpg",
  notes: [
    "Note: 1) Tax is not included in this amount. If the payment mode is cash so no tax is charged otherwise 16% Tax will be charged o the final amount",
    "2) Carriage Charges not included."
  ]
};

const STORAGE_KEY = "alHashmiQuotations";
const SESSION_KEY = "alHashmiLoggedIn";
const TAX_RATE = 0.16;

const state = {
  editingId: null
};

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const quotationForm = document.getElementById("quotation-form");
const formError = document.getElementById("form-error");
const itemsBody = document.getElementById("items-body");
const preview = document.getElementById("quotation-preview");
const historyList = document.getElementById("history-list");

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindEvents();
  addItemRow();
  showSession();
  updateEverything();
}

function bindEvents() {
  loginForm.addEventListener("submit", handleLogin);
  document.getElementById("logout-button").addEventListener("click", logout);
  document.getElementById("add-item-button").addEventListener("click", () => addItemRow());
  document.getElementById("save-button").addEventListener("click", () => saveCurrentQuotation(true));
  document.getElementById("download-button").addEventListener("click", () => downloadCurrentQuotation());
  document.getElementById("preview-button").addEventListener("click", () => preview.scrollIntoView({ behavior: "smooth", block: "start" }));
  document.getElementById("clear-history-button").addEventListener("click", clearAllHistory);
  quotationForm.addEventListener("input", updateEverything);
  quotationForm.addEventListener("change", updateEverything);
}

function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "true");
    loginError.textContent = "";
    showSession();
    return;
  }
  loginError.textContent = "Incorrect username or password.";
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  loginForm.reset();
  showSession();
}

function showSession() {
  const loggedIn = sessionStorage.getItem(SESSION_KEY) === "true";
  loginScreen.classList.toggle("hidden", loggedIn);
  appScreen.classList.toggle("hidden", !loggedIn);
  renderHistory();
}

function addItemRow(item = {}) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>
      <div class="item-name-cell">
        <select class="item-type">
          <option value="standard" ${item.type === "standard" ? "selected" : ""}>Standard</option>
          <option value="category" ${item.type === "category" ? "selected" : ""}>Category</option>
          <option value="product" ${item.type === "product" ? "selected" : ""}>Product</option>
        </select>
        <input class="item-name" type="text" value="${escapeAttribute(item.name || "")}" placeholder="Item/Category/Product Name">
      </div>
    </td>
    <td class="cell-qty"><input class="item-qty" type="number" min="0" step="0.01" value="${item.qty ? escapeAttribute(item.qty) : ""}"></td>
    <td class="cell-rate"><input class="item-rate" type="number" min="0" step="0.01" value="${item.rate ? escapeAttribute(item.rate) : ""}"></td>
    <td class="cell-amount amount-cell">0</td>
    <td><button type="button" class="remove-item" aria-label="Remove item">X</button></td>
  `;

  row.querySelector(".remove-item").addEventListener("click", (e) => {
    e.stopPropagation();
    if (itemsBody.children.length > 1) {
      const nextToSelect = row.previousElementSibling || row.nextElementSibling;
      row.remove();
      if (nextToSelect) {
        selectRow(nextToSelect);
      }
      adjustTableSpans();
      updateEverything();
    }
  });

  row.querySelector(".item-type").addEventListener("change", () => {
    adjustTableSpans();
    updateEverything();
  });

  row.addEventListener("click", (e) => {
    if (e.target.closest(".remove-item")) return;
    selectRow(row);
  });

  row.addEventListener("focusin", () => {
    selectRow(row);
  });

  const selectedRow = itemsBody.querySelector("tr.selected-row");
  if (selectedRow) {
    selectedRow.after(row);
  } else {
    itemsBody.appendChild(row);
  }

  selectRow(row);
  adjustTableSpans();
  updateEverything();
}

function getFormData() {
  const formData = new FormData(quotationForm);
  return {
    name: cleanText(formData.get("name")),
    address: cleanText(formData.get("address")),
    guests: cleanText(formData.get("guests")),
    functionType: cleanText(formData.get("functionType")),
    functionDate: cleanText(formData.get("functionDate")),
    contact: cleanText(formData.get("contact")),
    bookedBy: cleanText(formData.get("bookedBy")),
    setupReadyTime: cleanText(formData.get("setupReadyTime")),
    foodTime: cleanText(formData.get("foodTime")),
    paymentMode: cleanText(formData.get("paymentMode")),
    advanceAmount: toNumber(formData.get("advanceAmount")),
    discount: toNumber(formData.get("discount")),
    discountType: formData.get("discountType") || "flat",
    items: getItems()
  };
}

function getItems() {
  return Array.from(itemsBody.querySelectorAll("tr")).map((row) => {
    const typeSelect = row.querySelector(".item-type");
    const type = typeSelect ? typeSelect.value : "standard";
    const qtyInput = row.querySelector(".item-qty");
    const rateInput = row.querySelector(".item-rate");
    
    const qty = (type === "product" || !qtyInput) ? 0 : toNumber(qtyInput.value);
    const rate = (type === "product" || !rateInput) ? 0 : toNumber(rateInput.value);
    
    return {
      type,
      name: cleanText(row.querySelector(".item-name").value),
      qty,
      rate,
      amount: qty * rate
    };
  });
}

function calculateTotals(data) {
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  
  let discount = 0;
  if (data.discountType === "percent") {
    const percent = Math.max(0, Math.min(100, data.discount));
    discount = (subtotal * percent) / 100;
  } else {
    discount = Math.min(data.discount, subtotal);
  }
  
  const afterDiscount = Math.max(subtotal - discount, 0);
  const tax = data.paymentMode && data.paymentMode.toLowerCase() !== "cash" ? afterDiscount * TAX_RATE : 0;
  const finalAmount = afterDiscount + tax;
  const received = data.advanceAmount;
  const balance = finalAmount - received;
  return { subtotal, discount, afterDiscount, tax, finalAmount, received, balance };
}

function updateEverything() {
  const data = getFormData();
  const totals = calculateTotals(data);
  Array.from(itemsBody.querySelectorAll("tr")).forEach((row, index) => {
    row.querySelector(".amount-cell").textContent = formatMoney(data.items[index].amount);
  });
  document.getElementById("summary-subtotal").textContent = formatMoney(totals.subtotal);
  document.getElementById("summary-discount").textContent = formatMoney(totals.discount);
  document.getElementById("summary-tax").textContent = formatMoney(totals.tax);
  document.getElementById("summary-final").textContent = formatMoney(totals.finalAmount);
  document.getElementById("summary-received").textContent = formatMoney(totals.received);
  document.getElementById("summary-balance").textContent = formatMoney(totals.balance);
  preview.innerHTML = buildPreviewHtml(data, totals);
}

function validateQuotation(data) {
  if (!data.name) return "Please enter the customer name.";
  if (!data.functionDate) return "Please select the function date.";
  if (!data.functionType) return "Please enter the function type.";
  if (!data.contact) return "Please enter the contact number.";
  if (!data.paymentMode) return "Please select the mode of payment.";
  const activeItems = data.items.filter((item) => item.name || item.type === "product" || item.qty || item.rate);
  if (!activeItems.length) return "Please enter at least one item.";
  for (const item of activeItems) {
    if (!item.name) return "Please enter an item name.";
    if (item.type !== "product") {
      if (item.qty <= 0) return "Please enter a valid quantity.";
      if (item.rate <= 0) return "Please enter a valid rate.";
    }
  }
  data.items = activeItems;
  return "";
}

function saveCurrentQuotation(showMessage) {
  const data = getFormData();
  const validation = validateQuotation(data);
  if (validation) {
    formError.textContent = validation;
    return null;
  }
  formError.textContent = "";
  const totals = calculateTotals(data);
  const history = loadHistory();
  const existingIndex = history.findIndex((entry) => entry.id === state.editingId);
  const saved = {
    id: state.editingId || createId(),
    ...data,
    ...totals,
    // Keep the value entered by the user separate from the calculated
    // discount amount stored in `discount` by the totals object.
    discountValue: data.discount,
    createdAt: existingIndex >= 0 ? history[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (existingIndex >= 0) {
    history[existingIndex] = saved;
  } else {
    history.unshift(saved);
  }
  saveHistory(history);
  state.editingId = saved.id;
  renderHistory();
  if (showMessage) formError.textContent = "Quotation saved in browser history.";
  return saved;
}

async function downloadCurrentQuotation() {
  const saved = saveCurrentQuotation(false);
  if (!saved) return;
  await generatePdf(saved);
}

async function generatePdf(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 54;
  const tableWidth = pageWidth - margin * 2;
  const gold = [200, 148, 59];
  const black = [0, 0, 0];

  await drawPdfHeader(doc, margin, tableWidth, gold);
  drawInfoRows(doc, data, margin, 170, tableWidth, gold);

  const pdfBody = buildPdfBody(data.items, gold);

  doc.autoTable({
    startY: 320,
    margin: { left: margin, right: margin },
    tableWidth,
    head: [["Item", "Qty", "Rate", "Amount"]],
    body: pdfBody,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 5,
      lineColor: black,
      lineWidth: 0.7,
      textColor: black,
      valign: "middle"
    },
    headStyles: {
      fillColor: gold,
      textColor: black,
      fontStyle: "bold",
      halign: "center"
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.46 },
      1: { cellWidth: tableWidth * 0.16, halign: "center" },
      2: { cellWidth: tableWidth * 0.18, halign: "right" },
      3: { cellWidth: tableWidth * 0.2, halign: "right" }
    }
  });

  const discountLabel = data.discountType === "percent" ? `Discount (${formatDiscountValue(getEnteredDiscount(data))}%)` : "Discount";
  const financialRows = [
    ["Total", "", "", formatMoney(data.subtotal)],
    [discountLabel, "", "", formatMoney(data.discount)],
    ["Received", "", "", formatMoney(data.received)],
    ["Balance", "", "", formatMoney(data.balance)]
  ];

  doc.autoTable({
    startY: doc.lastAutoTable.finalY,
    margin: { left: margin, right: margin },
    tableWidth,
    body: financialRows,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 5,
      lineColor: black,
      lineWidth: 0.7,
      textColor: black,
      fillColor: gold,
      fontStyle: "bold"
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.46 },
      1: { cellWidth: tableWidth * 0.16 },
      2: { cellWidth: tableWidth * 0.18 },
      3: { cellWidth: tableWidth * 0.2, halign: "right" }
    }
  });

  drawNotes(doc, margin, tableWidth);
  const filename = `AL-HASHMI-Quotation-${sanitizeFilename(data.name)}.pdf`;
  try {
    doc.save(filename);
  } catch (error) {
    window.open(doc.output("bloburl"), "_blank", "noopener");
  }
}

async function drawPdfHeader(doc, margin, tableWidth, gold) {
  const logoMain = await loadImageData(COMPANY.logoMain);
  const logoWordmark = await loadImageData(COMPANY.logoWordmark);
  const headerY = 28;
  const headerHeight = 74;
  const leftSectionWidth = tableWidth * 0.3;
  const rightSectionX = margin + leftSectionWidth;
  const rightSectionWidth = tableWidth - leftSectionWidth;
  const logoInset = 14;

  // A single black header band keeps both supplied images aligned, touching,
  // and covering the same full width as the quotation tables below.
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, headerY, tableWidth, headerHeight, "F");
  if (logoMain) {
    addContainedPdfImage(doc, logoMain, 1254, 1254, margin + logoInset, headerY, leftSectionWidth - logoInset, headerHeight, "left");
  }
  if (logoWordmark) {
    addContainedPdfImage(doc, logoWordmark, 964, 288, rightSectionX, headerY + 3, rightSectionWidth - logoInset, 48, "right");
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(214, 161, 62);
  const phoneY = headerY + headerHeight - 8;
  doc.text(COMPANY.phones[0], rightSectionX + rightSectionWidth * 0.35, phoneY, { align: "center" });
  doc.text(COMPANY.phones[1], rightSectionX + rightSectionWidth * 0.75, phoneY, { align: "center" });

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(...gold);
  doc.rect(margin, 112, tableWidth, 22, "FD");
  doc.text(COMPANY.address, margin + tableWidth / 2, 127, { align: "center" });
  doc.setFillColor(...gold);
  doc.setTextColor(0, 0, 0);
  doc.rect(margin, 138, tableWidth, 24, "FD");
  doc.setFont("helvetica", "bolditalic");
  doc.text(COMPANY.quotationTitle, margin + tableWidth / 2, 154, { align: "center" });
}

function addContainedPdfImage(doc, imageData, sourceWidth, sourceHeight, x, y, boxWidth, boxHeight, align = "center") {
  const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  let imageX = x + (boxWidth - width) / 2;
  if (align === "left") imageX = x;
  if (align === "right") imageX = x + boxWidth - width;
  const imageY = y + (boxHeight - height) / 2;
  doc.addImage(imageData, "JPEG", imageX, imageY, width, height);
}

function drawInfoRows(doc, data, margin, y, tableWidth, gold) {
  const leftW = tableWidth / 2;
  const labelW = 105;
  const rowH = 22;
  const rows = [
    ["Name:", data.name, "Booked By:", data.bookedBy || "Al Hashmi"],
    ["Address:", data.address, "Setup Ready Time:", formatTime(data.setupReadyTime)],
    ["Number of Guest:", data.guests, "Food Time:", formatTime(data.foodTime)],
    ["Function Type:", data.functionType, "Mode of Payment:", data.paymentMode],
    ["Function Date:", formatDate(data.functionDate), "Advance Amount:", formatMoney(data.advanceAmount)],
    ["Contact No:", data.contact, "Balance Amount:", formatMoney(data.balance)]
  ];

  doc.setFontSize(9);
  rows.forEach((row, index) => {
    const currentY = y + index * rowH;
    drawCell(doc, margin, currentY, labelW, rowH, row[0], true);
    drawCell(doc, margin + labelW, currentY, leftW - labelW, rowH, row[1], false);
    drawCell(doc, margin + leftW, currentY, labelW, rowH, row[2], true);
    drawCell(doc, margin + leftW + labelW, currentY, leftW - labelW, rowH, row[3], false, index === 0 ? gold : null);
  });
}

function drawCell(doc, x, y, width, height, text, isLabel, fill) {
  if (fill) {
    doc.setFillColor(...fill);
    doc.rect(x, y, width, height, "FD");
  } else {
    doc.rect(x, y, width, height);
  }
  doc.setFont("helvetica", isLabel ? "bolditalic" : "normal");
  doc.text(String(text || ""), x + 5, y + 15, { maxWidth: width - 10 });
}

function drawNotes(doc, margin, tableWidth) {
  let y = doc.lastAutoTable.finalY + 16;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - 70) {
    doc.addPage();
    y = 54;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  COMPANY.notes.forEach((note, index) => {
    const lines = doc.splitTextToSize(note, tableWidth - 10);
    doc.text(lines, margin + 5, y + index * 22);
  });
}

function buildPreviewHtml(data, totals) {
  const groups = groupItems(data.items);
  let htmlRows = "";

  groups.forEach(group => {
    if (group.type === "standard") {
      const item = group.item;
      htmlRows += `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td class="num">${escapeHtml(formatQty(item.qty))}</td>
          <td class="num">${escapeHtml(item.rate === "" ? "" : formatMoney(item.rate))}</td>
          <td class="num">${escapeHtml(formatMoney(item.amount))}</td>
        </tr>
      `;
    } else if (group.type === "category") {
      const cat = group.category;
      const rowspan = group.products.length + 1;

      htmlRows += `
        <tr class="quote-category-header">
          <td class="category-name">${escapeHtml(cat.name)}</td>
          <td class="num" rowspan="${rowspan}">${escapeHtml(formatQty(cat.qty))}</td>
          <td class="num" rowspan="${rowspan}">${escapeHtml(formatMoney(cat.rate))}</td>
          <td class="num" rowspan="${rowspan}">${escapeHtml(formatMoney(cat.amount))}</td>
        </tr>
      `;

      group.products.forEach(prod => {
        htmlRows += `
          <tr class="quote-product-row">
            <td class="product-name">${escapeHtml(prod.name)}</td>
          </tr>
        `;
      });
    }
  });

  if (!htmlRows) {
    htmlRows = `
      <tr>
        <td></td>
        <td class="num"></td>
        <td class="num"></td>
        <td class="num">0</td>
      </tr>
    `;
  }

  const discountLabel = data.discountType === "percent" ? `Discount (${formatDiscountValue(data.discount)}%)` : "Discount";

  return `
    <article class="quote-sheet">
      <header class="quote-header">
        <div class="quote-logo-section">
          <img class="quote-logo" src="${COMPANY.logoMain}" alt="${escapeHtml(COMPANY.name)} logo">
        </div>
        <div class="quote-brand-section">
          <img class="quote-wordmark" src="${COMPANY.logoWordmark}" alt="${escapeHtml(COMPANY.name)} ${escapeHtml(COMPANY.subtitle)}">
          <div class="quote-phones">
            <span>${escapeHtml(COMPANY.phones[0])}</span>
            <span>${escapeHtml(COMPANY.phones[1])}</span>
          </div>
        </div>
      </header>
      <table>
        <tr><td class="quote-address" colspan="4">${escapeHtml(COMPANY.address)}</td></tr>
        <tr><td class="quote-title" colspan="4">${escapeHtml(COMPANY.quotationTitle)}</td></tr>
        ${infoRow("Name:", data.name, "Booked By:", data.bookedBy || "Al Hashmi", true)}
        ${infoRow("Address:", data.address, "Setup Ready Time:", formatTime(data.setupReadyTime))}
        ${infoRow("Number of Guest:", data.guests, "Food Time:", formatTime(data.foodTime))}
        ${infoRow("Function Type:", data.functionType, "Mode of Payment:", data.paymentMode)}
        ${infoRow("Function Date:", formatDate(data.functionDate), "Advance Amount:", formatMoney(data.advanceAmount))}
        ${infoRow("Contact No:", data.contact, "Balance Amount:", formatMoney(totals.balance))}
      </table>
      <table class="quote-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          ${htmlRows}
          <tr class="quote-gold"><td>Total</td><td></td><td></td><td class="num">${formatMoney(totals.subtotal)}</td></tr>
          <tr class="quote-gold"><td>${discountLabel}</td><td></td><td></td><td class="num">${formatMoney(totals.discount)}</td></tr>
          <tr class="quote-gold"><td>Received</td><td></td><td></td><td class="num">${formatMoney(totals.received)}</td></tr>
          <tr class="quote-gold"><td>Balance</td><td></td><td></td><td class="num">${formatMoney(totals.balance)}</td></tr>
        </tbody>
      </table>
      <table>
        <tr><td class="quote-note" colspan="4">${escapeHtml(COMPANY.notes[0])}</td></tr>
        <tr><td class="quote-note" colspan="2">${escapeHtml(COMPANY.notes[1])}</td><td colspan="2"></td></tr>
      </table>
    </article>
  `;
}

function infoRow(leftLabel, leftValue, rightLabel, rightValue, goldRight) {
  return `
    <tr>
      <td class="quote-label">${escapeHtml(leftLabel)}</td>
      <td>${escapeHtml(leftValue)}</td>
      <td class="quote-label">${escapeHtml(rightLabel)}</td>
      <td class="${goldRight ? "quote-gold" : ""}">${escapeHtml(rightValue)}</td>
    </tr>
  `;
}

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function renderHistory() {
  const history = loadHistory();
  if (!history.length) {
    historyList.innerHTML = `<p class="auth-note">No saved quotations yet.</p>`;
    return;
  }
  historyList.innerHTML = history.map((entry) => `
    <article class="history-card">
      <div><strong>${escapeHtml(entry.name || "Unnamed")}</strong><span>Customer Name</span></div>
      <div><strong>${escapeHtml(formatDate(entry.functionDate))}</strong><span>Function Date</span></div>
      <div><strong>${escapeHtml(formatMoney(entry.finalAmount))}</strong><span>Total</span></div>
      <div><strong>${escapeHtml(formatDateTime(entry.createdAt))}</strong><span>Created Date</span></div>
      <div class="history-actions">
        <button type="button" class="ghost-button" data-action="view" data-id="${entry.id}">View</button>
        <button type="button" class="secondary-button" data-action="edit" data-id="${entry.id}">Edit</button>
        <button type="button" class="primary-button" data-action="download" data-id="${entry.id}">Download PDF</button>
        <button type="button" class="danger-button" data-action="delete" data-id="${entry.id}">Delete</button>
      </div>
    </article>
  `).join("");
  historyList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => handleHistoryAction(button.dataset.action, button.dataset.id));
  });
}

async function handleHistoryAction(action, id) {
  const history = loadHistory();
  const entry = history.find((item) => item.id === id);
  if (!entry) return;
  if (action === "delete") {
    if (confirm("Are you sure you want to delete this quotation?")) {
      saveHistory(history.filter((item) => item.id !== id));
      if (state.editingId === id) state.editingId = null;
      renderHistory();
    }
    return;
  }
  if (action === "download") {
    await generatePdf(entry);
    return;
  }
  loadQuotation(entry);
  if (action === "view") {
    preview.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    quotationForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function loadQuotation(entry) {
  state.editingId = entry.id;
  setField("name", entry.name);
  setField("address", entry.address);
  setField("guests", entry.guests);
  setField("functionType", entry.functionType);
  setField("functionDate", entry.functionDate);
  setField("contact", entry.contact);
  setField("bookedBy", entry.bookedBy);
  setField("setupReadyTime", entry.setupReadyTime);
  setField("foodTime", entry.foodTime);
  setField("paymentMode", entry.paymentMode);
  setField("advanceAmount", entry.advanceAmount);
  setField("discount", getEnteredDiscount(entry));
  setField("discountType", entry.discountType || "flat");
  itemsBody.innerHTML = "";
  (entry.items && entry.items.length ? entry.items : [{}]).forEach((item) => addItemRow(item));
  adjustTableSpans();
  updateEverything();
}

function clearAllHistory() {
  if (confirm("This will permanently delete all saved quotations from this browser.\nAre you sure?")) {
    localStorage.removeItem(STORAGE_KEY);
    state.editingId = null;
    renderHistory();
  }
}

function setField(name, value) {
  const field = quotationForm.elements[name];
  if (field) field.value = value ?? "";
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function cleanText(value) {
  return String(value || "").trim();
}

function formatMoney(value) {
  return Math.round(toNumber(value)).toLocaleString("en-US");
}

function formatQty(value) {
  if (value === "") return "";
  const number = toNumber(value);
  return Number.isInteger(number) ? String(number) : String(number.toFixed(2)).replace(/\.?0+$/, "");
}

function formatDiscountValue(value) {
  const number = toNumber(value);
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(2)));
}

function getEnteredDiscount(data) {
  if (data.discountValue !== undefined) return toNumber(data.discountValue);
  // Quotations saved before discountValue was introduced stored the calculated
  // amount in `discount`. Recover the percentage when enough data is available.
  if (data.discountType === "percent" && toNumber(data.subtotal) > 0) {
    return (toNumber(data.discount) / toNumber(data.subtotal)) * 100;
  }
  return toNumber(data.discount);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
}

function formatTime(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function sanitizeFilename(value) {
  return cleanText(value).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "Customer";
}

function createId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function loadImageData(src) {
  return new Promise((resolve) => {
    const image = new Image();
    if (/^https?:\/\//i.test(src)) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function adjustTableSpans() {
  const rows = Array.from(itemsBody.querySelectorAll("tr"));
  let currentCategoryRow = null;
  let productCount = 0;

  // First, reset all cells to visible and remove rowspans
  rows.forEach(row => {
    const qtyCell = row.querySelector(".cell-qty");
    const rateCell = row.querySelector(".cell-rate");
    const amountCell = row.querySelector(".cell-amount");

    if (qtyCell) {
      qtyCell.style.display = "";
      qtyCell.removeAttribute("rowspan");
    }
    if (rateCell) {
      rateCell.style.display = "";
      rateCell.removeAttribute("rowspan");
    }
    if (amountCell) {
      amountCell.style.display = "";
      amountCell.removeAttribute("rowspan");
    }
  });

  // Calculate and apply spans
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const typeSelect = row.querySelector(".item-type");
    const type = typeSelect ? typeSelect.value : "standard";

    if (type === "category") {
      if (currentCategoryRow && productCount > 0) {
        applyRowspan(currentCategoryRow, productCount + 1);
      }
      currentCategoryRow = row;
      productCount = 0;
    } else if (type === "product") {
      if (currentCategoryRow) {
        productCount++;
        const qtyCell = row.querySelector(".cell-qty");
        const rateCell = row.querySelector(".cell-rate");
        const amountCell = row.querySelector(".cell-amount");

        if (qtyCell) qtyCell.style.display = "none";
        if (rateCell) rateCell.style.display = "none";
        if (amountCell) amountCell.style.display = "none";
      } else {
        // Fallback if product is added before any category
        if (typeSelect) typeSelect.value = "standard";
      }
    } else {
      if (currentCategoryRow && productCount > 0) {
        applyRowspan(currentCategoryRow, productCount + 1);
      }
      currentCategoryRow = null;
      productCount = 0;
    }
  }

  // Finalize last group
  if (currentCategoryRow && productCount > 0) {
    applyRowspan(currentCategoryRow, productCount + 1);
  }
}

function applyRowspan(row, rowspanValue) {
  const qtyCell = row.querySelector(".cell-qty");
  const rateCell = row.querySelector(".cell-rate");
  const amountCell = row.querySelector(".cell-amount");

  if (qtyCell) qtyCell.setAttribute("rowspan", rowspanValue);
  if (rateCell) rateCell.setAttribute("rowspan", rowspanValue);
  if (amountCell) amountCell.setAttribute("rowspan", rowspanValue);
}

function groupItems(items) {
  const groups = [];
  let currentGroup = null;

  items.forEach(item => {
    if (item.type === "category") {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = {
        type: "category",
        category: item,
        products: []
      };
    } else if (item.type === "product") {
      if (currentGroup) {
        currentGroup.products.push(item);
      } else {
        groups.push({
          type: "standard",
          item
        });
      }
    } else {
      if (currentGroup) {
        groups.push(currentGroup);
        currentGroup = null;
      }
      groups.push({
        type: "standard",
        item
      });
    }
  });

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

function buildPdfBody(items, gold) {
  const groups = groupItems(items);
  const body = [];

  groups.forEach(group => {
    if (group.type === "standard") {
      const item = group.item;
      body.push([
        item.name,
        formatQty(item.qty),
        formatMoney(item.rate),
        formatMoney(item.amount)
      ]);
    } else if (group.type === "category") {
      const cat = group.category;
      const rowspan = group.products.length + 1;

      body.push([
        { 
          content: cat.name, 
          styles: { fillColor: gold, fontStyle: "bold" } 
        },
        { 
          content: formatQty(cat.qty), 
          rowSpan: rowspan, 
          styles: { halign: "center", valign: "middle" } 
        },
        { 
          content: formatMoney(cat.rate), 
          rowSpan: rowspan, 
          styles: { halign: "right", valign: "middle" } 
        },
        { 
          content: formatMoney(cat.amount), 
          rowSpan: rowspan, 
          styles: { halign: "right", valign: "middle" } 
        }
      ]);

      group.products.forEach(prod => {
        body.push([
          {
            content: prod.name,
            styles: { fontStyle: "italic" }
          }
        ]);
      });
    }
  });

  return body;
}

function selectRow(row) {
  Array.from(itemsBody.querySelectorAll("tr")).forEach(r => {
    r.classList.remove("selected-row");
  });
  row.classList.add("selected-row");
}
