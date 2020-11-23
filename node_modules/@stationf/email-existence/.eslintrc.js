module.exports = {
	"env": {
		"node": true,
		"browser": false
	},
	"parserOptions": {
		"ecmaVersion": 10,
		"sourceType": "module",
		"ecmaFeatures": {
			"jsx": false
		}
	},
	"extends": [
		"eslint:recommended"
	],
	"rules": {
		"prefer-const": "error",
		"global-require": "warn",
		"no-new-require": "warn",
		"brace-style": ["warn", "stroustrup"],
		"comma-dangle": ["warn", "never"],
		"comma-style": ["warn", "last"],
		"computed-property-spacing": ["warn", "never"],
		"func-call-spacing": ["warn", "never"],
		"indent": ["warn", "tab"],
		"keyword-spacing": ["warn", { "before": true, "after": true }],
		"max-nested-callbacks": ["warn", 3],
		"multiline-comment-style": ["warn", "starred-block"],
		"no-array-constructor": "warn",
		"no-lonely-if": "warn",
		"no-multi-assign": "warn",
		"no-nested-ternary": "warn",
		"no-new-object": "warn",
		"no-trailing-spaces": ["warn", { "ignoreComments": true }],
		"no-unneeded-ternary": "warn",
		"no-whitespace-before-property": "warn",
		"nonblock-statement-body-position": ["error", "below"],
		"object-curly-newline": ["warn", { "multiline": true }],
		"object-curly-spacing": ["warn", "never"],
		"quotes": ["warn", "double"],
		"semi-spacing": ["warn", { "before": false, "after": true }],
		"semi-style": ["warn", "last"],
		"space-before-function-paren": ["warn", { "anonymous": "always", "named": "never", "asyncArrow": "always" }],
		"space-infix-ops": ["error", { "int32Hint": false }],
		"wrap-regex": "warn",
		"eqeqeq": "warn",
		"no-eval": "error",
		"no-else-return": "warn",
		"no-empty-function": "warn",
		"no-new-wrappers": "warn",
		"no-multi-str": "warn",
		"no-new-func": "warn",
		"no-return-assign": "warn",
		"no-self-compare": "warn",
		"yoda": "warn",
		"no-unused-vars": ["warn", { "args": "none" }],
		"no-console": "warn",
		"no-multi-spaces": "warn",
		"handle-callback-err": ["error"],
		"callback-return": ["error", ["callback", "cb", "next"]],
		"camelcase": "warn",
		"comma-spacing": ["warn", { "before": false, "after": true }],
		"func-call-spacing": ["warn", "never"],
		"key-spacing": ["warn", { "afterColon": true }],
		"semi": ["warn", "always"]
	}
}