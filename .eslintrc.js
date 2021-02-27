module.exports = {
  "plugins": ["jest", "sonarjs"],
  "globals": {
    "process": "readonly"
  },
  "env": {
    "browser": true,
    "es6": true
  },
  "extends": ["plugin:sonarjs/recommended", "eslint:recommended", "plugin:jest/recommended", "airbnb-base"],
  "parserOptions": {
    "ecmaVersion": 2018,
    "sourceType": "module"
  },
  "rules": {
    "no-use-before-define": [
      "error",
      {
        "functions": false,
        "classes": true,
        "variables": true
      }
    ],
    "class-methods-use-this": "off",
    "no-return-await": "off",
    "no-plusplus": "off",
    "max-len": "off",
    "no-console": "off",
    "import/no-dynamic-require": "off",
    "global-require": "off",
    "no-restricted-syntax": [
      "error",
      {
        "selector": "ForInStatement",
        "message": "for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array."
      },
      {
        "selector": "LabeledStatement",
        "message": "Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand."
      },
      {
        "selector": "WithStatement",
        "message": "`with` is disallowed in strict mode because it makes code impossible to predict and optimize."
      }
    ]
  }
};
