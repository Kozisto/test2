// I18n.js
// =======
//
// This small library provides the Rails I18n API on the Javascript.
// You don't actually have to use Rails (or even Ruby) to use I18n.js.
// Just make sure you export all translations in an object like this:
//
//     I18n.translations.en = {
//       hello: "Hello World"
//     };
//
// See tests for specific formatting like numbers and dates.
//
;(function(I18n){
  "use strict";

  // Just cache the Array#slice function.
  var slice = Array.prototype.slice;

  // Apply number padding.
  var padding = function(number) {
    return ("0" + number.toString()).substr(-2);
  };

  // Set default days/months translations.
  var DATE = {
      day_names: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    , abbr_day_names: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    , month_names: [null, "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    , abbr_month_names: [null, "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    , meridian: ["AM", "PM"]
  };

  // Set default number format.
  var NUMBER_FORMAT = {
      precision: 3
    , separator: "."
    , delimiter: ","
    , strip_insignificant_zeros: false
  };

  // Set default currency format.
  var CURRENCY_FORMAT = {
      unit: "$"
    , precision: 2
    , format: "%u%n"
    , delimiter: ","
    , separator: "."
  };

  // Set default percentage format.
  var PERCENTAGE_FORMAT = {
      precision: 3
    , separator: "."
    , delimiter: ""
  };

  // Set default size units.
  var SIZE_UNITS = [null, "kb", "mb", "gb", "tb"];

  // Other default options
  var DEFAULT_OPTIONS = {
    defaultLocale: "en",
    locale: "en",
    defaultSeparator: ".",
    placeholder: /(?:\{\{|%\{)(.*?)(?:\}\}?)/gm,
    fallbacks: false,
    translations: {}
  };

  I18n.reset = function() {
    // Set default locale. This locale will be used when fallback is enabled and
    // the translation doesn't exist in a particular locale.
    this.defaultLocale = DEFAULT_OPTIONS.defaultLocale;

    // Set the current locale to `en`.
    this.locale = DEFAULT_OPTIONS.locale;

    // Set the translation key separator.
    this.defaultSeparator = DEFAULT_OPTIONS.defaultSeparator;

    // Set the placeholder format. Accepts `{{placeholder}}` and `%{placeholder}`.
    this.placeholder = DEFAULT_OPTIONS.placeholder;

    // Set if engine should fallback to the default locale when a translation
    // is missing.
    this.fallbacks = DEFAULT_OPTIONS.fallbacks;

    // Set the default translation object.
    this.translations = DEFAULT_OPTIONS.translations;
  };

  // Much like `reset`, but only assign options if not already assigned
  I18n.initializeOptions = function() {
    if (typeof(this.defaultLocale) === "undefined" && this.defaultLocale !== null)
      this.defaultLocale = DEFAULT_OPTIONS.defaultLocale;

    if (typeof(this.locale) === "undefined" && this.locale !== null)
      this.locale = DEFAULT_OPTIONS.locale;

    if (typeof(this.defaultSeparator) === "undefined" && this.defaultSeparator !== null)
      this.defaultSeparator = DEFAULT_OPTIONS.defaultSeparator;

    if (typeof(this.placeholder) === "undefined" && this.placeholder !== null)
      this.placeholder = DEFAULT_OPTIONS.placeholder;

    if (typeof(this.fallbacks) === "undefined" && this.fallbacks !== null)
      this.fallbacks = DEFAULT_OPTIONS.fallbacks;

    if (typeof(this.translations) === "undefined" && this.translations !== null)
      this.translations = DEFAULT_OPTIONS.translations;
  };
  I18n.initializeOptions();

  // Return a list of all locales that must be tried before returning the
  // missing translation message. By default, this will consider the inline option,
  // current locale and fallback locale.
  //
  //     I18n.locales.get("de-DE");
  //     // ["de-DE", "de", "en"]
  //
  // You can define custom rules for any locale. Just make sure you return a array
  // containing all locales.
  //
  //     // Default the Wookie locale to English.
  //     I18n.locales["wk"] = function(locale) {
  //       return ["en"];
  //     };
  //
  I18n.locales = {};

  // Retrieve locales based on inline locale, current locale or default to
  // I18n's detection.
  I18n.locales.get = function(locale) {
    var result = this[locale] || this[I18n.locale] || this["default"];

    if (typeof(result) === "function") {
      result = result(locale);
    }

    if (result instanceof Array === false) {
      result = [result];
    }

    return result;
  };

  // The default locale list.
  I18n.locales["default"] = function(locale) {
    var locales = []
      , list = []
      , countryCode
      , count
    ;

    // Handle the inline locale option that can be provided to
    // the `I18n.t` options.
    if (locale) {
      locales.push(locale);
    }

    // Add the current locale to the list.
    if (!locale && I18n.locale) {
      locales.push(I18n.locale);
    }

    // Add the default locale if fallback strategy is enabled.
    if (I18n.fallbacks && I18n.defaultLocale) {
      locales.push(I18n.defaultLocale);
    }

    // Compute each locale with its country code.
    // So this will return an array containing both
    // `de-DE` and `de` locales.
    locales.forEach(function(locale){
      countryCode = locale.split("-")[0];

      if (!~list.indexOf(locale)) {
        list.push(locale);
      }

      if (I18n.fallbacks && countryCode && countryCode !== locale && !~list.indexOf(countryCode)) {
        list.push(countryCode);
      }
    });

    // No locales set? English it is.
    if (!locales.length) {
      locales.push("en");
    }

    return list;
  };

  // Hold pluralization rules.
  I18n.pluralization = {};

  // Return the pluralizer for a specific locale.
  // If no specify locale is found, then I18n's default will be used.
  I18n.pluralization.get = function(locale) {
    return this[locale] || this[I18n.locale] || this["default"];
  };

  // The default pluralizer rule.
  // It detects the `zero`, `one`, and `other` scopes.
  I18n.pluralization["default"] = function(count) {
    switch (count) {
      case 0: return ["zero", "other"];
      case 1: return ["one"];
      default: return ["other"];
    }
  };

  // Return current locale. If no locale has been set, then
  // the current locale will be the default locale.
  I18n.currentLocale = function() {
    return this.locale || this.defaultLocale;
  };

  // Check if value is different than undefined and null;
  I18n.isSet = function(value) {
    return value !== undefined && value !== null;
  };

  // Find and process the translation using the provided scope and options.
  // This is used internally by some functions and should not be used as an
  // public API.
  I18n.lookup = function(scope, options) {
    options = this.prepareOptions(options);

    var locales = this.locales.get(options.locale).slice()
      , requestedLocale = locales[0]
      , locale
      , scopes
      , translations
    ;

    // Deal with the scope as an array.
    if (scope.constructor === Array) {
      scope = scope.join(this.defaultSeparator);
    }

    // Deal with the scope option provided through the second argument.
    //
    //    I18n.t('hello', {scope: 'greetings'});
    //
    if (options.scope) {
      scope = [options.scope, scope].join(this.defaultSeparator);
    }

    while (locales.length) {
      locale = locales.shift();
      scopes = scope.split(this.defaultSeparator);
      translations = this.translations[locale];

      if (!translations) {
        continue;
      }

      while (scopes.length) {
        translations = translations[scopes.shift()];

        if (translations === undefined || translations === null) {
          break;
        }
      }

      if (translations !== undefined && translations !== null) {
        return translations;
      }
    }

    if (this.isSet(options.defaultValue)) {
      return options.defaultValue;
    }
  };

  // Rails changed the way the meridian is stored.
  // It started with `date.meridian` returning an array,
  // then it switched to `time.am` and `time.pm`.
  // This function abstracts this difference and returns
  // the correct meridian or the default value when none is provided.
  I18n.meridian = function() {
    var time = this.lookup("time");
    var date = this.lookup("date");

    if (time && time.am && time.pm) {
      return [time.am, time.pm];
    } else if (date && date.meridian) {
      return date.meridian;
    } else {
      return DATE.meridian;
    }
  };

  // Merge serveral hash options, checking if value is set before
  // overwriting any value. The precedence is from left to right.
  //
  //     I18n.prepareOptions({name: "John Doe"}, {name: "Mary Doe", role: "user"});
  //     #=> {name: "John Doe", role: "user"}
  //
  I18n.prepareOptions = function() {
    var args = slice.call(arguments)
      , options = {}
      , subject
    ;

    while (args.length) {
      subject = args.shift();

      if (typeof(subject) != "object") {
        continue;
      }

      for (var attr in subject) {
        if (!subject.hasOwnProperty(attr)) {
          continue;
        }

        if (this.isSet(options[attr])) {
          continue;
        }

        options[attr] = subject[attr];
      }
    }

    return options;
  };

  // Generate a list of translation options for default fallbacks.
  // `defaultValue` is also deleted from options as it is returned as part of
  // the translationOptions array.
  I18n.createTranslationOptions = function(scope, options) {
    var translationOptions = [{scope: scope}];

    // Defaults should be an array of hashes containing either
    // fallback scopes or messages
    if (this.isSet(options.defaults)) {
      translationOptions = translationOptions.concat(options.defaults);
    }

    // Maintain support for defaultValue. Since it is always a message
    // insert it in to the translation options as such.
    if (this.isSet(options.defaultValue)) {
      translationOptions.push({ message: options.defaultValue });
      delete options.defaultValue;
    }

    return translationOptions;
  };

  // Translate the given scope with the provided options.
  I18n.translate = function(scope, options) {
    options = this.prepareOptions(options);

    var translationOptions = this.createTranslationOptions(scope, options);

    var translation;
    // Iterate through the translation options until a translation
    // or message is found.
    var translationFound =
      translationOptions.some(function(translationOption) {
        if (this.isSet(translationOption.scope)) {
          translation = this.lookup(translationOption.scope, options);
        } else if (this.isSet(translationOption.message)) {
          translation = translationOption.message;
        }

        if (translation !== undefined && translation !== null) {
          return true;
        }
      }, this);

    if (!translationFound) {
      return this.missingTranslation(scope);
    }

    if (typeof(translation) === "string") {
      translation = this.interpolate(translation, options);
    } else if (translation instanceof Object && this.isSet(options.count)) {
      translation = this.pluralize(options.count, translation, options);
    }

    return translation;
  };

  // This function interpolates the all variables in the given message.
  I18n.interpolate = function(message, options) {
    options = this.prepareOptions(options);
    var matches = message.match(this.placeholder)
      , placeholder
      , value
      , name
      , regex
    ;

    if (!matches) {
      return message;
    }

    var value;

    while (matches.length) {
      placeholder = matches.shift();
      name = placeholder.replace(this.placeholder, "$1");

      if (this.isSet(options[name])) {
        value = options[name].toString().replace(/\$/gm, "_#$#_");
      } else {
        value = this.missingPlaceholder(placeholder, message);
      }

      regex = new RegExp(placeholder.replace(/\{/gm, "\\{").replace(/\}/gm, "\\}"));
      message = message.replace(regex, value);
    }

    return message.replace(/_#\$#_/g, "$");
  };

  // Pluralize the given scope using the `count` value.
  // The pluralized translation may have other placeholders,
  // which will be retrieved from `options`.
  I18n.pluralize = function(count, scope, options) {
    options = this.prepareOptions(options);
    var translations, pluralizer, keys, key, message;

    if (scope instanceof Object) {
      translations = scope;
    } else {
      translations = this.lookup(scope, options);
    }

    if (!translations) {
      return this.missingTranslation(scope);
    }

    pluralizer = this.pluralization.get(options.locale);
    keys = pluralizer(Math.abs(count));

    while (keys.length) {
      key = keys.shift();

      if (this.isSet(translations[key])) {
        message = translations[key];
        break;
      }
    }

    options.count = String(count);
    return this.interpolate(message, options);
  };

  // Return a missing translation message for the given parameters.
  I18n.missingTranslation = function(scope) {
    var message = '[missing "';

    message += this.currentLocale() + ".";
    message += slice.call(arguments).join(".");
    message += '" translation]';

    return message;
  };

  // Return a missing placeholder message for given parameters
  I18n.missingPlaceholder = function(placeholder, message) {
    return "[missing " + placeholder + " value]";
  };

  // Format number using localization rules.
  // The options will be retrieved from the `number.format` scope.
  // If this isn't present, then the following options will be used:
  //
  // - `precision`: `3`
  // - `separator`: `"."`
  // - `delimiter`: `","`
  // - `strip_insignificant_zeros`: `false`
  //
  // You can also override these options by providing the `options` argument.
  //
  I18n.toNumber = function(number, options) {
    options = this.prepareOptions(
        options
      , this.lookup("number.format")
      , NUMBER_FORMAT
    );

    var negative = number < 0
      , string = Math.abs(number).toFixed(options.precision).toString()
      , parts = string.split(".")
      , precision
      , buffer = []
      , formattedNumber
    ;

    number = parts[0];
    precision = parts[1];

    while (number.length > 0) {
      buffer.unshift(number.substr(Math.max(0, number.length - 3), 3));
      number = number.substr(0, number.length -3);
    }

    formattedNumber = buffer.join(options.delimiter);

    if (options.strip_insignificant_zeros && precision) {
      precision = precision.replace(/0+$/, "");
    }

    if (options.precision > 0 && precision) {
      formattedNumber += options.separator + precision;
    }

    if (negative) {
      formattedNumber = "-" + formattedNumber;
    }

    return formattedNumber;
  };

  // Format currency with localization rules.
  // The options will be retrieved from the `number.currency.format` and
  // `number.format` scopes, in that order.
  //
  // Any missing option will be retrieved from the `I18n.toNumber` defaults and
  // the following options:
  //
  // - `unit`: `"$"`
  // - `precision`: `2`
  // - `format`: `"%u%n"`
  // - `delimiter`: `","`
  // - `separator`: `"."`
  //
  // You can also override these options by providing the `options` argument.
  //
  I18n.toCurrency = function(number, options) {
    options = this.prepareOptions(
        options
      , this.lookup("number.currency.format")
      , this.lookup("number.format")
      , CURRENCY_FORMAT
    );

    number = this.toNumber(number, options);
    number = options.format
      .replace("%u", options.unit)
      .replace("%n", number)
    ;

    return number;
  };

  // Localize several values.
  // You can provide the following scopes: `currency`, `number`, or `percentage`.
  // If you provide a scope that matches the `/^(date|time)/` regular expression
  // then the `value` will be converted by using the `I18n.toTime` function.
  //
  // It will default to the value's `toString` function.
  //
  I18n.localize = function(scope, value) {
    switch (scope) {
      case "currency":
        return this.toCurrency(value);
      case "number":
        scope = this.lookup("number.format");
        return this.toNumber(value, scope);
      case "percentage":
        return this.toPercentage(value);
      default:
        if (scope.match(/^(date|time)/)) {
          return this.toTime(scope, value);
        } else {
          return value.toString();
        }
    }
  };

  // Parse a given `date` string into a JavaScript Date object.
  // This function is time zone aware.
  //
  // The following string formats are recognized:
  //
  //    yyyy-mm-dd
  //    yyyy-mm-dd[ T]hh:mm::ss
  //    yyyy-mm-dd[ T]hh:mm::ss
  //    yyyy-mm-dd[ T]hh:mm::ssZ
  //    yyyy-mm-dd[ T]hh:mm::ss+0000
  //    yyyy-mm-dd[ T]hh:mm::ss+00:00
  //    yyyy-mm-dd[ T]hh:mm::ss.123Z
  //
  I18n.parseDate = function(date) {
    var matches, convertedDate, fraction;
    // we have a date, so just return it.
    if (typeof(date) == "object") {
      return date;
    };

    matches = date.toString().match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})([\.,]\d{1,3})?)?(Z|\+00:?00)?/);

    if (matches) {
      for (var i = 1; i <= 6; i++) {
        matches[i] = parseInt(matches[i], 10) || 0;
      }

      // month starts on 0
      matches[2] -= 1;

      fraction = matches[7] ? 1000 * ("0" + matches[7]) : null;

      if (matches[8]) {
        convertedDate = new Date(Date.UTC(matches[1], matches[2], matches[3], matches[4], matches[5], matches[6], fraction));
      } else {
        convertedDate = new Date(matches[1], matches[2], matches[3], matches[4], matches[5], matches[6], fraction);
      }
    } else if (typeof(date) == "number") {
      // UNIX timestamp
      convertedDate = new Date();
      convertedDate.setTime(date);
    } else if (date.match(/([A-Z][a-z]{2}) ([A-Z][a-z]{2}) (\d+) (\d+:\d+:\d+) ([+-]\d+) (\d+)/)) {
      // This format `Wed Jul 20 13:03:39 +0000 2011` is parsed by
      // webkit/firefox, but not by IE, so we must parse it manually.
      convertedDate = new Date();
      convertedDate.setTime(Date.parse([
        RegExp.$1, RegExp.$2, RegExp.$3, RegExp.$6, RegExp.$4, RegExp.$5
      ].join(" ")));
    } else if (date.match(/\d+ \d+:\d+:\d+ [+-]\d+ \d+/)) {
      // a valid javascript format with timezone info
      convertedDate = new Date();
      convertedDate.setTime(Date.parse(date));
    } else {
      // an arbitrary javascript string
      convertedDate = new Date();
      convertedDate.setTime(Date.parse(date));
    }

    return convertedDate;
  };

  // Formats time according to the directives in the given format string.
  // The directives begins with a percent (%) character. Any text not listed as a
  // directive will be passed through to the output string.
  //
  // The accepted formats are:
  //
  //     %a  - The abbreviated weekday name (Sun)
  //     %A  - The full weekday name (Sunday)
  //     %b  - The abbreviated month name (Jan)
  //     %B  - The full month name (January)
  //     %c  - The preferred local date and time representation
  //     %d  - Day of the month (01..31)
  //     %-d - Day of the month (1..31)
  //     %H  - Hour of the day, 24-hour clock (00..23)
  //     %-H - Hour of the day, 24-hour clock (0..23)
  //     %I  - Hour of the day, 12-hour clock (01..12)
  //     %-I - Hour of the day, 12-hour clock (1..12)
  //     %m  - Month of the year (01..12)
  //     %-m - Month of the year (1..12)
  //     %M  - Minute of the hour (00..59)
  //     %-M - Minute of the hour (0..59)
  //     %p  - Meridian indicator (AM  or  PM)
  //     %S  - Second of the minute (00..60)
  //     %-S - Second of the minute (0..60)
  //     %w  - Day of the week (Sunday is 0, 0..6)
  //     %y  - Year without a century (00..99)
  //     %-y - Year without a century (0..99)
  //     %Y  - Year with century
  //     %z  - Timezone offset (+0545)
  //
  I18n.strftime = function(date, format) {
    var options = this.lookup("date")
      , meridianOptions = I18n.meridian()
    ;

    if (!options) {
      options = {};
    }

    options = this.prepareOptions(options, DATE);

    var weekDay = date.getDay()
      , day = date.getDate()
      , year = date.getFullYear()
      , month = date.getMonth() + 1
      , hour = date.getHours()
      , hour12 = hour
      , meridian = hour > 11 ? 1 : 0
      , secs = date.getSeconds()
      , mins = date.getMinutes()
      , offset = date.getTimezoneOffset()
      , absOffsetHours = Math.floor(Math.abs(offset / 60))
      , absOffsetMinutes = Math.abs(offset) - (absOffsetHours * 60)
      , timezoneoffset = (offset > 0 ? "-" : "+") +
          (absOffsetHours.toString().length < 2 ? "0" + absOffsetHours : absOffsetHours) +
          (absOffsetMinutes.toString().length < 2 ? "0" + absOffsetMinutes : absOffsetMinutes)
    ;

    if (hour12 > 12) {
      hour12 = hour12 - 12;
    } else if (hour12 === 0) {
      hour12 = 12;
    }

    format = format.replace("%a", options.abbr_day_names[weekDay]);
    format = format.replace("%A", options.day_names[weekDay]);
    format = format.replace("%b", options.abbr_month_names[month]);
    format = format.replace("%B", options.month_names[month]);
    format = format.replace("%d", padding(day));
    format = format.replace("%e", day);
    format = format.replace("%-d", day);
    format = format.replace("%H", padding(hour));
    format = format.replace("%-H", hour);
    format = format.replace("%I", padding(hour12));
    format = format.replace("%-I", hour12);
    format = format.replace("%m", padding(month));
    format = format.replace("%-m", month);
    format = format.replace("%M", padding(mins));
    format = format.replace("%-M", mins);
    format = format.replace("%p", meridianOptions[meridian]);
    format = format.replace("%S", padding(secs));
    format = format.replace("%-S", secs);
    format = format.replace("%w", weekDay);
    format = format.replace("%y", padding(year));
    format = format.replace("%-y", padding(year).replace(/^0+/, ""));
    format = format.replace("%Y", year);
    format = format.replace("%z", timezoneoffset);

    return format;
  };

  // Convert the given dateString into a formatted date.
  I18n.toTime = function(scope, dateString) {
    var date = this.parseDate(dateString)
      , format = this.lookup(scope)
    ;

    if (date.toString().match(/invalid/i)) {
      return date.toString();
    }

    if (!format) {
      return date.toString();
    }

    return this.strftime(date, format);
  };

  // Convert a number into a formatted percentage value.
  I18n.toPercentage = function(number, options) {
    options = this.prepareOptions(
        options
      , this.lookup("number.percentage.format")
      , this.lookup("number.format")
      , PERCENTAGE_FORMAT
    );

    number = this.toNumber(number, options);
    return number + "%";
  };

  // Convert a number into a readable size representation.
  I18n.toHumanSize = function(number, options) {
    var kb = 1024
      , size = number
      , iterations = 0
      , unit
      , precision
    ;

    while (size >= kb && iterations < 4) {
      size = size / kb;
      iterations += 1;
    }

    if (iterations === 0) {
      unit = this.t("number.human.storage_units.units.byte", {count: size});
      precision = 0;
    } else {
      unit = this.t("number.human.storage_units.units." + SIZE_UNITS[iterations]);
      precision = (size - Math.floor(size) === 0) ? 0 : 1;
    }

    options = this.prepareOptions(
        options
      , {precision: precision, format: "%n%u", delimiter: ""}
    );

    number = this.toNumber(size, options);
    number = options.format
      .replace("%u", unit)
      .replace("%n", number)
    ;

    return number;
  };

  // Set aliases, so we can save some typing.
  I18n.t = I18n.translate;
  I18n.l = I18n.localize;
  I18n.p = I18n.pluralize;
})(typeof(exports) === "undefined" ? (this.I18n || (this.I18n = {})) : exports);


