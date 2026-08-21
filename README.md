# AL HASHMI Quotation Generator

A simple static quotation generator for **AL HASHMI EVENTS DECORATOR**.

## Login

- Username: `****`
- Password: `****`

These values are in the clearly marked login constants at the top of `script.js`. This is only a frontend access gate for a static website, not secure server-side authentication.

## Files

- `index.html` - website markup and CDN script loading
- `style.css` - responsive black and gold styling
- `script.js` - login, dynamic items, calculations, history, and PDF generation
- `assets/logo-main.jpg` - main logo image
- `assets/logo-wordmark.jpg` - wordmark/header logo image

## Usage

Open `index.html` in a browser, or upload the folder to any static host such as GitHub Pages.

The quotation history is stored in the browser using `localStorage`, so it stays on the same browser/device after refreshes.

## PDF Notes

PDF generation runs fully in the browser using jsPDF and jsPDF AutoTable from CDN links. The layout follows the supplied Excel quotation: top branding, phone/address rows, `Quatation` heading, customer/booking details, bordered item table, gold financial rows, and notes.
