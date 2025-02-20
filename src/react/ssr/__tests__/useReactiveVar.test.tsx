/** @jest-environment node */
import React from "react";
import { makeVar } from "../../../core/index.js";
import { useReactiveVar } from "../../hooks/index.js";
import { renderToStringWithData } from "../index.js";
import { spyOnConsole } from "../../../testing/internal/index.js";

describe("useReactiveVar Hook SSR", () => {
  it("does not cause warnings", async () => {
    using consoleSpy = spyOnConsole("error");
    const counterVar = makeVar(0);
    function Component() {
      const count = useReactiveVar(counterVar);
      counterVar(1);
      counterVar(2);
      return <div>{count}</div>;
    }

    // eslint-disable-next-line testing-library/render-result-naming-convention
    const value = await renderToStringWithData(<Component />);
    expect(value).toEqual("<div>0</div>");
    expect(consoleSpy.error).toHaveBeenCalledTimes(0);
  });
});
