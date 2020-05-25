(function() {
  var Utils = {
    reformatDate: function(dt) {
      var _zeroPad = function(n) {
        return n >= 10 ? n + '' : '0' + n;
      };

      var parsed = new Date(Date.parse(dt));
      return (
        parsed.getFullYear() + '-' +
        _zeroPad(parsed.getMonth()) + '-' +
        _zeroPad(parsed.getDate()) + ' ' +
        _zeroPad(parsed.getHours()) + ':' +
        _zeroPad(parsed.getMinutes()) + ':' +
        _zeroPad(parsed.getSeconds())
      );
    },
    snakeToLabel: function(s) {
      s = s.replace('_', ' ');
      return s[0].toUpperCase() + s.slice(1);
    },
    // Truncate a stirng to n chars by adding an ellipsis
    // Return a summary of the whole operation
    truncate: function(s, n) {
      n = n || 16;

      var isTruncated = false;
      var truncated = s;

      if (s.length > n) {
        truncated = s.slice(0, n - 3) + '...';
        isTruncated = true;
      }

      return {
        full: s,
        truncated: truncated,
        isTruncated: isTruncated
      };
    }
  };

  window.Utils = Utils;
})();
