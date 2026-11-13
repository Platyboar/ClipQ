export default {
    extends: ["stylelint-config-standard"],
    rules: {
        "declaration-property-value-disallowed-list": {
            "outline": ["none", "0"],
        },
        "declaration-block-no-redundant-longhand-properties": [
            true,
            { ignoreShorthands: ["grid-template"] },
        ],
        "custom-property-empty-line-before": null,
        "comment-empty-line-before": null,
        "rule-empty-line-before": null,
        "no-descending-specificity": null,
        "alpha-value-notation": null,
        "color-function-notation": null,
        "color-hex-length": null,
        "color-function-alias-notation": null,
        "selector-class-pattern": "^[a-z][a-z0-9-]*$",
        "selector-id-pattern": "^[a-z][a-z0-9-]*$",
        "custom-property-pattern": "^[a-z][a-z0-9-]*$",
    },
};
