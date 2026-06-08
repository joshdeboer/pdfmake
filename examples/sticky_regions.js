var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

pdfmake.setUrlAccessPolicy((url) => url.startsWith('https://'));
pdfmake.setLocalAccessPolicy(() => true);

// Wraps content in a colored single-cell table so each sticky region reads as a box.
// extra (e.g. { width } / { height }) sizes the region; pdfmake reads it off the node.
function box(fillColor, content, extra) {
	return Object.assign({
		table: { widths: ['*'], body: [[{ fillColor: fillColor, border: [false, false, false, false], margin: [6, 4, 6, 4], stack: [].concat(content) }]] },
		layout: 'noBorders'
	}, extra || {});
}

// A long table so the section spans several pages.
function tableBody(rowCount) {
	var body = [[{ text: '#', bold: true }, { text: 'Item', bold: true }, { text: 'Value', bold: true }]];
	for (var i = 1; i <= rowCount; i++) {
		body.push([String(i), 'Item ' + i, '$' + (i * 10)]);
	}
	return body;
}

var docDefinition = {
	content: [
		// Section 1 — a title page with NO sticky regions (demonstrates per-section scoping).
		{
			section: [
				{ text: 'Sticky Regions', fontSize: 26, bold: true, alignment: 'center', margin: [0, 220, 0, 0] },
				{ text: 'The next section pins a left rail and above/below banners that repeat on every page while the table flows across pages.', alignment: 'center', italics: true, margin: [0, 12, 0, 0] }
			]
		},

		// Section 2 — a multi-page table with left, above and below sticky regions.
		{
			section: [
				{ table: { headerRows: 1, widths: ['auto', '*', 'auto'], body: tableBody(90) } }
			],
			sticky: {
				// full-height left rail (explicit width)
				left: box('#dbe9ff', [
					{ text: 'Sidebar', bold: true, margin: [0, 0, 0, 4] },
					{ text: 'This panel repeats on every page of the section.', fontSize: 9 }
				], { width: 136, margin: [0, 0, 6, 0] }), // 136 reserved = 130 box + 6 gutter before content
				// banner above the table (no height given — measured automatically)
				above: box('#ffe6cc', [
					{ text: 'Data Table', bold: true, fontSize: 14 },
					{ text: 'This title repeats on every page of the section.', italics: true, fontSize: 9 }
				], { margin: [0, 0, 0, 6] }),
				// dynamic, page-aware banner below the table (dynamic ⇒ explicit height)
				below: (currentPage, pageCount) => box('#dcf3dc', [
					{ text: 'Page ' + currentPage + ' of ' + pageCount, italics: true, fontSize: 9 }
				], { height: 26 })
			}
		}
	]
};

var now = new Date();
var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/sticky_regions.pdf').then(() => {
	console.log('sticky_regions.pdf written in ' + (new Date() - now) + 'ms');
}, err => {
	console.error(err);
});
