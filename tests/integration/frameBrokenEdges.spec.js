'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

// A gridless, outer-framed table: body cells draw borders only on the frame edges (left on the
// first column, right on the last, bottom on the final row); the header keeps a full grid.
function framedTable(frameBrokenEdges) {
	var body = [[
		{ text: 'H1', border: [true, true, true, true] },
		{ text: 'H2', border: [true, true, true, true] }
	]];
	for (var i = 0; i < 60; i++) {
		body.push([{ text: 'r' + i }, { text: 'v' + i }]);
	}
	for (var r = 1; r < body.length; r++) {
		var last = r === body.length - 1;
		body[r][0].border = [true, false, false, last];
		body[r][1].border = [false, false, true, last];
	}
	return {
		content: [{
			table: { headerRows: 1, widths: ['*', '*'], body: body },
			layout: {
				hLineWidth: function () { return 0.5; },
				vLineWidth: function () { return 0.5; },
				hLineColor: function () { return 'black'; },
				vLineColor: function () { return 'black'; },
				defaultBorder: false,
				frameBrokenEdges: frameBrokenEdges
			}
		}],
		defaultStyle: { font: 'Roboto', fontSize: 9 }
	};
}

function horizontalLineYs(page) {
	return page.items
		.filter(function (n) {
			return n.type === 'vector' && n.item.type === 'line' && Math.abs(n.item.y1 - n.item.y2) < 0.001;
		})
		.map(function (n) { return n.item.y1; });
}

describe('Integration test: table frameBrokenEdges', function () {
	var testHelper = new IntegrationTestHelper();

	it('draws a bottom rule near the content bottom of each page a framed table spans', function () {
		var pages = testHelper.renderPages('A7', framedTable(true));
		assert.ok(pages.length >= 2, 'table should span multiple pages, got ' + pages.length);

		var page0 = pages[0];
		var bottom = page0.pageSize.height - testHelper.MARGINS.bottom;
		var maxY = Math.max.apply(null, horizontalLineYs(page0));
		assert.ok(maxY > bottom - 60, 'expected a bottom rule near content bottom (' + bottom + '), got lowest line y ' + maxY);
	});

	it('draws no broken bottom rule when frameBrokenEdges is off', function () {
		var pages = testHelper.renderPages('A7', framedTable(false));
		var page0 = pages[0];
		var bottom = page0.pageSize.height - testHelper.MARGINS.bottom;
		var maxY = Math.max.apply(null, horizontalLineYs(page0));
		assert.ok(maxY < bottom - 60, 'expected no bottom rule low on the page, got lowest line y ' + maxY);
	});

	it('adds no interior horizontal gridlines between body rows', function () {
		var pages = testHelper.renderPages('A7', framedTable(true));
		var page0 = pages[0];
		var distinctYs = [...new Set(horizontalLineYs(page0).map(function (y) { return y.toFixed(1); }))];
		// header separator + the frame bottom only — not one line per row
		assert.ok(distinctYs.length <= 3, 'expected ~2 horizontal lines (header + frame bottom), got ' + distinctYs.length);
	});
});
