'use strict';

var assert = require('assert');

var integrationTestHelper = require('./integrationTestHelper');

// Forces content past one A6 page.
var LONG = [];
for (var i = 0; i < 40; i++) {
	LONG.push('Line ' + i);
}

function findText(page, text) {
	return page.items
		.map(function (i) { return i.item; })
		.find(function (it) {
			return it && it.inlines && it.inlines.map(function (n) { return n.text; }).join('') === text;
		});
}

describe('Integration test: sticky regions', function () {

	var testHelper = new integrationTestHelper();

	it('repeats a left sticky rail on every page and insets the flowing content', function () {
		var dd = {
			sticky: { left: { width: 100, text: 'RAIL' } },
			content: ['First'].concat(LONG)
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.ok(pages.length >= 2, 'content should span at least 2 pages, got ' + pages.length);

		// rail re-rendered on every page, at the content-box left edge (= page margin.left)
		pages.forEach(function (page, p) {
			var rail = findText(page, 'RAIL');
			assert.ok(rail, 'rail missing on page ' + p);
			assert.equal(rail.x, 40, 'rail x on page ' + p);
		});

		// flowing content is inset by the rail width (margin.left 40 + width 100)
		var first = findText(pages[0], 'First');
		assert.ok(first, 'first content line missing');
		assert.equal(first.x, 140, 'content should be inset past the rail');
	});

	it('repeats a right sticky rail at the right edge on every page', function () {
		var dd = {
			sticky: { right: { width: 100, text: 'RAIL' } },
			content: ['First'].concat(LONG)
		};

		var pages = testHelper.renderPages('A6', dd);
		assert.ok(pages.length >= 2, 'content should span at least 2 pages');

		pages.forEach(function (page, p) {
			var rail = findText(page, 'RAIL');
			assert.ok(rail, 'rail missing on page ' + p);
			assert.equal(rail.x, page.pageSize.width - 40 - 100, 'rail x on page ' + p);
		});

		// right rail does not inset the left edge; content still starts at margin.left
		var first = findText(pages[0], 'First');
		assert.ok(first, 'first content line missing');
		assert.equal(first.x, 40, 'content left edge should be unchanged');
	});

	it('reserves space for an explicit-height above banner and repeats it on every page', function () {
		var dd = {
			sticky: { above: { height: 30, text: 'BANNER' } },
			content: ['First'].concat(LONG)
		};

		var pages = testHelper.renderPages('A6', dd);
		assert.ok(pages.length >= 2, 'content should span at least 2 pages');

		// banner sits at the top of the content box (= page margin.top) on every page
		pages.forEach(function (page, p) {
			var banner = findText(page, 'BANNER');
			assert.ok(banner, 'banner missing on page ' + p);
			assert.equal(banner.y, 40, 'banner y on page ' + p);
			assert.equal(banner.x, 40, 'banner x on page ' + p);
		});

		// content is pushed down by the banner height (margin.top 40 + height 30)
		var first = findText(pages[0], 'First');
		assert.ok(first, 'first content line missing');
		assert.equal(first.y, 70, 'content should start below the banner');
	});

	it('reserves space for an explicit-height below banner and repeats it on every page', function () {
		var dd = {
			sticky: { below: { height: 30, text: 'FOOT' } },
			content: ['First'].concat(LONG)
		};

		var pages = testHelper.renderPages('A6', dd);
		assert.ok(pages.length >= 2, 'content should span at least 2 pages');

		pages.forEach(function (page, p) {
			var banner = findText(page, 'FOOT');
			assert.ok(banner, 'below banner missing on page ' + p);
			assert.equal(banner.y, page.pageSize.height - 40 - 30, 'below banner y on page ' + p);
		});

		// top of content unchanged
		var first = findText(pages[0], 'First');
		assert.ok(first, 'first content line missing');
		assert.equal(first.y, 40, 'content top should be unchanged');
	});

	it('auto-measures the above banner height when height is omitted', function () {
		var dd = {
			sticky: { above: { text: 'BANNER' } },
			content: ['First'].concat(LONG)
		};

		var pages = testHelper.renderPages('A6', dd);
		assert.ok(pages.length >= 2, 'content should span at least 2 pages');

		pages.forEach(function (page, p) {
			var banner = findText(page, 'BANNER');
			assert.ok(banner, 'banner missing on page ' + p);
			assert.equal(banner.y, 40, 'banner y on page ' + p);
		});

		// content pushed down by the auto-measured (one-line) banner height — finite, > margin, < two lines
		var first = findText(pages[0], 'First');
		assert.ok(first, 'first content line missing');
		assert.ok(Number.isFinite(first.y), 'content y must be finite (not NaN)');
		assert.ok(first.y > 40 && first.y < 80, 'content pushed by ~one measured line, got ' + first.y);
	});

	it('scopes sticky to the section that declares it', function () {
		var dd = {
			content: [
				{ section: ['AlphaOnly'] },
				{ section: ['BetaFirst'].concat(LONG), sticky: { left: { width: 100, text: 'RAIL' } } }
			]
		};

		var pages = testHelper.renderPages('A6', dd);
		assert.ok(pages.length >= 3, 'section A (1 page) + section B (2+ pages), got ' + pages.length);

		// section A page: no rail, content not inset
		var alpha = findText(pages[0], 'AlphaOnly');
		assert.ok(alpha, 'alpha content present on page 0');
		assert.equal(alpha.x, 40, 'section A content should not be inset');
		assert.ok(!findText(pages[0], 'RAIL'), 'no rail on the section without sticky');

		// section B pages: rail on every B page, content inset
		assert.ok(findText(pages[1], 'RAIL'), 'rail on section B first page');
		assert.ok(findText(pages[pages.length - 1], 'RAIL'), 'rail on section B last page');
		var beta = findText(pages[1], 'BetaFirst');
		assert.ok(beta, 'beta content present');
		assert.equal(beta.x, 140, 'section B content inset by the rail');
	});

	it('supports a dynamic (page-aware) sticky side', function () {
		var dd = {
			sticky: {
				left: function (page) {
					return { width: 100, text: 'PAGE ' + page };
				}
			},
			content: ['First'].concat(LONG)
		};

		var pages = testHelper.renderPages('A6', dd);
		assert.ok(pages.length >= 2, 'content should span at least 2 pages');

		// the function is invoked per page → page-aware content
		assert.ok(findText(pages[0], 'PAGE 1'), 'page-1 rail label');
		assert.ok(findText(pages[1], 'PAGE 2'), 'page-2 rail label');

		// reservation comes from the (sample) node's width
		var first = findText(pages[0], 'First');
		assert.ok(first, 'first content line missing');
		assert.equal(first.x, 140, 'content inset by the dynamic rail width');
	});

	it('makes left/right rails own the corners (rail spans alongside the above band)', function () {
		var dd = {
			sticky: {
				left: { width: 100, text: 'RAIL' },
				above: { height: 30, text: 'BANNER' }
			},
			content: ['First'].concat(LONG)
		};

		var pages = testHelper.renderPages('A6', dd);

		var banner = findText(pages[0], 'BANNER');
		var rail = findText(pages[0], 'RAIL');
		assert.ok(banner && rail, 'banner and rail present');
		assert.equal(banner.y, 40, 'banner sits at the content-box top');
		// rail starts at the content-box top too — it owns the corner, rather than starting
		// below the band (which would be y === 40 + above height === 70)
		assert.equal(rail.y, 40, 'rail should span up into the corner, level with the banner top');
	});

	it('throws when sticky regions leave no room for content', function () {
		var dd = {
			sticky: { left: { width: 1000, text: 'X' } }, // far wider than an A6 content box
			content: ['First']
		};
		assert.throws(function () {
			testHelper.renderPages('A6', dd);
		}, /sticky/i);
	});

	it('applies sticky to an existing empty page when section reuses it instead of adding a new one', function () {
		// Repro: an unbreakable block in the preceding stack pushes the writer onto a new
		// page that ends up empty (the block fit on the previous page after pdfmake's
		// retry). The section that follows finds the writer parked on an existing empty
		// page, takes the reuse branch, and previously never installed its sticky
		// customProperties on that page — so addStickyRegions silently skipped it.
		var TALL = [];
		for (var i = 0; i < 30; i++) {
			TALL.push({ text: 'fill ' + i });
		}
		var dd = {
			content: [
				{
					stack: [
						{ stack: TALL },
						{ stack: ['after the fill'], unbreakable: true }
					],
					pageOrientation: 'portrait'
				},
				{
					section: [['SectionContent']],
					sticky: { left: { width: 100, text: 'RAIL_REUSE' } },
					pageOrientation: 'portrait'
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);
		var sectionPageIdx = pages.findIndex(function (p) { return findText(p, 'SectionContent'); });
		assert.ok(sectionPageIdx >= 0, 'section content should appear on some page');
		assert.ok(
			findText(pages[sectionPageIdx], 'RAIL_REUSE'),
			'sticky rail must render on the section page even when it reused an existing empty page'
		);
	});

	it('two consecutive sticky sections each render their own rail without bleeding into each other', function () {
		var dd = {
			content: [
				{
					section: [['SecAFirst'].concat(LONG)],
					sticky: { left: { width: 100, text: 'RAIL_A' } }
				},
				{
					section: [['SecBFirst'].concat(LONG)],
					sticky: { left: { width: 100, text: 'RAIL_B' } }
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);
		assert.ok(pages.length >= 4, 'two sections × 2+ pages each, got ' + pages.length);

		var aFirst = pages.findIndex(function (p) { return findText(p, 'SecAFirst'); });
		var bFirst = pages.findIndex(function (p) { return findText(p, 'SecBFirst'); });
		assert.ok(aFirst >= 0 && bFirst > aFirst, 'A pages precede B pages');

		// Section A pages: only RAIL_A, no RAIL_B
		for (var i = aFirst; i < bFirst; i++) {
			assert.ok(findText(pages[i], 'RAIL_A'), 'RAIL_A missing on A page ' + i);
			assert.ok(!findText(pages[i], 'RAIL_B'), 'RAIL_B leaked back to A page ' + i);
		}
		// Section B pages: only RAIL_B, no RAIL_A
		for (var j = bFirst; j < pages.length; j++) {
			assert.ok(findText(pages[j], 'RAIL_B'), 'RAIL_B missing on B page ' + j);
			assert.ok(!findText(pages[j], 'RAIL_A'), 'RAIL_A bled into B page ' + j);
		}
	});

	it('renders sticky on a section preceded by regular pages and followed by non-section content', function () {
		// Repro of the bug surfaced in illustrate-go: a sticky section sits between regular
		// pages. The section's pages must show the rail, and the leading/trailing regular
		// pages must NOT show the rail (sticky scope must not bleed forward or back).
		// Shape mirrors illustrate-go-calc-engine's emit: every page is either {stack, pageBreak,
		// pageOrientation} or {section, sticky, pageOrientation}. The section's `section` field
		// holds an array containing one nested array of items, matching pageDef.stack. The
		// sticky.left is `{stack, width, margin}` (an item with a `stack` sub-array), not a
		// flat text node.
		var dd = {
			content: [
				{ stack: ['Lead'], pageOrientation: 'portrait' },
				{ stack: ['Narrative'], pageBreak: 'before', pageOrientation: 'portrait' },
				{
					section: [['BetaFirst'].concat(LONG)],
					sticky: { left: { stack: ['RAIL'], width: 100, margin: [0, 0, 5, 0] } },
					pageOrientation: 'portrait'
				},
				{ stack: ['Trailer'], pageBreak: 'before', pageOrientation: 'portrait' }
			]
		};

		var pages = testHelper.renderPages('A6', dd);
		assert.ok(pages.length >= 4, 'lead + section (2+ pages) + trailer = at least 4, got ' + pages.length);

		var leadIdx = pages.findIndex(function (p) { return findText(p, 'Lead'); });
		var betaIdx = pages.findIndex(function (p) { return findText(p, 'BetaFirst'); });
		var trailerIdx = pages.findIndex(function (p) { return findText(p, 'Trailer'); });
		assert.ok(leadIdx >= 0 && betaIdx > leadIdx && trailerIdx > betaIdx, 'pages in expected order');

		// rail on every section page
		for (var i = betaIdx; i < trailerIdx; i++) {
			assert.ok(findText(pages[i], 'RAIL'), 'rail missing on section page ' + i);
		}

		// no rail on lead/trailer
		assert.ok(!findText(pages[leadIdx], 'RAIL'), 'no rail on lead page (section did not start yet)');
		assert.ok(!findText(pages[trailerIdx], 'RAIL'), 'no rail on trailer page (section ended)');

		// trailer's content must start at the doc-level left margin (40), not the section's
		// inset margin (40 + rail width 100 = 140). The bug we're guarding against: addPage's
		// availableWidth update was being clobbered by moveToNextPage restoring the previous
		// page's (inset) availableWidth, leaving trailer content writing into a shifted area.
		var trailerText = findText(pages[trailerIdx], 'Trailer');
		assert.ok(trailerText, 'trailer text item exists');
		assert.equal(trailerText.x, 40, 'trailer content must start at doc-level left margin');
	});

	it('preserves a function-valued table layout in a sticky region', function () {
		var dd = {
			sticky: {
				left: {
					width: 130,
					table: { body: [[{ text: 'CELL' }]] },
					layout: {
						hLineWidth: function () { return 0; },
						vLineWidth: function () { return 0; },
						paddingLeft: function () { return 30; },
						paddingRight: function () { return 0; },
						paddingTop: function () { return 0; },
						paddingBottom: function () { return 0; }
					}
				}
			},
			content: ['First'].concat(LONG)
		};

		var pages = testHelper.renderPages('A6', dd);
		var cell = findText(pages[0], 'CELL');
		assert.ok(cell, 'sticky cell present');
		// the layout's paddingLeft (30) must survive the per-page clone; JSON-cloning the region
		// would drop the function and fall back to the ~4pt default. rail left = margin.left (40).
		assert.ok(cell.x >= 65, 'cell indented by the layout paddingLeft, got ' + cell.x);
	});
});
