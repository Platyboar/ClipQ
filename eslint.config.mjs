import js from "@eslint/js";
import globals from "globals";

export default [
    {
        ignores: [
            "node_modules/**",
            "app/public/js/tmi.min.js",
        ],
    },
    js.configs.recommended,
    {
        files: ["**/*.mjs"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.serviceworker,
            },
        },
        rules: {
            "no-unused-vars": ["error", { caughtErrors: "all" }],
        },
    },
    {
        files: ["worker.js", "worker/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.serviceworker,
            },
        },
        rules: {
            "no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                caughtErrors: "all",
            }],
            "no-var": "error",
            "prefer-const": "error",
            "eqeqeq": ["error", "always", { null: "ignore" }],
            "no-empty": ["error", { allowEmptyCatch: true }],
        },
    },
    {
        files: ["app/public/js/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "script",
            globals: {
                ...globals.browser,
                ClipQ: "writable",
                tmi: "readonly",
            },
        },
        rules: {
            "strict": ["error", "function"],
            "no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                caughtErrors: "all",
            }],
            "no-var": "error",
            "prefer-const": "error",
            "eqeqeq": ["error", "always", { null: "ignore" }],
            "no-implicit-globals": "error",
            "no-shadow": "warn",
            "no-empty": ["error", { allowEmptyCatch: true }],
            "no-useless-assignment": "error",
            "preserve-caught-error": "off",
            "no-eval": "error",
            "no-implied-eval": "error",
            "no-new-func": "error",
            "no-script-url": "error",
            "no-useless-return": "error",
            "no-unused-expressions": ["error", {
                allowShortCircuit: true,
                allowTernary: true,
            }],
        },
    },
];
