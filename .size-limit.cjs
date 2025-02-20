const limits = require("./.size-limits.json");

const checks = [
  {
    path: "dist/__cjs/index.cjs",
    import: "{ ApolloClient, InMemoryCache, HttpLink }",
  },
  {
    path: "dist/index.js",
    import: "{ ApolloClient, InMemoryCache, HttpLink }",
  },
  ...[
    "ApolloProvider",
    "useQuery",
    "useLazyQuery",
    "useMutation",
    "useSubscription",
    "useSuspenseQuery",
    "useBackgroundQuery",
    "useLoadableQuery",
    "useReadQuery",
    "useFragment",
  ].map((name) => ({ path: "dist/react/index.js", import: `{ ${name} }` })),
]
  .map((config) => ({
    ...config,
    name:
      config.name || config.import ?
        `import ${config.import} from "${config.path}"`
      : config.path,
    // newer versions of size-limit changed to brotli as a default
    // we'll stay on gzip for now, so results are easier to compare
    gzip: true,
    ignore: [
      ...(config.ignore || []),
      "rehackt",
      "react",
      "react-dom",
      "@graphql-typed-document-node/core",
      "@wry/caches",
      "@wry/context",
      "@wry/equality",
      "@wry/trie",
      "graphql-tag",
      "optimism",
      "prop-types",
      "response-iterator",
      "symbol-observable",
      "ts-invariant",
      "tslib",
      "zen-observable-ts",
    ],
  }))
  .flatMap((value) => [
    {
      ...value,
      modifyEsbuildConfig(config) {
        config.conditions = ["development", "module", "browser"];
        return config;
      },
    },
    {
      ...value,
      name: `${value.name} (production)`,
      modifyEsbuildConfig(config) {
        config.conditions = ["production", "module", "browser"];
        return config;
      },
    },
  ])
  .map((value) => {
    value.limit = limits[value.name];
    return value;
  });

module.exports = checks;
