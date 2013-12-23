var grunt = require('grunt')
  , lintinline = require('../tasks/lib/lint-inline')
  , jshint = require('grunt-contrib-jshint/tasks/lib/jshint').init(grunt)
  , path = require('path')
  , fs = require('fs')
  , fixtures = path.join(__dirname, 'fixtures');

var calculateMatches = function(file, regexFilters) {
  var count = 0;
  grunt.file.read(file).split('\n').forEach(function (line, i){
    regexFilters.forEach(function (filter) {
      if (filter.match.test(line)) count++;
    });
  });
  return count;
};

exports.inlinelint = {
  'test-1 detects errors in incorrect files': function (test) {
    test.expect(4);
    var files = [path.join(fixtures, 'fail.html')];
    var options = {};
    var tempFiles = lintinline.wrapReporter(jshint, options, files);

    jshint.lint(tempFiles, options, function (results, data) {
      test.equal(results[0].file, files[0], 'Should use real filepaths in `results`');
      test.equal(results[0].error.code, 'W033', 'Should detect errors');
      test.equal(data[0].file, files[0], 'Should use real file paths in `data`');
      test.ok(results.length === 2, 'Should check all `<script>` tags');
    });
    test.done();
  },
  'test-2 validates correct files': function (test) {
    test.expect(1);
    var files = [path.join(fixtures, 'pass.html')];
    var options = {};
    var tempFiles = lintinline.wrapReporter(jshint, options, files);

    jshint.lint(tempFiles, options, function (results, data) {
      test.ok(results.length === 0, 'Should validate correct files.');
    });
    test.done();
  },
  'test-3 deletes temporary files after task finishes': function (test) {
    test.expect(1);
    var files = [path.join(fixtures, 'fail.html')];
    var options = {};
    var tempFiles = lintinline.wrapReporter(jshint, options, files);

    jshint.lint(tempFiles, options, function (results, data) {
      tempFiles.forEach(function (file, index) {
        test.ok(!fs.existsSync(file), 'Should delete temporary files');
      });
      test.done();
    });
  },
  'test-4 reports line numbers in original file': function (test) {
    test.expect(1);
    var files = [path.join(fixtures, 'fail.html')];
    var expected = 9; // hard coded but what to do?
    var options = {};
    var tempFiles = lintinline.wrapReporter(jshint, options, files);

    jshint.lint(tempFiles, options, function (results, data) {
      test.equal(expected, results[0].error.line, 'Should report line numbers in original file');
    });
    test.done();
  },
  'test-5 replaces patterns with supplied regexs': function (test) {
    test.expect(2);
    var files = [path.join(fixtures, 'razor.cshtml')];
    var patterns = [
      { match: /([\"|\']?)@\w[\w\.\(\)]+/g },
      { match: /([\"|\']?)@\(([^(\)]*|\(([^(\)]*|\([^\)]*\))*\))*\)/g },
      { match: /([\"|\']?)@\{[^\}]*?\}/g }
    ];

    var tempFiles         = lintinline.wrapReporter(jshint, {}, files);
    var filteredTempFiles = lintinline.wrapReporter(jshint, {}, files, patterns);

    var matchesInUnfilteredFile = calculateMatches(tempFiles[0], patterns);
    var matchesInFilteredFile   = calculateMatches(filteredTempFiles[0], patterns);

    test.ok(matchesInUnfilteredFile > 0, 'Should find matches in unfiltered file');
    test.equals(0, matchesInFilteredFile, 'Should find no matches in filtered file');

    test.done();
  },
  'test-6 uses supplied replacement for patterns': function (test) {
    test.expect(1);
    var files = [path.join(fixtures, 'pass.html')];
    var patterns = [
      { match: /(foo)/g, replacement: '$1-$1-$1' }
    ];

    var filteredTempFiles = lintinline.wrapReporter(jshint, {}, files, patterns);
    var matches = calculateMatches(filteredTempFiles[0], [{ match: /foo-foo-foo/ }]);

    test.equals(1, matches, 'Should find provided replacement in processed file');
    test.done();
  },
  'test-7 only lints non-js script-tags': function (test) {
    test.expect(1);
    var files     = [path.join(fixtures, 'tag-types.html')];
    var options   = {};
    var tempFiles = lintinline.wrapReporter(jshint, {}, files);

    jshint.lint(tempFiles, options, function (results, data) {
      test.ok(results.length === 0, 'Should not include non-js script-tags');
    });
    test.done();
  },
  'test-8 lints script tags with or without type': function (test) {
    test.expect(3);
    var files     = [path.join(fixtures, 'tag-types-fail.html')];
    var options   = {};
    var tempFiles = lintinline.wrapReporter(jshint, {}, files);

    jshint.lint(tempFiles, options, function (results, data) {
      test.equal(results[0].file, files[0], 'Should use real filepaths in `results`');
      test.equal(results[0].error.code, 'W033', 'Should detect errors');
      test.equal(results.length, 2, 'Should lint regular script tags with and without type');
    });
    test.done();
  }
};
