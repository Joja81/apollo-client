import type { Collection, Transform, TemplateLiteral } from "jscodeshift";
import type { DirectiveNode, DocumentNode } from "graphql";
import { Kind, parse, visit, print } from "graphql";

const LEADING_WHITESPACE = /^[\\n\s]*/;
const TRAILING_WHITESPACE = /[\\n\s]*$/;
const INDENTATION = /[\\t ]+/;

const DEFAULT_TAGS = ["gql", "graphql"];

const transform: Transform = function transform(file, api, options) {
  const j = api.jscodeshift;
  const source = j(file.source);

  const { tag = DEFAULT_TAGS, mode } = options;

  if (mode && mode !== "migrate") {
    console.warn(
      `The option --mode '${mode}' is not supported. Please use --mode 'migrate' to enable migrate mode for the @ummask directive.`
    );
  }

  const tagNames = Array.isArray(tag) ? tag : [tag];

  tagNames.forEach((tagName) => {
    addUnmaskToTaggedTemplate(tagName);
    addUnmaskToFunctionCall(tagName);
  });

  return source.toSource();

  function addUnmaskToFunctionCall(name: string) {
    source
      .find(j.CallExpression, {
        callee: { name },
        arguments: [{ type: "TemplateLiteral" }],
      })
      .forEach((p) => {
        addUnmaskToTemplateLiteral(j(p.value.arguments[0]));
      });
  }

  function addUnmaskToTaggedTemplate(name: string) {
    source
      .find(j.TaggedTemplateExpression, { tag: { name } })
      .forEach((taggedTemplateExpressionPath) => {
        addUnmaskToTemplateLiteral(
          j(taggedTemplateExpressionPath).find(j.TemplateLiteral)
        );
      });
  }

  function addUnmaskToTemplateLiteral(template: Collection<TemplateLiteral>) {
    template.find(j.TemplateElement).replaceWith((templateElementPath) => {
      const templateElement = templateElementPath.value;
      const queryString =
        templateElement.value.cooked || templateElement.value.raw;
      const document = parseDocument(queryString);

      if (document === null) {
        return templateElement;
      }

      const query = applyWhitespaceFrom(
        queryString,
        print(addUnmaskDirective(document, mode))
      );

      return j.templateElement(
        {
          raw: String.raw({ raw: [query] }),
          cooked: query,
        },
        templateElement.tail
      );
    });
  }
};

function parseDocument(source: string) {
  try {
    return parse(source);
  } catch (e) {
    return null;
  }
}

function applyWhitespaceFrom(source: string, target: string) {
  const leadingWhitespace = source.match(LEADING_WHITESPACE)?.at(0) ?? "";
  const trailingWhitespace = source.match(TRAILING_WHITESPACE)?.at(0) ?? "";
  const indentation = leadingWhitespace.match(INDENTATION)?.at(0) ?? "";

  return (
    leadingWhitespace +
    target
      .split("\n")
      .map((line, idx) => (idx === 0 ? line : indentation + line))
      .join("\n") +
    trailingWhitespace
  );
}

function addUnmaskDirective(document: DocumentNode, mode: string | undefined) {
  return visit(document, {
    FragmentSpread: (node) => {
      if (
        node.directives?.some((directive) => directive.name.value === "unmask")
      ) {
        return;
      }

      return {
        ...node,
        directives: [
          ...(node.directives || []),
          {
            kind: Kind.DIRECTIVE,
            name: { kind: Kind.NAME, value: "unmask" },
            arguments:
              mode === "migrate" ?
                [
                  {
                    kind: Kind.ARGUMENT,
                    name: { kind: Kind.NAME, value: "mode" },
                    value: { kind: Kind.STRING, value: "migrate" },
                  },
                ]
              : undefined,
          } satisfies DirectiveNode,
        ],
      };
    },
  });
}

export default transform;
