'use strict';

const magico = require('magico');
const utils = require('./utils');
const ALLOWED_TYPES = ['validator', 'sanitizer'];

class Method {
  constructor(options) {
    options = options || {};

    this.name = options.name;
    this.args = options.args;
    this.refs = options.refs;
    this.type = options.type;
    this.path = options.path;
    this.locale = options.locale;

    // catchable function
    this.fn = utils.tryCatch(this.type, options.fn);
  }

  canBeBypassed(options) {
    options = options || {};
    if (this.is('validator') && options.skipValidators) return true;
    if (this.is('sanitizer') && options.skipSantizers) return true;
    if (!~ALLOWED_TYPES.indexOf(this.type)) return true;
    return false;
  }

  invoke(value, state, schema, options) {
    schema = schema || {};
    options = options || {};
    state = state || {
      origin: undefined,
      path: '',
      key: '',
      value: undefined,
      hasErrors: false
    };

    let args = utils.cloneArray(this.args);

    // search for reference value
    // 1. search original value
    // 2. search current value
    for (let key in this.refs) {
      let refValue = magico.get(state.value, this.refs[key].__key);
      if (utils.isUndefined(refValue)) {
        refValue = magico.get(state.origin, this.refs[key].__key);
      }
      args[key] = refValue;
    }

    state.args = args;

    // Method context
    let context = {
      state: state,
      schema: schema,
      options: options,
    };

    return this.fn.apply(context, [value].concat(args));
  }

  message(error, args, locale) {
    locale = locale || 'en';
    args = args || [];
    args.args = args;
    args.locale = locale;

    let msg;

    // generate error message by custom locale message
    if (this.locale) msg = magico.get(this.locale, `__msg.${locale}`);

    // generate error message by i18n
    if (!msg) msg = utils.t(this.path, args) || error || '';

    return msg;
  }

  is(type) {
    return this.type === type;
  }
}

module.exports = Method;
