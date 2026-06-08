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
});