I18n.translations = {"en":{"brand":"GRAVIEX","submit":"Submit","cancel":"Cancel","confirm":"Confirm","banks":{"icbc":"Industryand Commercial Bank of China","cbc":"Construction Bank of China","bc":"Bank of China","bcm":"Bank of Communications","abc":"Agriculture Bank of China","cmb":"China Merchants Bank Ltd","cmbc":"China Minsheng Banking Co., Ltd","cncb":"China CITIC Bank","hxb":"Hua Xia Bank Co., Ltd.","cib":"Industrial Bank Co., Ltd","spdb":"Shanghai Pudong Development Bank","bob":"Bank of Beijing","ceb":"China Everbright Bank CO.LTD","sdb":"Shenzhen Development Bank","pab":"Ping An Bank Co., Ltd.","gdb":"Guangdong Development Bank","psbc":"Postal Savings Bank of China","bos":"Bank of Shanghai"},"fund_sources":{"manage_bank_account":"Bank Account Management","manage_bank_account_desc":"To facilitate the choice of bank withdrawals address","manage_coin_address":"Coin Address Management","manage_coin_address_desc":"To facilitate the choice of coin withdrawals address","bank":"Bank","account":"Bank Account","label":"Label","address":"Address","action":"Action","add":"Add","remove":"Remove","default":"Default"},"dividends":{"agreement":"Contract","agreement_accepted":"Agreement accepted.","agreement_revoked":"Agreement revoked.","intraday":{"title":"Intraday profit","time":"Time","current":"Current","previous":"Volume","proft":"Profit","no_data":"There is no history data"},"daily":{"title":"Daily profit","time":"Time","volume":"Volume","proft":"Profit","no_data":"There is no history data"}},"funds":{"deposit":"Deposit","withdraw":"Withdraw","currency_name":{"cny":"CNY","btc":"BTC","gio":"GIO","doge":"DOGE","ltc":"LTC","eth":"ETH","psd":"PSD","phc":"PHC","xgc":"XGC","dev":"DEV","pbs":"PBS","din":"DIN","adv":"ADV","dv7":"DV7","jew":"JEW","argo":"ARGO","esco":"ESCO","neet":"NEET","xylo":"XYLO","steep":"STEEP","bitg":"BITG","crft":"CRFT","env":"ENV","xsg":"XSG","nyc":"NYC","zoc":"ZOC","btcz":"BTCZ","ytn":"YTN","yic":"YIC","tlp":"TLP","pwc":"PWC","shnd":"SHND","lmn":"LMN","kec":"KEC","abs":"ABS","suppo":"SUPPO","linda":"LINDA","hight":"HIGHT","bls":"BLS","tokc":"TOKC","elp":"ELP","zex":"ZEX","rlc":"RLC","lucky":"LUCKY","ich":"ICH","mmb":"MMB","pnx":"PNX","mix":"MIX","kreds":"KREDS","bkt":"BKT","snx":"SNX","giro":"GIRO","onex":"ONEX","pushi":"PUSHI","vrt":"VRT","zaca":"ZACA","xhm":"XHM","xar":"XAR","rupx":"RUPX","frm":"FRM","men":"MEN","mun":"MUN","onemc":"ONEMC","alp":"ALP","zel":"ZEL","amx":"AMX","pew":"PEW","fsc":"FSC","sln":"SLN","usx":"USX","bsx":"BSX","eot":"EOT","xap":"XAP","miac":"MIAC","kc":"KC","arhm":"ARHM","olmp":"OLMP","onz":"ONZ","agn":"AGN","crz":"CRZ","enix":"ENIX","snc":"SNC","quaz":"QUAZ","scriv":"SCRIV","ethf":"ETHF","arepa":"AREPA","sub1x":"SUB1X","cheese":"CHEESE","jiyo":"JIYO","pyro":"PYRO","roe":"ROE","citr":"CITR","xen":"XEN","edl":"EDL","cru":"CRU","ndc":"NDC","zls":"ZLS","proton":"PROTON","krait":"KRAIT","aln":"ALN","bcp":"BCP","xmx":"XMX","ida":"IDA","unify":"UNIFY","and":"AND","vig":"VIG","peps":"PEPS","vizz":"VIZZ","mon":"MON","lunex":"LUNEX","pruf":"PRUF","want":"WANT","mmo":"MMO","cbt":"CBT","xt3":"XT3","btcf":"BTCF","zcr":"ZCR","slrc":"SLRC","aevo":"AEVO","ppx":"PPX","yoba":"YOBA","nbx":"NBX","elli":"ELLI","kgx":"KGX","akn":"AKN","aka":"AKA","rvn":"RVN","posq":"POSQ","radius":"RADIUS","dsc":"DSC","varius":"VARIUS","cyr":"CYR","bbrc":"BBRC","ikt":"IKT","bsl":"BSL","bff":"BFF","toba":"TOBA","alps":"ALPS","rlm":"RLM","vzh":"VZH","rco":"RCO","cbc":"CBC","exam":"EXAM","nah":"NAH","slash":"SLASH","adr":"ADR","htrc":"HTRC","ice":"ICE","ebs":"EBS","xeh":"XEH","krm":"KRM","cgur":"CGUR","vre":"VRE","her":"HER","bzm":"BZM","itis":"ITIS","hpp":"HPP","dsn":"DSN","demos":"DEMOS","jagar":"JAGAR"},"deposit_cny":{"title":"Chinese Yuan Deposit","desc":"To deposit via Bank transfer, please follow these steps:","desc_item_1":"1. Submit the form to get the identification code.","desc_item_2":"2. Transfer the money to exchange's bank account. Please make sure your referral code was written on the form you fill in.","desc_item_3":"3. Your deposit will be confirmed as soon as the money is received.","attention":"Attention: The name of your bank account must be the same as your account name on our site, otherwise your deposit may fail.","from":"From","to":"To","deposit_name":"Your Name","deposit_account":"Deposit Account","add":"Add","manage":"Manage","amount":"Deposit Amount","min_amount":"At least 10 yuan","to_account":"Account","to_name":"Name","to_bank_name":"Bank Name","opening_bank_name":"Account where created","remark":"Referral Code (Transfer identification code)"},"deposit_btc":{"title":"BTC Deposit"},"deposit_gio":{"title":"GIO Deposit"},"deposit_doge":{"title":"DOGE Deposit"},"deposit_ltc":{"title":"LTC Deposit"},"deposit_eth":{"title":"ETH Deposit"},"deposit_psd":{"title":"PSD Deposit"},"deposit_phc":{"title":"PHC Deposit"},"deposit_xgc":{"title":"XGC Deposit"},"deposit_dev":{"title":"DEV Deposit"},"deposit_pbs":{"title":"PBS Deposit"},"deposit_din":{"title":"DIN Deposit"},"deposit_adv":{"title":"ADV Deposit"},"deposit_dv7":{"title":"DV7 Deposit"},"deposit_jew":{"title":"JEW Deposit"},"deposit_argo":{"title":"ARGO Deposit"},"deposit_esco":{"title":"ESCO Deposit"},"deposit_neet":{"title":"NEET Deposit"},"deposit_xylo":{"title":"XYLO Deposit"},"deposit_steep":{"title":"STEEP Deposit"},"deposit_bitg":{"title":"BITG Deposit"},"deposit_crft":{"title":"CRFT Deposit"},"deposit_env":{"title":"ENV Deposit"},"deposit_xsg":{"title":"XSG Deposit"},"deposit_nyc":{"title":"NYC Deposit"},"deposit_zoc":{"title":"ZOC Deposit"},"deposit_btcz":{"title":"BTCZ Deposit"},"deposit_ytn":{"title":"YTN Deposit"},"deposit_yic":{"title":"YIC Deposit"},"deposit_tlp":{"title":"TLP Deposit"},"deposit_pwc":{"title":"PWC Deposit"},"deposit_shnd":{"title":"SHND Deposit"},"deposit_lmn":{"title":"LMN Deposit"},"deposit_kec":{"title":"KEC Deposit"},"deposit_abs":{"title":"ABS Deposit"},"deposit_suppo":{"title":"SUPPO Deposit"},"deposit_linda":{"title":"LINDA Deposit"},"deposit_hight":{"title":"HIGHT Deposit"},"deposit_bls":{"title":"BLS Deposit"},"deposit_tokc":{"title":"TOKC Deposit"},"deposit_elp":{"title":"ELP Deposit"},"deposit_zex":{"title":"ZEX Deposit"},"deposit_rlc":{"title":"RLC Deposit"},"deposit_lucky":{"title":"LUCKY Deposit"},"deposit_ich":{"title":"ICH Deposit"},"deposit_mmb":{"title":"MMB Deposit"},"deposit_pnx":{"title":"PNX Deposit"},"deposit_mix":{"title":"MIX Deposit"},"deposit_kreds":{"title":"KREDS Deposit"},"deposit_bkt":{"title":"BKT Deposit"},"deposit_snx":{"title":"SNX Deposit"},"deposit_giro":{"title":"GIRO Deposit"},"deposit_onex":{"title":"ONEX Deposit"},"deposit_pushi":{"title":"PUSHI Deposit"},"deposit_vrt":{"title":"VRT Deposit"},"deposit_zaca":{"title":"ZACA Deposit"},"deposit_xhm":{"title":"XHM Deposit"},"deposit_xar":{"title":"XAR Deposit"},"deposit_rupx":{"title":"RUPX Deposit"},"deposit_frm":{"title":"FRM Deposit"},"deposit_men":{"title":"MEN Deposit"},"deposit_mun":{"title":"MUN Deposit"},"deposit_onemc":{"title":"ONEMC Deposit"},"deposit_alp":{"title":"ALP Deposit"},"deposit_zel":{"title":"ZEL Deposit"},"deposit_amx":{"title":"AMX Deposit"},"deposit_pew":{"title":"PEW Deposit"},"deposit_fsc":{"title":"FSC Deposit"},"deposit_sln":{"title":"SLN Deposit"},"deposit_usx":{"title":"USX Deposit"},"deposit_bsx":{"title":"BSX Deposit"},"deposit_eot":{"title":"EOT Deposit"},"deposit_xap":{"title":"XAP Deposit"},"deposit_miac":{"title":"MIAC Deposit"},"deposit_kc":{"title":"KC Deposit"},"deposit_arhm":{"title":"ARHM Deposit"},"deposit_olmp":{"title":"OLMP Deposit"},"deposit_onz":{"title":"ONZ Deposit"},"deposit_agn":{"title":"AGN Deposit"},"deposit_crz":{"title":"CRZ Deposit"},"deposit_enix":{"title":"ENIX Deposit"},"deposit_snc":{"title":"SNC Deposit"},"deposit_quaz":{"title":"QUAZ Deposit"},"deposit_scriv":{"title":"SCRIV Deposit"},"deposit_ethf":{"title":"ETHF Deposit"},"deposit_arepa":{"title":"AREPA Deposit"},"deposit_sub1x":{"title":"SUB1X Deposit"},"deposit_cheese":{"title":"CHEESE Deposit"},"deposit_jiyo":{"title":"JIYO Deposit"},"deposit_pyro":{"title":"PYRO Deposit"},"deposit_roe":{"title":"ROE Deposit"},"deposit_citr":{"title":"CITR Deposit"},"deposit_xen":{"title":"XEN Deposit"},"deposit_edl":{"title":"EDL Deposit"},"deposit_cru":{"title":"CRU Deposit"},"deposit_ndc":{"title":"NDC Deposit"},"deposit_zls":{"title":"ZLS Deposit"},"deposit_proton":{"title":"PROTON Deposit"},"deposit_krait":{"title":"KRAIT Deposit"},"deposit_aln":{"title":"ALN Deposit"},"deposit_bcp":{"title":"BCP Deposit"},"deposit_xmx":{"title":"XMX Deposit"},"deposit_ida":{"title":"IDA Deposit"},"deposit_unify":{"title":"UNIFY Deposit"},"deposit_and":{"title":"AND Deposit"},"deposit_vig":{"title":"VIG Deposit"},"deposit_peps":{"title":"PEPS Deposit"},"deposit_vizz":{"title":"VIZZ Deposit"},"deposit_mon":{"title":"MON Deposit"},"deposit_lunex":{"title":"LUNEX Deposit"},"deposit_pruf":{"title":"PRUF Deposit"},"deposit_want":{"title":"WANT Deposit"},"deposit_mmo":{"title":"MMO Deposit"},"deposit_cbt":{"title":"CBT Deposit"},"deposit_xt3":{"title":"XT3 Deposit"},"deposit_btcf":{"title":"BTCF Deposit"},"deposit_zcr":{"title":"ZCR Deposit"},"deposit_slrc":{"title":"SLRC Deposit"},"deposit_aevo":{"title":"AEVO Deposit"},"deposit_ppx":{"title":"PPX Deposit"},"deposit_yoba":{"title":"YOBA Deposit"},"deposit_nbx":{"title":"NBX Deposit"},"deposit_elli":{"title":"ELLI Deposit"},"deposit_kgx":{"title":"KGX Deposit"},"deposit_akn":{"title":"AKN Deposit"},"deposit_aka":{"title":"AKA Deposit"},"deposit_rvn":{"title":"RVN Deposit"},"deposit_posq":{"title":"POSQ Deposit"},"deposit_radius":{"title":"RADIUS Deposit"},"deposit_dsc":{"title":"DSC Deposit"},"deposit_varius":{"title":"VARIUS Deposit"},"deposit_cyr":{"title":"CYR Deposit"},"deposit_bbrc":{"title":"BBRC Deposit"},"deposit_ikt":{"title":"IKT Deposit"},"deposit_bsl":{"title":"BSL Deposit"},"deposit_bff":{"title":"BFF Deposit"},"deposit_toba":{"title":"TOBA Deposit"},"deposit_alps":{"title":"ALPS Deposit"},"deposit_rlm":{"title":"RLM Deposit"},"deposit_vzh":{"title":"VZH Deposit"},"deposit_rco":{"title":"RCO Deposit"},"deposit_cbc":{"title":"CBC Deposit"},"deposit_exam":{"title":"EXAM Deposit"},"deposit_nah":{"title":"NAH Deposit"},"deposit_slash":{"title":"SLASH Deposit"},"deposit_adr":{"title":"ADR Deposit"},"deposit_htrc":{"title":"HTRC Deposit"},"deposit_ice":{"title":"ICE Deposit"},"deposit_ebs":{"title":"EBS Deposit"},"deposit_xeh":{"title":"XEH Deposit"},"deposit_krm":{"title":"KRM Deposit"},"deposit_cgur":{"title":"CGUR Deposit"},"deposit_vre":{"title":"VRE Deposit"},"deposit_her":{"title":"HER Deposit"},"deposit_bzm":{"title":"BZM Deposit"},"deposit_itis":{"title":"ITIS Deposit"},"deposit_hpp":{"title":"HPP Deposit"},"deposit_dsn":{"title":"DSN Deposit"},"deposit_demos":{"title":"DEMOS Deposit"},"deposit_jagar":{"title":"JAGAR Deposit"},"deposit_coin":{"address":"Address","new_address":"New Address","confirm_gen_new_address":"You sure want to generate a new deposit address?","open-wallet":"Please use your common wallet services, local wallet, mobile terminal or online wallet, select a payment and send.","detail":"Please paste the address below in your wallet, and fill in the amount you want to deposit, then confirm and send.","scan-qr":"Scanning QR code to Pay for In the mobile terminal wallet.","after_deposit":"Once you complete sending, you can check the status of your new deposit below.","mining_to_deposit":"Attention! If you’re using an exchange wallet (your deposite address) for mining coins - you must take care you transactions to be no more frequent, than 1 time per hour. In other case exchange administration do not guarantee safety of your transactions.","generate-new":"Generate new address"},"deposit_history":{"title":"Deposit History","number":"#","identification":"Identification Code","time":"Time","txid":"Transaction ID","confirmations":"Confirmations","from":"From","amount":"Amount","state_and_action":"State/Action","cancel":"cancel","no_data":"There is no history data","submitting":"Submitting","cancelled":"Cancelled","submitted":"Submitted","accepted":"Accepted","rejected":"Rejected","checked":"Checked","warning":"Warning","suspect":"Suspect"},"withdraw_cny":{"title":"Chinese Yuan Withdraw","intro":"Select the bank to cash withdrawal amount and enter the account number and complete submission.","intro_2":"Your bank account and name must be consistent with the real-name authentication name.","attention":"Working Hours: 9:00 - 18:00","account_name":"Account Name","withdraw_address":"Withdraw Address","balance":"Balance","withdraw_amount":"Withdraw Amount","manage_withdraw":"Manage Withdraw","fee_explain":"About Fee","min":"At least","withdraw_all":"Withdraw all"},"withdraw_btc":{"title":"BTC Withdraw"},"withdraw_gio":{"title":"GIO Withdraw"},"withdraw_doge":{"title":"DOGE Withdraw"},"withdraw_ltc":{"title":"LTC Withdraw"},"withdraw_eth":{"title":"ETH Withdraw"},"withdraw_psd":{"title":"PSD Withdraw"},"withdraw_phc":{"title":"PHC Withdraw"},"withdraw_xgc":{"title":"XGC Withdraw"},"withdraw_dev":{"title":"DEV Withdraw"},"withdraw_pbs":{"title":"PBS Withdraw"},"withdraw_din":{"title":"DIN Withdraw"},"withdraw_adv":{"title":"ADV Withdraw"},"withdraw_dv7":{"title":"DV7 Withdraw"},"withdraw_jew":{"title":"JEW Withdraw"},"withdraw_argo":{"title":"ARGO Withdraw"},"withdraw_esco":{"title":"ESCO Withdraw"},"withdraw_neet":{"title":"NEET Withdraw"},"withdraw_xylo":{"title":"XYLO Withdraw"},"withdraw_steep":{"title":"STEEP Withdraw"},"withdraw_bitg":{"title":"BITG Withdraw"},"withdraw_crft":{"title":"CRFT Withdraw"},"withdraw_env":{"title":"ENV Withdraw"},"withdraw_xsg":{"title":"XSG Withdraw"},"withdraw_nyc":{"title":"NYC Withdraw"},"withdraw_zoc":{"title":"ZOC Withdraw"},"withdraw_btcz":{"title":"BTCZ Withdraw"},"withdraw_ytn":{"title":"YTN Withdraw"},"withdraw_yic":{"title":"YIC Withdraw"},"withdraw_tlp":{"title":"TLP Withdraw"},"withdraw_pwc":{"title":"PWC Withdraw"},"withdraw_shnd":{"title":"SHND Withdraw"},"withdraw_lmn":{"title":"LMN Withdraw"},"withdraw_kec":{"title":"KEC Withdraw"},"withdraw_abs":{"title":"ABS Withdraw"},"withdraw_suppo":{"title":"SUPPO Withdraw"},"withdraw_linda":{"title":"LINDA Withdraw"},"withdraw_hight":{"title":"HIGHT Withdraw"},"withdraw_bls":{"title":"BLS Withdraw"},"withdraw_tokc":{"title":"TOKC Withdraw"},"withdraw_elp":{"title":"ELP Withdraw"},"withdraw_zex":{"title":"ZEX Withdraw"},"withdraw_rlc":{"title":"RLC Withdraw"},"withdraw_lucky":{"title":"LUCKY Withdraw"},"withdraw_ich":{"title":"ICH Withdraw"},"withdraw_mmb":{"title":"MMB Withdraw"},"withdraw_pnx":{"title":"PNX Withdraw"},"withdraw_mix":{"title":"MIX Withdraw"},"withdraw_kreds":{"title":"KREDS Withdraw"},"withdraw_bkt":{"title":"BKT Withdraw"},"withdraw_snx":{"title":"SNX Withdraw"},"withdraw_giro":{"title":"GIRO Withdraw"},"withdraw_onex":{"title":"ONEX Withdraw"},"withdraw_pushi":{"title":"PUSHI Withdraw"},"withdraw_vrt":{"title":"VRT Withdraw"},"withdraw_zaca":{"title":"ZACA Withdraw"},"withdraw_xhm":{"title":"XHM Withdraw"},"withdraw_xar":{"title":"XAR Withdraw"},"withdraw_rupx":{"title":"RUPX Withdraw"},"withdraw_frm":{"title":"FRM Withdraw"},"withdraw_men":{"title":"MEN Withdraw"},"withdraw_mun":{"title":"MUN Withdraw"},"withdraw_onemc":{"title":"ONEMC Withdraw"},"withdraw_alp":{"title":"ALP Withdraw"},"withdraw_zel":{"title":"ZEL Withdraw"},"withdraw_amx":{"title":"AMX Withdraw"},"withdraw_pew":{"title":"PEW Withdraw"},"withdraw_fsc":{"title":"FSC Withdraw"},"withdraw_sln":{"title":"SLN Withdraw"},"withdraw_usx":{"title":"USX Withdraw"},"withdraw_bsx":{"title":"BSX Withdraw"},"withdraw_eot":{"title":"EOT Withdraw"},"withdraw_xap":{"title":"XAP Withdraw"},"withdraw_miac":{"title":"MIAC Withdraw"},"withdraw_kc":{"title":"KC Withdraw"},"withdraw_arhm":{"title":"ARHM Withdraw"},"withdraw_olmp":{"title":"OLMP Withdraw"},"withdraw_onz":{"title":"ONZ Withdraw"},"withdraw_agn":{"title":"AGN Withdraw"},"withdraw_crz":{"title":"CRZ Withdraw"},"withdraw_enix":{"title":"ENIX Withdraw"},"withdraw_snc":{"title":"SNC Withdraw"},"withdraw_quaz":{"title":"QUAZ Withdraw"},"withdraw_scriv":{"title":"SCRIV Withdraw"},"withdraw_ethf":{"title":"ETHF Withdraw"},"withdraw_arepa":{"title":"AREPA Withdraw"},"withdraw_sub1x":{"title":"SUB1X Withdraw"},"withdraw_cheese":{"title":"CHEESE Withdraw"},"withdraw_jiyo":{"title":"JIYO Withdraw"},"withdraw_pyro":{"title":"PYRO Withdraw"},"withdraw_roe":{"title":"ROE Withdraw"},"withdraw_citr":{"title":"CITR Withdraw"},"withdraw_xen":{"title":"XEN Withdraw"},"withdraw_edl":{"title":"EDL Withdraw"},"withdraw_cru":{"title":"CRU Withdraw"},"withdraw_ndc":{"title":"NDC Withdraw"},"withdraw_zls":{"title":"ZLS Withdraw"},"withdraw_proton":{"title":"PROTON Withdraw"},"withdraw_krait":{"title":"KRAIT Withdraw"},"withdraw_aln":{"title":"ALN Withdraw"},"withdraw_bcp":{"title":"BCP Withdraw"},"withdraw_xmx":{"title":"XMX Withdraw"},"withdraw_ida":{"title":"IDA Withdraw"},"withdraw_unify":{"title":"UNIFY Withdraw"},"withdraw_and":{"title":"AND Withdraw"},"withdraw_vig":{"title":"VIG Withdraw"},"withdraw_peps":{"title":"PEPS Withdraw"},"withdraw_vizz":{"title":"VIZZ Withdraw"},"withdraw_mon":{"title":"MON Withdraw"},"withdraw_lunex":{"title":"LUNEX Withdraw"},"withdraw_pruf":{"title":"PRUF Withdraw"},"withdraw_want":{"title":"WANT Withdraw"},"withdraw_mmo":{"title":"MMO Withdraw"},"withdraw_cbt":{"title":"CBT Withdraw"},"withdraw_xt3":{"title":"XT3 Withdraw"},"withdraw_btcf":{"title":"BTCF Withdraw"},"withdraw_zcr":{"title":"ZCR Withdraw"},"withdraw_slrc":{"title":"SLRC Withdraw"},"withdraw_aevo":{"title":"AEVO Withdraw"},"withdraw_ppx":{"title":"PPX Withdraw"},"withdraw_yoba":{"title":"YOBA Withdraw"},"withdraw_nbx":{"title":"NBX Withdraw"},"withdraw_elli":{"title":"ELLI Withdraw"},"withdraw_kgx":{"title":"KGX Withdraw"},"withdraw_akn":{"title":"AKN Withdraw"},"withdraw_aka":{"title":"AKA Withdraw"},"withdraw_rvn":{"title":"RVN Withdraw"},"withdraw_posq":{"title":"POSQ Withdraw"},"withdraw_radius":{"title":"RADIUS Withdraw"},"withdraw_dsc":{"title":"DSC Withdraw"},"withdraw_varius":{"title":"VARIUS Withdraw"},"withdraw_cyr":{"title":"CYR Withdraw"},"withdraw_bbrc":{"title":"BBRC Withdraw"},"withdraw_ikt":{"title":"IKT Withdraw"},"withdraw_bsl":{"title":"BSL Withdraw"},"withdraw_bff":{"title":"BFF Withdraw"},"withdraw_toba":{"title":"TOBA Withdraw"},"withdraw_alps":{"title":"ALPS Withdraw"},"withdraw_rlm":{"title":"RLM Withdraw"},"withdraw_vzh":{"title":"VZH Withdraw"},"withdraw_rco":{"title":"RCO Withdraw"},"withdraw_cbc":{"title":"CBC Withdraw"},"withdraw_exam":{"title":"EXAM Withdraw"},"withdraw_nah":{"title":"NAH Withdraw"},"withdraw_slash":{"title":"SLASH Withdraw"},"withdraw_adr":{"title":"ADR Withdraw"},"withdraw_htrc":{"title":"HTRC Withdraw"},"withdraw_ice":{"title":"ICE Withdraw"},"withdraw_ebs":{"title":"EBS Withdraw"},"withdraw_xeh":{"title":"XEH Withdraw"},"withdraw_krm":{"title":"KRM Withdraw"},"withdraw_cgur":{"title":"CGUR Withdraw"},"withdraw_vre":{"title":"VRE Withdraw"},"withdraw_her":{"title":"HER Withdraw"},"withdraw_bzm":{"title":"BZM Withdraw"},"withdraw_itis":{"title":"ITIS Withdraw"},"withdraw_hpp":{"title":"HPP Withdraw"},"withdraw_dsn":{"title":"DSN Withdraw"},"withdraw_demos":{"title":"DEMOS Withdraw"},"withdraw_jagar":{"title":"JAGAR Withdraw"},"withdraw_coin":{"intro":"Please fill in the address and amount, then submit the form. It will be confirmed in 10 minutes","withdraw_limit_btc":"Withdraw day limit is 2 for an unverified account.","withdraw_limit_gio":"Withdraw day limit is 5 000 000 for an unverified account.","withdraw_limit_doge":"Withdraw day limit is 1 000 000 for an unverified account.","withdraw_limit_ltc":"Withdraw day limit is 1 000 for an unverified account.","withdraw_limit_eth":"Withdraw day limit is 10 for an unverified account.","withdraw_limit_psd":"Withdraw day limit is 200 000 for an unverified account.","withdraw_limit_phc":"Withdraw day limit is 100 000 for an unverified account.","withdraw_limit_xgc":"Withdraw day limit is 10 000 for an unverified account.","withdraw_limit_dev":"Withdraw day limit is 50 000 for an unverified account.","withdraw_limit_pbs":"Withdraw day limit is 20 000 for an unverified account.","withdraw_limit_din":"Withdraw day limit is 20 000 for an unverified account.","withdraw_limit_adv":"Withdraw day limit is 20 000 000 for an unverified account.","withdraw_limit_dv7":"Withdraw day limit is 20 000 000 for an unverified account.","withdraw_limit_jew":"Withdraw day limit is 20 000 for an unverified account.","withdraw_limit_argo":"Withdraw day limit is 20 000 for an unverified account.","withdraw_limit_esco":"Withdraw day limit is 20 000 for an unverified account.","withdraw_limit_neet":"Withdraw day limit is 20 000 000 for an unverified account.","withdraw_limit_xylo":"Withdraw day limit is 20 000 for an unverified account.","withdraw_limit_steep":"Withdraw day limit is 5000000 for an unverified account.","withdraw_limit_bitg":"Withdraw day limit is 20 000 for an unverified account.","withdraw_limit_crft":"Withdraw day limit is 5000000 for an unverified account.","withdraw_limit_env":"Withdraw day limit is 500000 for an unverified account.","withdraw_limit_xsg":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_nyc":"Withdraw day limit is 5000000 for an unverified account.","withdraw_limit_zoc":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_btcz":"Withdraw day limit is 50000000 for an unverified account.","withdraw_limit_ytn":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_yic":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_tlp":"Withdraw day limit is 5000000 for an unverified account.","withdraw_limit_pwc":"Withdraw day limit is 5000000 for an unverified account.","withdraw_limit_shnd":"Withdraw day limit is 5000000000 for an unverified account.","withdraw_limit_lmn":"Withdraw day limit is 5000000 for an unverified account.","withdraw_limit_kec":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_abs":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_suppo":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_linda":"Withdraw day limit is 50000000 for an unverified account.","withdraw_limit_hight":"Withdraw day limit is 500000 for an unverified account.","withdraw_limit_bls":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_tokc":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_elp":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_zex":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_rlc":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_lucky":"Withdraw day limit is 5000 for an unverified account.","withdraw_limit_ich":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_mmb":"Withdraw day limit is 500000 for an unverified account.","withdraw_limit_pnx":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_mix":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_kreds":"Withdraw day limit is 500000 for an unverified account.","withdraw_limit_bkt":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_snx":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_giro":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_onex":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_pushi":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_vrt":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_zaca":"Withdraw day limit is 5000 for an unverified account.","withdraw_limit_xhm":"Withdraw day limit is 500000 for an unverified account.","withdraw_limit_xar":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_rupx":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_frm":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_men":"Withdraw day limit is 5000000 for an unverified account.","withdraw_limit_mun":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_onemc":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_alp":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_zel":"Withdraw day limit is 500000 for an unverified account.","withdraw_limit_amx":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_pew":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_fsc":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_sln":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_usx":"Withdraw day limit is 200000 for an unverified account.","withdraw_limit_bsx":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_eot":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_xap":"Withdraw day limit is 500000 for an unverified account.","withdraw_limit_miac":"Withdraw day limit is 500000 for an unverified account.","withdraw_limit_kc":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_arhm":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_olmp":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_onz":"Withdraw day limit is 200000 for an unverified account.","withdraw_limit_agn":"Withdraw day limit is 10000 for an unverified account.","withdraw_limit_crz":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_enix":"Withdraw day limit is 200000 for an unverified account.","withdraw_limit_snc":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_quaz":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_scriv":"Withdraw day limit is 2000000 for an unverified account.","withdraw_limit_ethf":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_arepa":"Withdraw day limit is 200000 for an unverified account.","withdraw_limit_sub1x":"Withdraw day limit is 1000 for an unverified account.","withdraw_limit_cheese":"Withdraw day limit is 5000000 for an unverified account.","withdraw_limit_jiyo":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_pyro":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_roe":"Withdraw day limit is 50000 for an unverified account.","withdraw_limit_citr":"Withdraw day limit is 5000 for an unverified account.","withdraw_limit_xen":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_edl":"Withdraw day limit is 20000000 for an unverified account.","withdraw_limit_cru":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_ndc":"Withdraw day limit is 200000 for an unverified account.","withdraw_limit_zls":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_proton":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_krait":"Withdraw day limit is 60000 for an unverified account.","withdraw_limit_aln":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_bcp":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_xmx":"Withdraw day limit is 200000 for an unverified account.","withdraw_limit_ida":"Withdraw day limit is 200000 for an unverified account.","withdraw_limit_unify":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_and":"Withdraw day limit is 400000 for an unverified account.","withdraw_limit_vig":"Withdraw day limit is 100000 for an unverified account.","withdraw_limit_peps":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_vizz":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_mon":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_lunex":"Withdraw day limit is 10000 for an unverified account.","withdraw_limit_pruf":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_want":"Withdraw day limit is 30000 for an unverified account.","withdraw_limit_mmo":"Withdraw day limit is 100000 for an unverified account.","withdraw_limit_cbt":"Withdraw day limit is 300000 for an unverified account.","withdraw_limit_xt3":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_btcf":"Withdraw day limit is 60000 for an unverified account.","withdraw_limit_zcr":"Withdraw day limit is 100000 for an unverified account.","withdraw_limit_slrc":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_aevo":"Withdraw day limit is 400000 for an unverified account.","withdraw_limit_ppx":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_yoba":"Withdraw day limit is 100000 for an unverified account.","withdraw_limit_nbx":"Withdraw day limit is 100000 for an unverified account.","withdraw_limit_elli":"Withdraw day limit is 40000 for an unverified account.","withdraw_limit_kgx":"Withdraw day limit is 30000 for an unverified account.","withdraw_limit_akn":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_aka":"Withdraw day limit is 30000 for an unverified account.","withdraw_limit_rvn":"Withdraw day limit is 2000000 for an unverified account.","withdraw_limit_posq":"Withdraw day limit is 200000 for an unverified account.","withdraw_limit_radius":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_dsc":"Withdraw day limit is 30000 for an unverified account.","withdraw_limit_varius":"Withdraw day limit is 30000000 for an unverified account.","withdraw_limit_cyr":"Withdraw day limit is 100000 for an unverified account.","withdraw_limit_bbrc":"Withdraw day limit is 200000 for an unverified account.","withdraw_limit_ikt":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_bsl":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_bff":"Withdraw day limit is 20000000 for an unverified account.","withdraw_limit_toba":"Withdraw day limit is 10000000 for an unverified account.","withdraw_limit_alps":"Withdraw day limit is 300000 for an unverified account.","withdraw_limit_rlm":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_vzh":"Withdraw day limit is 200000 for an unverified account.","withdraw_limit_rco":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_cbc":"Withdraw day limit is 200000 for an unverified account.","withdraw_limit_exam":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_nah":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_slash":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_adr":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_htrc":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_ice":"Withdraw day limit is 100000 for an unverified account.","withdraw_limit_ebs":"Withdraw day limit is 100000 for an unverified account.","withdraw_limit_xeh":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_krm":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_cgur":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_vre":"Withdraw day limit is 40000 for an unverified account.","withdraw_limit_her":"Withdraw day limit is 40000 for an unverified account.","withdraw_limit_bzm":"Withdraw day limit is 20000 for an unverified account.","withdraw_limit_itis":"Withdraw day limit is 200000 for an unverified account.","withdraw_limit_hpp":"Withdraw day limit is 100000 for an unverified account.","withdraw_limit_dsn":"Withdraw day limit is 40000 for an unverified account.","withdraw_limit_demos":"Withdraw day limit is 40000 for an unverified account.","withdraw_limit_jagar":"Withdraw day limit is 5000000 for an unverified account.","label":"Label","balance":"Balance","amount":"Amount","manage_withdraw":"Manage Address","min":"At least","withdraw_all":"Withdraw all","fee_explain":"About Fee"},"withdraw_history":{"title":"Withdraw History","number":"Number","withdraw_time":"Time","withdraw_account":"Withdraw Account","withdraw_address":"Address","withdraw_amount":"Amount","actual_amount":"Actual Amount","fee":"Fee","miner_fee":"Fee","state_and_action":"State/Action","cancel":"Cancel","no_data":"There is no history data","submitting":"Submitting","submitted":"Submitted","rejected":"Rejected","accepted":"Accepted","suspect":"Suspect","processing":"Processing","coin_ready":"Coin Ready","coin_done":"Coin Done","done":"Done","almost_done":"Almost Done","canceled":"Canceled","failed":"Failed"}},"auth":{"please_active_two_factor":"Please set google authenticator first.","submit":"Submit","otp_placeholder":"6-digit password","google_app":"Google Authenticator","sms":"SMS Verification Messages","send_code":"Send Code","send_code_alt":"Resend in COUNT seconds","hints":{"app":"Google Authenticator will re-generate a new password every thirty seconds, please input timely.","sms":"We'll send a text message to you phone with verify code."}},"markets":{"market_list":{"all":"All Market","cny":"CNY Market","btc":"BTC Market","gio":"GIO Market","doge":"DOGE Market","ltc":"LTC Market","eth":"ETH Market","psd":"PSD Market","phc":"PHC Market","xgc":"XGC Market","dev":"DEV Market","pbs":"PBS Market","din":"DIN Market","adv":"ADV Market","dv7":"DV7 Market","jew":"JEW Market","argo":"ARGO Market","esco":"ESCO Market","neet":"NEET Market","xylo":"XYLO Market","steep":"STEEP Market","bitg":"BITG Market","crft":"CRFT Market","env":"ENV Market","xsg":"XSG Market","nyc":"NYC Market","zoc":"ZOC Market","btcz":"BTCZ Market","ytn":"YTN Market","yic":"YIC Market","tlp":"TLP Market","pwc":"PWC Market","shnd":"SHND Market","lmn":"LMN Market","kec":"KEC Market","abs":"ABS Market","suppo":"SUPPO Market","linda":"LINDA Market","hight":"HIGHT Market","bls":"BLS Market","tokc":"TOKC Market","elp":"ELP Market","zex":"ZEX Market","rlc":"RLC Market","lucky":"LUCKY Market","ich":"ICH Market","mmb":"MMB Market","pnx":"PNX Market","mix":"MIX Market","kreds":"KREDS Market","bkt":"BKT Market","snx":"SNX Market","giro":"GIRO Market","onex":"ONEX Market","pushi":"PUSHI Market","vrt":"VRT Market","zaca":"ZACA Market","xhm":"XHM Market","xar":"XAR Market","rupx":"RUPX Market","frm":"FRM Market","men":"MEN Market","mun":"MUN Market","onemc":"ONEMC Market","alp":"ALP Market","zel":"ZEL Market","amx":"AMX Market","pew":"PEW Market","fsc":"FSC Market","sln":"SLN Market","usx":"USX Market","bsx":"BSX Market","eot":"EOT Market","xap":"XAP Market","miac":"MIAC Market","kc":"KC Market","arhm":"ARHM Market","olmp":"OLMP Market","onz":"ONZ Market","agn":"AGN Market","crz":"CRZ Market","enix":"ENIX Market","snc":"SNC Market","quaz":"QUAZ Market","scriv":"SCRIV Market","ethf":"ETHF Market","arepa":"AREPA Market","sub1x":"SUB1X Market","cheese":"CHEESE Market","jiyo":"JIYO Market","pyro":"PYRO Market","roe":"ROE Market","citr":"CITR Market","xen":"XEN Market","edl":"EDL Market","cru":"CRU Market","ndc":"NDC Market","zls":"ZLS Market","proton":"PROTON Market","krait":"KRAIT Market","aln":"ALN Market","bcp":"BCP Market","xmx":"XMX Market","ida":"IDA Market","unify":"UNIFY Market","and":"AND Market","vig":"VIG Market","peps":"PEPS Market","vizz":"VIZZ Market","mon":"MON Market","lunex":"LUNEX Market","pruf":"PRUF Market","want":"WANT Market","mmo":"MMO Market","cbt":"CBT Market","xt3":"XT3 Market","btcf":"BTCF Market","zcr":"ZCR Market","slrc":"SLRC Market","aevo":"AEVO Market","ppx":"PPX Market","yoba":"YOBA Market","nbx":"NBX Market","elli":"ELLI Market","kgx":"KGX Market","akn":"AKN Market","aka":"AKA Market","rvn":"RVN Market","posq":"POSQ Market","radius":"RADIUS Market","dsc":"DSC Market","varius":"VARIUS Market","cyr":"CYR Market","bbrc":"BBRC Market","ikt":"IKT Market","bsl":"BSL Market","bff":"BFF Market","toba":"TOBA Market","alps":"ALPS Market","rlm":"RLM Market","vzh":"VZH Market","rco":"RCO Market","cbc":"CBC Market","exam":"EXAM Market","nah":"NAH Market","slash":"SLASH Market","adr":"ADR Market","htrc":"HTRC Market","ice":"ICE Market","ebs":"EBS Market","xeh":"XEH Market","krm":"KRM Market","cgur":"CGUR Market","vre":"VRE Market","her":"HER Market","bzm":"BZM Market","itis":"ITIS Market","hpp":"HPP Market","dsn":"DSN Market","demos":"DEMOS Market","jagar":"JAGAR Market"}}}};
I18n.locale = 'en';





































































































































































































