(function ($, document) {
  'use strict';

  /**
   * CalendarLite
   * @author Steve Geer
   * @version 0.0.1
   */
  const CalendarLite = (function () {
    var CURRENT_DATE,      // Set on initialization and when the month is changed
        MONTH,             // Name of the CURRENT_DATE month
        START_DAY,         // Starting day of the week, 0-6
        NUM_DAYS,          // Number of days in the month
        currentSelection;  // Currently selected node, stored to toggle selection classes

    const TODAY = new Date();

    // Options to override/mixin with user options
    const OPTIONS = {
      footerHTML: null
    };

    // <td> element to clone and use for headers, days.
    const _cellNode = document.createElement('td');

    /**
     * @method getDayNode
     * @description
     * Builds a <td /> day node with supplied date info.
     */
    const getDayNode = function (date) {
      let text = document.createTextNode(date);
      let node = _cellNode.cloneNode();
      node.appendChild(text);

      return node;
    };

    // Header and body HTML templates
    const TEMPLATE = `
      <div class="cal-lite">
        <header>
          <span role="previous" class="btn-prev fa fa-angle-left"></span>
          <h2 class="month">Month</h2>
          <span role="next" class="btn-next fa fa-angle-right"></span>
        </header>
        <table>
          <thead><tr></tr></thead>
          <tbody></tbody>
        </table>
        <footer></footer>
      </div>
    `;

    /**
     * Helper method for exposing common date operations.
     */
    const dateHelpers = (function () {

      // New "today" date object at the first of the month.
      const START_OF_MONTH = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);

      // Cache for number of days/month computation
      const numDayCache = Object.create(null);

      return {
        getShortDays: getShortDays,
        getMonthLength: getMonthLength
      };

      /**
       * @method getShortDays
       * @description
       * Computes the short names of the week.
       * @return Array<String> Short names of the week.
       */
      function getShortDays() {
        var names = [];
        // "Clone" beginning of month
        var begin = new Date(START_OF_MONTH);
        for (let i = 0; i < 7; i++) {
          names.push(begin.toLocaleDateString('en-US', {weekday: 'short'}));
          begin.setDate(begin.getDate() + 1);
        }
        return names;
      }

      /**
       * @method getMonthLength
       * @description
       * Calculates the number of days in the supplied month, or current
       * if @param month is left blank.
       */
      function getMonthLength() {

        // Create a unique key for each lookup in "MM/DD/YYYY" format
        var key = CURRENT_DATE.toLocaleDateString(),
            month = CURRENT_DATE.getMonth();

        // Serve from cache if available
        if (numDayCache[key]) {
          return numDayCache[key];
        }

        // Construct and cache
        var otherDate = new Date(CURRENT_DATE.getFullYear(), month, 0);
        numDayCache[key] = new Date(otherDate.getFullYear(), otherDate.getMonth(), 0).getDate();

        return numDayCache[key];
      }
    })();

    /**
     * CalendarLite instance constructor
     * @param element Default jQuery instance
     * @param options {Object} Option override
     * @constructor
     */
    function CalendarLite(element, options = {}) {

      // Allowed options. Warned when an invalid option is supplied
      var allowedKeys = Object.keys(OPTIONS).join(', ');

      // Mixin supplied options to default options if supplied
      if (0 !== Object.keys(options).length) {
        for (let opt in options) {
          if (OPTIONS.hasOwnProperty(opt)) {
            OPTIONS[opt] = options[opt];
          } else {
            console.warn(`Invalid option supplied for CalendarLite: ${opt}. Allowed: ${allowedKeys}`);
          }
        }
      }

      this._element = element;
      this._setDateParameters(options.date || new Date());
      this._buildStatic(element);
      this._buildDays();

      // Month changer buttons
      $('.btn-prev', this._element).on('click', onMonthChange.bind(this));
      $('.btn-next', this._element).on('click', onMonthChange.bind(this));

      // Listen for bubbled 'click' events from the tbody.td
      $('tbody', this._element).on('click', 'td', onDaySelect.bind(this));
    }

    CalendarLite.prototype = {
      hide: function () {
        this._element.css('display', 'none')
      },
      show: function () {
        this._element.css('display', 'block')
      },
      toggle: function () {
        var display = this._element.css('display');
        this._element.css('display', display == 'none' ? 'initial' : 'none');
      },
      destroy(){
        $('tbody').off('click');
        $('.btn-next').off('click');
        $('.btn-prev').off('click');
      },

      /**
       * @method _buildStatic
       * @description
       * Builds static portions; day list, footer
       */
      _buildStatic: function (element) {
        this._element = $(element);
        this._element.append($(TEMPLATE));

        // TODO: Uncomment in production
        // this.hide();

        // Append the footerHTML if supplied.
        if (OPTIONS.footerHTML) {
          $('footer', this._element).append($(OPTIONS.footerHTML));
        }

        const thead = $('thead tr', this._element);
        const shortNames = dateHelpers.getShortDays();

        // Build the days of week with short names
        for (let i = 0, ii = 7; i < ii; i++) {
          let node = getDayNode(shortNames[i]);
          thead.append(node);
        }
      },

      /**
       * @method _setDateParameters
       * @param date
       * @description
       * Constructs a new Date object and all the other "constants".
       * @private
       */
      _setDateParameters: function (date) {
        CURRENT_DATE = date;
        MONTH = CURRENT_DATE.toLocaleDateString('en-US', {month: 'long'});
        START_DAY = new Date(CURRENT_DATE.getFullYear(), CURRENT_DATE.getMonth(), 1).getDay();
        NUM_DAYS = dateHelpers.getMonthLength();
      },

      /**
       * @method _buildDays
       * @private
       * @description
       * Removes the existing days and constructs a new DOM tree
       */
      _buildDays: function () {

        // Set month header text
        $('.month', this._element).text(MONTH);

        var row = document.createElement('tr');
        var tbody = $('tbody', this._element);
        var tbodyEl = tbody[0];

        // Remove all existing children
        while (tbodyEl.firstChild) {
          tbodyEl.removeChild(tbodyEl.firstChild);
        }

        // Loop length is the number of days + the offset of the starting day of the week.
        for (let i = 1, ii = dateHelpers.getMonthLength() + START_DAY; i <= ii; i++) {

          // Give empty contents if the start day of the week is less than
          // our start day.
          let dayText = i <= START_DAY ? '' : i - START_DAY;
          let dayBlock = getDayNode(dayText);

          // Different class for days already passed
          if (CURRENT_DATE.getMonth() == TODAY.getMonth()) {
            if (i - START_DAY < TODAY.getDate()) {
              dayBlock.classList.add('passed');
            }
          } else if (CURRENT_DATE.getMonth() <= TODAY.getMonth()) {
            dayBlock.classList.add('passed');
          }
          row.appendChild(dayBlock);

          // Break on every 7th day
          if (i > 0 && i % 7 === 0) {
            tbody.append(row);
            row = document.createElement('tr');
          }
        }
        // Add the last tr node from the loop if it has children.
        if (row.childNodes.length > 0) {
          tbody.append(row);
        }
      }
    };

    /**
     * @method onClick
     * @description
     * Click callback for the navigation arrows, either rebuilds
     * the days for the next or the previous month based on
     * role attribute
     */
    function onMonthChange(e) {

      // next or previous
      var role = e.currentTarget.getAttribute('role');

      var amount = role == 'previous' ? -1 : 1;
      var newDate = new Date(CURRENT_DATE.getFullYear(), CURRENT_DATE.getMonth() + amount, 1);

      // Reset date variables and build new DOM based on selected month
      this._setDateParameters(newDate);
      this._buildDays();
    }

    /**
     * @method onDaySelect
     * @description
     * onClick callback when a day is selected.
     * @param e
     */
    function onDaySelect(e) {
      var target = e.currentTarget;

      // Remove/toggle classes based on previous selection and current target.
      if (currentSelection) {
        if (currentSelection == target) {
          target.classList.toggle('selected');
        } else {
          currentSelection.classList.remove('selected');
        }
      }

      // Reset current target
      currentSelection = target;

      // Text content -> Number
      var day = target.textContent;

      // Create a new Date object based on selection
      var result = new Date(CURRENT_DATE.getFullYear(), CURRENT_DATE.getMonth(), day);

      $(target).toggleClass('selected');

      // Notify listeners of a selection
      this._element.trigger('select', result);
    }

    return CalendarLite;
  })();


  // jQuery init function
  $.fn.calendarLite = function () {
    var args = Array.prototype.slice.call(arguments, 1);
    var opt = arguments[0] || {};

    for (let i = 0; i < this.length; i++) {
      if (opt && /String/.test(opt.constructor) === true) {
        this[i].cal[opt].apply(this[i].cal, args);
      } else {
        this[i].cal = new CalendarLite(this[i], opt);
      }
    }
    return this;
  }

})(jQuery, document);

$(function () {
  var button = $('button');
  var cal = $('#cal').calendarLite({
    footerHTML: '<p>Visit requests must be made at least 24 hours in advance.</p> '
  });

  cal.on('select', function (e, data) {
    console.log('data', data)
  });

  button.on('click', function () {
    cal.toggle();
  })
});
